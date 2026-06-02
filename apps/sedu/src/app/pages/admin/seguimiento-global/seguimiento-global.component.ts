import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ReportesService } from '../../../core/services/reportes.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { Periodo, ResultsReport, EvaluationResult } from '../../../core/models';

@Component({
  selector: 'app-seguimiento-global',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SelectModule,
    InputTextModule,
    ToastModule,
    SkeletonModule,
  ],
  providers: [MessageService],
  templateUrl: './seguimiento-global.component.html',
})
export class SeguimientoGlobalComponent implements OnInit {
  periodos = signal<Periodo[]>([]);
  periodoSeleccionado = signal<string | null>(null);
  reporte = signal<ResultsReport | null>(null);
  cargando = signal(false);
  filtroDependencia = signal('');

  constructor(
    private reportesService: ReportesService,
    private periodosService: PeriodosService,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.periodosService.list().subscribe({
      next: (data) => {
        this.periodos.set(data);
        const activo = data.find((p) => p.estado === 'ACTIVO');
        if (activo) {
          this.periodoSeleccionado.set(activo.id);
          const dep = this.route.snapshot.queryParamMap.get('dependencia') || undefined;
          if (dep) this.filtroDependencia.set(dep);
          this.cargarReporte(activo.id, dep);
        }
      },
    });
  }

  onPeriodoChange(id: string): void {
    this.periodoSeleccionado.set(id);
    if (id) this.cargarReporte(id, this.filtroDependencia() || undefined);
  }

  buscar(): void {
    if (this.periodoSeleccionado()) {
      this.cargarReporte(this.periodoSeleccionado()!, this.filtroDependencia() || undefined);
    }
  }

  cargarReporte(periodoId: string, dependencia?: string): void {
    this.cargando.set(true);
    this.reportesService.getResultados(periodoId, dependencia).subscribe({
      next: (data) => {
        this.reporte.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar resultados' });
        this.cargando.set(false);
      },
    });
  }

  get totalCerradas(): number {
    return this.reporte()?.resultados.filter((r) => r.estado === 'CERRADA').length || 0;
  }

  get totalConPlan(): number {
    return this.reporte()?.resultados.filter((r) => r.tienePlan).length || 0;
  }

  getEstadoSeverity(estado: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    switch (estado?.toUpperCase()) {
      case 'CERRADA': return 'success';
      case 'FIRMADA': return 'info';
      case 'PENDIENTE_FIRMA': return 'warn';
      case 'ENVIADA': return 'info';
      case 'DEVUELTA': return 'danger';
      default: return 'secondary';
    }
  }
}
