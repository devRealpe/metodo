import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { EvaluacionesService } from '../../../core/services/evaluaciones.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { Asignacion, Periodo } from '../../../core/models';

interface AsignacionConEval extends Asignacion {
  evaluacionId?: string;
  evaluacionEstado?: string;
  creando?: boolean;
}

@Component({
  selector: 'app-dashboard-evaluador',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    SkeletonModule,
    ProgressBarModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard-evaluador.component.html',
})
export class DashboardEvaluadorComponent implements OnInit {
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
              // Load evaluacion state for each assignment
              items.forEach((item, idx) => {
                this.evaluacionesService.getByAsignacion(item.id).subscribe({
                  next: (ev) => {
                    this.asignaciones.update((prev) => {
                      const updated = [...prev];
                      updated[idx] = { ...updated[idx], evaluacionId: ev.id, evaluacionEstado: ev.estado };
                      return updated;
                    });
                  },
                  error: () => { /* sin evaluacion aun */ },
                });
              });
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar asignaciones' });
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

  iniciarEvaluacion(asignacion: AsignacionConEval): void {
    if (asignacion.evaluacionId) {
      this.router.navigate(['/app/evaluador/evaluacion', asignacion.evaluacionId]);
      return;
    }
    // Crear evaluación y navegar
    this.asignaciones.update((prev) =>
      prev.map((a) => a.id === asignacion.id ? { ...a, creando: true } : a)
    );
    this.evaluacionesService.create(asignacion.id).subscribe({
      next: (evaluacion) => {
        this.asignaciones.update((prev) =>
          prev.map((a) => a.id === asignacion.id ? { ...a, evaluacionId: evaluacion.id, evaluacionEstado: evaluacion.estado, creando: false } : a)
        );
        this.router.navigate(['/app/evaluador/evaluacion', evaluacion.id]);
      },
      error: () => {
        this.asignaciones.update((prev) =>
          prev.map((a) => a.id === asignacion.id ? { ...a, creando: false } : a)
        );
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al crear evaluación' });
      },
    });
  }

  getEstadoSeverity(estado?: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    switch (estado?.toUpperCase()) {
      case 'CERRADA': return 'success';
      case 'FIRMADO_EVALUADO': return 'success';
      case 'FIRMADO_EVALUADOR': return 'warn';
      case 'EN_PROCESO': case 'BORRADOR': return 'info';
      case 'DEVUELTA': return 'danger';
      case 'ANULADA': return 'danger';
      default: return 'secondary';
    }
  }

  get totalAsignaciones(): number { return this.asignaciones().length; }
  get completadas(): number { return this.asignaciones().filter((a) => a.evaluacionEstado === 'CERRADA' || a.evaluacionEstado === 'FIRMADO_EVALUADO').length; }
  get pendientes(): number { return this.totalAsignaciones - this.completadas; }
}
