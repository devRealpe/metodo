import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl, FormControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import {  map, takeUntil } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import {
  SelectComponent,
  InputComponent,
  DatepickerComponent,
  FileAttachmentComponent,
  FileInfoS,
  FileAttachmentConfig,
  PdfValidationResult,
  InfoTableComponent,
  TableColumn,
  TableAction
} from '@microfrontends/shared-ui';
import { FileAttachmentService } from '@microfrontends/shared-services';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InfoLaboral } from '../../../../core/models/info-laboral.model';
import { InfoLaboralService, SinExperienciaLaboralResponse } from '../../../../core/services/info-laboral.service';
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
import { TagModule } from 'primeng/tag';

interface TipoExperiencia {
  id: string;
  nombre: string;
  label: string;
  value: string;
}

interface MotivoRetiro {
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
    const value = control.value;
    const isBoolean = typeof value === 'boolean';
    let isEmpty = false;
    if (isBoolean) {
      isEmpty = value === null || value === undefined;
    } else if (typeof value === 'string') {
      isEmpty = value.trim() === '';
    } else {
      isEmpty = value === null || value === undefined;
    }

    if (isEmpty) {
      return control.touched ? { required: true } : { required: true };
    }

    return null;
  }

  static emailPattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value || control.value.trim() === '') {
      return null; 
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(control.value) ? null : { email: true };
  }

  static phonePattern(control: AbstractControl): ValidationErrors | null {
    const val = control.value;
    if (val === null || val === undefined || val === '') return null;

    const valueStr = typeof val === 'string' ? val.trim() : String(val);

    const phonePattern = /^[0-9\-]+$/;
    if (!phonePattern.test(valueStr)) {
      return { phoneInvalid: true };
    }

    const numbersOnly = valueStr.replace(/\-/g, '');
    if (numbersOnly.length < 7) {
      return { phoneInvalid: true };
    }

    return null;
  }

  static namePattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.&\-(),/]+$/;
    return namePattern.test(control.value) ? null : { nameInvalid: true };
  }

  static addressPattern(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const addressPattern = /^[A-Za-z0-9\s#.,\-°]{5,65}$/;
    return addressPattern.test(control.value) ? null : { addressInvalid: true };
  }

  static noFutureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const fecha = control.value instanceof Date ? control.value : new Date(control.value);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    
    return fecha > hoy ? { fechaFutura: true } : null;
  }
}

