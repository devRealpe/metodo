import { Component, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { Destreza } from '../../../../core/models/destrezas.model';
import { DestrezaService } from '../../../../core/services/destrezas.service';
import { PersonasService } from '../../../../core/services/personas.service';
import { HojaVidaStatusService } from '../../../../core/services/hoja-vida-status.service';
import { ListasValoresService } from '../../../../core/services/listas-valores.service';
import { ListasValoresDto, DropdownItem } from '@microfrontends/shared-models';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Dialog } from "primeng/dialog";
import { MessageModule } from 'primeng/message';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { InputComponent, MultiselectComponent, SelectComponent, InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-destrezas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MultiselectComponent,
    SelectComponent,
    CardModule,
    TableModule,
    InputComponent,
    ButtonModule,
    ToastModule,
    TooltipModule,
    Dialog,
    MessageModule,
    FloatLabelModule,
    ConfirmDialogModule,
    InfoTableComponent,
],
  providers: [MessageService, ConfirmationService],
  templateUrl: './competencias-usuario-component.html',
  styleUrls: ['./competencias-usuario-component.scss'],
})
export class CompetenciasComponent implements OnInit {
  @ViewChild('multiselectRef') multiselectRef: any;

  competencias: DropdownItem[] = [];
  opcionesDestrezas: any[] = [];
  opcionesDestrezasConOtro: any[] = [];
  destrezas: Destreza[] = [];   
    visible: boolean = false;
  activo: boolean = true;
  isEditOtro: boolean = false;

  form!: FormGroup;
  editingId: string | null = null;
  personaId: string | null = null;
  isLoading: boolean = false;
  isSubmitting: boolean = false;

