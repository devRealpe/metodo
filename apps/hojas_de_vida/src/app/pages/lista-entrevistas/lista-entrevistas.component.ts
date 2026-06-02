import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

// Services
import { EntrevistasService } from '@microfrontends/shared-services';

// Models
import { EntrevistaDto } from '../../core/models/entrevista.model';

@Component({
  selector: 'app-lista-entrevistas',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './lista-entrevistas.component.html',
  styleUrl: './lista-entrevistas.component.scss'
})
export class ListaEntrevistasComponent implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private entrevistasService = inject(EntrevistasService);
  private messageService = inject(MessageService);

  postulacionId: string | null = null;  // ← Cambiar de number a string (UUID)
  nombreAspirante: string = '';
  entrevista: EntrevistaDto | null = null;
  
  loading = false;
  entrevistaCargada = false;

  ngOnInit(): void {
    // Obtener postulacionId y nombreAspirante de los queryParams
    this.route.queryParams.subscribe(params => {
      const postulacionIdParam = params['postulacionId'];
      this.nombreAspirante = params['nombreAspirante'] || 'Candidato';
      
      if (postulacionIdParam) {
        // El ID es un UUID, debe mantenerse como string, NO convertir a número
        this.postulacionId = postulacionIdParam;
        this.cargarEntrevista();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se especificó un candidato'
        });
        this.router.navigate(['/app/ofertas-finalizadas']);
      }
    });
  }

  cargarEntrevista(): void {
    if (!this.postulacionId) return;

    this.loading = true;
    this.entrevistaCargada = false;

    this.entrevistasService.obtenerEntrevistaPorPostulacion(this.postulacionId).subscribe({
      next: (entrevista: EntrevistaDto | null) => {
        this.entrevista = entrevista;
        this.entrevistaCargada = true;
        this.loading = false;
        
        if (!entrevista) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin entrevista',
            detail: 'Este candidato aún no tiene una entrevista registrada'
          });
        }
      },
      error: (error: any) => {
        this.loading = false;
        this.entrevistaCargada = true;
        
        this.messageService.add({
          severity: 'warn',
          summary: 'Error',
          detail: 'No se pudo cargar la entrevista del candidato'
        });
      }
    });
  }

  descargarPdfEntrevista(): void {
    if (!this.entrevista?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede descargar el PDF de esta entrevista'
      });
      return;
    }

    this.entrevistasService.generarPDF(this.entrevista.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `entrevista_${this.nombreAspirante}_${this.formatFecha(this.entrevista!.fechaEntrevista)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'PDF descargado correctamente'
        });
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo descargar el PDF de la entrevista'
        });
      }
    });
  }

  editarEntrevista(): void {
    if (!this.entrevista?.id) return;
    
    this.router.navigate(['/app/entrevistas/editar', this.entrevista.id], {
      queryParams: { desde: 'fase2' }
    });
  }

  getEstadoLabel(estado: string | undefined): string {
    const estadoMap: { [key: string]: string } = {
      'COMPLETADA': 'Completada',
      'PROGRAMADA': 'Programada',
      'CANCELADA': 'Cancelada',
      'EN_PROCESO': 'En Proceso',
      'borrador': 'Borrador',
      'en_revision': 'En Revisión',
      'finalizado': 'Finalizado',
      'aprobado': 'Aprobado'
    };
    return estado ? (estadoMap[estado] || estado) : 'Sin estado';
  }

  getNombreCreadoPor(creadoPor: string | undefined): string {
    if (!creadoPor) return 'No asignado';
    
    // Si contiene @, es un email - formatear como nombre
    if (creadoPor.includes('@')) {
      const nombre = creadoPor.split('@')[0];
      return nombre
        .split('.')
        .map(n => n.charAt(0).toUpperCase() + n.slice(1))
        .join(' ');
    }
    
    // El backend ya resuelve UUIDs a nombres completos
    return creadoPor;
  }

  getEstadoSeverity(estado: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: { [key: string]: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' } = {
      'borrador': 'warn',
      'en_revision': 'info',
      'finalizado': 'success',
      'aprobado': 'success'
    };
    return estado ? (severityMap[estado] || 'secondary') : 'secondary';
  }

  formatFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return 'N/A';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getInitials(fullName: string | undefined): string {
    if (!fullName) return 'NA';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  getCompetenciasEvaluadas(): any[] {
    if (!this.entrevista?.competenciasCardinales || !this.entrevista.competenciasCardinales.length) {
      return [];
    }
    return this.entrevista.competenciasCardinales;
  }

  getPromedioCompetencias(): string {
    const competencias = this.getCompetenciasEvaluadas();
    if (competencias.length === 0) return '0';
    const calificadas = competencias.filter(c => c.calificacion != null && c.calificacion > 0);
    if (calificadas.length === 0) return '0';
    const suma = calificadas.reduce((acc: number, c: any) => acc + (c.calificacion || 0), 0);
    return (suma / calificadas.length).toFixed(2);
  }

  getCalificacionSeverity(calificacion: number | undefined | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (calificacion == null) return 'secondary';
    if (calificacion >= 4) return 'success';
    if (calificacion >= 3) return 'info';
    if (calificacion >= 2) return 'warn';
    return 'danger';
  }

  getCargoFirmaLabel(cargo: string | undefined): string {
    const cargoMap: { [key: string]: string } = {
      'decano': 'Decano',
      'director': 'Director',
      'experto_tecnico': 'Experto Técnico',
      'psicologo': 'Psicólogo'
    };
    return cargo ? (cargoMap[cargo] || cargo) : 'Sin cargo';
  }

  volver(): void {
    this.router.navigate(['/app/seleccionados-fase2']);
  }

}
