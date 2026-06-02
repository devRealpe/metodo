import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AdminService } from '../../../core/services/admin.service';
import { EvaluacionesService } from '../../../core/services/evaluaciones.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { Asignacion } from '../../../core/models';

interface AsignacionConEvaluacion extends Asignacion {
  evaluacionId?: string;
  estadoEvaluacion?: string;
}

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    SkeletonModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './super-admin.component.html',
})
export class SuperAdminComponent implements OnInit {
  evaluaciones = signal<AsignacionConEvaluacion[]>([]);
  cargando = signal(false);

  periodos = signal<{ label: string; value: string }[]>([]);
  periodoSeleccionado = '';

  mostrarModalForzar = signal(false);
  evaluacionSeleccionada = signal<AsignacionConEvaluacion | null>(null);
  estadoNuevo = '';

  estadosDisponibles = [
    { label: 'Borrador', value: 'BORRADOR' },
    { label: 'En Proceso', value: 'EN_PROCESO' },
    { label: 'Firmado Evaluador', value: 'FIRMADO_EVALUADOR' },
    { label: 'Firmado Evaluado', value: 'FIRMADO_EVALUADO' },
    { label: 'Devuelta', value: 'DEVUELTA' },
    { label: 'Cerrada', value: 'CERRADA' },
    { label: 'Anulada', value: 'ANULADA' },
  ];

  constructor(
    private adminService: AdminService,
    private evaluacionesService: EvaluacionesService,
    private periodosService: PeriodosService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  cargarPeriodos(): void {
    this.periodosService.list().subscribe({
      next: (data) => {
        this.periodos.set(
          data.map((p) => ({ label: `${p.nombre} (${p.estado})`, value: p.id }))
        );
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error cargando periodos' });
      },
    });
  }

  onPeriodoChange(): void {
    if (!this.periodoSeleccionado) {
      this.evaluaciones.set([]);
      return;
    }
    this.cargando.set(true);
    this.periodosService.listAsignaciones(this.periodoSeleccionado).subscribe({
      next: (asignaciones) => {
        const items: AsignacionConEvaluacion[] = asignaciones.map((a) => ({ ...a }));
        this.evaluaciones.set(items);
        this.cargando.set(false);

        // Load evaluation info for each assignment
        items.forEach((item, idx) => {
          this.evaluacionesService.getByAsignacion(item.id).subscribe({
            next: (ev) => {
              const updated = [...this.evaluaciones()];
              updated[idx] = { ...updated[idx], evaluacionId: ev.id, estadoEvaluacion: ev.estado };
              this.evaluaciones.set(updated);
            },
            error: () => {
              // No evaluation yet for this assignment — ignore
            },
          });
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error cargando asignaciones' });
        this.cargando.set(false);
      },
    });
  }

  abrirForzarEstado(ev: AsignacionConEvaluacion): void {
    if (!ev.evaluacionId) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Esta asignación no tiene evaluación creada' });
      return;
    }
    this.evaluacionSeleccionada.set(ev);
    this.estadoNuevo = '';
    this.mostrarModalForzar.set(true);
  }

  confirmarForzarEstado(): void {
    const ev = this.evaluacionSeleccionada();
    if (!ev || !this.estadoNuevo || !ev.evaluacionId) return;

    this.adminService.forzarEstado(ev.evaluacionId, this.estadoNuevo).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado forzado correctamente' });
        this.mostrarModalForzar.set(false);
        this.onPeriodoChange();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error forzando estado' });
      },
    });
  }

  confirmarAnular(ev: AsignacionConEvaluacion): void {
    if (!ev.evaluacionId) {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Esta asignación no tiene evaluación creada' });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de anular la evaluación de ${ev.evaluadoNombre || 'este empleado'}?`,
      header: 'Confirmar Anulación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Anular',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.adminService.anularEvaluacion(ev.evaluacionId!).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Evaluación anulada' });
            this.onPeriodoChange();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error anulando evaluación' });
          },
        });
      },
    });
  }

  getSeverityEstado(estado?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (!estado) return 'secondary';
    const e = estado.toUpperCase();
    if (e === 'CERRADA') return 'success';
    if (e === 'EN_PROCESO' || e === 'BORRADOR') return 'info';
    if (e === 'FIRMADO_EVALUADOR' || e === 'FIRMADO_EVALUADO') return 'warn';
    if (e === 'DEVUELTA' || e === 'ANULADA') return 'danger';
    return 'secondary';
  }
}
