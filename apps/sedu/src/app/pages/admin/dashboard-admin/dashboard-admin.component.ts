import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { MessageService } from 'primeng/api';
import { PeriodosService } from '../../../core/services/periodos.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { Periodo, ProgressReport, DependenciaAvance } from '../../../core/models';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    TableModule,
    TagModule,
    SkeletonModule,
    ToastModule,
    ChartModule,
  ],
  providers: [MessageService],
  templateUrl: './dashboard-admin.component.html',
})
export class DashboardAdminComponent implements OnInit {
  periodos = signal<Periodo[]>([]);
  periodoSeleccionado = signal<string | null>(null);
  reporte = signal<ProgressReport | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  chartData: any = null;
  chartOptions: any = {
    plugins: { legend: { position: 'bottom' } },
    responsive: true,
    maintainAspectRatio: false,
  };

  constructor(
    private periodosService: PeriodosService,
    private reportesService: ReportesService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  cargarPeriodos(): void {
    this.periodosService.list().subscribe({
      next: (data) => {
        this.periodos.set(data);
        const activo = data.find((p) => p.estado === 'ACTIVO');
        if (activo) {
          this.periodoSeleccionado.set(activo.id);
          this.cargarReporte(activo.id);
        }
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los periodos',
        }),
    });
  }

  onPeriodoChange(periodoId: string): void {
    this.periodoSeleccionado.set(periodoId);
    if (periodoId) this.cargarReporte(periodoId);
  }

  cargarReporte(periodoId: string): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reportesService.getAvance(periodoId).subscribe({
      next: (data) => {
        this.reporte.set(data);
        this.buildChart(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar el reporte de avance');
        this.cargando.set(false);
      },
    });
  }

  private buildChart(report: ProgressReport): void {
    const labels = report.detalles.map((d) => d.dependencia);
    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Cerradas',
          backgroundColor: '#22c55e',
          data: report.detalles.map((d) => d.cerradas),
        },
        {
          label: 'Pendientes Firma',
          backgroundColor: '#f59e0b',
          data: report.detalles.map((d) => d.pendientesFirma),
        },
        {
          label: 'En Borrador',
          backgroundColor: '#94a3b8',
          data: report.detalles.map((d) => d.enBorrador),
        },
      ],
    };
  }

  get totalEvaluaciones(): number {
    return this.reporte()?.totalEvaluaciones ?? 0;
  }

  get totalCerradas(): number {
    return (this.reporte()?.detalles ?? []).reduce((s, d) => s + d.cerradas, 0);
  }

  get totalPendientes(): number {
    return (this.reporte()?.detalles ?? []).reduce((s, d) => s + d.pendientesFirma, 0);
  }

  get totalBorrador(): number {
    return (this.reporte()?.detalles ?? []).reduce((s, d) => s + d.enBorrador, 0);
  }

  navegarDetalle(dep: DependenciaAvance): void {
    this.router.navigate(['/app/admin/seguimiento'], {
      queryParams: { dependencia: dep.dependencia },
    });
  }
}
