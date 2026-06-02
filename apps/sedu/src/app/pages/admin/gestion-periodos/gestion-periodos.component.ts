import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PeriodosService } from '../../../core/services/periodos.service';
import { FormatosService } from '../../../core/services/formatos.service';
import { Periodo, PeriodStatus } from '../../../core/models';
import { Formato } from '../../../core/models';

@Component({
  selector: 'app-gestion-periodos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gestion-periodos.component.html',
})
export class GestionPeriodosComponent implements OnInit {
  periodos = signal<Periodo[]>([]);
  formatos = signal<Formato[]>([]);
  cargando = signal(false);
  mostrarModal = signal(false);
  modoEdicion = signal(false);
  periodoEditando = signal<Periodo | null>(null);
  mostrarDetalle = signal(false);
  periodoDetalle = signal<Periodo | null>(null);

  formulario!: FormGroup;

  constructor(
    private periodosService: PeriodosService,
    private formatosService: FormatosService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.formulario = this.fb.group({
      nombre: ['', Validators.required],
      formatoId: [null, Validators.required],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarFormatos();
  }

  cargarPeriodos(): void {
    this.cargando.set(true);
    this.periodosService.list().subscribe({
      next: (data) => {
        this.periodos.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los periodos' });
        this.cargando.set(false);
      },
    });
  }

  cargarFormatos(): void {
    this.formatosService.listActivos().subscribe({
      next: (data) => this.formatos.set(data),
    });
  }

  abrirCrear(): void {
    this.modoEdicion.set(false);
    this.periodoEditando.set(null);
    this.formulario.reset();
    this.mostrarModal.set(true);
  }

  abrirEditar(periodo: Periodo): void {
    this.modoEdicion.set(true);
    this.periodoEditando.set(periodo);
    this.formulario.patchValue({
      nombre: periodo.nombre,
      formatoId: periodo.formatoId,
      fechaInicio: periodo.fechaInicio ? new Date(periodo.fechaInicio) : null,
      fechaFin: periodo.fechaFin ? new Date(periodo.fechaFin) : null,
    });
    this.mostrarModal.set(true);
  }

  guardar(): void {
    if (this.formulario.invalid) return;

    const val = this.formulario.value;
    const payload = {
      ...val,
      fechaInicio: val.fechaInicio instanceof Date ? val.fechaInicio.toISOString().split('T')[0] : val.fechaInicio,
      fechaFin: val.fechaFin instanceof Date ? val.fechaFin.toISOString().split('T')[0] : val.fechaFin,
    };

    if (this.modoEdicion() && this.periodoEditando()) {
      const { formatoId, ...updatePayload } = payload;
      this.periodosService.update(this.periodoEditando()!.id, updatePayload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Periodo actualizado' });
          this.mostrarModal.set(false);
          this.cargarPeriodos();
        },
        error: () =>
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' }),
      });
    } else {
      this.periodosService.create(payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Periodo creado' });
          this.mostrarModal.set(false);
          this.cargarPeriodos();
        },
        error: () =>
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear' }),
      });
    }
  }

  activar(periodo: Periodo): void {
    this.confirmationService.confirm({
      message: `¿Activar el periodo "${periodo.nombre}"? Solo puede haber un periodo activo.`,
      header: 'Confirmar Activación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.periodosService.activar(periodo.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Periodo activado' });
            this.cargarPeriodos();
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo activar' }),
        });
      },
    });
  }

  cerrar(periodo: Periodo): void {
    this.confirmationService.confirm({
      message: `¿Cerrar el periodo "${periodo.nombre}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar Cierre',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.periodosService.cerrar(periodo.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Periodo cerrado' });
            this.cargarPeriodos();
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cerrar' }),
        });
      },
    });
  }

  verDetalle(periodo: Periodo): void {
    this.periodoDetalle.set(periodo);
    this.mostrarDetalle.set(true);
  }

  getEstadoSeverity(estado: PeriodStatus): 'success' | 'warn' | 'secondary' | 'info' {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'BORRADOR': return 'secondary';
      case 'CERRADO': return 'info';
      default: return 'secondary';
    }
  }
}
