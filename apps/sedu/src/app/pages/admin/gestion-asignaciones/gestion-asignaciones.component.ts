import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PeriodosService } from '../../../core/services/periodos.service';
import { AsignacionesService } from '../../../core/services/asignaciones.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Periodo, Asignacion, Usuario } from '../../../core/models';

@Component({
  selector: 'app-gestion-asignaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SelectModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gestion-asignaciones.component.html',
})
export class GestionAsignacionesComponent implements OnInit {
  periodos = signal<Periodo[]>([]);
  periodoSeleccionado = signal<string | null>(null);
  asignaciones = signal<Asignacion[]>([]);
  usuarios = signal<Usuario[]>([]);
  cargando = signal(false);
  guardando = signal(false);
  filtroTexto = signal('');
  mostrarModal = signal(false);

  form!: FormGroup;

  constructor(
    private periodosService: PeriodosService,
    private asignacionesService: AsignacionesService,
    private usuariosService: UsuariosService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      evaluadoId: ['', Validators.required],
      evaluadorId: ['', Validators.required],
    });

    this.periodosService.list().subscribe({
      next: (data) => {
        this.periodos.set(data);
        const activo = data.find((p) => p.estado === 'ACTIVO');
        if (activo) {
          this.periodoSeleccionado.set(activo.id);
          this.cargarAsignaciones(activo.id);
        }
      },
    });

    this.usuariosService.list().subscribe({
      next: (data) => this.usuarios.set(data.filter((u) => u.activo)),
    });
  }

  get usuariosOptions(): { label: string; value: string }[] {
    return this.usuarios().map((u) => ({
      label: `${u.nombreSnapshot} (${u.codigoEmpleado})`,
      value: u.id,
    }));
  }

  onPeriodoChange(id: string): void {
    this.periodoSeleccionado.set(id);
    if (id) this.cargarAsignaciones(id);
  }

  cargarAsignaciones(periodoId: string): void {
    this.cargando.set(true);
    this.periodosService.listAsignaciones(periodoId).subscribe({
      next: (data) => {
        this.asignaciones.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las asignaciones' });
        this.cargando.set(false);
      },
    });
  }

  abrirCrear(): void {
    this.form.reset();
    this.mostrarModal.set(true);
  }

  guardar(): void {
    if (this.form.invalid || !this.periodoSeleccionado()) return;
    this.guardando.set(true);
    const { evaluadoId, evaluadorId } = this.form.value;
    this.asignacionesService.create({ periodoId: this.periodoSeleccionado()!, evaluadoId, evaluadorId }).subscribe({
      next: (nueva) => {
        this.asignaciones.update((prev) => [...prev, nueva]);
        this.messageService.add({ severity: 'success', summary: 'Creada', detail: 'Asignación creada correctamente' });
        this.mostrarModal.set(false);
        this.guardando.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la asignación' });
        this.guardando.set(false);
      },
    });
  }

  get asignacionesFiltradas(): Asignacion[] {
    const filtro = this.filtroTexto().toLowerCase();
    if (!filtro) return this.asignaciones();
    return this.asignaciones().filter(
      (a) =>
        (a.evaluadorNombre?.toLowerCase() || '').includes(filtro) ||
        (a.evaluadoNombre?.toLowerCase() || '').includes(filtro) ||
        (a.periodoNombre?.toLowerCase() || '').includes(filtro)
    );
  }

  getEstadoSeverity(estado: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    switch (estado?.toUpperCase()) {
      case 'COMPLETADA': return 'success';
      case 'PENDIENTE': return 'info';
      default: return 'secondary';
    }
  }
}
