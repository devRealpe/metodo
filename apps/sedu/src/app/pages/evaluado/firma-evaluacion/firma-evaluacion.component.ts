import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EvaluacionesService } from '../../../core/services/evaluaciones.service';
import { Evaluacion } from '../../../core/models';

@Component({
  selector: 'app-firma-evaluacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    ButtonModule,
    CheckboxModule,
    TextareaModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './firma-evaluacion.component.html',
})
export class FirmaEvaluacionComponent implements OnInit {
  evaluacion = signal<Evaluacion | null>(null);
  cargando = signal(true);
  firmando = signal(false);
  devolviendo = signal(false);
  aceptaResultados = false;
  observacionDevolucion = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private evaluacionesService: EvaluacionesService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.evaluacionesService.getById(id).subscribe({
      next: (eval_) => {
        this.evaluacion.set(eval_);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la evaluación' });
        this.cargando.set(false);
      },
    });
  }

  firmar(): void {
    if (!this.aceptaResultados) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Debe aceptar los resultados para firmar' });
      return;
    }
    this.confirmationService.confirm({
      message: '¿Confirma que desea firmar esta evaluación? Esta acción no se puede deshacer.',
      header: 'Confirmar Firma',
      icon: 'pi pi-pen-to-square',
      accept: () => {
        this.firmando.set(true);
        this.evaluacionesService.firmarEvaluado(this.evaluacion()!.id, {}).subscribe({
          next: (updated) => {
            this.evaluacion.set(updated);
            this.messageService.add({ severity: 'success', summary: 'Firmada', detail: 'Evaluación firmada exitosamente' });
            this.firmando.set(false);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al firmar la evaluación' });
            this.firmando.set(false);
          },
        });
      },
    });
  }

  devolver(): void {
    if (!this.observacionDevolucion.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Requerido', detail: 'Indique el motivo de la devolución' });
      return;
    }
    this.confirmationService.confirm({
      message: '¿Devolver la evaluación al evaluador?',
      header: 'Confirmar Devolución',
      icon: 'pi pi-undo',
      accept: () => {
        this.devolviendo.set(true);
        this.evaluacionesService.devolver(this.evaluacion()!.id, { observaciones: this.observacionDevolucion }).subscribe({
          next: (updated) => {
            this.evaluacion.set(updated);
            this.messageService.add({ severity: 'info', summary: 'Devuelta', detail: 'Evaluación devuelta al evaluador' });
            this.devolviendo.set(false);
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al devolver' });
            this.devolviendo.set(false);
          },
        });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/app/evaluado/dashboard']);
  }
}