  tableColumns: TableColumn[] = [
    { field: 'nombre', header: 'Nombre de la Competencia', type: 'text' },
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-pencil',
      tooltip: 'Editar',
      severity: 'info',
      onClick: (row) => this.editarDestreza(row)
    },
    {
      icon: 'pi pi-trash',
      tooltip: 'Eliminar',
      severity: 'danger',
      onClick: (row) => this.eliminarDestreza(row.id!)
    }
  ];

  get tableData(): any[] {
    return this.destrezas;
  }

  readonly errorMessages = {
    destreza: {
      required: 'Debe seleccionar una competencia',
      maxSelection: 'Máximo 5 competencias permitidas'
    },
    otraDestreza: {
      required: 'Debe especificar la otra competencia',
      minlength: 'Mínimo 4 caracteres requeridos',
      maxlength: 'Máximo 20 caracteres permitidos',
      pattern: 'Solo se permiten letras y espacios (sin números)'
    }
  } as const;


  constructor(
    private fb: FormBuilder,
    private destrezaService: DestrezaService,
    private personasService: PersonasService,
    private listasValoresService: ListasValoresService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private renderer: Renderer2,
    private hojaVidaStatusService: HojaVidaStatusService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.inicializarFormulario();
    this.obtenerPersonaId().then(() => {
      this.cargarDestrezas();
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
      destreza: [[], [Validators.required, this.maxSelectionValidator(5)]], 
       otraDestreza: [
    '',
    [
      Validators.minLength(4), 
      Validators.maxLength(20), 
      Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/) 
    ]
  ]
    });
    
  }

  private cargarDatos(): void {
    forkJoin({
      competencias: this.listasValoresService
        .obtenerPorTipo('COMP')
        .pipe(
          map((response: any[]) =>
            response
              .filter(
                (item) =>
                  'idPadre' in item &&
                  (item as { idPadre: string | null }).idPadre !== null
              ) 
              .filter(item => item.nombre !== 'Competencias') 
              .map((item) => ({ id: item.id, nombre: item.nombre }))
          )
        ),
    }).subscribe({
      next: (data) => {
        this.competencias = data.competencias;
        this.opcionesDestrezas = [
          ...this.competencias.map(comp => ({ label: comp.nombre, value: comp.nombre }))
        ];
        this.opcionesDestrezasConOtro = [
          ...this.opcionesDestrezas,
          { label: 'Otro', value: 'otro' }
        ];
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las opciones de competencias. Intente recargar la página.',
        });
        this.opcionesDestrezas = [];
        this.opcionesDestrezasConOtro = [{ label: 'Otro', value: 'otro' }];
      },
    });
  }

  cargarDestrezas(): void {
    if (!this.personaId) return;

    this.destrezaService.obtenerDestrezasPorPersona(this.personaId).subscribe({
      next: (data) => {
        this.destrezas = data;
        
        this.hojaVidaStatusService.updateSectionByRecordCount(
          'competencias',
          this.destrezas.length
        );
      },
      error: (err) => {
        this.hojaVidaStatusService.updateSectionByRecordCount('competencias', 0);
      },
    });
    this.visible = false;
  }

  guardar(): void {
    if (this.isLoading || this.isSubmitting) {
      return;
    }

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
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;

  const formData = this.form.value;

  if (this.editingId) {
    // Modo edición: destreza es un valor simple (string) o se usa otraDestreza
    let nombreDestreza: string;
    if (this.isEditOtro) {
      nombreDestreza = formData.otraDestreza;
    } else {
      nombreDestreza = formData.destreza;
    }

    const competenciasExistentes = this.destrezas
      .filter(d => d.id !== this.editingId)
      .map(d => d.nombre.toLowerCase());

    if (competenciasExistentes.includes(nombreDestreza.toLowerCase())) {
      this.isLoading = false;
      this.isSubmitting = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Competencia duplicada',
        detail: `La competencia "${nombreDestreza}" ya existe. Por favor, seleccione una diferente.`
      });
      return;
    }

    const payload: Destreza = {
      id: this.editingId,
      nombre: nombreDestreza,
      persona: {
        id: this.personaId!
      },
    };

    this.destrezaService.actualizarDestreza(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSubmitting = false;
        this.resetFormulario();
        this.cargarDestrezas();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Competencia actualizada correctamente'
        });
        this.visible = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al actualizar la competencia'
        });
      }
    });
  } 
  else {
    // Modo agregar: destreza es un array (multiselect)
    const destrezasSeleccionadas = [...(formData.destreza || [])];

    if (destrezasSeleccionadas.includes('otro') && formData.otraDestreza) {
      destrezasSeleccionadas.push(formData.otraDestreza);
      const index = destrezasSeleccionadas.indexOf('otro');
      if (index > -1) {
        destrezasSeleccionadas.splice(index, 1);
      }
    }

    const competenciasExistentes = this.destrezas.map(d => d.nombre.toLowerCase());

    const duplicados = destrezasSeleccionadas.filter((comp: string) =>
      competenciasExistentes.includes(comp.toLowerCase())
    );

    if (duplicados.length > 0) {
      this.isLoading = false;
      this.isSubmitting = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Competencias duplicadas',
        detail: `Las siguientes competencias ya existen: ${duplicados.join(', ')}. Por favor, seleccione competencias diferentes.`
      });
      return;
    }

    const requests = destrezasSeleccionadas.map((nombreDestreza: string) => {
      const payload: Destreza = {
        nombre: nombreDestreza,
        persona: {
          id: this.personaId!
        },
      };

      return this.destrezaService.guardarDestreza(payload);
    });

    Promise.all(requests.map((req: any) => req.toPromise())).then(() => {
      this.isLoading = false;
      this.isSubmitting = false;
      this.resetFormulario();
      this.cargarDestrezas();
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Competencias guardadas correctamente'
      });
      this.visible = false;
    }).catch((err) => {
      this.isLoading = false;
      this.isSubmitting = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar las competencias'
      });
    });
  }
}

