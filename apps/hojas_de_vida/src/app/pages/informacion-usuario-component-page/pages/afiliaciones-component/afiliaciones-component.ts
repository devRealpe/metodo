import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn, ValidationErrors, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { FileUploadModule } from 'primeng/fileupload';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Afiliacion } from '../../../../core/models/afiliacion.model';
import { AfiliacionesService } from '../../../../core/services/afiliaciones.service';
import { PersonasService } from '../../../../core/services/personas.service';
import { HojaVidaStatusService } from '../../../../core/services/hoja-vida-status.service';
import {
  SelectComponent,
  DatepickerComponent,
  FileAttachmentComponent,
  FileInfoS as FileAttachmentFileInfo, 
  FileAttachmentConfig, 
  FileAttachmentResult,
  PdfValidationResult as PdfValidationResultShared,
  InfoTableComponent,
  TableColumn,
  TableAction
} from '@microfrontends/shared-ui';
import { FileAttachmentService } from '@microfrontends/shared-services';
import { PdfValidatorComponent, PdfValidationResult, PdfValidatorConfig } from '../validador-pdf-component/pdf-validator/pdf-validator.component';
import { getValidatorConfigForModule, getDocumentInfoForModule } from '../validador-pdf-component/pdf-validator/document-validation.config';import { PdfValidatorService } from '../validador-pdf-component/pdf-validator/pdf-validator.service';
import { ListasValoresService } from '@microfrontends/shared-services';
import { ListasValoresDto } from '@microfrontends/shared-models';

