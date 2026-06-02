import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin, map } from 'rxjs';

import {
  SelectComponent,
  InputComponent,
  DatepickerComponent,
  InfoTableComponent,
  TableColumn,
  TableAction,
} from '@microfrontends/shared-ui';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InfoFamiliar } from '../../../../core/models/infoFamiliar.model';
import { InfoFamiliarService } from '../../../../core/services/info-familiar.service';
import { PersonasService } from '../../../../core/services/personas.service';
import { HojaVidaStatusService } from '../../../../core/services/hoja-vida-status.service';
import {
  ListasValoresService,
  UbicacionesGeograficasService,
} from '@microfrontends/shared-services';
import {
  ListasValoresDto,
  UbicacionesGeograficasDto,
} from '@microfrontends/shared-models';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
interface TipoDocumento {
  id: string;
  nombre: string;
  label: string;
  value: string;
}

interface Parentesco {
  id: string;
  nombre: string;
  label: string;
  value: string;
}

interface DropdownOption {
  id: string;
  nombre: string;
  label: string;
  value: string;
}

class CustomValidators {
  static requiredWithTouched(
    control: AbstractControl
  ): ValidationErrors | null {
    const isEmpty =
      !control.value ||
      (typeof control.value === 'string' && control.value.trim() === '');

    if (isEmpty) {
      return control.touched ? { requiredTouched: true } : { required: true };
    }

    return null;
  }

  static requiredBooleanWithTouched(
    control: AbstractControl
  ): ValidationErrors | null {
    const isEmpty = control.value === null || control.value === undefined;

    if (isEmpty) {
      return control.touched ? { requiredTouched: true } : { required: true };
    }

    return null;
  }

  static validarFechaNacimiento(
    control: AbstractControl
  ): ValidationErrors | null {
    if (!control.value) return null;

    const fechaNacimiento = new Date(control.value);
    const hoy = new Date();
    
    hoy.setHours(0, 0, 0, 0);
    fechaNacimiento.setHours(0, 0, 0, 0);

    if (fechaNacimiento > hoy) {
      return { fechaFutura: true };
    }

    const edadMinima = new Date();
    edadMinima.setFullYear(edadMinima.getFullYear() - 14);
    edadMinima.setHours(0, 0, 0, 0);

    if (fechaNacimiento > edadMinima) {
      return { edadMinima: true };
    }

    return null;
  }

  static validarFechaNacimientoCondicional(tiposDocumento: TipoDocumento[]) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const fechaNacimiento = new Date(control.value);
      const hoy = new Date();
      
      hoy.setHours(0, 0, 0, 0);
      fechaNacimiento.setHours(0, 0, 0, 0);

      if (fechaNacimiento > hoy) {
        return { fechaFutura: true };
      }

      const formGroup = control.parent as FormGroup;
      if (!formGroup) return null;

      const tipoDocumentoId = formGroup.get('tipoDocumento')?.value;
      if (!tipoDocumentoId) return null;

      const tipoDocumento = tiposDocumento.find(t => t.id === tipoDocumentoId);
      const nombreTipoDoc = tipoDocumento?.nombre?.toLowerCase() || '';

      const esTarjetaIdentidad = nombreTipoDoc.includes('tarjeta') && nombreTipoDoc.includes('identidad');
      const esRegistroCivil = nombreTipoDoc.includes('registro') && nombreTipoDoc.includes('civil');

      if (esTarjetaIdentidad || esRegistroCivil) {
        return null; 
      }

      const edadMinima = new Date();
      edadMinima.setFullYear(edadMinima.getFullYear() - 14);
      edadMinima.setHours(0, 0, 0, 0);

      if (fechaNacimiento > edadMinima) {
        return { edadMinima: true };
      }

      return null;
    };
  }

  static emailOptional(control: AbstractControl): ValidationErrors | null {
    if (!control.value || control.value.trim() === '') {
      return null;
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(control.value) ? null : { email: true };
  }

  static phonePattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const phonePattern = /^\d{10}$/;
    return phonePattern.test(control.value) ? null : { phoneInvalid: true };
  }

  static namePattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return namePattern.test(control.value) ? null : { nameInvalid: true };
  }

  static identificationPattern(
    control: AbstractControl
  ): ValidationErrors | null {
    if (!control.value) return null;
    const idPattern = /^\d{6,12}$/;
    return idPattern.test(control.value)
      ? null
      : { identificationInvalid: true };
  }

  static numberPattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const value = String(control.value).trim();
    const numberPattern = /^\d{6,12}$/;
    return numberPattern.test(value)
      ? null
      : { numberInvalid: true };
  }
}

