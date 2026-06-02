import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TimelineModule } from 'primeng/timeline';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';

import { InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';

import { PostulacionService } from '../../core/services/postulacion.service';
import { PersonasService } from '../../core/services/personas.service';

interface PostulacionEnriquecida {
  id?: string;
  personaId?: string;
  tituloPostulacion?: string;
  descripcion?: string;
  fechaPostulacion?: Date | string;
  estado?: string;
  aceptacionDeclaracion?: boolean;
  numeroConvocatoria?: string;
  cargoRequerido?: string;
  departamentoSolicitante?: string;
  
  fase1Aprobada?: boolean;
  fase1PuntajeFinal?: number;
  fase1FechaEvaluacion?: Date | string;
  
  fase2Seleccionado?: boolean;
  fase2FechaSeleccion?: Date | string;
  fase2SeleccionadoPor?: string;
  
  fase2EntrevistaRealizada?: boolean;
  fase2FechaEntrevista?: Date | string;
  fase2CalificacionFinal?: string;
  fase2EstadoEntrevista?: string;
  
  fase3Seleccionado?: boolean;
  fase3FechaSeleccion?: Date | string;
  
  oferta?: {
    id?: string;
    funciones?: string;
    fechaPublicacion?: Date | string;
    fechaCierre?: Date | string;
    numeroConvocatoria?: string;
    cargoRequerido?: string;
    departamentoSolicitante?: string;
    activo?: boolean;
  };
  
  convocatoria?: {
    id?: string;
  };
}

@Component({
  selector: 'app-mis-postulaciones',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressBarModule,
    TooltipModule,
    DialogModule,
    TimelineModule,
    ChipModule,
    DividerModule,
    InfoTableComponent
  ],
  templateUrl: './mis-postulaciones.component.html',
  styleUrls: ['./mis-postulaciones.component.scss']
})
export class MisPostulacionesComponent implements OnInit {
  
  postulaciones: PostulacionEnriquecida[] = [];
  loading: boolean = false;
  personaId: string | null = null;
  
  tableColumns: TableColumn[] = [];
  tableActions: TableAction[] = [];
  globalFilterFields: string[] = ['numeroConvocatoria', 'cargoRequerido', 'tituloPostulacion', 'departamentoSolicitante', 'estado', 'descripcion'];

