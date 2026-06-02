import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { DialogModule } from 'primeng/dialog';


// Componentes compartidos
import { InfoTableComponent, TableColumn, TableAction, ImageViewerWithCacheComponent } from '@microfrontends/shared-ui';
import { CvViewerComponent } from '../../shared/components/cv-viewer/cv-viewer.component';

// Servicios y modelos
import { PersonasService } from '../../core/services/personas.service';
import { environment } from '@shared/shared-environments';
import { FotoPerfilService } from '../../core/services/foto-perfil.service';
import { PdfService } from '../../core/services/pdf.service';
import { Persona } from '../../core/models/persona.model';

@Component({
  selector: 'app-banco-hojas-de-vida',
  standalone: true,
  imports: [
    CommonModule,
    InfoTableComponent,
    ToastModule,
    AvatarModule,
    TagModule,
    ButtonModule,
    CardModule,
    PanelModule,
    DialogModule,
    CvViewerComponent,
    ImageViewerWithCacheComponent
  ],
  providers: [MessageService],
  templateUrl: './banco-hojas-de-vida.component.html',
  styleUrl: './banco-hojas-de-vida.component.scss',
})
export class BancoHojasDeVidaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  environment = environment;
  personas: Persona[] = [];
  loading = false;
  
  displayDialog = false;
  personaSeleccionada: Persona | null = null;
  
  generatingPdf = false;
  generatingPdfWithAttachments = false;

  tableColumns: TableColumn[] = [
    { 
      field: 'foto', 
      header: 'Foto', 
      type: 'custom',
      width: '80px',
      align: 'center'
    },
    { 
      field: 'nombreCompleto', 
      header: 'Nombre Completo', 
      type: 'text',
      sortable: true,
      filterable: true
    },
    { 
      field: 'identificacion', 
      header: 'Identificación', 
      type: 'text',
      sortable: true,
      filterable: true
    },
    { 
      field: 'correo', 
      header: 'Correo Electrónico', 
      type: 'text',
      sortable: true,
      filterable: true
    },
    { 
      field: 'celular1', 
      header: 'Celular', 
      type: 'text',
      filterable: true
    },
    { 
      field: 'ciudadResidencia', 
      header: 'Ciudad', 
      type: 'text',
      sortable: true,
      filterable: true
    },
    { 
      field: 'area', 
      header: 'Área de Interés', 
      type: 'text',
      sortable: true,
      filterable: true
    },
    { 
      field: 'hojaVidaStatus', 
      header: 'Estado', 
      type: 'badge',
      align: 'center',
      badgeConfig: {
        getSeverity: (value: boolean) => value ? 'success' : 'warn',
        getLabel: (value: boolean) => value ? 'Completa' : 'Incompleta'
      }
    }
  ];

  tableActions: TableAction[] = [
    {
      icon: 'pi pi-eye',
      tooltip: 'Ver perfil completo',
      severity: 'info',
      onClick: (row: Persona) => this.verPerfil(row)
    },
    {
      icon: 'pi pi-file-pdf',
      tooltip: 'Descargar hoja de vida en PDF',
      severity: 'danger',
      onClick: (row: Persona) => this.descargarPDF(row)
    },
    {
      icon: 'pi pi-file-excel',
      tooltip: 'Descargar datos en CSV',
      severity: 'success',
      onClick: (row: Persona) => this.descargarCsv(row)
    }
  ];

  globalFilterFields = [
    'nombreCompleto',
    'identificacion',
    'correo',
    'celular1',
    'ciudadResidencia',
    'area'
  ];

  constructor(
    private personasService: PersonasService,
    private fotoPerfilService: FotoPerfilService,
    private pdfService: PdfService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPersonas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarPersonas(): void {
    this.loading = true;
    
    this.personasService.obtenerPersonas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (personas) => {
          this.personas = personas.map(persona => ({
            ...persona,
            nombreCompleto: this.obtenerNombreCompleto(persona),
            hojaVidaStatus: persona.hojaVidaPresentada || false
          }));
          
          this.loading = false;
          
          this.messageService.add({
            severity: 'success',
            summary: 'Datos cargados',
            detail: `Se cargaron ${this.personas.length} hojas de vida`,
            life: 3000
          });
        },
        error: (error) => {
          this.loading = false;
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las hojas de vida',
            life: 5000
          });
        }
      });
  }

  obtenerNombreCompleto(persona: Persona): string {
    const partes = [
      persona.primerNombre,
      persona.segundoNombre,
      persona.primerApellido,
      persona.segundoApellido
    ].filter(Boolean);
    
    return partes.join(' ');
  }

  obtenerIniciales(persona: Persona): string {
    const iniciales = [
      persona.primerNombre?.charAt(0),
      persona.primerApellido?.charAt(0)
    ].filter(Boolean).join('');
    
    return iniciales.toUpperCase();
  }

  verPerfil(persona: Persona): void {
    if (!persona.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede ver el perfil: ID de persona no disponible',
        life: 3000
      });
      return;
    }

    this.loading = true;
    this.personasService.obtenerPersonaPorId(persona.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (personaCompleta) => {
          this.personaSeleccionada = personaCompleta;
          this.displayDialog = true;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la información completa del perfil',
            life: 5000
          });
        }
      });
  }

  cerrarDialog(): void {
    this.displayDialog = false;
    this.personaSeleccionada = null;
  }

  descargarCsv(persona: Persona): void {
    if (!persona.id) return;
    
    this.personasService.descargarExcelPersona(persona.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const nombreCompleto = this.obtenerNombreCompleto(persona);
        const fecha = new Date().toISOString().split('T')[0];
        link.download = `${nombreCompleto.replace(/\s+/g, '_')}_${fecha}.zip`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Archivo CSV de ${nombreCompleto} descargado correctamente`,
          life: 3000
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo descargar el archivo CSV',
          life: 5000
        });
      }
    });
  }

  async descargarPDF(persona: Persona): Promise<void> {
    if (!persona.id) return;
    
    this.generatingPdf = true;
    try {
      const pdfBlob = await this.pdfService.downloadPdfByPersonaId(persona.id).toPromise();
      if (pdfBlob) {
        const nombreCompleto = `${persona.primerNombre} ${persona.segundoNombre || ''}`.trim();
        const filename = this.pdfService.generatePdfFilename(
          nombreCompleto,
          persona.primerApellido,
          persona.segundoApellido,
          false 
        );
        this.pdfService.downloadPdf(pdfBlob, filename);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `PDF de ${this.obtenerNombreCompleto(persona)} generado y descargado`,
          life: 3000
        });
      }
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo generar el PDF',
        life: 5000
      });
    } finally {
      this.generatingPdf = false;
    }
  }

  async descargarPDFConAdjuntos(persona: Persona): Promise<void> {
    if (!persona.id) return;
    
    this.generatingPdfWithAttachments = true;
    try {
      const pdfBlob = await this.pdfService.downloadPdfWithAttachmentsByPersonaId(persona.id).toPromise();
      if (pdfBlob) {
        const nombreCompleto = `${persona.primerNombre} ${persona.segundoNombre || ''}`.trim();
        const filename = this.pdfService.generatePdfFilename(
          nombreCompleto,
          persona.primerApellido,
          persona.segundoApellido,
          true 
        );
        this.pdfService.downloadPdf(pdfBlob, filename);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `PDF completo de ${this.obtenerNombreCompleto(persona)} generado y descargado`,
          life: 3000
        });
      }
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo generar el PDF completo',
        life: 5000
      });
    } finally {
      this.generatingPdfWithAttachments = false;
    }
  }

  refrescarDatos(): void {
    this.cargarPersonas();
  }
}