@Component({
  selector: 'app-informacion-familiar-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    HttpClientModule,
    SelectComponent,
    InputComponent,
    DatepickerComponent,
    InfoTableComponent,
    RadioButtonModule,
    ButtonModule,
    TableModule,
    CardModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    MessageModule,
      ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './informacion-familiar-component.html',
  styleUrl: './informacion-familiar-component.scss',
})
export class InformacionFamiliarComponent implements OnInit {
  form: FormGroup;
  registros: Array<
    InfoFamiliar & {
      ciudadNombre?: string;   
    }
  > = [];
  tiposDocumento: TipoDocumento[] = [];
  parentescos: Parentesco[] = [];
  paises: DropdownOption[] = [];
  departamentos: DropdownOption[] = [];
  municipios: DropdownOption[] = [];
  ciudadesExpedicion: DropdownOption[] = [];
  personaId: string | null = null;
  private _deptCiudadMap: Record<string, DropdownOption[]> = {};
  isEditando = false;
  registroEditandoId: string | null = null;
  visible = false;
  activo = true;
  isLoadingDropdowns = false;
  isLoadingDepartamentos = false;
  isLoadingMunicipios = false;
  isLoadingInitial = true;
  isLoading = false;
  isSubmitting = false;
  private _ubicacionesCache: UbicacionesGeograficasDto[] = [];

  get tableData() {
    return this.registros.map(r => this.prepareTableRow(r));
  }