editarDestreza(destreza: Destreza): void {
  this.editingId = destreza.id!;

  const existe = this.opcionesDestrezas.some(op => op.value === destreza.nombre);

  if (existe) {
    this.isEditOtro = false;
    this.form.get('destreza')?.setValidators([Validators.required]);
    this.form.get('destreza')?.updateValueAndValidity();
    this.form.patchValue({
      id: destreza.id,
      destreza: destreza.nombre,
      otraDestreza: null
    });
  } else {
    this.isEditOtro = true;
    this.form.get('destreza')?.clearValidators();
    this.form.get('destreza')?.updateValueAndValidity();
    this.form.patchValue({
      id: destreza.id,
      destreza: null,
      otraDestreza: destreza.nombre
    });
    this.updateOtraDestrezaValidation(true);
  }

  this.visible = true;
}

onEditSelectChange(value: any): void {
  this.form.patchValue({ destreza: value });
}


  eliminarDestreza(id: string): void {
    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar esta destreza/competencia?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.destrezaService.eliminarDestreza(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Destreza/competencia eliminada correctamente'
            });
            this.cargarDestrezas();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la destreza/competencia'
            });
          }
        });
      }
    });
  }

  cancelarEdicion(): void {
    this.isLoading = false;
    this.isSubmitting = false;
    this.resetFormulario();
  }

  private resetFormulario(): void {
    this.isLoading = false;
    this.isSubmitting = false;
    this.editingId = null;
    this.isEditOtro = false;
    this.form.get('destreza')?.setValidators([Validators.required, this.maxSelectionValidator(5)]);
    this.form.get('destreza')?.updateValueAndValidity();
    this.form.reset();
  }

  showDialog() {
     this.resetFormulario();
    this.visible = true;
  }
  onCancel(): void {
    this.isLoading = false;
    this.isSubmitting = false;
    this.form.reset({
      activo: true,
    });
    this.visible = false;
  }

  hasError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  public getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors || !(field.dirty || field.touched)) {
      return '';
    }

    const errors = field.errors;
    
    const fieldMessages = (this.errorMessages as any)[fieldName] || {};

    for (const errorKey of Object.keys(errors)) {
      const errorValue = errors[errorKey];
      
      if (errorKey === 'minlength' && errorValue && 'requiredLength' in errorValue) {
        const msg = fieldMessages['minlength'];
        return msg || `Mínimo ${(errorValue as any).requiredLength} caracteres`;
      }
      
      if (errorKey === 'maxlength' && errorValue && 'requiredLength' in errorValue) {
        const msg = fieldMessages['maxlength'];
        return msg || `Máximo ${(errorValue as any).requiredLength} caracteres`;
      }
      
      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['required']) return 'Este campo es requerido';
    if (errors['minlength']) return `Mínimo ${(errors['minlength'] as any).requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${(errors['maxlength'] as any).requiredLength} caracteres`;
    if (errors['pattern']) return 'Formato no válido';
    if (errors['maxSelection']) return 'Máximo 5 competencias permitidas';

    return 'Este campo tiene un error';
  }

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getCustomErrorMessage(fieldName: string, errorType: string): string {
    const customMessages: { [key: string]: { [key: string]: string } } = {
      destreza: {
        required: 'Debe seleccionar una competencia',
        maxSelection: 'Máximo 5 competencias permitidas'
      },
      otraDestreza: {
        required: 'Debe especificar la otra competencia',
        minlength: 'Mínimo 4 caracteres requeridos',
        maxlength: 'Máximo 20 caracteres permitidos',
        pattern: 'Solo se permiten letras y espacios (sin números)'
      }
    };

    return customMessages[fieldName]?.[errorType] || 'Campo inválido';
  }

  maxSelectionValidator(max: number) {
    return (control: AbstractControl) => {
      if (!control.value || !Array.isArray(control.value)) {
        return null;
      }
      return control.value.length > max ? { maxSelection: true } : null;
    };
  }

  private noDuplicadosValidator() {
    return (control: AbstractControl) => {
      if (!control.value || !Array.isArray(control.value)) {
        return null;
      }

      const seleccionados = control.value;
      const competenciasExistentes = this.destrezas.map(d => d.nombre.toLowerCase());

      if (this.editingId) {
        const competenciaEditada = this.destrezas.find(d => d.id === this.editingId);
        if (competenciaEditada) {
          const index = competenciasExistentes.indexOf(competenciaEditada.nombre.toLowerCase());
          if (index > -1) {
            competenciasExistentes.splice(index, 1);
          }
        }
      }

      const duplicados = seleccionados.filter((comp: string) => 
        comp !== 'otro' && competenciasExistentes.includes(comp.toLowerCase())
      );

      return duplicados.length > 0 ? { duplicados: { duplicados } } : null;
    };
  }

  private obtenerCompetenciasDuplicadas(seleccionados: string[]): string[] {
    const competenciasExistentes = this.destrezas.map(d => d.nombre.toLowerCase());

    if (this.editingId) {
      const competenciaEditada = this.destrezas.find(d => d.id === this.editingId);
      if (competenciaEditada) {
        const index = competenciasExistentes.indexOf(competenciaEditada.nombre.toLowerCase());
        if (index > -1) {
          competenciasExistentes.splice(index, 1);
        }
      }
    }

    return seleccionados.filter((comp: string) => 
      comp !== 'otro' && competenciasExistentes.includes(comp.toLowerCase())
    );
  }

  onCompetenciasChange(selectedValues: any[]): void {
    const duplicados = this.obtenerCompetenciasDuplicadas(selectedValues || []);
    if (duplicados.length > 0) {
      const valoresSinDuplicados = selectedValues.filter((v: string) => !duplicados.includes(v));
      this.form.patchValue({
        destreza: valoresSinDuplicados
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Competencias duplicadas',
        detail: `Las siguientes competencias ya existen: ${duplicados.join(', ')}. Se han removido automáticamente.`
      });
      this.cerrarMultiselect();
      return;
    }

    if (selectedValues && selectedValues.length > 5) {
      const limitedValues = selectedValues.slice(0, 5);
      this.form.patchValue({
        destreza: limitedValues
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: 'Solo puede seleccionar máximo 5 competencias'
      });
      this.cerrarMultiselect();
      return;
    }
    
    if (selectedValues && selectedValues.includes('otro')) {
      if (selectedValues.length > 1) {
        this.form.patchValue({
          destreza: ['otro']
        });
        this.messageService.add({
          severity: 'info',
          summary: 'Selección actualizada',
          detail: 'Al seleccionar "Otro", se han desmarcado las demás opciones'
        });
      }
      this.cerrarMultiselect();
    }
    else if (selectedValues && !selectedValues.includes('otro') && this.form.get('destreza')?.value?.includes('otro')) {
      this.form.patchValue({
        otraDestreza: ''
      });
    }
    else if (selectedValues && selectedValues.length === 5) {
      this.cerrarMultiselect();
    }
    
    this.updateOtraDestrezaValidation(selectedValues ? selectedValues.includes('otro') : false);
  }
  
  private updateOtraDestrezaValidation(isOtroSelected: boolean): void {
    const otraDestrezaControl = this.form.get('otraDestreza');
    
    if (isOtroSelected) {
      otraDestrezaControl?.setValidators([
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/)
      ]);
    } else {
      otraDestrezaControl?.setValidators([
        Validators.minLength(4),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/)
      ]);
    }
    
    otraDestrezaControl?.updateValueAndValidity();
  }

  private encontrarPrimerCampoInvalido(): string | null {
    const camposOrdenados = [
      'destrezas',
      'otraDestreza'
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
      destrezas: 'Destrezas',
      otraDestreza: 'Otra destreza'
    };
    return etiquetas[nombreCampo] || nombreCampo;
  }
 
  private cerrarMultiselect(): void {
    setTimeout(() => {
      try {
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        document.body.dispatchEvent(clickEvent);
      } catch (error) {
        }
    }, 300); 
  }

  cerrarMultiselectManual(): void {
    this.cerrarMultiselect();
  }
}