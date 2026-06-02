import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EvaluacionesService } from '../../../core/services/evaluaciones.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { Asignacion, Periodo } from '../../../core/models';

interface AsignacionConEval extends Asignacion {
  evaluacionId?: string;
  evaluacionEstado?: string;
}

@Component({
  selector: 'app-dashboard-evaluado',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard-evaluado.component.html',
})
export class DashboardEvaluadoComponent implements OnInit {
  asignaciones = signal<AsignacionConEval[]>([]);
  periodoActivo = signal<Periodo | null>(null);
  cargando = signal(false);

  constructor(
    private periodosService: PeriodosService,
    private evaluacionesService: EvaluacionesService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargando.set(true);
    this.periodosService.list().subscribe({
      next: (periodos) => {
        const activo = periodos.find((p) => p.estado === 'ACTIVO') || periodos[0];
        if (activo) {
          this.periodoActivo.set(activo);
          this.periodosService.listAsignaciones(activo.id).subscribe({
            next: (data) => {
              const items: AsignacionConEval[] = data.map((a) => ({ ...a }));
              this.asignaciones.set(items);
              this.cargando.set(false);
              // Cargar evaluacion de cada asignación para obtener su ID y estado
              items.forEach((item, idx) => {
                this.evaluacionesService.getByAsignacion(item.id).subscribe({
                  next: (ev) => {
                    this.asignaciones.update((prev) => {
                      const updated = [...prev];
                      updated[idx] = { ...updated[idx], evaluacionId: ev.id, evaluacionEstado: ev.estado };
                      return updated;
                    });
                  },
                  error: () => { /* evaluacion aun no creada */ },
                });
              });
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar evaluaciones' });
              this.cargando.set(false);
            },
          });
        } else {
          this.cargando.set(false);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar periodos' });
        this.cargando.set(false);
      },
    });
  }

  verEvaluacion(asignacion: AsignacionConEval): void {
    if (asignacion.evaluacionId) {
      this.router.navigate(['/app/evaluado/revision', asignacion.evaluacionId]);
    }
  }

  firmarEvaluacion(asignacion: AsignacionConEval): void {
    if (asignacion.evaluacionId) {
      this.router.navigate(['/app/evaluado/firma', asignacion.evaluacionId]);
    }
  }

  getEstadoSeverity(estado?: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    switch (estado?.toUpperCase()) {
      case 'CERRADA': case 'FIRMADO_EVALUADO': return 'success';
      case 'FIRMADO_EVALUADOR': return 'warn';
      case 'EN_PROCESO': case 'BORRADOR': return 'info';
      case 'DEVUELTA': return 'danger';
      case 'ANULADA': return 'danger';
      default: return 'secondary';
    }
  }
}