  constructor(
    private postulacionService: PostulacionService,
    private personasService: PersonasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.configurarTabla();

    this.personasService.getPersonaActual().subscribe({
      next: (persona) => {
        this.personaId = persona?.id || null;

        if (this.personaId) {
          this.cargarPostulaciones();
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private configurarTabla(): void {
    this.tableColumns = [
      {
        field: 'numeroConvocatoria',
        header: 'N° Convocatoria',
        sortable: true,
        width: '12%',
        type: 'text'
      },
      {
        field: 'cargoRequerido',
        header: 'Cargo',
        sortable: true,
        width: '20%',
        type: 'text'
      },
      {
        field: 'departamentoSolicitante',
        header: 'Departamento',
        sortable: true,
        width: '15%',
        type: 'text'
      },
      {
        field: 'fechaPostulacion',
        header: 'Fecha',
        sortable: true,
        type: 'date',
        dateFormat: 'dd/MM/yyyy',
        width: '10%'
      },
      {
        field: 'progreso',
        header: 'Progreso',
        width: '18%',
        type: 'custom'
      },
      {
        field: 'estado',
        header: 'Estado',
        sortable: false,
        width: '10%',
        type: 'custom'
      }
    ];

    this.tableActions = [
      {
        icon: 'pi pi-eye',
        tooltip: 'Ver Detalle',
        severity: 'info',
        outlined: true,
        onClick: (row: PostulacionEnriquecida) => this.verPostulacion(row)
      }
    ];
  }

  cargarPostulaciones(): void {
    if (!this.personaId) {
      this.loading = false;
      return;
    }

    this.loading = true;

    this.postulacionService.obtenerPostulacionesEnriquecidas(this.personaId).subscribe({
      next: (postulaciones) => {
        this.postulaciones = postulaciones.map(p => this.mapearPostulacionEnriquecida(p));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private mapearPostulacionEnriquecida(data: any): PostulacionEnriquecida {
    return {
      id: data.id,
      personaId: data.personaId,
      tituloPostulacion: data.tituloPostulacion,
      descripcion: data.descripcion,
      fechaPostulacion: data.fechaPostulacion,
      estado: data.estado,
      aceptacionDeclaracion: data.aceptacionDeclaracion,
      numeroConvocatoria: data.numeroConvocatoria,
      cargoRequerido: data.cargoRequerido,
      departamentoSolicitante: data.departamentoSolicitante,
      
      // Fase 1
      fase1Aprobada: data.fase1?.aprobada,
      fase1PuntajeFinal: data.fase1?.puntajeFinal,
      fase1FechaEvaluacion: data.fase1?.fechaEvaluacion,
      
      // Fase 2
      fase2Seleccionado: data.fase2?.seleccionado,
      fase2FechaSeleccion: data.fase2?.fechaSeleccion,
      fase2SeleccionadoPor: data.fase2?.seleccionadoPor,
      fase2EntrevistaRealizada: data.fase2?.entrevistaRealizada,
      fase2FechaEntrevista: data.fase2?.fechaEntrevista,
      fase2CalificacionFinal: data.fase2?.calificacionFinal,
      fase2EstadoEntrevista: data.fase2?.estadoEntrevista,
      
      // Fase 3
      fase3Seleccionado: data.fase3?.seleccionado,
      fase3FechaSeleccion: data.fase3?.fechaSeleccion,
      
      // Oferta
      oferta: data.oferta,
      convocatoria: data.oferta ? { id: data.oferta.id } : undefined
    };
  }

  getEstadoSimple(postulacion: PostulacionEnriquecida): string {
    const fechaActual = new Date();
    const fechaCierre = postulacion.oferta?.fechaCierre ? new Date(postulacion.oferta.fechaCierre) : null;
    
    if (!fechaCierre) {
      return 'En Evaluación';
    }
    
    const convocatoriaCerrada = fechaActual > fechaCierre;
    
    if (!convocatoriaCerrada) {
      return 'En Evaluación';
    }
    
    const unaSemana = 7 * 24 * 60 * 60 * 1000; 
    const pasoUnaSemana = (fechaActual.getTime() - fechaCierre.getTime()) > unaSemana;
    
    if (pasoUnaSemana) {
      return 'Finalizada';
    }
    
    return 'En Evaluación';
  }

  getSeverity(estado: string): "success" | "info" | "warn" | "danger" | "secondary" {
    switch (estado?.toLowerCase()) {
      case 'en registro': return 'info';
      case 'en evaluación': return 'warn';
      case 'finalizada': return 'secondary';
      case 'activa': return 'info';
      case 'aprobada': return 'success';
      case 'rechazada': return 'danger';
      case 'en revision': return 'warn';
      default: return 'secondary';
    }
  }

  getEstadoProgreso(postulacion: PostulacionEnriquecida): { estado: string, fecha: Date | string | null, icon: string, color: string } {
    const fechaActual = new Date();
    const fechaCierre = postulacion.oferta?.fechaCierre ? new Date(postulacion.oferta.fechaCierre) : null;
    const convocatoriaCerrada = fechaCierre ? fechaActual > fechaCierre : false;
    
    const unaSemana = 7 * 24 * 60 * 60 * 1000; 
    const pasoUnaSemana = fechaCierre ? (fechaActual.getTime() - fechaCierre.getTime()) > unaSemana : false;

    if (postulacion.fase3Seleccionado && postulacion.fase3FechaSeleccion) {
      return {
        estado: 'Fase 3 - Seleccionado Final',
        fecha: postulacion.fase3FechaSeleccion,
        icon: 'pi pi-crown',
        color: 'success'
      };
    }

    if (postulacion.fase2EntrevistaRealizada && postulacion.fase2FechaEntrevista) {
      return {
        estado: 'Proceso Completo',
        fecha: postulacion.fase2FechaEntrevista,
        icon: 'pi pi-check-circle',
        color: 'success'
      };
    }
    
    if (postulacion.fase2Seleccionado && postulacion.fase2FechaSeleccion) {
      return {
        estado: 'Fase 2 - Seleccionado',
        fecha: postulacion.fase2FechaSeleccion,
        icon: 'pi pi-star-fill',
        color: 'warn'
      };
    }
    
    if (pasoUnaSemana && !postulacion.fase2Seleccionado) {
      return {
        estado: 'No Seleccionado',
        fecha: fechaCierre,
        icon: 'pi pi-times-circle',
        color: 'secondary'
      };
    }
    
    if (convocatoriaCerrada && !pasoUnaSemana) {
      return {
        estado: 'En Evaluación',
        fecha: fechaCierre,
        icon: 'pi pi-hourglass',
        color: 'warn'
      };
    }
    
    return {
      estado: 'En Registro',
      fecha: postulacion.fechaPostulacion || null,
      icon: 'pi pi-file-edit',
      color: 'info'
    };
  }

  mostrarDialogVista: boolean = false;
  postulacionSeleccionada: PostulacionEnriquecida | null = null;
  loadingPostulacion: boolean = false;
  timelineEvents: any[] = [];

  verPostulacion(postulacion: PostulacionEnriquecida): void {
    this.postulacionSeleccionada = postulacion;
    this.construirTimeline(postulacion);
    this.mostrarDialogVista = true;
  }

  private construirTimeline(postulacion: PostulacionEnriquecida): void {
    this.timelineEvents = [];

    const fechaActual = new Date();
    const fechaCierre = postulacion.oferta?.fechaCierre ? new Date(postulacion.oferta.fechaCierre) : null;
    const convocatoriaCerrada = fechaCierre ? fechaActual > fechaCierre : false;
    
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    const pasoUnaSemana = fechaCierre ? (fechaActual.getTime() - fechaCierre.getTime()) > unaSemana : false;

    if (postulacion.fechaPostulacion) {
      this.timelineEvents.push({
        status: 'En Registro',
        date: new Date(postulacion.fechaPostulacion),
        icon: 'pi pi-file-edit',
        color: '#2196F3',
        description: 'Tu postulación fue registrada exitosamente mientras la convocatoria estaba abierta'
      });
    }

    if (convocatoriaCerrada && fechaCierre) {
      this.timelineEvents.push({
        status: 'En Evaluación',
        date: fechaCierre,
        icon: 'pi pi-hourglass',
        color: '#FF9800',
        description: 'La convocatoria ha cerrado. Tu postulación está siendo evaluada'
      });
    }

    if (postulacion.fase2Seleccionado && postulacion.fase2FechaSeleccion) {
      this.timelineEvents.push({
        status: 'Seleccionado para Entrevista',
        date: new Date(postulacion.fase2FechaSeleccion),
        icon: 'pi pi-star-fill',
        color: '#4CAF50',
        description: '¡Felicitaciones! Fuiste seleccionado para la fase de entrevistas'
      });
    }

    if (postulacion.fase2EntrevistaRealizada && postulacion.fase2FechaEntrevista) {
      const calificacion = postulacion.fase2CalificacionFinal 
        ? ` - Calificación: ${postulacion.fase2CalificacionFinal}` 
        : '';
      this.timelineEvents.push({
        status: 'Entrevista Completada',
        date: new Date(postulacion.fase2FechaEntrevista),
        icon: 'pi pi-check-circle',
        color: '#4CAF50',
        description: `Tu entrevista ha sido completada${calificacion}`
      });
    }

    if (postulacion.fase3Seleccionado && postulacion.fase3FechaSeleccion) {
      this.timelineEvents.push({
        status: 'Fase 3 - Seleccionado Final',
        date: new Date(postulacion.fase3FechaSeleccion),
        icon: 'pi pi-crown',
        color: '#FFD700',
        description: '¡Felicitaciones! Has sido seleccionado en la fase final del proceso'
      });
    }

    if (pasoUnaSemana && !postulacion.fase2Seleccionado && fechaCierre) {
      this.timelineEvents.push({
        status: 'No Seleccionado',
        date: new Date(fechaCierre.getTime() + unaSemana),
        icon: 'pi pi-times-circle',
        color: '#9E9E9E',
        description: 'El proceso de evaluación ha finalizado. No fuiste seleccionado para continuar'
      });
    }

    this.timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  volverAOfertas(): void {
    this.router.navigate(['/app/ofertas-laborales']);
  }
}