  tableColumns: TableColumn[] = [
    { field: 'nombres', header: 'Nombres', sortable: true },
    { field: 'identificacion', header: 'Identificación', sortable: true },
    { field: 'tipoDocumento', header: 'Tipo Doc.', sortable: true },
    { field: 'ciudadExpedicion', header: 'Ciudad Expedición', sortable: true },
    { field: 'fechaNacimiento', header: 'Fecha Nac.', sortable: true, align: 'center' },
    { field: 'ocupacion', header: 'Ocupación', sortable: true },
    { field: 'celular', header: 'Celular', sortable: true },
    { field: 'correo', header: 'Correo', sortable: true },
    { field: 'dependeEconomicamente', header: 'Depende Econ.', sortable: true, align: 'center' },
    { field: 'parentesco', header: 'Parentesco', sortable: true }
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-pencil',
      severity: 'info',
      tooltip: 'Editar registro',
      onClick: (row: InfoFamiliar) => this.editarRegistro(row)
    },
    {
      icon: 'pi pi-trash',
      severity: 'danger',
      tooltip: 'Eliminar registro',
      onClick: (row: InfoFamiliar) => this.eliminarRegistro(row.id)
    }
  ];

  readonly errorMessages = {
    nombres: {
      required: 'El nombre del familiar es obligatorio',
      minlength: 'Mínimo 2 caracteres',
      nameInvalid: 'Solo se permiten letras y espacios'
    },
    identificacion: {
      required: 'La identificación del familiar es obligatoria',
      numberInvalid: 'La identificación debe contener entre 6 y 12 dígitos'
    },
    tipoDocumento: {
      required: 'El tipo de documento es obligatorio'
    },
    paisExpedicion: {
      required: 'El país de expedición es obligatorio'
    },
    departamentoExpedicion: {
      required: 'El departamento de expedición es obligatorio'
    },
    municipioExpedicion: {
      required: 'La ciudad/municipio de expedición es obligatoria'
    },
    ciudadExpedicion: {
      required: 'La ciudad de expedición es obligatoria',
      minlength: 'Mínimo 2 caracteres',
      nameInvalid: 'Solo se permiten letras y espacios'
    },
    fechaNacimiento: {
      required: 'La fecha de nacimiento es obligatoria',
      fechaFutura: 'La fecha no puede ser futura',
      edadMinima: 'La persona debe tener al menos 14 años'
    },
    ocupacion: {
      required: 'La ocupación es obligatoria',
      minlength: 'Mínimo 2 caracteres',
      nameInvalid: 'Solo se permiten letras y espacios'
    },
    celular: {
      required: 'El celular es obligatorio',
      phoneInvalid: 'El celular debe tener exactamente 10 dígitos'
    },
    correo: {
      required: 'El correo electrónico es obligatorio',
      email: 'Correo electrónico inválido'
    },
    dependeEconomicamente: {
      required: 'Debe especificar si depende económicamente'
    },
    parentesco: {
      required: 'El parentesco es obligatorio'
    }
  } as const;

  get esColombia(): boolean {
    const paisId = this.form.get('paisExpedicion')?.value;
    if (!paisId) return false;

    const pais = this._ubicacionesCache.find((u) => u.id === paisId);
    return pais?.nombre?.toLowerCase().includes('colombia') || false;
  }

  get ocupacionEsRequerida(): boolean {
    return !this.esHijo();
  }

  get celularEsRequerido(): boolean {
    return !this.esHijo();
  }

  get correoEsRequerido(): boolean {
    return !this.esHijo(); 
  }

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private infoFamiliarService: InfoFamiliarService,
    private personasService: PersonasService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private listasValoresService: ListasValoresService,
    private ubicacionesGeograficasService: UbicacionesGeograficasService,
    private cdr: ChangeDetectorRef,
    private hojaVidaStatusService: HojaVidaStatusService
  ) {
    this.form = this.fb.group({
      nombres: [
        '',
        [
          CustomValidators.requiredWithTouched,
          Validators.minLength(2),
          CustomValidators.namePattern,
        ],
      ],
      identificacion: [
        '',
        [
          CustomValidators.requiredWithTouched,
          CustomValidators.numberPattern,
          Validators.min(0),
        ],
      ],
      tipoDocumento: [null, [CustomValidators.requiredWithTouched]],
      paisExpedicion: [null, [CustomValidators.requiredWithTouched]],
      departamentoExpedicion: [null, [CustomValidators.requiredWithTouched]],
      municipioExpedicion: [null, [CustomValidators.requiredWithTouched]],
      ciudadExpedicion: [''], 
      lugarExpedicion: [''], 
      fechaNacimiento: [
        '',
        [],
      ],
      ocupacion: [
        '',
        [
          Validators.minLength(2),
          CustomValidators.namePattern,
        ],
      ],
      celular: [
        '',
        [
          CustomValidators.phonePattern,
        ],
      ],
      correo: ['', [CustomValidators.emailOptional]],
      dependeEconomicamente: [null, [CustomValidators.requiredBooleanWithTouched]],
      parentesco: [null, [CustomValidators.requiredWithTouched]],
      persona: [null],
    });
  }

  ngOnInit() {
    this.cargarDatos().then(() => {
      this.configurarValidadorFechaNacimiento();
      
      this.configurarValidadoresSegunParentesco();
      
      this.obtenerPersonaId().then(() => {
        this.cargarRegistros();
      });
    });

    this.form.get('fechaNacimiento')?.valueChanges.subscribe((fecha) => {
      if (fecha) {
        const control = this.form.get('fechaNacimiento');
        control?.markAsTouched();
      }
    });

    this.form.get('tipoDocumento')?.valueChanges.subscribe((tipoDocumentoId) => {
      const fechaNacimientoControl = this.form.get('fechaNacimiento');
      if (fechaNacimientoControl?.value) {
        fechaNacimientoControl.updateValueAndValidity();
      }
    });

    this.form.get('parentesco')?.valueChanges.subscribe((parentescoId) => {
      this.configurarValidadoresSegunParentesco();
    });

    this.form
      .get('paisExpedicion')
      ?.valueChanges.subscribe((paisId: string | null) => {
        if (paisId) {
          this.cargarDepartamentosPorPais(paisId);

          const departamentoControl = this.form.get('departamentoExpedicion');
          const municipioControl = this.form.get('municipioExpedicion');
          const ciudadControl = this.form.get('ciudadExpedicion');

          if (this.esColombia) {
            departamentoControl?.setValidators([
              CustomValidators.requiredWithTouched,
            ]);
            municipioControl?.setValidators([
              CustomValidators.requiredWithTouched,
            ]);
            ciudadControl?.setValidators([]);
            ciudadControl?.setValue('');
          } else {
            departamentoControl?.setValidators([]);
            municipioControl?.setValidators([]);
            ciudadControl?.setValidators([
              CustomValidators.requiredWithTouched,
              Validators.minLength(2),
              CustomValidators.namePattern,
            ]);
            departamentoControl?.setValue(null);
            municipioControl?.setValue(null);
          }

          departamentoControl?.updateValueAndValidity();
          municipioControl?.updateValueAndValidity();
          ciudadControl?.updateValueAndValidity();
        } else {
          this.departamentos = [];
          this.municipios = [];
          this.form.get('departamentoExpedicion')?.setValue(null);
          this.form.get('municipioExpedicion')?.setValue(null);
          this.form.get('ciudadExpedicion')?.setValue('');
        }
      });

    this.form
      .get('departamentoExpedicion')
      ?.valueChanges.subscribe((departamentoId) => {
        if (departamentoId) {
          this.cargarMunicipiosPorDepartamento(departamentoId);
        } else {
          this.municipios = [];
          this.form.get('municipioExpedicion')?.setValue(null);
        }
      });
  }

  private configurarValidadorFechaNacimiento(): void {
    const fechaNacimientoControl = this.form.get('fechaNacimiento');
    if (fechaNacimientoControl) {
      fechaNacimientoControl.setValidators([
        CustomValidators.validarFechaNacimientoCondicional(this.tiposDocumento)
      ]);
      fechaNacimientoControl.updateValueAndValidity();
    }
  }

  private configurarValidadoresSegunParentesco(): void {
    const esHijo = this.esHijo();
    
    const ocupacionControl = this.form.get('ocupacion');
    if (ocupacionControl) {
      if (esHijo) {
        ocupacionControl.setValidators([
          Validators.minLength(2),
          CustomValidators.namePattern,
        ]);
      } else {
        ocupacionControl.setValidators([
          CustomValidators.requiredWithTouched,
          Validators.minLength(2),
          CustomValidators.namePattern,
        ]);
      }
      ocupacionControl.updateValueAndValidity();
    }

    const celularControl = this.form.get('celular');
    if (celularControl) {
      if (esHijo) {
        celularControl.setValidators([
          CustomValidators.phonePattern,
          Validators.min(0),
        ]);
      } else {
        celularControl.setValidators([
          CustomValidators.requiredWithTouched,
          CustomValidators.phonePattern,
          Validators.min(0),
        ]);
      }
      celularControl.updateValueAndValidity();
    }

    const correoControl = this.form.get('correo');
    if (correoControl) {
      if (esHijo) {
        correoControl.setValidators([
          CustomValidators.emailOptional,
        ]);
      } else {
        correoControl.setValidators([
          CustomValidators.requiredWithTouched,
          CustomValidators.emailOptional,
        ]);
      }
      correoControl.updateValueAndValidity();
    }
  }

  private cargarDatos(): Promise<void> {
    this.isLoadingDropdowns = true;

    return new Promise((resolve, reject) => {
      forkJoin({
        tiposDocumento: this.listasValoresService
          .getDropdownByTipo('TDOC')
          .pipe(
            map((response: ListasValoresDto[]) =>
              response
                .filter(
                  (item) =>
                    'idPadre' in item &&
                    (item as { idPadre: string | null }).idPadre !== null
                ) 
                .map((item) => ({
                  id: item.id,
                  nombre: item.nombre,
                  label: item.nombre,
                  value: item.id,
                }))
            )
          ),
          parentescos: this.listasValoresService
          .getDropdownByTipo('PAR')
          .pipe(
            map((response: ListasValoresDto[]) =>
              response
                .filter(
                  (item) =>
                    'idPadre' in item &&
                    (item as { idPadre: string | null }).idPadre !== null
                ) 
                .map((item) => ({
                  id: item.id,
                  nombre: item.nombre,
                  label: item.nombre,
                  value: item.id,
                }))
            )
          ),
        ubicaciones: this.ubicacionesGeograficasService
          .getAllForDropdown()
          .pipe(map((response: UbicacionesGeograficasDto[]) => response)),
      }).subscribe({
        next: (data) => {
          this.tiposDocumento = data.tiposDocumento;
          this.parentescos = data.parentescos;

          this._ubicacionesCache = data.ubicaciones || [];

          this.paises = this._ubicacionesCache
            .filter(
              (u) =>
                (u.nombreTipo && u.nombreTipo.toLowerCase().includes('país')) ||
                u.idPadre == null
            )
            .map((u) => ({
              id: u.id || '',
              nombre: u.nombre || '',
              label: u.nombre || '',
              value: u.id || '',
            }));

          this.departamentos = [];
          this.municipios = [];

          this.isLoadingDropdowns = false;
          resolve();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error cargando datos',
          });
          this.isLoadingDropdowns = false;
          reject(error);
        },
      });
    });
  }

  cargarDepartamentosPorPais(paisId: string | null): Promise<void> {
    if (!paisId) {
      this.departamentos = [];
      return Promise.resolve();
    }

    this.isLoadingDepartamentos = true;

    return new Promise((resolve) => {
      const deps = this._ubicacionesCache
        .filter(
          (u) =>
            u.idPadre === paisId &&
            u.nombreTipo &&
            u.nombreTipo.toLowerCase().includes('depart')
        )
        .map((u) => ({
          id: u.id || '',
          nombre: u.nombre || '',
          label: u.nombre || '',
          value: u.id || '',
        }));

      if (deps.length === 0) {
        const pais = this._ubicacionesCache.find((u) => u.id === paisId) as
          | UbicacionesGeograficasDto
          | undefined;
        const nombrePais = pais?.nombre || '';
        const depsByNombrePadre = this._ubicacionesCache
          .filter(
            (u) =>
              u.nombrePadre === nombrePais &&
              u.nombreTipo &&
              u.nombreTipo.toLowerCase().includes('depart')
          )
          .map((u) => ({
            id: u.id || '',
            nombre: u.nombre || '',
            label: u.nombre || '',
            value: u.id || '',
          }));

        this.departamentos = depsByNombrePadre;
      } else {
        this.departamentos = deps;
      }

      this.municipios = [];
      this.form.get('departamentoExpedicion')?.setValue(null);
      this.form.get('municipioExpedicion')?.setValue(null);
      this.isLoadingDepartamentos = false;
      resolve();
    });
  }

  cargarMunicipiosPorDepartamento(
    departamentoId: string | null
  ): Promise<void> {
    if (!departamentoId) {
      this.municipios = [];
      return Promise.resolve();
    }

    this.isLoadingMunicipios = true;

    return new Promise((resolve) => {
      const mun = this._ubicacionesCache
        .filter(
          (u) =>
            u.idPadre === departamentoId &&
            u.nombreTipo &&
            (u.nombreTipo.toLowerCase().includes('ciudad') ||
              u.nombreTipo.toLowerCase().includes('municip'))
        )
        .map((u) => ({
          id: u.id || '',
          nombre: u.nombre || '',
          label: u.nombre || '',
          value: u.id || '',
        }));

      if (mun.length === 0) {
        const dept = this._ubicacionesCache.find(
          (u) => u.id === departamentoId
        ) as UbicacionesGeograficasDto | undefined;
        const nombreDept = dept?.nombre || '';
        const munByNombrePadre = this._ubicacionesCache
          .filter(
            (u) =>
              u.nombrePadre === nombreDept &&
              u.nombreTipo &&
              (u.nombreTipo.toLowerCase().includes('ciudad') ||
                u.nombreTipo.toLowerCase().includes('municip'))
          )
          .map((u) => ({
            id: u.id || '',
            nombre: u.nombre || '',
            label: u.nombre || '',
            value: u.id || '',
          }));

        this.municipios = munByNombrePadre;
      } else {
        this.municipios = mun;
      }

      this.form.get('municipioExpedicion')?.setValue(null);
      this.isLoadingMunicipios = false;
      resolve();
    });
  }

  showDialog() {
    this.resetearFormulario(); 
    this.visible = true;
  }

  private async obtenerPersonaId(): Promise<void> {
    try {
      const persona = await this.personasService
        .getPersonaActual()
        .toPromise();
      this.personaId = persona?.id || null;
      if (!this.personaId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'Debe completar su información personal primero',
        });
      } else {
        this.form.patchValue({ persona: this.personaId });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario',
      });
    }
  }

  cargarRegistros() {
    if (!this.personaId) {
      return;
    }

    this.isLoadingInitial = true;
    this.cdr.markForCheck();

    this.infoFamiliarService.getByUsuarioId(this.personaId).subscribe({
      next: (data) => {
        this.registros = data.map(registro => {
          const ciudadParaMostrar = this.extraerNombreCiudad(registro.lugarExpedicion || '');
          
          return {
            ...registro,
            ciudadNombre: ciudadParaMostrar,  
          };
        });
        this.isLoadingInitial = false;
        this.cdr.markForCheck();
        
        this.hojaVidaStatusService.updateSectionByRecordCount(
          'informacion-familiar',
          this.registros.length
        );
      },
      error: (err) => {
        
        this.isLoadingInitial = false;
        this.cdr.markForCheck();
        
        this.hojaVidaStatusService.updateSectionByRecordCount('informacion-familiar', 0);
      },
    });
  }

  public isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    
    if (fieldName === 'fechaNacimiento') {
      if (!control) return false;
      
      if (control.value) {
        if (control.errors?.['edadMinima'] && this.esDocumentoMenorEdad()) {
          return false; 
        }
        return !!(control.invalid && (control.errors?.['fechaFutura'] || control.errors?.['edadMinima']));
      }
      
      if (!control.value && control.touched) {
        return !!(control.invalid && (control.errors?.['required'] || control.errors?.['requiredTouched']));
      }
      
      return false;
    }
    
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  public getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control?.errors) return '';
    
    const shouldShowImmediately = ['fechaNacimiento'];
    if (!control.touched && !shouldShowImmediately.includes(fieldName)) return '';
    
    const errors = control.errors;
    
    const fieldMessages = (this.errorMessages as any)[fieldName] || {};

    for (const errorKey of Object.keys(errors)) {
      const errorValue = errors[errorKey];
      
      if (errorKey === 'minlength' && errorValue && 'requiredLength' in errorValue) {
        const msg = fieldMessages['minlength'];
        return msg || `Mínimo ${(errorValue as any).requiredLength} caracteres`;
      }
      
      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['requiredTouched'] || errors['required']) return 'Este campo es obligatorio';
    if (errors['phoneInvalid']) return 'El celular debe tener 10 dígitos';
    if (errors['nameInvalid']) return 'Solo se permiten letras y espacios';
    if (errors['identificationInvalid']) return 'La identificación debe tener entre 6 y 12 dígitos';
    if (errors['email']) return 'Correo electrónico inválido';
    if (errors['fechaFutura']) return 'La fecha no puede ser futura';
    if (errors['edadMinima']) return 'La persona debe tener al menos 14 años';
    if (errors['minlength']) return `Mínimo ${(errors['minlength'] as any).requiredLength} caracteres`;

    return 'Campo inválido';
  }

  

  public getFormErrors(): Record<string, ValidationErrors | null> {
    const formErrors: Record<string, ValidationErrors | null> = {};
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.errors) {
        formErrors[key] = control.errors;
      }
    });
    return formErrors;
  }

  guardarRegistro() {
    if (this.isLoading || this.isSubmitting) {
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;
    this.cdr.detectChanges(); 
    
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const primerCampoInvalido = this.encontrarPrimerCampoInvalido();
      if (primerCampoInvalido) {
        this.scrollYEnfocarCampo(primerCampoInvalido);
        this.messageService.add({
          severity: 'warn',
          summary: 'Formulario incompleto',
          detail: `Por favor complete el campo: ${this.obtenerEtiquetaCampo(primerCampoInvalido)}`,
          life: 5000
        });
      } else {
        this.mostrarErroresFormulario();
      }
      this.isLoading = false;
      this.isSubmitting = false;
      this.cdr.detectChanges();
      return;
    }

    if (!this.personaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la persona. Inicie sesión nuevamente.',
      });
      return;
    }

    const formValue = this.form.getRawValue();

    let fechaNacimiento = formValue.fechaNacimiento;
    if (fechaNacimiento instanceof Date) {
      fechaNacimiento = fechaNacimiento.toISOString();
    }

    let lugarExpedicion = '';
    if (this.esColombia && formValue.municipioExpedicion) {
      const municipioNombre = this.getMunicipioNombre(
        formValue.municipioExpedicion
      );
      lugarExpedicion = municipioNombre;
    } else if (!this.esColombia && formValue.ciudadExpedicion) {
      lugarExpedicion = formValue.ciudadExpedicion;
    }

    const tipoDocumentoNombre = this.getTipoDocumentoLabel(formValue.tipoDocumento);
    const parentescoNombre = this.getParentescoLabel(formValue.parentesco);
    
    const datosParaEnviar: Partial<InfoFamiliar> = {
      nombres: formValue.nombres,
      identificacion: formValue.identificacion,
      tipoDocumento: tipoDocumentoNombre, 
      fechaNacimiento,
      ocupacion: formValue.ocupacion,
      celular: formValue.celular,
      correo: formValue.correo,
      dependeEconomicamente: formValue.dependeEconomicamente,
      parentesco: parentescoNombre, 
      lugarExpedicion: lugarExpedicion, 
      persona: this.personaId || formValue.persona,
    };

    if (this.isEditando && this.registroEditandoId) {
      this.infoFamiliarService
        .update(this.registroEditandoId, datosParaEnviar as InfoFamiliar)
        .subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Información familiar actualizada correctamente'
            });
            this.cargarRegistros();
            this.cancelarEdicion();
            this.isLoading = false;
            this.isSubmitting = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al actualizar el registro'
            });
            this.isLoading = false;
            this.isSubmitting = false;
            this.cdr.detectChanges();
          },
        });
    } else {
      this.infoFamiliarService
        .create(datosParaEnviar as InfoFamiliar)
        .subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Información familiar creada correctamente'
            });
            this.cargarRegistros();
            this.resetearFormulario();
            this.isLoading = false;
            this.isSubmitting = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al guardar el registro'
            });
            this.isLoading = false;
            this.isSubmitting = false;
            this.cdr.detectChanges();
          },
        });
    }
    this.visible = false;
  }

  async editarRegistro(registro: InfoFamiliar) {
    this.isEditando = true;
    this.registroEditandoId = registro.id || null;

    let fechaNacimiento = null;
    if (registro.fechaNacimiento) {
      const fechaStr =
        typeof registro.fechaNacimiento === 'string'
          ? registro.fechaNacimiento
          : registro.fechaNacimiento.toString();

      let fechaDate: Date;
      if (fechaStr.includes('/')) {
        const parts = fechaStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; 
          const year = parseInt(parts[2], 10);
          fechaDate = new Date(year, month, day);
        } else {
          fechaDate = new Date(fechaStr);
        }
      } else if (fechaStr.includes('T')) {
        fechaDate = new Date(fechaStr);
      } else {
        fechaDate = new Date(fechaStr + 'T12:00:00');
      }

      if (fechaDate && !isNaN(fechaDate.getTime())) {
        fechaNacimiento = fechaDate;
      } else {
        fechaNacimiento = null;
      }
    }

    let paisId: string | null = null;
    let departamentoId: string | null = null;
    let municipioId: string | null = null;
    let ciudadExpedicion = '';

    if (registro.lugarExpedicion) {
      const municipioEntry = this._ubicacionesCache.find(
        (u) =>
          u.nombre === registro.lugarExpedicion &&
          u.nombreTipo &&
          (u.nombreTipo.toLowerCase().includes('ciudad') ||
            u.nombreTipo.toLowerCase().includes('municip'))
      );

      if (municipioEntry) {
        municipioId = municipioEntry.id || null;
        departamentoId = municipioEntry.idPadre || null;
        
        const deptEntry = this._ubicacionesCache.find(
          (u) => u.id === departamentoId
        );
        paisId = deptEntry?.idPadre || null;
      } else {
        const deptEntry = this._ubicacionesCache.find(
          (u) =>
            u.nombre === registro.lugarExpedicion &&
            u.nombreTipo &&
            u.nombreTipo.toLowerCase().includes('depart')
        );
        
        if (deptEntry) {
          departamentoId = deptEntry.id || null;
          paisId = deptEntry.idPadre || null;
        } else {
          ciudadExpedicion = registro.lugarExpedicion;
          const paisNoColombiaId = this.paises.find(p => 
            !p.nombre.toLowerCase().includes('colombia')
          )?.id;
          if (paisNoColombiaId) {
            paisId = paisNoColombiaId;
          }
        }
      }
    }

    let tipoDocumentoId = registro.tipoDocumento;
    let parentescoId = registro.parentesco;
    
    if (this.isUUID(registro.tipoDocumento)) {
      tipoDocumentoId = this.tiposDocumento.length > 0 ? this.tiposDocumento[0].id : '';
    } else {
      const tipoEncontrado = this.tiposDocumento.find(t => t.nombre === registro.tipoDocumento || t.label === registro.tipoDocumento);
      tipoDocumentoId = tipoEncontrado ? tipoEncontrado.id : '';
    }
    
    if (this.isUUID(registro.parentesco)) {
      parentescoId = this.parentescos.length > 0 ? this.parentescos[0].id : '';
    } else {
      const parentescoEncontrado = this.parentescos.find(p => p.nombre === registro.parentesco || p.label === registro.parentesco);
      parentescoId = parentescoEncontrado ? parentescoEncontrado.id : '';
    }

    this.form.patchValue({
      nombres: registro.nombres,
      identificacion: registro.identificacion,
      tipoDocumento: tipoDocumentoId, 
      ciudadExpedicion: ciudadExpedicion,
      lugarExpedicion: registro.lugarExpedicion,
      fechaNacimiento: fechaNacimiento,
      ocupacion: registro.ocupacion,
      celular: registro.celular,
      correo: registro.correo,
      dependeEconomicamente: String(registro.dependeEconomicamente).toLowerCase() === 'true',
      parentesco: parentescoId, 
      persona: registro.persona || this.personaId,
    }, { emitEvent: false });

    try {
      if (paisId) {
        this.form.patchValue({ paisExpedicion: paisId }, { emitEvent: false });
        
        if (departamentoId) {
          await this.cargarDepartamentosPorPais(paisId);
          await new Promise(resolve => setTimeout(resolve, 100));
          this.form.patchValue({ departamentoExpedicion: departamentoId }, { emitEvent: false });
          
          if (municipioId) {
            await this.cargarMunicipiosPorDepartamento(departamentoId);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            setTimeout(() => {
              this.form.get('municipioExpedicion')?.setValue(municipioId);
              this.cdr.detectChanges();
            }, 300);
          }
        }
      }

      this.cdr.detectChanges();

    } catch (error) {
    }

    this.visible = true;
    }

  eliminarRegistro(id?: string) {
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: ' ID no proporcionado para eliminar'
      });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar esta información familiar?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.infoFamiliarService.delete(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Información familiar eliminada correctamente'
            });
            this.cargarRegistros();
            if (this.isEditando && this.registroEditandoId === id) {
              this.cancelarEdicion();
            }
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la información familiar'
            });
          }
        });
      }
    });
  }

  cancelarEdicion() {
    this.isEditando = false;
    this.registroEditandoId = null;
    this.resetearFormulario();
    this.visible = false;
  }

  private resetearFormulario() {
    this.form.reset();
    this.form.patchValue({ persona: this.personaId });
    this.departamentos = []; 
    this.municipios = []; 
    this.isLoading = false;
    this.isSubmitting = false;
    
    this.configurarValidadoresSegunParentesco();
  }

  private mostrarErroresFormulario() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        }
    });
  }

  private getMunicipioNombre(municipioId?: string | null): string {
    if (!municipioId) {
      return this.form.get('lugarExpedicion')?.value || '';
    }
    const entry = this._ubicacionesCache.find((u) => u.id === municipioId);
    return entry?.nombre || this.form.get('lugarExpedicion')?.value || '';
  }

  getTipoDocumentoLabel(value: string): string {
    const tipo = this.tiposDocumento.find(
      (t) => t.id === value || t.value === value
    );
    return tipo ? tipo.nombre || tipo.label : value;
  }

  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  getParentescoLabel(value: string): string {
    const par = this.parentescos.find(
      (p) => p.id === value || p.value === value
    );
    return par ? par.nombre || par.label : value;
  }

  private extraerNombreCiudad(ciudadCompleta: string): string {
    if (!ciudadCompleta) return '';
    
    if (ciudadCompleta.includes(',')) {
      return ciudadCompleta.split(',')[0].trim();
    }
    
    return ciudadCompleta.trim();
  }

  private esDocumentoMenorEdad(): boolean {
    const tipoDocumentoId = this.form.get('tipoDocumento')?.value;
    if (!tipoDocumentoId) return false;

    const tipoDocumento = this.tiposDocumento.find(t => t.id === tipoDocumentoId);
    const nombreTipoDoc = tipoDocumento?.nombre?.toLowerCase() || '';
    
    const esTarjetaIdentidad = nombreTipoDoc.includes('tarjeta') && nombreTipoDoc.includes('identidad');
    const esRegistroCivil = nombreTipoDoc.includes('registro') && nombreTipoDoc.includes('civil');
    
    return esTarjetaIdentidad || esRegistroCivil;
  }

  private esHijo(): boolean {
    const parentescoId = this.form.get('parentesco')?.value;
    if (!parentescoId) return false;

    const parentesco = this.parentescos.find(p => p.id === parentescoId);
    const nombreParentesco = parentesco?.nombre?.toLowerCase() || '';
    
    return nombreParentesco.includes('hijo');
  }

  private encontrarPrimerCampoInvalido(): string | null {
    const camposOrdenados = [
      'parentesco',
      'primerNombre',
      'primerApellido',
      'tipoDocumento',
      'numeroDocumento',
      'fechaExpedicion',
      'lugarExpedicion',
      'fechaNacimiento',
      'genero',
      'ocupacion',
      'telefono',
      'direccion',
      'vive',
      'dependeEconomicamente'
    ];

    for (const campo of camposOrdenados) {
      const control = this.form.get(campo);
      if (control && control.invalid && control.touched) {
        return campo;
      }
    }

    return null;
  }

  private scrollYEnfocarCampo(nombreCampo: string): void {
    setTimeout(() => {
      const elemento = document.querySelector(
        `[formControlName="${nombreCampo}"], [ng-reflect-name="${nombreCampo}"], #${nombreCampo}, .field-${nombreCampo}`
      ) as HTMLElement;

      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          elemento.focus();
        }, 300);
      }
    }, 100);
  }

  private obtenerEtiquetaCampo(nombreCampo: string): string {
    const etiquetas: { [key: string]: string } = {
      parentesco: 'Parentesco',
      primerNombre: 'Primer nombre',
      segundoNombre: 'Segundo nombre',
      primerApellido: 'Primer apellido',
      segundoApellido: 'Segundo apellido',
      tipoDocumento: 'Tipo de documento',
      numeroDocumento: 'Número de documento',
      fechaExpedicion: 'Fecha de expedición',
      lugarExpedicion: 'Lugar de expedición',
      fechaNacimiento: 'Fecha de nacimiento',
      genero: 'Género',
      ocupacion: 'Ocupación',
      telefono: 'Teléfono',
      direccion: 'Dirección',
      vive: '¿Vive?',
      dependeEconomicamente: '¿Depende económicamente?'
    };
    return etiquetas[nombreCampo] || nombreCampo;
  }

  prepareTableRow(registro: InfoFamiliar & { ciudadNombre?: string }) {
    return {
      ...registro,
      tipoDocumento: this.getTipoDocumentoLabel(registro.tipoDocumento || ''),
      ciudadExpedicion: registro.ciudadNombre || registro.lugarExpedicion || 'N/A',
      fechaNacimiento: registro.fechaNacimiento 
        ? new Date(registro.fechaNacimiento).toLocaleDateString('es-CO')
        : 'N/A',
      correo: registro.correo || '-',
      dependeEconomicamente: registro.dependeEconomicamente ? 'Sí' : 'No',
      parentesco: this.getParentescoLabel(registro.parentesco || '')
    };
  }
}