@Component({
  selector: 'app-afiliaciones-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    InputTextModule,
    DatePickerModule,
    ButtonModule,
    TableModule,
    ToastModule,
    CardModule,
    FloatLabelModule,
    MessageModule,
    DialogModule,
    FileUploadModule,
    AutoCompleteModule,
    BadgeModule,
    TooltipModule,
    ConfirmDialogModule,
    SelectComponent,
    DatepickerComponent,
    FileAttachmentComponent,
    InfoTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './afiliaciones-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AfiliacionesComponent implements OnInit, OnDestroy {
  @ViewChild('fileAttachment') fileAttachmentComponent!: FileAttachmentComponent;
  
  private destroy$ = new Subject<void>();
  editForm: FormGroup;
  registros: Afiliacion[] = [];
  selectedFile: File | null = null;
  fileError: string | null = null;
  uploadedFileId: string | null = null;
  personaId: string | null = null;
  isEditando = false;
  registroEditandoId: string | null = null;
  isLoadingInitial = true;
  isLoading = false;
  isSubmitting = false;
  visible = false;
  first = 0;
  rows = 5;
  today = new Date();

  archivoOriginalId: string | null = null; 
  archivoPendienteEliminacion: boolean = false; 
  
  private _hadFilesOnOpen: boolean = false;

  readonly errorMessages = {
    tipo: {
      required: 'El tipo de afiliación es obligatorio',
    },
    administradora: {
      required: 'La administradora es obligatoria',
      minlength: 'Debe tener al menos 2 caracteres',
      pattern: 'Solo se permiten letras y espacios',
    },
    fechaAfiliacion: {
      required: 'La fecha de afiliación es obligatoria',
      maxDate: 'La fecha no puede ser mayor a hoy',
    },
  } as const;

  tableColumns: TableColumn[] = [
    { field: 'tipoNombre', header: 'Tipo', type: 'text' },
    { field: 'administradoraNombre', header: 'Administradora', type: 'text' },
    { field: 'fechaAfiliacion', header: 'Fecha de Afiliación', type: 'date' },
    { field: 'archivos', header: 'Archivos', type: 'custom' },
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-pencil',
      tooltip: 'Editar registro',
      severity: 'info',
      onClick: (row) => this.abrirDialogoEdicion(row)
    },
    {
      icon: 'pi pi-trash',
      tooltip: 'Eliminar registro',
      severity: 'danger',
      onClick: (row) => this.eliminarRegistro(row)
    }
  ];

  get tableData(): any[] {
    return this.registros.map(reg => ({
      ...reg,
      tipoNombre: this.getNombreTipo(reg.tipo),
      administradoraNombre: this.getNombreAdministradora(reg.administradora, reg)
    }));
  }

  private fb = inject(FormBuilder);
  private afiliacionesService = inject(AfiliacionesService);
  private personasService = inject(PersonasService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  private listasValoresService = inject(ListasValoresService);
  private fileAttachmentService = inject(FileAttachmentService);
  private pdfValidatorService = inject(PdfValidatorService);
  private hojaVidaStatusService = inject(HojaVidaStatusService);
  private http = inject(HttpClient);

  tipoEntidadOptions: ListasValoresDto[] = [];
  entidadesOptions: ListasValoresDto[] = [];
  selectedTipoEntidad: string | null = null;

  isLoadingAdministradoras = false;
  administradorasFiltradas: ListasValoresDto[] = [];
  
  debugMode = false; 
  fileAttachmentConfig: FileAttachmentConfig = {
    moduleType: 'afiliacion',
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
      moduleType: 'afiliacion',
      expectedDocumentType: 'Social_Security_Affiliation',
      autoReject: true,
      showValidationFeedback: true
    }
  };

  existingFiles: FileAttachmentFileInfo[] = [];
  fileControl = new FormControl();

  @ViewChild('fileAttachment', { static: false }) fileAttachment!: FileAttachmentComponent;

  pdfValidatorConfig: PdfValidatorConfig = getValidatorConfigForModule('afiliacion');

  pdfValidationSuccess = false;
  lastValidatedFile: File | null = null;
  validationResult: PdfValidationResult | null = null;
  documentInfo = getDocumentInfoForModule('afiliacion');

  get administradoraControl(): FormControl {
    return this.editForm.get('administradora') as FormControl;
  }
  buscarAdministradoras(filtro: string): void {
    if (!filtro || filtro.length < 2) {
      this.administradorasFiltradas = [];
      this.cdr.markForCheck();
      return;
    }

    const tipoSeleccionado = this.editForm.get('tipo')?.value;
    const tipoSeleccionadoObj = this.tipoEntidadOptions.find(t => t.id === tipoSeleccionado);
    const nombrePadreRequerido = tipoSeleccionadoObj?.nombre;

    this.isLoadingAdministradoras = true;
    this.cdr.markForCheck();

    this.listasValoresService.getEntidadesAfiliacion()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: ListasValoresDto[]) => {
          const filtroLower = filtro.toLowerCase().trim();
          this.administradorasFiltradas = data
            .filter(e => {
              if (nombrePadreRequerido && e.nombrePadre) {
                const nombrePadreLower = e.nombrePadre.toLowerCase();
                const tipoRequeridoLower = nombrePadreRequerido.toLowerCase();
                const cumpleTipo = nombrePadreLower.includes(tipoRequeridoLower) || tipoRequeridoLower.includes(nombrePadreLower);
                if (!cumpleTipo) {
                  return false;
                }
              }
              const nombreLower = e.nombre.toLowerCase();
              return nombreLower.includes(filtroLower);
            })
            .sort((a, b) => {
              const aLower = a.nombre.toLowerCase();
              const bLower = b.nombre.toLowerCase();
              const filtroLower = filtro.toLowerCase();
              const aStartsWith = aLower.startsWith(filtroLower);
              const bStartsWith = bLower.startsWith(filtroLower);
              if (aStartsWith && !bStartsWith) return -1;
              if (!aStartsWith && bStartsWith) return 1;
              return a.nombre.localeCompare(b.nombre);
            })
            .slice(0, 50);
          this.isLoadingAdministradoras = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.administradorasFiltradas = [];
          this.isLoadingAdministradoras = false;
          this.cdr.markForCheck();
        }
      });
  }

  onAdministradoraSelected(event: AutoCompleteSelectEvent): void {
    const selectedEntity = event.value as ListasValoresDto;
    if (selectedEntity && selectedEntity.nombre) {
      this.administradoraControl.setValue(selectedEntity);
      this.administradoraControl.markAsTouched();
      this.administradoraControl.updateValueAndValidity();
      this.cdr.markForCheck();
    }
  }

  onAdministradoraCleared(): void {
    this.administradoraControl.setValue(null);
    this.administradorasFiltradas = [];
    this.cdr.markForCheck();
  }

  constructor() {
    this.editForm = this.fb.group({
      tipo: ['', [Validators.required]],
      administradora: [null, [
        Validators.required,
        (control: AbstractControl) => {
          const value = control.value;
          if (!value || typeof value !== 'object' || !value.nombre) {
            return { required: true };
          }
          if (value.nombre.length < 2) {
            return { minlength: true };
          }
          if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-.,()]+$/.test(value.nombre)) {
            return { pattern: true };
          }
          return null;
        }
      ]],
      fechaAfiliacion: ['', [Validators.required, fechaAfiliacionNoMayorAHoy()]],
      idPersona: [null, [Validators.required]]
    });
  }

  ngOnInit() {
    this.obtenerPersonaId().then(() => {
      this.cargarRegistros();
    });
    this.cargarEntidadesAfiliacion();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
        this.editForm.patchValue({ idPersona: this.personaId });
      }
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario'
      });
    }
  }

  showDialog() {
    this.isEditando = false;
    this.registroEditandoId = null;
    this.limpiarFormularioCompleto();
    
    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: undefined
    };
    
    setTimeout(() => {
      this.visible = true;
      this.cdr.markForCheck();
    }, 150);
  }

  abrirDialogoEdicion(registro: Afiliacion): void {
    this.limpiarFormularioCompleto();
    
    this.isEditando = true;
    this.registroEditandoId = registro.id || null;
    this.visible = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.cargarDatosParaEdicion(registro);
    }, 50);
  }

  private cargarDatosParaEdicion(registro: Afiliacion): void {    
    try {
      const tipoId = this.tipoEntidadOptions.find(t => t.nombre === registro.tipo)?.id;
      if (tipoId) {
        this.editForm.get('tipo')?.setValue(tipoId);
        this.selectedTipoEntidad = tipoId;
      }
      
      let administradoraObj = this.entidadesOptions.find(e => e.nombre === registro.administradora);
      if (!administradoraObj) {
        administradoraObj = { 
          id: registro.administradora, 
          nombre: registro.administradora, 
          nombrePadre: '',
          tipo: '' 
        };
      }
      
      if (administradoraObj) {
        this.editForm.get('administradora')?.setValue(administradoraObj);
      }
      
      if (registro.fechaAfiliacion) {
        const fecha = new Date(registro.fechaAfiliacion);
        this.editForm.get('fechaAfiliacion')?.setValue(fecha);
      }
      
      if (registro.id) {
        this.fileAttachmentConfig.recordId = registro.id;
      }
      
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
      
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los datos del registro'
      });
    }
  }

  cargarRegistros() {
    if (!this.personaId) return;
    
    this.isLoadingInitial = true;
    this.cdr.markForCheck();
    
    this.afiliacionesService.getAfiliacionesPersonas(this.personaId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.registros = data.map(registro => ({
          ...registro,
          archivos: registro.archivos || [] 
        }));
        this.isLoadingInitial = false;
        this.cdr.markForCheck();
        this.hojaVidaStatusService.updateSectionByRecordCount(
          'afiliaciones',
          this.registros.length
        );
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los registros de afiliaciones'
        });
        this.isLoadingInitial = false;
        this.cdr.markForCheck();
        
        this.hojaVidaStatusService.updateSectionByRecordCount('afiliaciones', 0);
      }
    });
  }

  cargarEntidadesAfiliacion() {
    this.listasValoresService.getEntidadesAfiliacion().subscribe((data) => {
      this.tipoEntidadOptions = data.filter(e => e.nombrePadre === 'Entidades');
      this.entidadesOptions = data;
    });
  }

  onTipoEntidadChange(tipoId: string) {
    this.selectedTipoEntidad = tipoId;
    
    this.editForm.patchValue({ administradora: null });
    this.administradoraControl.setValue(null);
    this.administradorasFiltradas = [];
    
    this.cdr.markForCheck();
  }

  async guardarRegistro(): Promise<void> {
    if (this.isLoading || this.isSubmitting) {
      return;
    }

    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
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
        this.messageService.add({
          severity: 'warn',
          summary: 'Formulario incompleto',
          detail: 'Por favor, complete todos los campos requeridos'
        });
      }
      return;
    }
    if (this.isEditando) {
      const tieneArchivoOriginal = this.archivoOriginalId && !this.archivoPendienteEliminacion;
      const tieneArchivoNuevo = this.uploadedFileId && this.uploadedFileId !== this.archivoOriginalId;
      
      if (!tieneArchivoOriginal && !tieneArchivoNuevo) {
        this.fileError = 'Debe mantener el archivo existente o cargar uno nuevo. No puede guardar sin archivo.';
        this.messageService.add({
          severity: 'error',
          summary: 'Archivo requerido',
          detail: 'Debe mantener el archivo existente o cargar uno nuevo. No puede guardar sin archivo de soporte.'
        });
        this.cdr.markForCheck();
        return;
      }
    } else {
      if (!this.hasValidFile()) {
        this.fileError = 'Por favor, seleccione un archivo de soporte.';
        this.messageService.add({
          severity: 'error',
          summary: 'Archivo requerido',
          detail: 'Debe cargar un archivo de soporte válido para crear la afiliación.'
        });
        this.cdr.markForCheck();
        return;
      }
    }

    this.isLoading = true;
    this.isSubmitting = true;
    this.cdr.markForCheck();
    
    const formValue = this.editForm.getRawValue();
    const tipoNombre = this.tipoEntidadOptions.find(t => t.id === formValue.tipo)?.nombre || formValue.tipo;
    const administradoraNombre = typeof formValue.administradora === 'object' 
      ? formValue.administradora.nombre 
      : formValue.administradora;
    
    const datosParaEnviar: Afiliacion = {
      ...formValue,
      tipo: tipoNombre,
      administradora: administradoraNombre,
      fechaAfiliacion: formValue.fechaAfiliacion instanceof Date
        ? formValue.fechaAfiliacion.toISOString().split('T')[0]
        : formValue.fechaAfiliacion,
      persona: this.personaId  
    };

    try {
      let response;
      if (this.isEditando && this.registroEditandoId) {
        datosParaEnviar.id = this.registroEditandoId;
        
        this.fileAttachmentConfig.recordId = this.registroEditandoId;

        response = await this.afiliacionesService.update( datosParaEnviar as Afiliacion).toPromise();
      } else {
        response = await this.afiliacionesService.create(datosParaEnviar).toPromise();
      }

      if (!response) {
        throw new Error('No se recibió información de afiliación del servidor');
      }

      if (this.uploadedFileId && response.id) {
        try {
          await this.http.put(
            `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/${this.uploadedFileId}/afiliacion/${response.id}`,
            {}
          ).toPromise();
          
          if (this.isEditando && this.fileAttachmentComponent) {
            try {
              await this.fileAttachmentComponent.confirmDeferredDeletions();
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

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: this.isEditando ? 'Afiliación actualizada correctamente' : 'Afiliación creada correctamente'
      });
      
      this.cargarRegistros();
      this.cancelarEdicion();
      this.visible = false;
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la afiliación. Verifique los datos e intente nuevamente.'
      });
    } finally {
      this.isLoading = false;
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  async cancelarEdicion() {
    if (this.isEditando && this.registroEditandoId && this.archivoPendienteEliminacion) {
      try {
        if (this.fileAttachmentComponent) {
          await this.fileAttachmentComponent.cancelMarkedDeletions();
          }
      } catch (error) {
      }
    }

    if (this.isEditando && !this.hasFileAttached()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se puede cancelar',
        detail: 'Debe cargar un archivo antes de cerrar. El registro requiere al menos un archivo de soporte.'
      });
      return;
    }

    this.isEditando = false;
    this.registroEditandoId = null;
    this.limpiarFormularioCompleto();
    
    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: undefined
    };
    
    this.existingFiles = [];
    this.uploadedFileId = null;
    this.fileError = null;
    this.isSubmitting = false;
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
    
    this.visible = false;
    this.cdr.markForCheck();
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
    }
    
    if (this.isEditando && this.fileAttachmentComponent) {
      try {
        this.fileAttachmentComponent.cancelDeferredDeletions();
      } catch (error) {
      }
    }

    if (!this.isLoading) {
      this.isEditando = false;
      this.registroEditandoId = null;
      this.limpiarFormularioCompleto();
      
      this.archivoOriginalId = null;
      this.archivoPendienteEliminacion = false;
      this._hadFilesOnOpen = false; 
    }
    this.isSubmitting = false;
  }

  private resetearFormulario() {
    this.editForm.reset(); 
    if (this.personaId) {
      this.editForm.patchValue({ idPersona: this.personaId });
    }
    this.uploadedFileId = null;
    this.selectedFile = null;
    this.fileError = null;
    this.isSubmitting = false;
    Object.values(this.editForm.controls).forEach(control => {
      control.markAsPristine();
      control.markAsUntouched();
    });
  }

  onFileUploaded(fileId: string): void {
    this.uploadedFileId = fileId;
    this.fileError = null;
    
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Archivo subido correctamente'
    });
    
    this.cdr.markForCheck();
  }

  eliminarRegistro(reg: Afiliacion) {
    if (!reg.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'ID no proporcionado para eliminar'
      });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar esta afiliación?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
      
        this.fileAttachmentService.deleteFileAssociationsByRecord(reg.id!, 'afiliacion').pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (archivosIds: string[]) => {
            this.afiliacionesService.delete(reg.id!).pipe(
              takeUntil(this.destroy$)
            ).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Eliminado',
                  detail: 'Afiliación y archivos eliminados correctamente'
                });
                this.cargarRegistros();
                if (this.isEditando && this.registroEditandoId === reg.id) {
                  this.cancelarEdicion();
                }
              },
              error: () => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo eliminar la afiliación'
                });
              }
            });
          },
          error: () => {
            this.afiliacionesService.delete(reg.id!).pipe(
              takeUntil(this.destroy$)
            ).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Eliminado',
                  detail: 'Afiliación eliminada (los archivos podrían seguir existiendo)'
                });
                this.cargarRegistros();
                if (this.isEditando && this.registroEditandoId === reg.id) {
                  this.cancelarEdicion();
                }
              },
              error: () => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo eliminar la afiliación'
                });
              }
            });
          }
        });
      }
    });
  }

  pageChange(event: {first: number, rows: number}): void {
    this.first = event.first;
    this.rows = event.rows;
    this.cdr.markForCheck();
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

  getUsuarioId(): string {
    return this.personaId || '';
  }

  onFileUploadComplete(response: {id: string}): void {
    this.uploadedFileId = response.id;
    this.fileError = null;
    this.cdr.markForCheck();
  }

  getNombreTipo(id: string): string {
    const tipo = this.tipoEntidadOptions.find(e => e.id === id);
    return tipo ? tipo.nombre : id;
  }

  getNombreAdministradora(id: string, reg?: Afiliacion): string {
    const entidad = this.entidadesOptions.find(e => e.id === id);
    if (entidad) return entidad.nombre;
    if (reg) {
      this.listasValoresService.getEntidadesAfiliacion().subscribe(data => {
        const found = data.find(e => e.id === id);
        if (found) {
          reg.administradora = found.id;
          this.entidadesOptions.push(found);
          this.cdr.markForCheck();
        }
      });
    }
    return id;
  }

  private async cargarAdministradoraCompleta(administradoraId: string): Promise<ListasValoresDto | null> {
    try {
      let administradoraObj = this.entidadesOptions.find(e => e.id === administradoraId);
      
      if (!administradoraObj) {
        const todasEntidades = await this.listasValoresService.getEntidadesAfiliacion().toPromise();
        administradoraObj = todasEntidades?.find(e => e.id === administradoraId) || undefined;
        
        if (administradoraObj) {
          this.entidadesOptions.push(administradoraObj);
        }
      }
      
      return administradoraObj || null;
    } catch {
      return null;
    }
  }

  private limpiarFormularioCompleto(): void {
    this.uploadedFileId = null;
    this.selectedFile = null;
    this.fileError = null;
    this.selectedTipoEntidad = null;
    this.administradorasFiltradas = [];
    this.existingFiles = []; 
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
    this.pdfValidationSuccess = false;
    this.lastValidatedFile = null;
    this.validationResult = null;
    this.fileAttachmentConfig.recordId = undefined;
  
    const controlesALimpiar = ['tipo', 'administradora', 'fechaAfiliacion'];
    controlesALimpiar.forEach(nombreControl => {
      const control = this.editForm.get(nombreControl);
      if (control) {
        control.setValue(null);
        control.markAsPristine();
        control.markAsUntouched();
        control.setErrors(null);
        control.updateValueAndValidity();
      }
    });
    
    this.editForm.reset();
    this.fileControl.setValue(null);
    this.fileControl.markAsPristine();
    this.fileControl.markAsUntouched();
    this.fileControl.setErrors(null);
    this.cdr.detectChanges();
    if (this.personaId) {
      this.editForm.get('idPersona')?.setValue(this.personaId);
    }
    Object.keys(this.editForm.controls).forEach(key => {
      const control = this.editForm.get(key);
      if (control && key !== 'idPersona') {
        control.setValue(null);
        control.markAsPristine();
        control.markAsUntouched();
        control.updateValueAndValidity();
      }
    });
    if (this.fileAttachment) {
      this.fileAttachment.clearFiles();
    }
    this.pdfValidationSuccess = false;
    this.lastValidatedFile = null;
  }

  debugAdministradorasState(): void {
  }

  getPlaceholderText(): string {
    const tipoSeleccionado = this.editForm.get('tipo')?.value;
    const tipoObj = this.tipoEntidadOptions.find(t => t.id === tipoSeleccionado);
    
    if (tipoObj) {
      return `Buscar ${tipoObj.nombre.toLowerCase()} (mín. 2 caracteres)`;
    }
    return 'Primero seleccione el tipo de entidad';
  }

  getEmptyMessage(): string {
    const tipoSeleccionado = this.editForm.get('tipo')?.value;
    const tipoObj = this.tipoEntidadOptions.find(t => t.id === tipoSeleccionado);
    
    if (!tipoSeleccionado) {
      return 'Seleccione primero el tipo de entidad';
    }
    
    if (tipoObj) {
      return  `No se encontraron ${tipoObj.nombre.toLowerCase()}s con ese nombre`;
    }
    
    return 'No se encontraron administradoras';
  }

  shouldShowAutocomplete(): boolean {
    return !!this.editForm.get('tipo')?.value;
  }

  getTipoSeleccionadoNombre(): string {
    const tipoSeleccionado = this.editForm.get('tipo')?.value;
    const tipoObj = this.tipoEntidadOptions.find(t => t.id === tipoSeleccionado);
    return tipoObj?.nombre || 'administradora';
  }

  onTipoSelectionChange(valor: string): void {
    this.editForm.get('tipo')?.setValue(valor);
    this.editForm.get('tipo')?.markAsTouched();
    this.editForm.get('tipo')?.updateValueAndValidity();
    this.onTipoEntidadChange(valor);
  }

  onTipoFocus(): void {
    this.editForm.get('tipo')?.markAsTouched();
  }

  onTipoBlur(): void {
    this.editForm.get('tipo')?.markAsTouched();
    this.editForm.get('tipo')?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  onFechaAfiliacionChange(fecha: Date | null): void {
    this.editForm.get('fechaAfiliacion')?.setValue(fecha);
    this.editForm.get('fechaAfiliacion')?.markAsTouched();
    this.editForm.get('fechaAfiliacion')?.updateValueAndValidity();
  }

  onFechaFocus(): void {
    this.editForm.get('fechaAfiliacion')?.markAsTouched();
  }

  onFechaBlur(): void {
    this.editForm.get('fechaAfiliacion')?.markAsTouched();
    this.editForm.get('fechaAfiliacion')?.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  forceValidationOnAllFields(): void {
    Object.keys(this.editForm.controls).forEach(key => {
      const control = this.editForm.get(key);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
      }
    });
    this.cdr.markForCheck();
  }


  onFileSelected(files: File[]): void {
    this.fileError = null;
    this.pdfValidationSuccess = false;
    this.cdr.markForCheck();
  }

  onValidationComplete(result: PdfValidationResultShared): void {
    if (result.isValid) {
      this.pdfValidationSuccess = true;
      
      this.messageService.add({
        severity: 'success',
        summary: 'Documento Válido',
        detail: result.message || `Documento de afiliación validado y subido correctamente (${Math.round(result.confidence * 100)}% confianza).`
      });
    } else {
      this.pdfValidationSuccess = false;
      
      const errorDetail = result.message || 'El documento no cumple con los criterios de validación requeridos.';
      this.fileError = errorDetail;
      
      this.messageService.add({
        severity: 'error',
        summary: 'Documento No Válido',
        detail: errorDetail + ' Por favor, suba el documento correcto.'
      });
    }

    this.cdr.markForCheck();
  }

  onFilesUploaded(files: FileAttachmentFileInfo[]): void {
    if (files && files.length > 0) {
      this.uploadedFileId = typeof files[0] === 'string' ? files[0] : files[0].id;
      this.fileError = null;
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Archivo subido correctamente'
      });
      this.cdr.markForCheck();
    }
  }

  onFileDeleted(fileId: string): void {
    if (this.uploadedFileId === fileId) {
      this.uploadedFileId = null;
    }
    this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
    this.messageService.add({
      severity: 'success',
      summary: 'Archivo eliminado',
      detail: 'El archivo fue eliminado correctamente'
    });
    this.cdr.markForCheck();
  }

  onFileMarkedForDeletion(fileId: string): void {
    
    if (!this.archivoOriginalId) {
      this.archivoOriginalId = fileId;
    }
    
    this.archivoPendienteEliminacion = true;
    
    if (this.uploadedFileId === fileId) {
      this.uploadedFileId = null;
    }

    this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Archivo marcado para eliminación',
      detail: 'El archivo se eliminará al guardar el registro con un archivo de reemplazo'
    });
    
    this.cdr.markForCheck();
  }

  onFileUploadError(error: string): void {
    this.fileError = error;
    this.uploadedFileId = null;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error
    });
    this.cdr.markForCheck();
  }

  onFilePreview(file: FileAttachmentFileInfo): void {
    if (!file.id && !file.url) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se puede previsualizar el archivo' 
      });
      return;
    }

    if (file.id) {
      this.previewArchivo(file.id);
    } else if (file.url) {
      this.http.get(file.url, { responseType: 'blob' })
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
              detail: 'No se pudo abrir el archivo para vista previa'
            });
          }
        });
    }
  }

  onFileOperationComplete(result: FileAttachmentResult): void {
    if (result.success && result.files && result.files.length > 0) {
      this.uploadedFileId = result.files[0].id;
    }
  }

  hasValidFile(): boolean {
    if (!this.isEditando) {
      return this.pdfValidationSuccess && this.hasFileAttached();
    }
    
    return this.hasFileAttached();
  }

  hasFileAttached(): boolean {
    if (this.uploadedFileId && this.uploadedFileId.trim() !== '') {
      return true;
    }

    if (this.existingFiles && this.existingFiles.length > 0) {
      return true;
    }
    
    if (this.fileAttachment && this.fileAttachment.hasFiles()) {
      return true;
    }
    
    return false;
  }

  isEditingWithoutFile(): boolean {
    return this.isEditando && !this.hasFileAttached();
  }

  public getFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
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
      
      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['required']) return 'Este campo es requerido';
    if (errors['minlength']) return `Mínimo ${(errors['minlength'] as any).requiredLength} caracteres`;
    if (errors['pattern']) return 'Formato no válido';
    if (errors['maxDate']) return 'La fecha no puede ser mayor a hoy';

    return 'Este campo tiene un error';
  }

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private encontrarPrimerCampoInvalido(): string | null {
    const camposOrdenados = [
      'tipo',
      'administradora',
      'fechaAfiliacion'
    ];

    for (const campo of camposOrdenados) {
      const control = this.editForm.get(campo);
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
      tipo: 'Tipo de entidad',
      administradora: 'Administradora',
      fechaAfiliacion: 'Fecha de afiliación'
    };
    return etiquetas[nombreCampo] || nombreCampo;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

function fechaAfiliacionNoMayorAHoy(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const hoy = new Date();
    const valor = new Date(control.value);
    if (valor > hoy) {
      return { maxHoy: true };
    }
    return null;
  };
}
