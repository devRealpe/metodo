import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { FileUploadModule } from 'primeng/fileupload';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DocumentoSoporte } from '../../../../core/models/documento-soporte.model';
import { DocumentoSoporteService } from '../../../../core/services/documento-soporte.service';
import { PersonasService } from '../../../../core/services/personas.service';
import { HojaVidaStatusService } from '../../../../core/services/hoja-vida-status.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '@shared/shared-environments';
import {
  SelectComponent,
  FileAttachmentComponent,
  FileInfoS,
  FileAttachmentConfig,
  InfoTableComponent,
  TableColumn,
  TableAction
} from '@microfrontends/shared-ui';
import { ListasValoresService, FileAttachmentService } from '@microfrontends/shared-services';
import { DropdownItem, ListasValoresDto } from '@microfrontends/shared-models';

@Component({
  selector: 'app-documentos-soporte-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    ToastModule,
    CardModule,
    FloatLabelModule,
    MessageModule,
    DialogModule,
    ConfirmDialogModule,
    FileUploadModule,
    BadgeModule,
    TooltipModule,
    SelectComponent,
    FileAttachmentComponent,
    InfoTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './documentos-soporte-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentosSoporteComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  editForm: FormGroup;
  registros: DocumentoSoporte[] = [];
  personaId: string | null = null;
  isEditando = false;
  registroEditandoId: string | null = null;
  isLoadingInitial = true;
  isLoading = false;
  isSubmitting = false;
  visible = false;
  first = 0;
  rows = 5;

  existingFiles: FileInfoS[] = [];
  fileControl = new FormControl();
  @ViewChild('fileAttachment') fileAttachment!: FileAttachmentComponent;

  archivoOriginalId: string | null = null;
  archivoPendienteEliminacion: boolean = false;
  
  private _hadFilesOnOpen: boolean = false;

  tiposSoporte: DropdownItem[] = [];
  isLoadingDropdowns = false;

  documentosRequeridos: Set<string> = new Set();
  personaData: any = null; 
  selectedFile: File | null = null;
  uploadedFileId: string | null = null;
  isUploadingFile = false;
  fileError: string | null = null;

  readonly errorMessages = {
    tipoSoporte: {
      required: 'El tipo de soporte es obligatorio',
      pattern: 'El tipo de soporte no es válido'
    },
    archivo: {
      required: 'El archivo es obligatorio'
    }
  } as const;

  tableColumns: TableColumn[] = [
    { field: 'tipoSoporte', header: 'Tipo de Soporte', type: 'custom' }, 
    { field: 'archivos', header: 'Archivos', type: 'custom' },
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-pencil',
      tooltip: 'Editar',
      severity: 'info',
      onClick: (row) => this.editarRegistro(row)
    },
    {
      icon: 'pi pi-trash',
      tooltip: 'Eliminar',
      severity: 'danger',
      onClick: (row) => this.eliminarRegistro(row.id!)
    }
  ];

  get tableData(): any[] {
    return this.registros;
  }

  get tiposSoporteConIndicador(): any[] {
    return this.tiposSoporte.map(tipo => ({
      label: this.isDocumentoRequerido(tipo.nombre) 
        ? `${tipo.nombre} (*)` 
        : tipo.nombre,
      value: tipo.nombre,
      id: tipo.id
    }));
  }

  private fb = inject(FormBuilder);
  private documentoSoporteService = inject(DocumentoSoporteService);
  private personasService = inject(PersonasService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private listasValoresService = inject(ListasValoresService);
  private fileAttachmentService = inject(FileAttachmentService);
  private hojaVidaStatusService = inject(HojaVidaStatusService);

  fileAttachmentConfig: FileAttachmentConfig = {
    moduleType: 'documento_soporte', 
    multiple: false,
    maxFileSize: 10 * 1024 * 1024, 
    accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
    autoUpload: false,
    showPreview: true,
    showDownload: true,
    showDelete: true,
    renameFiles: true
  };

  constructor() {
    this.editForm = this.fb.group({
      tipoSoporte: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.cargarDropdowns();
    this.obtenerPersonaId().then(() => {
      this.loadRegistros();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDropdowns(): void {
    this.isLoadingDropdowns = true;

    this.listasValoresService
      .getDropdownByTipo('DOCS')
      .pipe(
        map((response: ListasValoresDto[]) =>
          response
            .filter(
              (item) =>
                'idPadre' in item &&
                (item as { idPadre: string | null }).idPadre !== null
            ) 
            .map((item) => ({ id: item.id, nombre: item.nombre }))
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data) => {
          this.tiposSoporte = data;
          this.isLoadingDropdowns = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.isLoadingDropdowns = false;
          this.tiposSoporte = [
            { id: '1', nombre: 'Certificado Médico' },
            { id: '2', nombre: 'Certificación Laboral' },
            { id: '3', nombre: 'Certificado de Estudio' },
            { id: '4', nombre: 'Documento de Identidad' },
            { id: '5', nombre: 'Antecedentes Judiciales' },
            { id: '6', nombre: 'Antecedentes Disciplinarios' },
            { id: '7', nombre: 'Antecedentes Fiscales' },
            { id: '8', nombre: 'Otro' }
          ];
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'Se cargaron las opciones por defecto para tipos de soporte'
          });
          this.cdr.markForCheck();
        },
      });
  }

  private async obtenerPersonaId(): Promise<void> {
    try {
      const persona = await this.personasService.getPersonaActual().toPromise();
      this.personaId = persona?.id || null;
      this.personaData = persona; 
      
      if (!this.personaId) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'Debe completar su información personal primero'
        });
        this.isLoadingInitial = false;
        this.cdr.markForCheck();
      } else {
        await this.cargarInformacionCompleta();
        this.determinarDocumentosRequeridos();
      }
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la información del usuario'
      });
      this.isLoadingInitial = false;
      this.cdr.markForCheck();
    }
  }

  private loadRegistros(): void {
    if (!this.personaId) {
      return;
    }

    this.documentoSoporteService.getByUsuarioId(this.personaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (registros) => {
          this.registros = registros;
          this.isLoadingInitial = false;
          this.cdr.markForCheck();
          this.actualizarEstadoSeccion();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los documentos de soporte'
          });
          this.isLoadingInitial = false;
          this.cdr.markForCheck();
          
          this.hojaVidaStatusService.updateSectionByRecordCount('documentos-soporte', 0);
        }
      });
  }

  private actualizarEstadoSeccion(): void {
    if (this.documentosRequeridos.size > 0) {
      const todosPresentes = this.todosDocumentosRequeridosPresentes();
      this.hojaVidaStatusService.updateSectionByRecordCount(
        'documentos-soporte',
        todosPresentes ? this.registros.length : 0
      );
      
      if (!todosPresentes && this.registros.length > 0) {
        const faltantes = this.getDocumentosFaltantes();
        this.messageService.add({
          severity: 'warn',
          summary: 'Documentos Faltantes',
          detail: `Aún faltan documentos obligatorios: ${faltantes.join(', ')}`,
          life: 5000
        });
      }
    } else {
      this.hojaVidaStatusService.updateSectionByRecordCount(
        'documentos-soporte',
        this.registros.length
      );
    }
  }

  private async cargarInformacionCompleta(): Promise<void> {
    if (!this.personaId) return;
    
    try {
      const personaCompleta = await this.personasService.obtenerPersonaPorId(this.personaId).toPromise();
      this.personaData = personaCompleta;
      this.cdr.markForCheck();
    } catch (error) {
    }
  }

  private determinarDocumentosRequeridos(): void {
    this.documentosRequeridos.clear();
    
    this.documentosRequeridos.add('Documento de Identidad');
    
    if (this.personaData?.tieneLibretaMilitar === true) {
      this.documentosRequeridos.add('Libreta Militar');
    }
    
    const informacionAcademica = this.personaData?.informacionAcademica || 
                                 this.personaData?.informacionesAcademicas || [];
    const tieneTarjetaProfesional = informacionAcademica.some((info: any) => info.tarjetaProfesional === true);
    
    if (tieneTarjetaProfesional) {
      this.documentosRequeridos.add('Tarjeta Profesional');
    }
    
    this.cdr.markForCheck();
  }

  isDocumentoRequerido(tipoDocumento: string): boolean {
    return Array.from(this.documentosRequeridos).some(
      doc => doc.toLowerCase() === tipoDocumento.toLowerCase()
    );
  }

  isDocumentoSubido(tipoDocumento: string): boolean {
    return this.registros.some(r => r.tipoSoporte?.toLowerCase() === tipoDocumento.toLowerCase());
  }

  getDocumentosFaltantes(): string[] {
    const documentosSubidos = new Set(
      this.registros.map(r => r.tipoSoporte?.toLowerCase() || '')
    );
    const faltantes: string[] = [];
    
    this.documentosRequeridos.forEach(docRequerido => {
      if (!documentosSubidos.has(docRequerido.toLowerCase())) {
        faltantes.push(docRequerido);
      }
    });
    
    return faltantes;
  }

  todosDocumentosRequeridosPresentes(): boolean {
    return this.getDocumentosFaltantes().length === 0;
  }

  showDialog(): void {
    this.resetForm();
    this.isEditando = false;
    this.registroEditandoId = null;
    
    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: undefined
    };
    
    this.selectedFile = null;
    this.uploadedFileId = null;
    this.existingFiles = [];
    this.fileError = null;
    
    this.visible = true;
    this.cdr.markForCheck();
  }

  editarRegistro(registro: DocumentoSoporte): void {
 
    this.isEditando = true;
    this.registroEditandoId = registro.id!;
    

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
    this.selectedFile = null;
    
    this.editForm.patchValue({
      tipoSoporte: registro.tipoSoporte
    });

    this.visible = true;
    this.cdr.markForCheck();
  }

  eliminarRegistro(id: string): void {
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'ID no proporcionado para eliminar'
      });
      return;
    }

    const registro = this.registros.find(r => r.id === id);
    if (!registro) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'Registro no encontrado'
      });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Está seguro de que desea eliminar este documento de soporte?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.documentoSoporteService.delete(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Documento de soporte eliminado correctamente'
              });
              
              this.registros = this.registros.filter(r => r.id !== id);
              this.cdr.markForCheck();
              
              this.loadRegistros();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al eliminar el documento de soporte'
              });
            }
          });
      }
    });
  }

  guardarRegistro(): void {

    if (this.isLoading || this.isSubmitting) {
      return;
    }

    if (this.editForm.invalid || !this.personaId) {
      this.editForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    if (!this.uploadedFileId) {
      this.fileError = 'El archivo es obligatorio';
      this.messageService.add({
        severity: 'warn',
        summary: 'Archivo requerido',
        detail: 'Debe cargar un archivo para guardar este documento de soporte'
      });
      this.cdr.markForCheck();
      return;
    }

    if (this.isEditando && !this.registroEditandoId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al identificar el documento a actualizar'
      });
      this.isEditando = false; 
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;
    this.cdr.markForCheck();

 

    const formData: DocumentoSoporte = {
      tipoSoporte: this.editForm.value.tipoSoporte,
      idPersona: this.personaId  
    };

    const operation = this.isEditando
      ? this.documentoSoporteService.update(this.registroEditandoId!, formData)
      : this.documentoSoporteService.create(formData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (resultado) => {
          if (this.uploadedFileId && resultado.id) {
            const registroExistente = this.isEditando ? this.registros.find(r => r.id === this.registroEditandoId) : null;
            const yaEstaAsociado = registroExistente?.archivos?.some(archivo => archivo.id === this.uploadedFileId) || false;
            
            if (!yaEstaAsociado) {
              this.crearAsociacionArchivo(resultado.id!, this.uploadedFileId!);
            } else {
              if (this.isEditando && this.fileAttachment) {
                try {
                  await this.fileAttachment.confirmDeferredDeletions();
                } catch (deleteError) {
                }
              }
              this.finalizarGuardado();
            }
          } else {
            this.finalizarGuardado();
          }
        },
        error: (error: any) => {
          
          
          let errorMessage = `Error al ${this.isEditando ? 'actualizar' : 'crear'} el documento de soporte`;
          
          if (error?.status === 404 && this.isEditando) {
            errorMessage = 'El documento de soporte que intenta actualizar no existe. Por favor, recargue la página e intente nuevamente.';
            this.loadRegistros();
            this.onDialogHide();
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
          this.isLoading = false;
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
  }

  private crearAsociacionArchivo(documentoId: string, archivoId: string): void {
    this.http.put(
      `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/${archivoId}/documento_soporte/${documentoId}`,
      {}
    ).subscribe({
      next: (response) => {
        
        if (this.archivoPendienteEliminacion && this.uploadedFileId && this.uploadedFileId !== this.archivoOriginalId) {
          try {
            this.fileAttachment.confirmMarkedDeletions(this.uploadedFileId);
          } catch (deleteError) {
          }
        }
        
        this.finalizarGuardado();
      },
      error: (error) => {

        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'Registro guardado pero hubo un problema asociando el archivo'
        });
        this.finalizarGuardado();
      }
    });
  }

  private finalizarGuardado(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: this.isEditando
        ? 'Documento de soporte actualizado correctamente'
        : 'Documento de soporte creado correctamente'
    });
    
    this.onDialogHide();
    this.loadRegistros();
    this.isLoading = false;
    this.isSubmitting = false;
    this.cdr.detectChanges();
  }

  onDialogHide(): void {
    
    const puedeSerrarSinArchivos = !this._hadFilesOnOpen;
    const tieneArchivos = this.hasFileAttached();
    
    
    
    if (this.isEditando && !tieneArchivos && !puedeSerrarSinArchivos) {
      
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
    
    this.visible = false;
    this.resetForm();
    
    this.selectedFile = null;
    this.uploadedFileId = null;
    this.existingFiles = [];
    this.fileError = null;
    
    this.isEditando = false;
    this.registroEditandoId = null;
    
    this.fileAttachmentConfig = {
      ...this.fileAttachmentConfig,
      recordId: undefined
    };
    
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
    this._hadFilesOnOpen = false; 
    
    this.isSubmitting = false;
    this.cdr.markForCheck();
    }

  private resetForm(): void {
    this.editForm.reset();
    this.editForm.markAsUntouched();
    this.editForm.markAsPristine();
    this.isSubmitting = false;
  }

  public getFieldError(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (!control?.errors || !control.touched) return '';

    const errors = control.errors;
    
    const fieldMessages = (this.errorMessages as any)[fieldName] || {};

    for (const errorKey of Object.keys(errors)) {
      if (fieldMessages[errorKey]) {
        return fieldMessages[errorKey];
      }
    }

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['pattern']) return 'Formato no válido';

    return 'Campo inválido';
  }

  public isFieldInvalid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  getErrorMessage(fieldName: string): string {
    return this.getFieldError(fieldName);
  }

  hasFieldError(fieldName: string): boolean {
    return this.isFieldInvalid(fieldName);
  }

  onFileSelect(event: any): void {
    const files = event.files || event.currentFiles;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.uploadFile();
    }
  }

  private uploadFile(): void {
    if (!this.selectedFile || !this.personaId) return;

    this.isUploadingFile = true;
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('archivo', this.selectedFile);
    formData.append('modulo', 'documento_soporte');
    formData.append('tipo', 'soporte');
    formData.append('idPersona', this.personaId);

    this.http.post<any>(`${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/subir`, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.uploadedFileId = response.id;
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Archivo subido correctamente'
          });
          this.isUploadingFile = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al subir el archivo'
          });
          this.selectedFile = null;
          this.uploadedFileId = null;
          this.isUploadingFile = false;
          this.cdr.markForCheck();
        }
      });
  }

  onFileRemove(): void {
    this.selectedFile = null;
    this.uploadedFileId = null;
    this.cdr.markForCheck();
  }

  private async asociarArchivo(documentoId: string, archivoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(`${environment.apiHojasDeVida}/hojas-de-vida/documentos-soporte/${documentoId}/asociar-archivo/${archivoId}`, {})
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => resolve(),
          error: (error) => reject(error)
        });
    });
  }

  onFilesUploaded(files: FileInfoS[]): void {
    if (files && files.length > 0) {
      this.uploadedFileId = files[0].id;
      this.existingFiles = files;
      this.fileError = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Archivo subido correctamente'
      });
    }
  }

  onFileDeleted(fileId: string): void {
    if (!fileId) {
      return;
    }

    if (this.isEditando && this.registroEditandoId) {
      this.fileAttachmentService.deleteFileAssociationsByRecord(this.registroEditandoId, 'documento_soporte').subscribe({
        next: (deletedFileIds) => {
          this.uploadedFileId = null;
          this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Archivo y asociación eliminados correctamente'
          });
        },
        error: (err: any) => {
          this.fileAttachmentService.deleteUploadedFile(fileId).subscribe({
            next: () => {
              this.uploadedFileId = null;
              this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Archivo eliminado correctamente'
              });
            },
            error: (delErr: any) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo eliminar el archivo'
              });
            }
          });
        }
      });
    } else {
      this.fileAttachmentService.deleteUploadedFile(fileId).subscribe({
        next: () => {
          this.uploadedFileId = null;
          this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Archivo eliminado correctamente'
          });
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar el archivo físico'
          });
        }
      });
    }
  }

  onFileAttachmentUploadError(error: string): void {
    this.fileError = error;
    this.messageService.add({ severity: 'error', summary: 'Error', detail: error });
  }

  onFilePreview(file: FileInfoS): void {
    if (!file.id && !file.url) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se puede previsualizar el archivo' 
      });
      return;
    }

    const downloadUrl = file.id 
      ? this.fileAttachmentService.getDownloadUrl(file.id)
      : file.url!;

    this.http.get(downloadUrl, { responseType: 'blob' })
      .pipe(takeUntil(this.destroy$))
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

  onFileMarkedForDeletion(fileId: string): void {
    
    if (!this.archivoOriginalId) {
      this.archivoOriginalId = fileId;
    }
    
    this.archivoPendienteEliminacion = true;
    
    if (this.uploadedFileId === fileId) {
      this.uploadedFileId = null;
      this.selectedFile = null;
    }
    
    this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
    
    this.messageService.add({
      severity: 'info',
      summary: 'Archivo marcado para eliminación',
      detail: 'El archivo se eliminará al guardar el registro con un archivo de reemplazo'
    });
    
    this.cdr.markForCheck();
  }

  previewArchivoTabla(archivoId: string): void {
    if (!archivoId) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se puede previsualizar el archivo' 
      });
      return;
    }

    const downloadUrl = this.fileAttachmentService.getDownloadUrl(archivoId);
    this.http.get(downloadUrl, { responseType: 'blob' })
      .pipe(takeUntil(this.destroy$))
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

  onRealUploadNeeded(files: File[]): void {
    if (!files || files.length === 0) {
      return;
    }

    if (!this.personaId) {
      const errorMsg = 'ID de persona no disponible. No se puede subir el archivo.';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
      return;
    }

    const uploadObservables = files.map(file => 
      this.fileAttachmentService.uploadFile(file, this.fileAttachmentConfig, this.personaId!)
    );

    forkJoin(uploadObservables).pipe(takeUntil(this.destroy$)).subscribe({
      next: (responses: any[]) => {
        const uploadedFiles: FileInfoS[] = responses.map((r, idx) => ({
          id: r.id,
          name: r.nombre || files[idx]?.name || 'archivo',
          size: r.tamano || files[idx]?.size || 0,
          type: r.tipoContenido || files[idx]?.type || 'application/octet-stream',
          uploadDate: new Date(r.fechaSubida || Date.now()),
          url: this.fileAttachmentService.getDownloadUrl(r.id)
        }));

        this.existingFiles = uploadedFiles;
        this.uploadedFileId = uploadedFiles[0]?.id || null;
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Archivo(s) subido(s) correctamente' });
      },
      error: (err) => {
        const msg = err?.message || 'Error subiendo archivos';
        this.fileError = msg;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
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

  hasFileAttached(): boolean {
    return !!(this.uploadedFileId || (this.existingFiles && this.existingFiles.length > 0));
  }

  isEditingWithoutFile(): boolean {
    return this.isEditando && !this.hasFileAttached();
  }
}