import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, map } from 'rxjs';

import { Referencia } from '../../../../core/models/referencias-personales.model';
import { ReferenciaService } from '../../../../core/services/referencias-personales.service';
import { PersonasService } from '../../../../core/services/personas.service';
import { HojaVidaStatusService } from '../../../../core/services/hoja-vida-status.service';
import { ListasValoresService } from '@microfrontends/shared-services';
import { ListasValoresDto } from '@microfrontends/shared-models';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { InputComponent, SelectComponent, InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';

interface TipoReferencia {
  id: string;
  nombre: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-referencia',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    ConfirmDialogModule,
    InputComponent,
    SelectComponent,
    InfoTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './referencias-personales-component.html',
  styleUrls: ['./referencias-personales-component.scss']
})
export class ReferenciasPersonalesComponent implements OnInit {
  form!: FormGroup;
  tiposReferencia: TipoReferencia[] = [];
  referencias: Referencia[] = [];
  editingId: string | null = null;
  personaId: string | null = null;
  visible = false;
  isLoadingDropdowns = false;
  isLoading = false;
  isSubmitting = false;

  tableColumns: TableColumn[] = [
    { field: 'tipo_referencia_label', header: 'Tipo de Referencia', type: 'text' },
    { field: 'nombres', header: 'Nombres', type: 'text' },
    { field: 'apellidos', header: 'Apellidos', type: 'text' },
    { field: 'telefono', header: 'Teléfono', type: 'text' },
    { field: 'celular', header: 'Celular', type: 'text' },
    { field: 'direccion', header: 'Dirección', type: 'text' },
    { field: 'ocupacion', header: 'Ocupación', type: 'text' },
    { field: 'empresa', header: 'Empresa', type: 'text' },
    { field: 'cargo', header: 'Cargo', type: 'text' },
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-pencil',
      tooltip: 'Editar',
      severity: 'info',
      onClick: (row) => this.editarReferencia(row)
    },
    {
      icon: 'pi pi-trash',
      tooltip: 'Eliminar',
      severity: 'danger',
      onClick: (row) => this.eliminarReferencia(row.id!)
    }
  ];

  get tableData(): any[] {
    return this.referencias.map(referencia => ({
      ...referencia,
      tipo_referencia_label: this.getTipoReferenciaLabel(referencia.tipo_referencia)
    }));
  }

  readonly errorMessages = {
    tipo_referencia: {
      required: 'El tipo de referencia es obligatorio'
    },
    nombres: {
      required: 'El nombre es obligatorio',
      maxlength: 'Máximo 100 caracteres',
      invalidName: 'Solo se permiten letras y espacios'
    },
    apellidos: {
      required: 'El apellido es obligatorio',
      maxlength: 'Máximo 100 caracteres',
      invalidName: 'Solo se permiten letras y espacios'
    },
    telefono: {
      invalidPhone: 'El teléfono debe tener entre 7 y 10 dígitos'
    },
    celular: {
      required: 'El celular es obligatorio',
      invalidCellPhone: 'El celular debe tener exactamente 10 dígitos'
    },
    direccion: {
      required: 'La dirección es obligatoria',
      maxlength: 'Máximo 150 caracteres',
      pattern: 'Solo se permiten letras, números, espacios, guiones y símbolos # y .'
    },
    ocupacion: {
      required: 'La ocupación es obligatoria',
      maxlength: 'Máximo 100 caracteres',
      invalidName: 'Solo se permiten letras y espacios'
    },
    empresa: {
      required: 'La empresa es obligatoria',
      maxlength: 'Máximo 100 caracteres',
      pattern: 'Solo se permiten letras, números, espacios, puntos, guiones y ampersand (&)'
    },
    cargo: {
      required: 'El cargo es obligatorio',
      maxlength: 'Máximo 100 caracteres',
      invalidName: 'Solo se permiten letras y espacios'
    }
  } as const;

  constructor(
    private fb: FormBuilder,
    private referenciaService: ReferenciaService,
    private personasService: PersonasService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private listasValoresService: ListasValoresService,
    private hojaVidaStatusService: HojaVidaStatusService
  ) {}

  showDialog() {
    this.resetFormulario(); 
    this.visible = true;
  }

  ngOnInit(): void {
    this.inicializarFormulario(); 
    this.cargarDatos().then(() => {
      this.obtenerPersonaId().then(() => {
        this.cargarReferencias();
      });
    });
  }

  private cargarDatos(): Promise<void> {
    this.isLoadingDropdowns = true;

    return new Promise((resolve, reject) => {
      forkJoin({
        tiposReferencia: this.listasValoresService
          .getDropdownByTipo('REF')
          .pipe(
            map((response: ListasValoresDto[]) => {
              let filtered = response
                .filter(
                  (item) =>
                    'idPadre' in item &&
                    (item as { idPadre: string | null }).idPadre !== null
                );
              
              if (filtered.length === 0) {
                filtered = response
                  .filter(
                    (item) =>
                      !('idPadre' in item) ||
                      (item as { idPadre: string | null }).idPadre === null
                  );
              }
              
              if (filtered.length === 0) {
                filtered = response;
              }
              
              const result = filtered.map((item) => ({
                id: item.id,
                nombre: item.nombre,
                label: item.nombre,
                value: item.id,
              }));
              
              return result;
            })
          )
      }).subscribe({
        next: (data) => {
          this.tiposReferencia = data.tiposReferencia;
          this.isLoadingDropdowns = false;
          resolve();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error cargando tipos de referencia'
          });
          this.isLoadingDropdowns = false;
          reject(error);
        }
      });
    });
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
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario'
      });
    }
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      id: [''],
      tipo_referencia: [null, [Validators.required]],
      nombres: ['', [
        Validators.required,
        Validators.maxLength(100),
        CustomValidators.nameValidator()
      ]],
      apellidos: ['', [
        Validators.required,
        Validators.maxLength(100),
        CustomValidators.nameValidator()
      ]],
      telefono: ['', [
        CustomValidators.phoneNumber()
      ]],
      celular: ['', [
        Validators.required,
        CustomValidators.cellPhoneNumber()
      ]],
      direccion: ['', [
        Validators.required,
        Validators.maxLength(150),
        Validators.pattern(/^[A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s\-#.]+$/)
      ]],
      ocupacion: ['', [
        Validators.required,
        Validators.maxLength(100),
        CustomValidators.nameValidator()
      ]],
      empresa: ['', [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(/^[A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s.\-&]+$/)
      ]],
      cargo: ['', [
        Validators.required,
        Validators.maxLength(100),
        CustomValidators.nameValidator()
      ]],
    });
  }

    guardar(): void {
    if (this.isLoading || this.isSubmitting) {
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;
    
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const primerCampoInvalido = this.encontrarPrimerCampoInvalido();
      if (primerCampoInvalido) {
        this.scrollYEnfocarCampo(primerCampoInvalido);
        this.messageService.add({
          severity: 'warn',
          summary: 'Formulario incompleto',
          detail: `Por favor complete el campo: ${this.obtenerEtiquetaCampo(primerCampoInvalido)}`,
          life: 5000
        });
      }
      this.isLoading = false;
      this.isSubmitting = false;
      return;
    }

    const formData = this.form.value;
    
    const tipoReferenciaName = this.getTipoReferenciaLabel(formData.tipo_referencia);
    
    const payload: any = {
      ...(formData.id && { id: formData.id }),
      tipo_referencia: tipoReferenciaName, 
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      telefono: formData.telefono,
      celular: formData.celular,
      direccion: formData.direccion,
      ocupacion: formData.ocupacion,
      empresa: formData.empresa,
      cargo: formData.cargo,
      persona: this.personaId 
    };

    
    const request = this.editingId
      ? this.referenciaService.actualizarReferencia(payload)
      : this.referenciaService.guardarReferencia(payload);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editingId ? 'Referencia actualizada correctamente' : 'Referencia guardada correctamente'
        });
        this.resetFormulario();
        this.cargarReferencias();
        this.isLoading = false;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar/actualizar la referencia'
        });
        this.isLoading = false;
        this.isSubmitting = false;
      }
    });
    this.visible = false;
  }


  editarReferencia(ref: Referencia): void {
    this.editingId = ref.id!;
    
    let tipoReferenciaId = ref.tipo_referencia;
    
    if (this.isUUID(ref.tipo_referencia)) {
      tipoReferenciaId = this.tiposReferencia.length > 0 ? this.tiposReferencia[0].id : '';
    } else {
      const tipoEncontrado = this.tiposReferencia.find(t => t.nombre === ref.tipo_referencia || t.label === ref.tipo_referencia);
      tipoReferenciaId = tipoEncontrado ? tipoEncontrado.id : '';
    }
    
    this.form.patchValue({
      ...ref,
      tipo_referencia: tipoReferenciaId 
    });
    
    this.visible = true;
  }

  eliminarReferencia(id: string): void {
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'ID no proporcionado para eliminar'
      });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar esta referencia personal?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.referenciaService.eliminarReferencia(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Referencia personal eliminada correctamente'
            });
            this.cargarReferencias();
            if (this.editingId === id) {
              this.resetFormulario();
            }
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la referencia personal'
            });
          }
        });
      }
    });
  }

  cargarReferencias(): void {
    if (!this.personaId) {
      return;
    }
    this.referenciaService.obtenerReferenciasPorPersona(this.personaId).subscribe({
      next: (data) => {
        this.referencias = data || [];
        this.hojaVidaStatusService.updateSectionByRecordCount('referencias-personales', this.referencias.length);
      },
      error: (err) => {
        this.referencias = [];
        this.hojaVidaStatusService.updateSectionByRecordCount('referencias-personales', 0);
      }
    });
  }

  cancelarEdicion(): void {
    this.resetFormulario();
    this.visible = false;
  }

  private resetFormulario(): void {
    this.form.reset();
    this.editingId = null;
    this.isLoading = false;
    this.isSubmitting = false;
  }

  public isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  public getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control?.errors || !control.touched) return '';

    const errors = control.errors;
    
    const fieldMessages = (this.errorMessages as any)[fieldName] || {};

    for (const errorKey of Object.keys(errors)) {
      const errorValue = errors[errorKey];
      
      if (errorKey === 'maxlength' && errorValue && 'requiredLength' in errorValue) {
        const msg = fieldMessages['maxlength'];
        return msg || `Máximo ${(errorValue as any).requiredLength} caracteres`;
      }
      
      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['maxlength']) return `Máximo ${(errors['maxlength'] as any).requiredLength} caracteres`;
    if (errors['invalidPhone']) return 'El teléfono debe tener entre 7 y 10 dígitos';
    if (errors['invalidCellPhone']) return 'El celular debe tener exactamente 10 dígitos';
    if (errors['invalidName']) return 'Solo se permiten letras y espacios';
    if (errors['pattern']) return 'Formato no válido';

    return 'Campo inválido';
  }

  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  getTipoReferenciaLabel(value: string): string {
    if (!value) return '';
    
    const tipo = this.tiposReferencia.find(
      (t) => t.id === value || t.value === value
    );
    
    if (tipo) {
      return tipo.nombre || tipo.label || value;
    }
    
    const tipoByName = this.tiposReferencia.find(
      (t) => t.nombre === value || t.label === value
    );
    
    return tipoByName ? tipoByName.nombre || tipoByName.label : value;
  }

  private encontrarPrimerCampoInvalido(): string | null {
    const camposOrdenados = [
      'tipo_referencia',
      'nombres',
      'apellidos',
      'cargo',
      'empresa',
      'telefono',
      'correo'
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
      tipo_referencia: 'Tipo de referencia',
      nombres: 'Nombres',
      apellidos: 'Apellidos',
      cargo: 'Cargo',
      empresa: 'Empresa',
      telefono: 'Teléfono',
      correo: 'Correo electrónico'
    };
    return etiquetas[nombreCampo] || nombreCampo;
  }
}

export class CustomValidators {
  static email(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      return isValid ? null : { invalidEmail: { value: control.value } };
    };
  }

  static documentNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();
      const isValid = /^\d{7,15}$/.test(value);

      return isValid ? null : { invalidDocument: { value: control.value } };
    };
  }

  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();
      const isValid = /^\d{7,10}$/.test(value);

      return isValid ? null : { invalidPhone: { value: control.value } };
    };
  }

  static cellPhoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();
      const isValid = /^\d{10}$/.test(value);

      return isValid ? null : { invalidCellPhone: { value: control.value } };
    };
  }

  static nameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();
      const isValid = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/.test(value);

      return isValid ? null : { invalidName: { value: control.value } };
    };
  }
}