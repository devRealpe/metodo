import { Component, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ResumenService } from '../../core/services/resumen.service';
import { PersonasService } from '../../core/services/personas.service';
import { PdfService } from '../../core/services/pdf.service';
import { DocumentoSoporte } from '../../core/models/documento-soporte.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '@shared/shared-environments';
import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Persona } from '../../core/models/persona.model';
import { AuthService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-mi-hoja-vida-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    CurrencyPipe,
    CardModule,
    PanelModule,
    ButtonModule,
    MessageModule,
    DialogModule,
    FileUploadModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  templateUrl: './mi-hoja-vida-component.html',
  providers: [MessageService, ConfirmationService],
})
export class MiHojaVidaComponent implements OnInit, OnDestroy {

  persona: Persona | null = null;
  generatingPdf = false;
  generatingPdfWithAttachments = false;
  previewingPdf = false;

  fotoPerfilUrl: string | null = null;
  personaId: string | null = null;
  mostrarDialogoFoto = false;
  subiendoFoto = false;
  private previousBlobUrl: string | null = null; 
  private destroy$ = new Subject<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private personaService: PersonasService,
    private messageService: MessageService,
    private pdfService: PdfService,
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private fotoPerfilService: FotoPerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscribeToFotoChanges();
    this.cargarDatosUsuario();
  }

  private subscribeToFotoChanges() {
    this.fotoPerfilService.fotoUrl$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(url => {
      if (this.previousBlobUrl && this.previousBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.previousBlobUrl);
      }
      
      this.fotoPerfilUrl = url;
      this.previousBlobUrl = url;
      this.cdr.markForCheck();
    });
  }

  private cargarDatosUsuario(): void {
    this.personaService.getPersonaActual().subscribe(
      (persona: any) => {
        if (persona) {
          if (persona.informacionesAcademicas && !persona.informacionAcademica) {
            persona.informacionAcademica = persona.informacionesAcademicas;
          }
          if (persona.informacionesLaborales && !persona.informacionLaboral) {
            persona.informacionLaboral = persona.informacionesLaborales;
          }
          if (persona.destrezas && !persona.competencias) {
            persona.competencias = persona.destrezas;
          }
        }

        this.persona = persona;
        this.personaId = persona.id ?? null;
        if (this.personaId) {
          this.cargarFotoPerfil(this.personaId);
        }
      },
      () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información de la hoja de vida. Intente de nuevo más tarde.',
        });
      }
    );
  }

  get edad(): number | null {
    if (!this.persona?.fechaNacimiento) {
      return null;
    }

    const fechaNacimiento = new Date(this.persona.fechaNacimiento);
    const hoy = new Date();
    
    if (isNaN(fechaNacimiento.getTime())) {
      return null;
    }
    
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const diferenciaMeses = hoy.getMonth() - fechaNacimiento.getMonth();
    
    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
      edad--;
    }
    
    if (edad < 0 || edad > 150) {
      return null;
    }
    
    return edad;
  }

  getGeneroLabel(genero: string | null | undefined): string {
    switch (genero) {
      case 'M':
      case 'Masculino':
        return 'Masculino';
      case 'F':
      case 'Femenino':
        return 'Femenino';
      case 'L':
      case 'OSIGD':
        return 'OSIGD';
      default:
        return 'Otro';
    }
  }

  private cargarFotoPerfil(personaId: string) {
    const fotoUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas/${personaId}/foto`;
    
    this.http.get(fotoUrl, { 
      responseType: 'blob', 
      observe: 'response',
      withCredentials: true 
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.status !== 204 && response.body && response.body.size > 0) {
          this.blobToBase64(response.body).then(base64 => {
            const nuevaUrl = base64 as string;
            this.fotoPerfilService.updateFotoUrl(nuevaUrl);
          }).catch(error => {
            this.fotoPerfilService.updateFotoUrl(null);
          });
        } else {
          this.fotoPerfilService.updateFotoUrl(null);
        }
      },
      error: (error) => {
        if (error.status === 404) {
          } else {
        }
        this.fotoPerfilService.updateFotoUrl(null);
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  abrirDialogoFoto() {
    if (!this.personaId) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Advertencia', 
        detail: 'Primero debe completar la información personal' 
      });
      return;
    }
    this.mostrarDialogoFoto = true;
  }

  abrirSelectorArchivo() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    let file: File | null = null;

    if (event.files && event.files.length > 0) {
      file = event.files[0];
    } else if (event.target && event.target.files.length > 0) {
      file = event.target.files[0];
    }

    if (file && this.personaId) {
      this.subirFoto(file);
      this.mostrarDialogoFoto = false;
    }
  }

  subirFoto(file: File) {
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'El archivo debe ser una imagen' 
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'La imagen no puede superar 5MB' 
      });
      return;
    }
    
    this.subiendoFoto = true;
    this.personaService.subirFoto(this.personaId!, file).subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: 'Foto actualizada' 
        });
        
        this.cargarFotoPerfil(this.personaId!);
        
        this.mostrarDialogoFoto = false;
        this.subiendoFoto = false;
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      },
      error: () => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudo subir la foto' 
        });
        this.subiendoFoto = false;
      }
    });
  }

  eliminarFoto() {
    if (!this.personaId) return;

    this.confirmationService.confirm({
      message: '¿Está seguro que desea eliminar la foto?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.personaService.eliminarFoto(this.personaId!).subscribe({
          next: () => {
            this.fotoPerfilService.updateFotoUrl(null);
            
            this.mostrarDialogoFoto = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Foto eliminada' 
            });
          },
          error: () => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'No se pudo eliminar la foto' 
            });
          }
        });
      }
    });
  }

  /**
   * Devuelve la lista de requisitos obligatorios que aún no se cumplen.
   * Se requieren mínimo 2 informaciones familiares y 2 referencias personales.
   */
  getRequisitosIncumplidos(): string[] {
    const faltantes: string[] = [];
    const familiares = this.persona?.informacionesFamiliares?.length ?? 0;
    const referencias = this.persona?.referencias?.length ?? 0;
    if (familiares < 2) {
      const faltan = 2 - familiares;
      faltantes.push(
        familiares === 0
          ? 'Agregar al menos 2 registros de información familiar (no tiene ninguno).'
          : `Agregar ${faltan} registro${faltan > 1 ? 's' : ''} más de información familiar (tiene ${familiares}, se requieren mínimo 2).`
      );
    }
    if (referencias < 2) {
      const faltan = 2 - referencias;
      faltantes.push(
        referencias === 0
          ? 'Agregar al menos 2 referencias personales (no tiene ninguna).'
          : `Agregar ${faltan} referencia${faltan > 1 ? 's' : ''} personal${faltan > 1 ? 'es' : ''} más (tiene ${referencias}, se requieren mínimo 2).`
      );
    }
    return faltantes;
  }

  /** Indica si la hoja de vida cumple los requisitos mínimos para generar el PDF. */
  puedeGenerarPdf(): boolean {
    return this.getRequisitosIncumplidos().length === 0;
  }

  private mostrarAlertaRequisitos(): void {
    const faltantes = this.getRequisitosIncumplidos();
    faltantes.forEach(msg => {
      this.messageService.add({
        severity: 'warn',
        summary: 'Requisito incompleto',
        detail: msg,
        life: 6000,
      });
    });
  }

  async previewPDF(): Promise<void> {
    if (!this.personaId) return;
    if (!this.puedeGenerarPdf()) {
      this.mostrarAlertaRequisitos();
      return;
    }
    this.previewingPdf = true;
    try {
      const pdfBlob = await this.pdfService.previewPdfByPersonaId(this.personaId).toPromise();
      if (pdfBlob) {
        this.pdfService.openPdfInNewTab(pdfBlob);
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: 'Vista previa abierta con archivos adjuntos.' 
        });
      }
    } catch (error: any) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: error.message 
      });
    } finally {
      this.previewingPdf = false;
    }
  }

  async generatePDF(): Promise<void> {
    if (!this.personaId || !this.persona) return;
    if (!this.puedeGenerarPdf()) {
      this.mostrarAlertaRequisitos();
      return;
    }
    this.generatingPdf = true;
    try {
      const pdfBlob = await this.pdfService.downloadPdfByPersonaId(this.personaId).toPromise();
      if (pdfBlob) {
        const nombreCompleto = `${this.persona.primerNombre} ${this.persona.segundoNombre || ''}`.trim();
        const filename = this.pdfService.generatePdfFilename(
          nombreCompleto,
          this.persona.primerApellido,
          this.persona.segundoApellido,
          false
        );
        this.pdfService.downloadPdf(pdfBlob, filename);
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: 'PDF generado y descargado (sin archivos adjuntos).' 
        });
      }
    } catch (error: any) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: error.message 
      });
    } finally {
      this.generatingPdf = false;
    }
  }

  async generatePDFWithAttachments(): Promise<void> {
    if (!this.personaId || !this.persona) return;
    if (!this.puedeGenerarPdf()) {
      this.mostrarAlertaRequisitos();
      return;
    }
    this.generatingPdfWithAttachments = true;
    try {
      const pdfBlob = await this.pdfService.downloadPdfWithAttachmentsByPersonaId(this.personaId).toPromise();
      if (pdfBlob) {
        const nombreCompleto = `${this.persona.primerNombre} ${this.persona.segundoNombre || ''}`.trim();
        const filename = this.pdfService.generatePdfFilename(
          nombreCompleto,
          this.persona.primerApellido,
          this.persona.segundoApellido,
          true 
        );
        this.pdfService.downloadPdf(pdfBlob, filename);
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: 'PDF generado y descargado (con archivos adjuntos).' 
        });
      }
    } catch (error: any) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: error.message 
      });
    } finally {
      this.generatingPdfWithAttachments = false;
    }
  }

  hasAttachments(): boolean {
    if (!this.persona) return false;
    
    const hasAcademicFiles = this.persona.informacionAcademica?.some(info => 
      info.archivos && info.archivos.length > 0
    );

    const hasLaboralFiles = this.persona.informacionLaboral?.some(info =>
      info.archivos && info.archivos.length > 0
    );
    
    const hasAfiliacionFiles = this.persona.afiliaciones?.some(afiliacion => 
      afiliacion.archivos && afiliacion.archivos.length > 0
    );
    
    const hasFamiliarFiles = this.persona.informacionesFamiliares?.some(info => 
      info.archivos && info.archivos.length > 0
    );
    
    const hasDocumentoSoporteFiles = this.persona.documentosSoporte?.some(doc => 
      doc.archivos && doc.archivos.length > 0
    );
    
    return !!hasAcademicFiles || !!hasLaboralFiles || !!hasAfiliacionFiles || !!hasFamiliarFiles || !!hasDocumentoSoporteFiles;
  }

  getTotalAttachmentsCount(): number {
    if (!this.persona) return 0;
    
    let count = 0;
    
    this.persona.informacionAcademica?.forEach(info => {
      count += info.archivos?.length || 0;
    });

    this.persona.informacionLaboral?.forEach(info => {
      count += info.archivos?.length || 0;
    });
    
    this.persona.afiliaciones?.forEach(afiliacion => {
      count += afiliacion.archivos?.length || 0;
    });
    
    this.persona.informacionesFamiliares?.forEach(info => {
      count += info.archivos?.length || 0;
    });
    
    this.persona.documentosSoporte?.forEach(doc => {
      count += doc.archivos?.length || 0;
    });
    
    return count;
  }


  previewArchivo(archivoId: string): void {
    if (!archivoId) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se puede previsualizar el archivo' 
      });
      return;
    }

    const downloadUrl = `${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/descargar/${archivoId}`;
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

  ngOnDestroy() {
    if (this.previousBlobUrl && this.previousBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previousBlobUrl);
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  getFormattedTipoTitulo(tipoTitulo: string): string {
    return tipoTitulo || 'Tipo no especificado';
  }

  getFormattedInstitucion(institucion: string): string {
    return institucion || 'Institución no especificada';
  }

  getFormattedTipoAfiliacion(tipo: string): string {
    return tipo || 'Tipo no especificado';
  }

  getFormattedAdministradora(administradora: string): string {
    return administradora || 'Administradora no especificada';
  }
}