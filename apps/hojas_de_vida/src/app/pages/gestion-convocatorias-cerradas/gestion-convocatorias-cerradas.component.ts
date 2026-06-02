import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AccordionModule } from 'primeng/accordion';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { OfertaLaboralService } from '../../core/services/ofertas-laborales.service';
import { PostulacionesSeleccionadasService } from '../../core/services/postulaciones-seleccionadas.service';
import { OfertaLaboral } from '../../core/models/oferta-laboral.model';
import { PostulacionSeleccionada } from '../../core/models/postulacion-seleccionada.model';
import { environment } from '@shared/shared-environments';
import { ImageViewerWithCacheComponent } from '@microfrontends/shared-ui';
import { InputTextModule } from 'primeng/inputtext';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-gestion-convocatorias-cerradas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    TableModule,
    TagModule,
    DialogModule,
    ProgressSpinnerModule,
    AccordionModule,
    AvatarModule,
    BadgeModule,
    ImageViewerWithCacheComponent,
    InputTextModule,
    BreadcrumbModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gestion-convocatorias-cerradas.component.html',
  styleUrls: ['./gestion-convocatorias-cerradas.component.scss']
})
export class GestionConvocatoriasCerradasComponent implements OnInit, OnDestroy {
  
  convocatorias: OfertaLaboral[] = [];
  convocatoriasFiltradas: OfertaLaboral[] = [];
  convocatoriaSeleccionada: OfertaLaboral | null = null;
  candidatosSeleccionados: PostulacionSeleccionada[] = [];
  loading = false;
  loadingCandidatos = false;
  filtroTexto: string = '';
  
  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/app/ofertas-laborales' };
  
  protected readonly environment = environment;

  constructor(
    private ofertaService: OfertaLaboralService,
    private postulacionesSeleccionadasService: PostulacionesSeleccionadasService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarConvocatoriasCerradas();
  }

  cargarConvocatoriasCerradas(): void {
    this.loading = true;
    
    this.ofertaService.getConvocatoriasCerradas().subscribe({
      next: (convocatorias) => {
        this.convocatorias = convocatorias.sort((a, b) => {
          const fechaA = new Date(a.fechaCierre).getTime();
          const fechaB = new Date(b.fechaCierre).getTime();
          return fechaB - fechaA; 
        });
        this.convocatoriasFiltradas = [...this.convocatorias];
        this.loading = false;

        if (this.convocatorias.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'No hay convocatorias cerradas',
            life: 3000
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las convocatorias cerradas',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  cargarCandidatosSeleccionados(convocatoria: OfertaLaboral): void {
    if (!convocatoria.id) return;

    this.convocatoriaSeleccionada = convocatoria;
    this.loadingCandidatos = true;
    
    this.postulacionesSeleccionadasService.listarPorOferta(convocatoria.id).subscribe({
      next: (candidatos) => {
        this.candidatosSeleccionados = candidatos;
        this.loadingCandidatos = false;

        if (candidatos.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'No hay candidatos seleccionados para esta convocatoria',
            life: 3000
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los candidatos seleccionados',
          life: 5000
        });
        this.loadingCandidatos = false;
      }
    });
  }

  verHojaDeVida(candidato: PostulacionSeleccionada): void {
    if (!candidato.postulacion?.personaId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'No se pudo obtener la información del candidato',
        life: 3000
      });
      return;
    }

    this.router.navigate(['/app/visor-hoja-vida', candidato.postulacion.personaId], {
      state: {
        candidato: candidato,
        convocatoria: this.convocatoriaSeleccionada
      }
    });
  }

  getInitials(nombre: string | undefined): string {
    if (!nombre) return '?';
    const parts = nombre.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  formatFecha(fecha: Date | string | undefined): string {
    if (!fecha) return '-';
    
    try {
      const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
      
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  }

  descargarCsvConvocatoria(convocatoria: OfertaLaboral): void {
    if (!convocatoria.id) {
      return;
    }

    this.postulacionesSeleccionadasService.descargarCsvSeleccionados(convocatoria.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const fecha = new Date().toISOString().split('T')[0];
        const nombreOferta = convocatoria.cargoRequerido?.replace(/\s+/g, '_') || 'convocatoria';
        link.download = `candidatos_${nombreOferta}_${fecha}.zip`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Archivo ZIP con CSVs descargado correctamente',
          life: 3000
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el archivo ZIP',
          life: 5000
        });
      }
    });
  }

  enviarCorreo(convocatoria: OfertaLaboral): void {
    if (!convocatoria.id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de enviar los correos de resultado del proceso de selección a los postulantes no seleccionados de la convocatoria "${convocatoria.cargoRequerido}"?`,
      header: 'Confirmar envío de correos',
      icon: 'pi pi-envelope',
      acceptLabel: 'Enviar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.postulacionesSeleccionadasService.enviarCorreosNoSeleccionados(convocatoria.id!).subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Correos enviados',
              detail: `Se enviaron ${response.enviados} correos de notificación`,
              life: 5000
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudieron enviar los correos de notificación',
              life: 5000
            });
          }
        });
      }
    });
  }

  aplicarFiltro(): void {
    const textoLower = this.filtroTexto.toLowerCase().trim();
    
    if (!textoLower) {
      this.convocatoriasFiltradas = [...this.convocatorias];
      return;
    }

    this.convocatoriasFiltradas = this.convocatorias.filter(conv => {
      return (
        conv.cargoRequerido?.toLowerCase().includes(textoLower) ||
        conv.numeroConvocatoria?.toLowerCase().includes(textoLower) ||
        conv.departamentoSolicitante?.toLowerCase().includes(textoLower) ||
        conv.tipoConvocatoria?.toLowerCase().includes(textoLower) ||
        conv.tipoContrato?.toLowerCase().includes(textoLower) ||
        conv.periodo?.toLowerCase().includes(textoLower)
      );
    });
  }

  limpiarFiltro(): void {
    this.filtroTexto = '';
    this.convocatoriasFiltradas = [...this.convocatorias];
  }

  ngOnDestroy(): void {
  }
}
