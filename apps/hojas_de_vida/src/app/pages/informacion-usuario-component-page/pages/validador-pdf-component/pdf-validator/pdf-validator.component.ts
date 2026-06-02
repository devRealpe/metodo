import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PdfValidatorService } from './pdf-validator.service';
// import { PdfValidatorService } from './pdf-validator.service';

export interface PdfValidationResult {
  isValid: boolean;
  documentType: string;
  confidence: number;
  criteria: Array<{
    criterion: string;
    satisfied: boolean;
    confidence: number;
    details?: string;
  }>;
  message?: string;
  error?: string;
}

export interface PdfValidatorConfig {
  expectedDocumentType: 'Social_Security_Affiliation' | 'Employment_Document' | 'Educational_Certificate';
  acceptedMimeTypes: string[];
  maxFileSize: number; // en bytes
  allowMultipleFiles: boolean;
  showDetailedResults: boolean;
  autoValidateOnSelect: boolean;
}

@Component({
  selector: 'app-pdf-validator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    FileUploadModule,
    ProgressBarModule,
    MessageModule,
    CardModule,
    BadgeModule,
    TooltipModule
  ],
  templateUrl: './pdf-validator.component.html',
  styleUrls: ['./pdf-validator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdfValidatorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Configuración del componente
  @Input() config: PdfValidatorConfig = {
    expectedDocumentType: 'Social_Security_Affiliation',
    acceptedMimeTypes: ['application/pdf'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowMultipleFiles: false,
    showDetailedResults: true,
    autoValidateOnSelect: true
  };

  @Input() moduleType: string = 'afiliacion'; // Nuevo: para identificar el módulo

  // Eventos emitidos
  @Output() validationComplete = new EventEmitter<PdfValidationResult>();
  @Output() validationStart = new EventEmitter<File>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileRejected = new EventEmitter<{file: File, reason: string}>();
  @Output() validationError = new EventEmitter<string>();
  @Output() validFileAccepted = new EventEmitter<{file: File, validationResult: PdfValidationResult}>();

  @ViewChild('fileUpload', { static: false }) fileUpload!: ElementRef;

  // Estado del componente
  isValidating = false;
  selectedFile: File | null = null;
  validationResult: PdfValidationResult | null = null;
  fileError: string | null = null;
  uploadProgress = 0;

  // Formulario para el archivo
  validatorForm: FormGroup;

  // Servicios inyectados
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);
  private pdfValidatorService = inject(PdfValidatorService);

  // Mapeo de tipos de documento para mostrar
  documentTypeLabels: Record<string, string> = {
    'Social_Security_Affiliation': 'Afiliación a Seguridad Social',
    'Employment_Document': 'Documento Laboral',
    'Educational_Certificate': 'Certificado Educativo'
  };

  constructor() {
    this.validatorForm = this.fb.group({
      file: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Configurar validaciones dinámicas basadas en la configuración
    this.setupDynamicValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDynamicValidation(): void {
    // Actualizar validaciones basadas en config
    const fileControl = this.validatorForm.get('file');
    if (fileControl) {
      fileControl.setValidators([
        Validators.required,
        this.createFileValidator()
      ]);
      fileControl.updateValueAndValidity();
    }
  }

  private createFileValidator() {
    return (control: any) => {
      const file: File = control.value;
      if (!file) return null;

      // Validar tipo MIME
      if (!this.config.acceptedMimeTypes.includes(file.type)) {
        return {
          invalidType: {
            actualType: file.type,
            expectedTypes: this.config.acceptedMimeTypes
          }
        };
      }

      // Validar tamaño
      if (file.size > this.config.maxFileSize) {
        return {
          fileTooLarge: {
            actualSize: file.size,
            maxSize: this.config.maxFileSize
          }
        };
      }

      return null;
    };
  }

  /**
   * Maneja la selección de archivos
   */
  onFileSelect(event: any): void {
    const files = event.files || event.target.files;
    if (!files || files.length === 0) {
      this.clearSelection();
      return;
    }

    const file = files[0];
    
    // Validar archivo antes de procesar
    if (!this.validateFile(file)) {
      return;
    }

    this.selectedFile = file;
    this.validatorForm.patchValue({ file });
    this.fileError = null;
    this.validationResult = null;

    this.fileSelected.emit(file);

    // Auto-validar si está configurado
    if (this.config.autoValidateOnSelect) {
      this.validatePdf();
    }

    this.cdr.markForCheck();
  }

  /**
   * Valida un archivo antes de procesarlo
   */
  private validateFile(file: File): boolean {
    // Validar tipo MIME
    if (!this.config.acceptedMimeTypes.includes(file.type)) {
      const error = `Tipo de archivo no válido. Se esperaba: ${this.config.acceptedMimeTypes.join(', ')}`;
      this.fileError = error;
      this.fileRejected.emit({ file, reason: error });
      this.cdr.markForCheck();
      return false;
    }

    // Validar tamaño
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = (this.config.maxFileSize / (1024 * 1024)).toFixed(1);
      const actualSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const error = `Archivo demasiado grande. Tamaño: ${actualSizeMB}MB, máximo permitido: ${maxSizeMB}MB`;
      this.fileError = error;
      this.fileRejected.emit({ file, reason: error });
      this.cdr.markForCheck();
      return false;
    }

    return true;
  }

  /**
   * Valida el PDF seleccionado
   */
  async validatePdf(): Promise<void> {
    if (!this.selectedFile) {
      this.fileError = 'Por favor, seleccione un archivo PDF para validar';
      this.cdr.markForCheck();
      return;
    }

    if (this.validatorForm.invalid) {
      this.fileError = 'El archivo seleccionado no es válido';
      this.cdr.markForCheck();
      return;
    }

    this.isValidating = true;
    this.uploadProgress = 0;
    this.fileError = null;
    this.validationResult = null;
    this.cdr.markForCheck();

    this.validationStart.emit(this.selectedFile);

    try {
      // Simular progreso de upload
      this.simulateUploadProgress();

      // Llamar al servicio de validación usando configuración del módulo
      const result = await this.pdfValidatorService.validatePdfForModule(
        this.selectedFile,
        this.moduleType
      ).pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isValidating = false;
          this.uploadProgress = 100;
          this.cdr.markForCheck();
        })
      ).toPromise();

      if (result) {
        this.validationResult = result;
        this.validationComplete.emit(result);

        // Verificar si el documento es válido y del tipo correcto
        const isValidAndCorrectType = result.isValid && this.isCorrectDocumentType;

        if (isValidAndCorrectType) {
          // Emitir evento para habilitar file-attachment automáticamente
          this.validFileAccepted.emit({
            file: this.selectedFile!,
            validationResult: result
          });

          this.messageService.add({
            severity: 'success',
            summary: 'Documento Válido',
            detail: 'El archivo ha sido validado y agregado automáticamente'
          });
        } else if (result.isValid && !this.isCorrectDocumentType) {
          // Documento válido pero tipo incorrecto para el módulo
          this.messageService.add({
            severity: 'warn',
            summary: 'Tipo de Documento Incorrecto',
            detail: `Se detectó ${this.documentTypeLabel}, pero se esperaba ${this.expectedDocumentLabel}`
          });
        } else {
          // Documento no válido
          this.messageService.add({
            severity: 'warn',
            summary: 'Documento No Válido',
            detail: result.message || 'El documento no cumple con los criterios esperados'
          });
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la validación';
      this.fileError = errorMessage;
      this.validationError.emit(errorMessage);
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error de Validación',
        detail: errorMessage
      });
    }
  }

  /**
   * Simula el progreso de upload para mejorar UX
   */
  private simulateUploadProgress(): void {
    const interval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += Math.random() * 30;
        this.cdr.markForCheck();
      } else {
        clearInterval(interval);
      }
    }, 500);
  }

  /**
   * Limpia la selección actual
   */
  clearSelection(): void {
    this.selectedFile = null;
    this.validationResult = null;
    this.fileError = null;
    this.uploadProgress = 0;
    this.validatorForm.reset();
    
    // Limpiar el input de archivo
    if (this.fileUpload?.nativeElement) {
      this.fileUpload.nativeElement.value = '';
    }
    
    this.cdr.markForCheck();
  }

  /**
   * Revalida el archivo actual
   */
  revalidate(): void {
    if (this.selectedFile) {
      this.validatePdf();
    }
  }

  /**
   * Getters para el template
   */
  get hasFile(): boolean {
    return !!this.selectedFile;
  }

  get hasValidationResult(): boolean {
    return !!this.validationResult;
  }

  get isValidDocument(): boolean {
    return this.validationResult?.isValid || false;
  }

  get isCorrectDocumentType(): boolean {
    if (!this.validationResult) return false;
    return this.validationResult.documentType === this.config.expectedDocumentType;
  }

  getValidationMessage(): string {
    if (!this.validationResult) return '';
    
    const isValid = this.isValidDocument;
    const isCorrectType = this.isCorrectDocumentType;
    
    if (isValid && isCorrectType) {
      return 'Documento válido';
    }
    
    if (isValid && !isCorrectType) {
      return `Tipo detectado: ${this.documentTypeLabel}`;
    }
    
    return `Tipo detectado: ${this.documentTypeLabel}`;
  }

  get documentTypeLabel(): string {
    if (!this.validationResult) return '';
    return this.documentTypeLabels[this.validationResult.documentType as keyof typeof this.documentTypeLabels] || this.validationResult.documentType;
  }

  get confidencePercentage(): number {
    return this.validationResult ? Math.round(this.validationResult.confidence * 100) : 0;
  }

  get confidenceColor(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const confidence = this.confidencePercentage;
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warn';
    return 'danger';
  }

  get expectedDocumentLabel(): string {
    return this.documentTypeLabels[this.config.expectedDocumentType] || this.config.expectedDocumentType;
  }

  get maxFileSizeMB(): string {
    return (this.config.maxFileSize / (1024 * 1024)).toFixed(1);
  }

  get selectedFileSizeMB(): string {
    return this.selectedFile ? (this.selectedFile.size / (1024 * 1024)).toFixed(1) : '0';
  }
}