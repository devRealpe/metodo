import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PlanesMejoramientoService } from '../../../core/services/planes-mejoramiento.service';
import { EvaluacionesService } from '../../../core/services/evaluaciones.service';
import { Evaluacion, PlanMejoramiento } from '../../../core/models';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-plan-mejoramiento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './plan-mejoramiento.component.html',
})
export class PlanMejoramientoComponent implements OnInit {
  evaluacion = signal<Evaluacion | null>(null);
  planes = signal<PlanMejoramiento[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  mostrarFormNuevo = signal(false);
  planEditando = signal<PlanMejoramiento | null>(null);

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private planesService: PlanesMejoramientoService,
    private evaluacionesService: EvaluacionesService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    const evaluacionId = this.route.snapshot.paramMap.get('evaluacionId')!;
    this.evaluacionesService.getById(evaluacionId).subscribe({
      next: (eval_) => {
        this.evaluacion.set(eval_);
        this.cargarPlanes(evaluacionId);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la evaluación' });
        this.cargando.set(false);
      },
    });
    this.initForm();
  }

  private initForm(plan?: PlanMejoramiento): void {
    this.form = this.fb.group({
      descripcion: [plan?.descripcion || '', Validators.required],
      fechaCompromiso: [plan?.fechaCompromiso ? new Date(plan.fechaCompromiso) : null],
    });
  }

  private cargarPlanes(evaluacionId: string): void {
    this.planesService.getByEvaluacion(evaluacionId).subscribe({
      next: (data) => {
        this.planes.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error cargando planes de mejora' });
        this.cargando.set(false);
      },
    });
  }

  abrirNuevoPlan(): void {
    this.planEditando.set(null);
    this.initForm();
    this.mostrarFormNuevo.set(true);
  }

  abrirEditarPlan(plan: PlanMejoramiento): void {
    this.planEditando.set(plan);
    this.initForm(plan);
    this.mostrarFormNuevo.set(true);
  }

  cancelar(): void {
    this.mostrarFormNuevo.set(false);
    this.planEditando.set(null);
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Incompleto', detail: 'La descripción es requerida' });
      return;
    }
    this.guardando.set(true);
    const { descripcion, fechaCompromiso } = this.form.value;
    const fechaStr = fechaCompromiso ? new Date(fechaCompromiso).toISOString().split('T')[0] : undefined;

    if (this.planEditando()) {
      this.planesService.update(this.planEditando()!.id, { descripcion, fechaCompromiso: fechaStr }).subscribe({
        next: (updated) => {
          this.planes.update((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Plan actualizado correctamente' });
          this.cancelar();
          this.guardando.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar el plan' });
          this.guardando.set(false);
        },
      });
    } else {
      this.planesService.create({ evaluacionId: this.evaluacion()!.id, descripcion, fechaCompromiso: fechaStr }).subscribe({
        next: (created) => {
          this.planes.update((prev) => [...prev, created]);
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'Plan de mejora creado' });
          this.cancelar();
          this.guardando.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al crear el plan' });
          this.guardando.set(false);
        },
      });
    }
  }

  eliminarPlan(plan: PlanMejoramiento): void {
    this.confirmationService.confirm({
      message: '¿Eliminar este plan de mejora?',
      header: 'Confirmar',
      icon: 'pi pi-trash',
      accept: () => {
        this.planesService.delete(plan.id).subscribe({
          next: () => {
            this.planes.update((prev) => prev.filter((p) => p.id !== plan.id));
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Plan eliminado' });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar' });
          },
        });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/app/evaluador/evaluacion', this.evaluacion()?.id]);
  }
}