@Component({
  selector: 'app-informacion-laboral-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    SelectComponent,
    InputComponent,
    DatepickerComponent,
    RadioButtonModule,
    ButtonModule,
    TableModule,
    CardModule,
    ToastModule,
    DialogModule,
    MessageModule,
    ConfirmDialogModule,
    FileAttachmentComponent,
    TooltipModule,
    InfoTableComponent,
    TagModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './informacion-laboral-component.html',
  styleUrl: './informacion-laboral-component.scss',
})
export class InformacionLaboralComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  isLoading = false;
  isSubmitting = false; 
  form: FormGroup;
  tiposExperiencia: TipoExperiencia[] = [];
  motivosRetiro: MotivoRetiro[] = [];
  registros: InfoLaboral[] = [];
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
  private _ubicacionesCache: UbicacionesGeograficasDto[] = [];
  private _originalFormValues: any = {}; 

  selectedFile?: File;
  fileError: string | null = null;
  uploadedFileId: string | null = null;
  fileAttachmentConfig: FileAttachmentConfig = {
    moduleType: 'info_laboral',
    multiple: false,
    maxFileSize: 10 * 1024 * 1024, 
    accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
    autoUpload: true, 
    showPreview: true,
    showDownload: true,
    showDelete: true,
    renameFiles: false,
    pdfValidation: {
      enabled: true,
      moduleType: 'info_laboral',
      expectedDocumentType: 'Employment_Document',
      autoReject: true,
      showValidationFeedback: true
    }
  };
  existingFiles: FileInfoS[] = [];
  fileControl = new FormControl();
  @ViewChild('fileAttachment') fileAttachment!: FileAttachmentComponent;

  archivoOriginalId: string | null = null;
  archivoPendienteEliminacion: boolean = false;
  
  private _hadFilesOnOpen: boolean = false;

  // ── Declaración sin experiencia laboral ──────────────────────────────────
  sinExperienciaLaboral = false;
  fechaDeclaracionSinExperienciaLaboral: string | null = null;
  isTogglingDeclaracion = false;

  tableColumns: TableColumn[] = [
    { field: 'nombreEmpresa', header: 'Empresa', sortable: true, width: '15%' },
    { field: 'cargoDesempenado', header: 'Cargo', sortable: true, width: '15%' },
    { field: 'fechaInicio', header: 'Inicio', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy', width: '10%', align: 'center' },
    { field: 'fechaFin', header: 'Fin', type: 'custom', width: '10%', align: 'center' },
    { field: 'ubicacion', header: 'Ubicación', width: '12%' },
    { field: 'jefeInmediato', header: 'Jefe Inmediato', width: '12%' },
    { 
      field: 'vigente', 
      header: 'Vigente', 
      type: 'badge',
      width: '8%',
      align: 'center',
      badgeConfig: {
        getSeverity: (value: boolean) => value ? 'success' : 'secondary',
        getLabel: (value: boolean) => value ? 'Sí' : 'No'
      }
    },
    { field: 'tipo_experiencia_label', header: 'Tipo', width: '10%' },
    { field: 'archivos', header: 'Archivos', type: 'custom', width: '8%', align: 'center' }
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-pencil',
      tooltip: 'Editar experiencia',
      severity: 'info',
      outlined: true,
      onClick: (row: InfoLaboral) => this.editarRegistro(row)
    },
    {
      icon: 'pi pi-trash',
      tooltip: 'Eliminar experiencia',
      severity: 'danger',
      outlined: true,
      onClick: (row: InfoLaboral) => this.eliminarRegistro(row.id!)
    }
  ];

  readonly errorMessages = {
    tipo_experiencia: {
      required: 'El tipo de experiencia es requerido'
    },
    nombreEmpresa: {
      required: 'El nombre de la empresa es requerido',
      minlength: 'Mínimo 3 caracteres',
      maxlength: 'Máximo 100 caracteres',
      nameInvalid: 'El nombre solo debe contener letras, espacios y caracteres especiales (., &, -, etc.)'
    },
    cargoDesempenado: {
      required: 'El cargo desempeñado es requerido',
      minlength: 'Mínimo 3 caracteres',
      maxlength: 'Máximo 100 caracteres',
      nameInvalid: 'El cargo solo debe contener letras y espacios, sin números'
    },
    fechaInicio: {
      required: 'La fecha de inicio es requerida',
      fechaFutura: 'La fecha de inicio no puede ser una fecha futura',
      fechaInicioFutura: 'La fecha de inicio no puede ser una fecha futura',
      fechaInicioMayorQueFin: 'La fecha de inicio no puede ser mayor que la fecha de fin'
    },
    fechaFin: {
      required: 'La fecha de fin es requerida',
      fechaFutura: 'La fecha de fin no puede ser una fecha futura',
      fechaFinFutura: 'La fecha de fin no puede ser una fecha futura',
      fechaFinAntesQueInicio: 'La fecha de fin no puede ser anterior a la fecha de inicio'
    },
    pais: {
      required: 'El país es requerido'
    },
    departamento: {
      required: 'El departamento es requerido'
    },
    municipio: {
      required: 'El municipio es requerido'
    },
    ciudadInput: {
      required: 'La ciudad es requerida',
      minlength: 'Mínimo 2 caracteres',
      maxlength: 'Máximo 50 caracteres'
    },
    direccion: {
      required: 'La dirección es requerida',
      minlength: 'Mínimo 5 caracteres',
      maxlength: 'Máximo 150 caracteres',
      addressInvalid: 'La dirección contiene caracteres no permitidos'
    },
    celular: {
      required: 'El celular es requerido',
      minlength: 'Mínimo 7 dígitos',
      maxlength: 'Máximo 15 dígitos',
      phoneInvalid: 'El celular debe contener solo dígitos y guiones opcionales'
    },
    correo: {
      required: 'El correo es requerido',
      email: 'Ingrese un correo válido'
    },
    jefeInmediato: {
      required: 'El nombre del jefe inmediato es requerido',
      minlength: 'Mínimo 3 caracteres',
      maxlength: 'Máximo 100 caracteres',
      nameInvalid: 'El nombre solo debe contener letras y espacios, sin números'
    },
    vigente: {
      required: 'Debe indicar si la experiencia es vigente'
    },
    motivoRetiro: {
      required: 'El motivo del retiro es requerido',
      minlength: 'Mínimo 10 caracteres',
      maxlength: 'Máximo 500 caracteres'
    }
  } as const;

  get esColombia(): boolean {
    const paisId = this.form.get('pais')?.value;
    if (!paisId) return false;

    const pais = this._ubicacionesCache.find((u) => u.id === paisId);
    return pais?.nombre?.toLowerCase().includes('colombia') || false;
  }
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private infoLaboralService: InfoLaboralService,
    private personasService: PersonasService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private listasValoresService: ListasValoresService,
    private ubicacionesGeograficasService: UbicacionesGeograficasService,
    private fileAttachmentService: FileAttachmentService,
    private cdr: ChangeDetectorRef,
    private hojaVidaStatusService: HojaVidaStatusService
  ) {
    this.form = this.fb.group({
      tipo_experiencia: [null, [CustomValidators.requiredWithTouched]],
      nombreEmpresa: [
        '',
        [
          CustomValidators.requiredWithTouched,
          Validators.minLength(2),
          Validators.maxLength(65),
          CustomValidators.namePattern,
        ],
      ],
      cargoDesempenado: [
        '',
        [
          CustomValidators.requiredWithTouched,
          Validators.minLength(2),
          Validators.maxLength(65),
          CustomValidators.namePattern,
        ],
      ],
      fechaInicio: [null, [CustomValidators.requiredWithTouched, CustomValidators.noFutureDateValidator]],
      fechaFin: [null, []], 
      pais: [null, [CustomValidators.requiredWithTouched]],
      departamento: [{ value: null, disabled: true }, [CustomValidators.requiredWithTouched]],
      municipio: [{ value: null, disabled: true }, [CustomValidators.requiredWithTouched]],
      ciudadInput: [''], 
      direccion: [
        '',
        [
          CustomValidators.requiredWithTouched,
          Validators.minLength(5),
          CustomValidators.addressPattern,
        ],
      ],
      celular: [
        '',
        [
          CustomValidators.requiredWithTouched, 
          Validators.minLength(7),
          Validators.maxLength(15),
          CustomValidators.phonePattern,
          Validators.min(0)
        ],
      ],
      correo: [
        '',
        [CustomValidators.requiredWithTouched, CustomValidators.emailPattern],
      ],
      jefeInmediato: [
        '',
        [
          CustomValidators.requiredWithTouched,
          Validators.minLength(2),
          Validators.maxLength(65),
          CustomValidators.namePattern,
        ],
      ],
      vigente: [null, [CustomValidators.requiredWithTouched]],
      motivoRetiro: [''],
      persona: [null],
    }, { validators: fechaInicioFinValidator });
  }

  ngOnInit() {
    this.cargarDatos().then(() => {
      this.obtenerPersonaId().then(() => {
        this.cargarRegistros();
        this.cargarEstadoDeclaracion();
      });
    });

    this.form
      .get('pais')
      ?.valueChanges.subscribe((paisId: string | null) => {
        if (paisId) {
          this.cargarDepartamentosPorPais(paisId);

          const departamentoControl = this.form.get('departamento');
          const municipioControl = this.form.get('municipio');
          const ciudadControl = this.form.get('ciudadInput');

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
          this.form.get('departamento')?.setValue(null);
          this.form.get('municipio')?.setValue(null);
          this.form.get('ciudadInput')?.setValue('');
        }
      });

    this.form
      .get('departamento')
      ?.valueChanges.subscribe((departamentoId) => {
        if (departamentoId) {
          this.cargarMunicipiosPorDepartamento(departamentoId);
        } else {
          this.municipios = [];
          this.form.get('municipio')?.setValue(null);
        }
      });

    this.form.get('vigente')?.valueChanges.subscribe(vigente => {
      const motivoRetiroControl = this.form.get('motivoRetiro');
      const fechaFinControl = this.form.get('fechaFin');

      if (vigente === false) {
        fechaFinControl?.setValidators([
          CustomValidators.requiredWithTouched,
          CustomValidators.noFutureDateValidator
        ]);
        fechaFinControl?.enable();
        
        motivoRetiroControl?.setValidators([CustomValidators.requiredWithTouched]);
      } else if (vigente === true) {
        motivoRetiroControl?.clearValidators();
        motivoRetiroControl?.setValue('');
        fechaFinControl?.clearValidators();
        fechaFinControl?.setValue(null);
        fechaFinControl?.disable();
      }
      if (vigente !== null) {
        motivoRetiroControl?.updateValueAndValidity({ onlySelf: false, emitEvent: true });
        fechaFinControl?.updateValueAndValidity({ onlySelf: false, emitEvent: true });
      }
    });

    this.form.get('pais')?.valueChanges.subscribe(paisId => {
      const departamentoControl = this.form.get('departamento');
      const municipioControl = this.form.get('municipio');
      
      if (paisId) {
        departamentoControl?.enable();
      } else {
        departamentoControl?.setValue(null);
        departamentoControl?.disable();
        municipioControl?.setValue(null);
        municipioControl?.disable();
      }
    });

    this.form.get('departamento')?.valueChanges.subscribe(departamentoId => {
      const municipioControl = this.form.get('municipio');
      
      if (departamentoId) {
        municipioControl?.enable();
      } else {
        municipioControl?.setValue(null);
        municipioControl?.disable();
      }
    });
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private cargarDatos(): Promise<void> {
    this.isLoadingDropdowns = true;

    return new Promise((resolve, reject) => {
      forkJoin({
          tiposExperiencia: this.listasValoresService
          .getDropdownByTipo('EXP')
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
        motivosRetiro: this.listasValoresService
          .getDropdownByTipo('MOVR')
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
            ),
          ),
        ubicaciones: this.ubicacionesGeograficasService
          .getAllForDropdown()
          .pipe(map((response: UbicacionesGeograficasDto[]) => response)),
      }).subscribe({
        next: (data) => {
          this._ubicacionesCache = Array.isArray(data.ubicaciones) ? data.ubicaciones : [];
          this.tiposExperiencia = data.tiposExperiencia;
          this.motivosRetiro = data.motivosRetiro;
          
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
      this.form.get('departamento')?.setValue(null);
      this.form.get('municipio')?.setValue(null);
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

      this.form.get('municipio')?.setValue(null);
      this.isLoadingMunicipios = false;
      resolve();
    });
  }

  onFilesSelected(event: any): void {
    const files: File[] = event && event.length ? event : (event?.files || []);
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.fileError = null;
    } else {
      this.selectedFile = undefined;
    }
  }

  onFilesUploaded(event: any): void {
    const files = event && event.length ? event : (event?.files || []);
    if (files && files.length > 0) {
      this.uploadedFileId = typeof files[0] === 'string' ? files[0] : files[0].id;
      this.fileError = null;
      }
  }

  onValidationComplete(result: PdfValidationResult): void {
    if (result.isValid) {
      this.messageService.add({
        severity: 'success',
        summary: 'Documento Válido',
        detail: `Documento laboral validado y subido correctamente (${Math.round(result.confidence * 100)}% confianza).`
      });
      } else {
      const errorDetail = result.message || 'El documento no cumple con los criterios de validación para documentos laborales.';
      this.fileError = errorDetail;
      
      this.messageService.add({
        severity: 'error',
        summary: 'Documento No Válido',
        detail: errorDetail + ' Por favor, suba un documento laboral válido (certificado, carta laboral, etc.).'
      });
    }
  }

  onFileDeleted(event: any): void {
    const fileId: string = typeof event === 'string' ? event : event?.fileId;
    if (this.uploadedFileId === fileId) {
      this.uploadedFileId = null;
      this.selectedFile = undefined;
    }
    
    this.existingFiles = this.existingFiles.filter(file => file.id !== fileId);
    
    if (this.existingFiles.length === 0) {
      this.existingFiles = [];
    }
    
    if (this.fileAttachment?.fileInput) {
      this.fileAttachment.fileInput.nativeElement.value = '';
    }
    
    this.cdr.detectChanges();
    
    }
    
  onFileMarkedForDeletion(fileId: string): void {
    if (!this.archivoOriginalId) {
      this.archivoOriginalId = fileId;
    }
    
    this.archivoPendienteEliminacion = true;
    
    if (this.uploadedFileId === fileId) {
      this.uploadedFileId = null;
      this.selectedFile = undefined;
    }
    
    this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Archivo marcado para eliminación',
      detail: 'El archivo se eliminará al guardar el registro con un archivo de reemplazo'
    });
    
    this.cdr.markForCheck();
  }

  onFileAttachmentUploadError(event: any): void {
    const error: string = typeof event === 'string' ? event : event?.error || 'Error al subir archivo';
    this.fileError = error;
    this.uploadedFileId = null;
  }

  onFilePreview(event: any): void {
    const file: FileInfoS = event && event.id ? event : null;
    if (file && file.id) {
      this.previewArchivo(file.id);
    }
  }

  getUsuarioId(): string {
    return this.personaId || '';
  }

  showDialog() {
    this.resetearFormulario(); 
    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: undefined
    };
    
    this.visible = true;
  }

  private async obtenerPersonaId(): Promise<void> {
    try {
      const persona = await this.personasService.getPersonaActual().toPromise();
      this.personaId = persona?.id || null;
      if (!this.personaId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'Debe completar su información personal primero'
        });
      } else {
        this.form.patchValue({ persona: this.personaId });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario'
      });
    }
  }

  public isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  public getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control?.errors || !(control.touched || control.dirty)) return '';

    const errors = control.errors;
    const fieldMessages = (this.errorMessages as any)[fieldName] || {};

    for (const errorKey of Object.keys(errors)) {
      const errorValue = errors[errorKey];

      if ((errorKey === 'maxlength' || errorKey === 'minlength') && errorValue?.requiredLength) {
        const msg = fieldMessages[errorKey];
        return msg || `${errorKey === 'maxlength' ? 'Máximo' : 'Mínimo'} ${errorValue.requiredLength} caracteres`;
      }

      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['phoneInvalid']) return 'El teléfono debe contener solo dígitos y guiones opcionales';
    if (errors['nameInvalid']) return 'El nombre debe contener solo letras y espacios';
    if (errors['addressInvalid']) return 'La dirección contiene caracteres no permitidos';
    if (errors['email']) return 'Ingrese un correo válido';
    if (errors['required']) return 'Este campo es requerido';

    return 'Campo inválido';
  }

  isFormInvalidForSubmit(): boolean {
    const requiredFields = [
      'tipo_experiencia', 'nombreEmpresa', 'cargoDesempenado', 'fechaInicio',
      'pais', 'direccion', 'celular', 'correo', 'jefeInmediato', 'vigente'
    ];
    
    for (const field of requiredFields) {
      const control = this.form.get(field);
      if (!control || control.invalid) {
        return true;
      }
    }
    
    const vigente = this.form.get('vigente')?.value;
    
    if (vigente === false) {
      const fechaFinControl = this.form.get('fechaFin');
      if (!fechaFinControl?.value) {
        return true;
      }
    }
    
    if (this.esColombia) {
      const departamento = this.form.get('departamento')?.value;
      const municipio = this.form.get('municipio')?.value;
      if (!departamento || !municipio) {
        return true;
      }
    } else {
      const ciudadInput = this.form.get('ciudadInput')?.value;
      if (!ciudadInput || ciudadInput.trim() === '') {
        return true;
      }
    }
    
    if (this.form.errors) {
      return true;
    }

    if (this.isEditando) {
      const hasChanges = this._hasFormChangesInternal();
      if (!hasChanges) {
        return true;
      }
    }
    
    return false;
  }

  hasFormChanges(): boolean {
    return this._hasFormChangesInternal();
  }

  private _hasFormChangesInternal(): boolean {
    const currentValues = this.form.getRawValue();

    const fieldsToCompare = [
      'tipo_experiencia',
      'nombreEmpresa',
      'cargoDesempenado',
      'fechaInicio',
      'fechaFin',
      'pais',
      'departamento',
      'municipio',
      'ciudadInput',
      'direccion',
      'celular',
      'correo',
      'jefeInmediato',
      'vigente',
      'motivoRetiro'
    ];

    for (const field of fieldsToCompare) {
      const originalValue = this._originalFormValues[field];
      const currentValue = currentValues[field];

      if (field === 'fechaInicio' || field === 'fechaFin') {
        const originalDate = originalValue ? new Date(originalValue).toISOString().split('T')[0] : null;
        const currentDate = currentValue ? (currentValue instanceof Date ? currentValue.toISOString().split('T')[0] : new Date(currentValue).toISOString().split('T')[0]) : null;
        
        if (originalDate !== currentDate) {
          return true;
        }
      } else if (originalValue !== currentValue) {
        return true;
      }
    }

    const hasNewFile = !!this.uploadedFileId && 
      (!this.existingFiles.length || 
       !this.existingFiles.some(f => f.id === this.uploadedFileId));

    return hasNewFile;
  }

  private saveFormSnapshot(): void {
    const currentValues = this.form.getRawValue();
    this._originalFormValues = { ...currentValues };
  }


  private markAllAsTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup) {
        this.markAllAsTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  cargarRegistros() {
    if (!this.personaId) {
      return;
    }

    this.infoLaboralService.getAll(this.personaId).subscribe({
      next: (data: any[]) => {
        this.registros = data.map(registro => this.prepareTableRow(registro));
        this.registros.forEach((registro, index) => {
          });

        // Si tiene registros reales, la declaración ya no aplica; si no tiene,
        // el estado de sección depende de si declaró sin experiencia.
        const effectiveCount = this.registros.length > 0
          ? this.registros.length
          : (this.sinExperienciaLaboral ? 1 : 0);
        this.hojaVidaStatusService.updateSectionByRecordCount(
          'informacion-laboral',
          effectiveCount
        );
      },
      error: (err: any) => {
        this.hojaVidaStatusService.updateSectionByRecordCount('informacion-laboral', 0);
      },
    });
  }

  private prepareTableRow(registro: InfoLaboral): any {
    return {
      ...registro,
      ubicacion: `${registro.ciudad}, ${registro.pais}`,
      tipo_experiencia_label: this.getTipoExperienciaLabel(registro.tipo_experiencia)
    };
  }

  private obtenerDatosUbicacion(formValue: any) {
    if (this.esColombia && formValue.municipio) {
      const municipioNombre = this.getMunicipioNombre(formValue.municipio);
      return { ciudad: municipioNombre };
    } else if (!this.esColombia && formValue.ciudadInput) {
      return { ciudad: formValue.ciudadInput };
    }
    return { ciudad: '' };
  }

  private getMunicipioNombre(municipioId?: string | null): string {
    if (!municipioId) {
      return '';
    }
    const entry = this._ubicacionesCache.find((u) => u.id === municipioId);
    return entry?.nombre || '';
  }

  async guardarRegistro(): Promise<void> {
    if (this.isLoading || this.isSubmitting) {
      return;
    }
    
    this.form.get('motivoRetiro')?.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.markAllAsTouched(this.form);
    
    const vigente = this.form.get('vigente')?.value;
    const motivoRetiroControl = this.form.get('motivoRetiro');
    const motivoRetiro = motivoRetiroControl?.value;
    
    if (vigente === false && (!motivoRetiro || motivoRetiro.trim() === '')) {
      motivoRetiroControl?.setValidators([
        Validators.required
      ]);
      motivoRetiroControl?.markAsTouched();
      motivoRetiroControl?.updateValueAndValidity();
      
      this.scrollYEnfocarCampo('motivoRetiro');
      this.messageService.add({
        severity: 'warn',
        summary: 'Campo requerido',
        detail: 'El motivo de retiro es requerido para trabajos no vigentes',
        life: 5000
      });
      
      return;
    }
    
    if (this.form.invalid) {
      const vigenteControl = this.form.get('vigente');
      if (vigenteControl && !vigenteControl.touched) {
        vigenteControl.markAsTouched();
      }
      
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
      return;
    }

    if (!this.uploadedFileId) {
      this.fileError = 'Por favor, seleccione un archivo de soporte.';
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.isLoading = true;
    this.cdr.detectChanges(); 

    if (!this.personaId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la persona. Inicie sesión nuevamente.',
      });
      return;
    }

    const formValue = this.form.getRawValue();

    const ubicacion = this.obtenerDatosUbicacion(formValue);

    let fechaInicio = formValue.fechaInicio;
    let fechaFin = formValue.fechaFin;

    if (fechaInicio instanceof Date) {
      fechaInicio = fechaInicio.toISOString();
    }

    if (fechaFin instanceof Date) {
      fechaFin = fechaFin.toISOString();
    } else if (formValue.vigente) {
      fechaFin = null;
    }

    let pais = '';
    if (this.esColombia && formValue.pais) {
      const paisEntry = this._ubicacionesCache.find((u) => u.id === formValue.pais);
      pais = paisEntry?.nombre || 'Colombia';
    } else if (!this.esColombia && formValue.pais) {
      const paisEntry = this._ubicacionesCache.find((u) => u.id === formValue.pais);
      pais = paisEntry?.nombre || formValue.pais;
    }

    const tipoExperienciaNombre = this.getTipoExperienciaLabel(formValue.tipo_experiencia);
    const motivoRetiroNombre = formValue.vigente ? null : this.getMotivoRetiroLabel(formValue.motivoRetiro);
    
    const datosParaEnviar: Partial<InfoLaboral> = {
      tipo_experiencia: tipoExperienciaNombre, 
      nombreEmpresa: formValue.nombreEmpresa,
      cargoDesempenado: formValue.cargoDesempenado,
      fechaInicio,
      fechaFin,
      pais: pais,
      ciudad: ubicacion.ciudad,
      direccion: formValue.direccion,
      celular: formValue.celular,
      correo: formValue.correo,
      jefeInmediato: formValue.jefeInmediato,
      vigente: formValue.vigente,
      motivoRetiro: motivoRetiroNombre,
      persona: this.personaId || formValue.persona,
    };

    try {
      let response;
      if (this.isEditando && this.registroEditandoId) {
        datosParaEnviar.id = this.registroEditandoId;

        response = await this.infoLaboralService.update(datosParaEnviar as InfoLaboral).toPromise();
        
        if (response && this.uploadedFileId && response.id) {
          try {
            await this.http.put(
              `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/${this.uploadedFileId}/info_laboral/${response.id}`,
              {}
            ).toPromise();
            
            if (this.isEditando && this.fileAttachment) {
              try {
                await this.fileAttachment.confirmDeferredDeletions();
                ('✅ Eliminaciones diferidas confirmadas');
              } catch (deleteError) {
              }
            }
          } catch (error) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'Registro guardado pero hubo un problema asociando el archivo',
            });
          }
        }
      } else {
        response = await this.infoLaboralService.create(datosParaEnviar as InfoLaboral).toPromise();
        
        if (response && this.uploadedFileId && response.id) {
          try {
            await this.http.put(
              `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/${this.uploadedFileId}/info_laboral/${response.id}`,
              {}
            ).toPromise();
            
            } catch (error) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'Registro guardado pero hubo un problema asociando el archivo',
            });
          }
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: this.isEditando ? 'Información laboral actualizada correctamente' : 'Información laboral creada correctamente'
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      this.cargarRegistros();
      // Si se guardó un registro real, el backend ya revirtió la declaración
      this.cargarEstadoDeclaracion();
      this.cancelarEdicion();
      this.visible = false;
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la información laboral. Verifique los datos e intente nuevamente.'
      });
    } finally {
      this.isLoading = false;
      this.isSubmitting = false;
      this.cdr.detectChanges(); 
    }
  }

  editarRegistro(registro: InfoLaboral) {
    this.isEditando = true;
    this.registroEditandoId = registro.id || null;

    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: registro.id || undefined
    };

    if (registro.archivos && registro.archivos.length > 0) {
      this._hadFilesOnOpen = true;
      this.uploadedFileId = registro.archivos[0].id;
      this.archivoOriginalId = registro.archivos[0].id;
      this.archivoPendienteEliminacion = false;
      
      this.existingFiles = registro.archivos.map(archivo => ({
        id: archivo.id,
        name: archivo.nombre,
        size: 0, 
        type: 'application/octet-stream', 
        uploadDate: new Date(), 
        url: this.fileAttachmentService.getDownloadUrl(archivo.id)
      }));
      
      } else {
      this._hadFilesOnOpen = false;
      this.uploadedFileId = null;
      this.existingFiles = [];
      this.archivoOriginalId = null;
      this.archivoPendienteEliminacion = false;
    }

    this.fileError = null;
    this.selectedFile = undefined;

    let fechaInicio = null;
    let fechaFin = null;

    if (registro.fechaInicio) {
      const fechaInicioStr =
        typeof registro.fechaInicio === 'string'
          ? registro.fechaInicio
          : registro.fechaInicio.toString();
      fechaInicio = fechaInicioStr.includes('T')
        ? new Date(fechaInicioStr)
        : new Date(fechaInicioStr + 'T12:00:00');
    }

    if (registro.fechaFin && !registro.vigente) {
      const fechaFinStr =
        typeof registro.fechaFin === 'string'
          ? registro.fechaFin
          : registro.fechaFin.toString();
      const fechaFinDate = fechaFinStr.includes('T')
        ? new Date(fechaFinStr)
        : new Date(fechaFinStr + 'T12:00:00');

      if (fechaFinDate.getFullYear() < 2099) {
        fechaFin = fechaFinDate;
      }
    }

    let paisId: string | null = null;
    let departamentoId: string | null = null;
    let municipioId: string | null = null;
    let ciudadInput = '';

    if (registro.pais) {
      const paisEntry = this._ubicacionesCache.find(
        (u) =>
          u.nombre === registro.pais &&
          u.nombreTipo &&
          u.nombreTipo.toLowerCase().includes('país')
      );
      if (paisEntry) {
        paisId = paisEntry.id || null;
      }
    }

    if (registro.ciudad && paisId) {
      const municipioEntry = this._ubicacionesCache.find(
        (u) =>
          u.nombre === registro.ciudad &&
          u.nombreTipo &&
          (u.nombreTipo.toLowerCase().includes('ciudad') ||
            u.nombreTipo.toLowerCase().includes('municip'))
      );
      if (municipioEntry) {
        municipioId = municipioEntry.id || null;
        departamentoId = municipioEntry.idPadre || null;
      } else {
        const departamentoEntry = this._ubicacionesCache.find(
          (u) =>
            u.nombre === registro.ciudad &&
            u.nombreTipo &&
            u.nombreTipo.toLowerCase().includes('depart')
        );
        if (departamentoEntry) {
          departamentoId = departamentoEntry.id || null;
        } else {
          ciudadInput = registro.ciudad;
        }
      }
    }

    let tipoExperienciaId = registro.tipo_experiencia;
    let motivoRetiroId = registro.motivoRetiro;
    
    if (this.isUUID(registro.tipo_experiencia)) {
      tipoExperienciaId = this.tiposExperiencia.length > 0 ? this.tiposExperiencia[0].id : '';
    } else {
      const tipoEncontrado = this.tiposExperiencia.find(t => t.nombre === registro.tipo_experiencia || t.label === registro.tipo_experiencia);
      tipoExperienciaId = tipoEncontrado ? tipoEncontrado.id : '';
    }

    if (motivoRetiroId && typeof motivoRetiroId === 'string') {
      const motivoEncontrado = this.motivosRetiro.find(m => m.nombre === motivoRetiroId || m.label === motivoRetiroId);
      motivoRetiroId = motivoEncontrado ? motivoEncontrado.id : motivoRetiroId;
    }

    this.form.patchValue({
      tipo_experiencia: tipoExperienciaId, 
      nombreEmpresa: registro.nombreEmpresa,
      cargoDesempenado: registro.cargoDesempenado,
      fechaInicio: registro.fechaInicio ? fechaInicio : null,
      fechaFin: fechaFin,
      pais: paisId,
      direccion: registro.direccion,
      celular: registro.celular,
      correo: registro.correo,
      jefeInmediato: registro.jefeInmediato,
      vigente: registro.vigente,
      motivoRetiro: motivoRetiroId,
      persona: registro.persona || this.personaId,
      ciudadInput: ciudadInput,
      departamento: null,
      municipio: null
    });

    if (paisId) {
      this.cargarDepartamentosPorPais(paisId).then(() => {
        this.form.get('departamento')?.enable(); 
        if (departamentoId) {
          this.form.patchValue({ departamento: departamentoId });
          this.cargarMunicipiosPorDepartamento(departamentoId).then(() => {
            this.form.get('municipio')?.enable(); 
            if (municipioId) {
              this.form.patchValue({ municipio: municipioId });
            }
            this.saveFormSnapshot();
          });
        } else {
          this.saveFormSnapshot();
        }
      });
    } else {
      this.saveFormSnapshot();
    }
    this.visible = true;
    }

  eliminarRegistro(id?: string) {
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'ID no proporcionado para eliminar'
      });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar esta experiencia laboral?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        const registro = this.registros.find(r => r.id === id);
        const archivosIds: string[] = registro?.archivos?.map(a => a.id) ?? [];

        this.infoLaboralService.delete(id).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => {
            if (archivosIds && archivosIds.length > 0) {
              const deletePromises = archivosIds.map(archivoId =>
                this.fileAttachmentService.deleteUploadedFile(archivoId).toPromise()
              );

              Promise.allSettled(deletePromises).then(results => {
                const fallosArchivos = results.filter(r => r.status === 'rejected').length;
                if (fallosArchivos > 0) {
                  }
              });
            }

            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Experiencia laboral y archivos eliminados correctamente'
            });

            this.cargarRegistros();
            this.cargarEstadoDeclaracion();
            if (this.isEditando && this.registroEditandoId === id) {
              this.cancelarEdicion();
            }
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la experiencia laboral'
            });
          }
        });
      }
    });
  }

  async cancelarEdicion() {
    if (this.isEditando && this.registroEditandoId && this.archivoPendienteEliminacion) {
      try {
        if (this.fileAttachment) {
          await this.fileAttachment.cancelMarkedDeletions();
          }
      } catch (error) {
      }
    }

    if (this.isEditando && !this.hasFileAttached()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede cancelar',
        detail: 'Debe cargar un archivo antes de cerrar. El registro no puede quedar sin soporte.'
      });
      return;
    }

    this.isEditando = false;
    this.registroEditandoId = null;
    this.visible = false;
    
    this.isLoading = false;
    this.isSubmitting = false;
    
    this._originalFormValues = {};
    
    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: undefined
    };
    
    this.existingFiles = [];
    this.uploadedFileId = null;
    this.fileError = null;
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
  }

  cerrarDialogo(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isEditando && !this.hasFileAttached()) {
      return;
    }

    this.visible = false;
    this.onDialogHide();
  }

  async onDialogHide() {
    const puedeSerrarSinArchivos = !this._hadFilesOnOpen;
    const tieneArchivos = this.hasFileAttached();
    
   
    
    if (this.isEditando && !tieneArchivos && !puedeSerrarSinArchivos) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede cerrar',
        detail: 'Debe cargar un archivo antes de cerrar. El registro requiere al menos un archivo de soporte.'
      });
      setTimeout(() => {
        this.visible = true;
        this.cdr.markForCheck();
      }, 100);
      return; 
    }
    
    if (this.isEditando && this.fileAttachment) {
      try {
        this.fileAttachment.cancelDeferredDeletions();
      } catch (error) {
      }
    }

    if (!this.isLoading) {
      this.isEditando = false;
      this.registroEditandoId = null;
      this.resetearFormulario();
      
      this.archivoOriginalId = null;
      this.archivoPendienteEliminacion = false;
      this._hadFilesOnOpen = false; 
    }
    this.isSubmitting = false;
  }

  hasFileAttached(): boolean {
    return !!(this.uploadedFileId || (this.existingFiles && this.existingFiles.length > 0));
  }

  isEditingWithoutFile(): boolean {
    return this.isEditando && !this.hasFileAttached();
  }

  private resetearFormulario() {
    this.form.reset();
    this.form.patchValue({ persona: this.personaId });
    
    this.isLoading = false;
    this.isSubmitting = false;
    
    const fechaFinControl = this.form.get('fechaFin');
    fechaFinControl?.clearValidators();
    fechaFinControl?.updateValueAndValidity();
    
    this.departamentos = []; 
    this.municipios = []; 
    this.selectedFile = undefined;
    this.fileError = null;
    this.uploadedFileId = null;
    this.existingFiles = [];
  }

  private mostrarErroresFormulario() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        }
    });
  }

  previewArchivo(id: string): void {
    const downloadUrl = this.fileAttachmentService.getDownloadUrl(id);
    
    this.http.get(downloadUrl, { responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const objectUrl = URL.createObjectURL(blob);
          
          const newWindow = window.open(objectUrl, '_blank');
          
          if (newWindow) {
            newWindow.addEventListener('load', () => {
              setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            });
          } else {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          }
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo abrir el archivo'
          });
        }
      });
  }

  getTipoExperienciaLabel(value: string): string {
    const par = this.tiposExperiencia.find(
      (p) => p.id === value || p.value === value
    );
    return par ? par.nombre || par.label : value;
  }

  getMotivoRetiroLabel(value: string): string {
    if (!value) return '';
    
    const motivo = this.motivosRetiro.find(
      (m) => m.id === value || m.value === value
    );
    return motivo ? motivo.nombre || motivo.label : value;
  }

  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private encontrarPrimerCampoInvalido(): string | null {
    const camposOrdenados = [
      'empresa',
      'pais',
      'departamento',
      'municipio',
      'tipoEmpresa',
      'cargo',
      'vigente',
      'fechaInicio',
      'fechaFin',
      'motivoRetiro'
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
      empresa: 'Empresa',
      pais: 'País',
      departamento: 'Departamento',
      municipio: 'Municipio',
      tipoEmpresa: 'Tipo de empresa',
      cargo: 'Cargo',
      vigente: '¿Trabajo vigente?',
      fechaInicio: 'Fecha de inicio',
      fechaFin: 'Fecha de fin',
      motivoRetiro: 'Motivo de retiro'
    };
    return etiquetas[nombreCampo] || nombreCampo;
  }

  // ── Declaración sin experiencia laboral ──────────────────────────────────

  cargarEstadoDeclaracion(): void {
    if (!this.personaId) return;

    this.infoLaboralService.getSinExperienciaLaboral(this.personaId).subscribe({
      next: (resp: SinExperienciaLaboralResponse) => {
        this.sinExperienciaLaboral = resp.sinExperienciaLaboral;
        this.fechaDeclaracionSinExperienciaLaboral = resp.fechaDeclaracionSinExperienciaLaboral;
        // Actualizar sección si no hay registros reales y está declarada
        if (this.registros.length === 0) {
          this.hojaVidaStatusService.updateSectionByRecordCount(
            'informacion-laboral',
            this.sinExperienciaLaboral ? 1 : 0
          );
        }
      },
      error: () => {
        // Si falla, mantener estado por defecto (no bloquear la UI)
      }
    });
  }

  toggleSinExperiencia(valor: boolean): void {
    if (!this.personaId || this.isTogglingDeclaracion) return;

    this.isTogglingDeclaracion = true;
    this.infoLaboralService.actualizarSinExperienciaLaboral(this.personaId, valor).subscribe({
      next: (resp: SinExperienciaLaboralResponse) => {
        this.sinExperienciaLaboral = resp.sinExperienciaLaboral;
        this.fechaDeclaracionSinExperienciaLaboral = resp.fechaDeclaracionSinExperienciaLaboral;
        this.isTogglingDeclaracion = false;

        if (valor) {
          this.messageService.add({
            severity: 'success',
            summary: 'Declaración registrada',
            detail: 'Se registró que no cuenta con experiencia laboral. La sección queda marcada como completa.',
            life: 5000
          });
          this.hojaVidaStatusService.updateSectionByRecordCount('informacion-laboral', 1);
        } else {
          this.messageService.add({
            severity: 'info',
            summary: 'Declaración revocada',
            detail: 'Puede ahora agregar sus experiencias laborales.',
            life: 4000
          });
          this.hojaVidaStatusService.updateSectionByRecordCount('informacion-laboral', 0);
        }
      },
      error: (err: any) => {
        this.isTogglingDeclaracion = false;
        const detail = err?.error?.detail || err?.error?.message ||
          (valor
            ? 'No se puede declarar sin experiencia cuando ya existen registros laborales.'
            : 'No se pudo actualizar la declaración. Intente nuevamente.');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
          life: 6000
        });
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

}

export const fechaInicioFinValidator: ValidatorFn = (control: AbstractControl) => {
  const fechaInicioControl = control.get('fechaInicio');
  const fechaFinControl = control.get('fechaFin');
  const vigenteControl = control.get('vigente');
  
  const fechaInicio = fechaInicioControl?.value;
  const fechaFin = fechaFinControl?.value;
  const vigente = vigenteControl?.value;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const errors: any = {};

  const getFechaAsDate = (fecha: any): Date | null => {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string') return new Date(fecha);
    return null;
  };

  const inicioDate = getFechaAsDate(fechaInicio);
  const finDate = getFechaAsDate(fechaFin);

  if (inicioDate) {
    const inicioLimpio = new Date(inicioDate);
    inicioLimpio.setHours(0, 0, 0, 0);
    
    if (inicioLimpio > hoy) {
      errors.fechaInicioFutura = true;
      fechaInicioControl?.setErrors({ ...fechaInicioControl.errors, fechaInicioFutura: true });
    } else if (fechaInicioControl?.errors?.['fechaInicioFutura']) {
      const otrosErrores = { ...fechaInicioControl.errors };
      delete otrosErrores['fechaInicioFutura'];
      fechaInicioControl?.setErrors(Object.keys(otrosErrores).length > 0 ? otrosErrores : null);
    }
  }

  if (!vigente && finDate) {
    const finLimpio = new Date(finDate);
    finLimpio.setHours(0, 0, 0, 0);
    
    if (finLimpio > hoy) {
      errors.fechaFinFutura = true;
      fechaFinControl?.setErrors({ ...fechaFinControl.errors, fechaFinFutura: true });
    } else if (fechaFinControl?.errors?.['fechaFinFutura']) {
      const otrosErrores = { ...fechaFinControl.errors };
      delete otrosErrores['fechaFinFutura'];
      fechaFinControl?.setErrors(Object.keys(otrosErrores).length > 0 ? otrosErrores : null);
    }

    if (inicioDate && finDate) {
      const inicioLimpio = new Date(inicioDate);
      const finLimpio = new Date(finDate);
      inicioLimpio.setHours(0, 0, 0, 0);
      finLimpio.setHours(0, 0, 0, 0);

      if (finLimpio < inicioLimpio) {
        errors.fechaFinAntesQueInicio = true;
        fechaFinControl?.setErrors({ ...fechaFinControl.errors, fechaFinAntesQueInicio: true });
      } else if (fechaFinControl?.errors?.['fechaFinAntesQueInicio']) {
        const otrosErrores = { ...fechaFinControl.errors };
        delete otrosErrores['fechaFinAntesQueInicio'];
        fechaFinControl?.setErrors(Object.keys(otrosErrores).length > 0 ? otrosErrores : null);
      }
    }
  }

  if (!vigente && inicioDate && finDate) {
    const inicioLimpio = new Date(inicioDate);
    const finLimpio = new Date(finDate);
    inicioLimpio.setHours(0, 0, 0, 0);
    finLimpio.setHours(0, 0, 0, 0);

    if (inicioLimpio > finLimpio) {
      errors.fechaInicioMayorQueFin = true;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
};
