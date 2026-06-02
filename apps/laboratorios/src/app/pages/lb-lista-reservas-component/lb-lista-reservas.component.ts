import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { SelectComponent, DatepickerComponent, InputComponent } from '@microfrontends/shared-ui';
import { LbReservaEquipoService } from '../../core/services/lb-reserva-equipo.service';
import { LbReservaEquipo, LbReservaEquipoDetalle } from '../../core/models/lb-reserva-equipo.model';
import { LbEquipoAula } from '../../core/models/lb-equipo-aula.model';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';

@Component({
  selector: 'app-lb-lista-reservas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    InputComponent,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    ProgressSpinnerModule,
    DividerModule,
    DatePickerModule,
    SelectComponent,
    DatepickerComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-lista-reservas.component.html',
})
export class LbListaReservasComponent implements OnInit {

  private fb                = inject(FormBuilder);
  private destroyRef        = inject(DestroyRef);
  private router            = inject(Router);
  private reservaEquipoSvc  = inject(LbReservaEquipoService);
  private usuariosOracleSvc = inject(UsuariosOracleService);
  private labAulasSvc       = inject(LbLaboratoriosAulasService);
  private equipoAulaSvc     = inject(LbEquipoAulaService);
  private confirmationSvc   = inject(ConfirmationService);
  private messageService    = inject(MessageService);

  // ─── Estado ────────────────────────────────────────────────────────────────
  reservas     = signal<LbReservaEquipo[]>([]);
  cargandoLista = false;
  mostrarModal  = false;
  guardandoEdicion = false;
  reservaSeleccionada: LbReservaEquipo | null = null;
  filter = true;

  // ─── Filtros ───────────────────────────────────────────────────────────────
  filtroSolicitante  = signal('');
  filtroFecha        = signal('');
  filtroLaboratorio  = signal('');

  reservasFiltradas = computed<LbReservaEquipo[]>(() => {
    let lista = this.reservas();
    const q1 = this.filtroSolicitante().toLowerCase();
    const q2 = this.filtroFecha();
    const q3 = this.filtroLaboratorio(); // ID del laboratorio
    const eas = this.todosEquiposAula();
    if (q1) {
      lista = lista.filter(r =>
        this.getNombreUsuario(r.identificacion).toLowerCase().includes(q1) ||
        r.identificacion.toLowerCase().includes(q1)
      );
    }
    if (q2) {
      lista = lista.filter(r => r.fecha?.includes(q2));
    }
    if (q3) {
      lista = lista.filter(r =>
        r.detalles?.some(d => {
          const ea = eas.find(e => e.equipoUnidad?.id === d.equipoUnidad?.id);
          return ea?.laboratorio?.id === q3;
        }) ?? false
      );
    }
    return lista;
  });

  // ─── Usuarios Oracle ────────────────────────────────────────────────────────
  usuariosTodos: UsuarioOracle[] = [];
  cargandoUsuarios = false;

  get usuarioOpciones(): { label: string; value: string }[] {
    return [
      { label: 'Seleccionar usuario...', value: '' },
      ...this.usuariosTodos.map(u => ({ label: u.nombre, value: u.identificacion })),
    ];
  }

  get asistenteOpciones(): { label: string; value: string }[] {
    const yaAgregados = new Set(this.asistentesList);
    return [
      { label: 'Seleccionar asistente...', value: '' },
      ...this.usuariosTodos
        .filter(u => !yaAgregados.has(u.identificacion))
        .map(u => ({ label: u.nombre, value: u.identificacion })),
    ];
  }

  getNombreUsuario(identificacion: string): string {
    const u = this.usuariosTodos.find(x => x.identificacion === identificacion);
    return u ? u.nombre : identificacion;
  }

  // ─── Laboratorios y equipos (para edición) ──────────────────────────────────
  todosEquiposAula = signal<LbEquipoAula[]>([]);
  laboratorioOpciones: { label: string; value: string }[] = [];
  equiposDisponibles: LbEquipoAula[] = [];
  equiposSeleccionadosIds = new Set<string>();
  cargandoEquipos = false;

  get laboratorioSeleccionado(): boolean {
    return !!this.editForm.get('laboratorioId')?.value;
  }

  // ─── Asistentes (para edición) ──────────────────────────────────────────────
  asistentesList: string[] = [];

  // ─── Horas como Date (para el datepicker) ──────────────────────────────────
  horaInicioDate: Date | null = null;
  horaFinDate:    Date | null = null;

  // ─── Formulario de edición ──────────────────────────────────────────────────
  editForm = this.fb.group({
    identificacion: ['', [Validators.required, Validators.maxLength(50)]],
    fecha:          ['', Validators.required],
    horaInicio:     ['', Validators.required],
    horaFin:        ['', Validators.required],
    laboratorioId:  [''],
    asistente:      [''],
  });

  ngOnInit(): void {
    this.cargarLista();
    this.cargarUsuarios();
    this.cargarLaboratorios();
    this.cargarTodosEquiposAula();

    this.editForm.get('laboratorioId')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctUntilChanged()
    ).subscribe(idLab => {
      this.onLaboratorioChange(idLab ?? '');
    });
  }

  // ─── Carga de datos ─────────────────────────────────────────────────────────
  cargarLista(): void {
    this.cargandoLista = true;
    this.reservaEquipoSvc.getAll().subscribe({
      next: data => {
        this.reservas.set(data);
        this.cargandoLista = false;
      },
      error: () => {
        this.cargandoLista = false;
        this.mostrarError('No se pudo cargar la lista de reservas.');
      },
    });
  }

  cargarUsuarios(): void {
    this.cargandoUsuarios = true;
    this.usuariosOracleSvc.getAll().subscribe({
      next: data => {
        this.usuariosTodos = data.filter(u => {
          const cargo = u.cargo?.toUpperCase() ?? '';
          return cargo === 'ESTUDIANTE' || cargo === 'PROFESOR';
        });
        this.cargandoUsuarios = false;
      },
      error: () => { this.cargandoUsuarios = false; },
    });
  }

  cargarLaboratorios(): void {
    this.labAulasSvc.getAll().subscribe({
      next: data => {
        this.laboratorioOpciones = [
          { label: 'Seleccionar laboratorio...', value: '' },
          ...data.map(l => ({ label: `${l.nomAula} (${l.codAula})`, value: l.id })),
        ];
      },
      error: () => this.mostrarError('No se pudo cargar laboratorios.'),
    });
  }

  cargarTodosEquiposAula(): void {
    this.equipoAulaSvc.getAll().subscribe({
      next: data => this.todosEquiposAula.set(data),
      error: () => { /* no bloqueante */ },
    });
  }

  onLaboratorioChange(idLab: string): void {
    this.equiposDisponibles = [];
    this.equiposSeleccionadosIds = new Set(
      this.reservaSeleccionada?.detalles?.map(d => d.equipoUnidad.id) ?? []
    );
    if (!idLab) return;
    this.cargandoEquipos = true;
    this.equipoAulaSvc.getByLaboratorio(idLab).subscribe({
      next: data => {
        this.equiposDisponibles = data.filter(e => e.equipoUnidad?.id);
        this.cargandoEquipos = false;
      },
      error: () => {
        this.cargandoEquipos = false;
        this.mostrarError('No se pudo cargar los equipos del laboratorio.');
      },
    });
  }

  // ─── Acciones ───────────────────────────────────────────────────────────────
  abrirEdicion(reserva: LbReservaEquipo): void {
    this.reservaSeleccionada = reserva;

    // Parsear horaInicio y horaFin a objetos Date
    this.horaInicioDate = this.parseTimeToDate(reserva.horaInicio);
    this.horaFinDate    = this.parseTimeToDate(reserva.horaFin);

    this.asistentesList = reserva.asistentes?.map(a => a.identificacion) ?? [];
    this.equiposSeleccionadosIds = new Set(reserva.detalles?.map(d => d.equipoUnidad.id) ?? []);

    // Detectar laboratorio a partir de los equipos reservados
    const primeraUnidadId = reserva.detalles?.[0]?.equipoUnidad?.id;
    const ea = this.todosEquiposAula().find(e => e.equipoUnidad?.id === primeraUnidadId);
    const laboratorioId = ea?.laboratorio?.id ?? '';

    // Convertir fecha string YYYY-MM-DD a Date para el datepicker
    const fechaDate = reserva.fecha ? new Date(reserva.fecha + 'T00:00:00') : null;

    this.editForm.patchValue({
      identificacion: reserva.identificacion,
      fecha:          fechaDate as any,
      horaInicio:     reserva.horaInicio,
      horaFin:        reserva.horaFin,
      laboratorioId,
      asistente:      '',
    });

    this.mostrarModal = true;
  }

  guardarEdicion(): void {
    if (this.editForm.invalid || !this.reservaSeleccionada?.id) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;

    const fechaRaw = v.fecha as unknown;
    let fechaStr = '';
    if (fechaRaw instanceof Date) {
      const y  = fechaRaw.getFullYear();
      const mo = String(fechaRaw.getMonth() + 1).padStart(2, '0');
      const d  = String(fechaRaw.getDate()).padStart(2, '0');
      fechaStr = `${y}-${mo}-${d}`;
    } else {
      fechaStr = (fechaRaw as string) ?? '';
    }

    const payload: LbReservaEquipo = {
      id:             this.reservaSeleccionada.id,
      identificacion: v.identificacion ?? '',
      fecha:          fechaStr,
      horaInicio:     v.horaInicio ?? '',
      horaFin:        v.horaFin    ?? '',
      detalles:       [...this.equiposSeleccionadosIds].map(id => ({ equipoUnidad: { id } })),
      asistentes:     this.asistentesList.map(identificacion => ({ identificacion })),
    };

    this.guardandoEdicion = true;
    this.reservaEquipoSvc.update(this.reservaSeleccionada.id, payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Reserva actualizada correctamente.' });
        this.guardandoEdicion = false;
        this.mostrarModal = false;
        this.cargarLista();
      },
      error: err => {
        this.guardandoEdicion = false;
        this.mostrarError(err.error?.mensaje ?? 'Error al actualizar la reserva.');
      },
    });
  }

  confirmarEliminar(reserva: LbReservaEquipo): void {
    this.confirmationSvc.confirm({
      message: `¿Desea eliminar la reserva de ${this.getNombreUsuario(reserva.identificacion)} del ${reserva.fecha}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.eliminar(reserva),
    });
  }

  eliminar(reserva: LbReservaEquipo): void {
    if (!reserva.id) return;
    this.reservaEquipoSvc.delete(reserva.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Reserva eliminada correctamente.' });
        this.cargarLista();
      },
      error: () => this.mostrarError('Error al eliminar la reserva.'),
    });
  }

  // ─── Equipos en modal ───────────────────────────────────────────────────────
  toggleEquipo(id: string): void {
    if (this.equiposSeleccionadosIds.has(id)) {
      this.equiposSeleccionadosIds.delete(id);
    } else {
      this.equiposSeleccionadosIds.add(id);
    }
  }

  estaSeleccionado(id: string): boolean {
    return this.equiposSeleccionadosIds.has(id);
  }

  // ─── Asistentes en modal ────────────────────────────────────────────────────
  agregarAsistente(): void {
    const id = this.editForm.get('asistente')?.value as string;
    if (!id || this.asistentesList.includes(id)) return;
    this.asistentesList = [...this.asistentesList, id];
    this.editForm.get('asistente')?.setValue('');
  }

  eliminarAsistente(i: number): void {
    this.asistentesList = this.asistentesList.filter((_, idx) => idx !== i);
  }

  // ─── Horas ──────────────────────────────────────────────────────────────────
  onHoraInicioChange(date: Date | null): void {
    this.horaInicioDate = date;
    this.editForm.get('horaInicio')?.setValue(date ? this.formatTime(date) : '');
    this.editForm.get('horaInicio')?.markAsTouched();
  }

  onHoraFinChange(date: Date | null): void {
    this.horaFinDate = date;
    this.editForm.get('horaFin')?.setValue(date ? this.formatTime(date) : '');
    this.editForm.get('horaFin')?.markAsTouched();
  }

  private formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}:00`;
  }

  formatTimeDisplay(time: string): string {
    if (!time) return '—';
    const parts = time.split(':');
    let h = parseInt(parts[0] ?? '0', 10);
    const m = parts[1] ?? '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }

  private resolverLaboratorioNombre(reserva: LbReservaEquipo, eas: LbEquipoAula[]): string {
    const primeraUnidadId = reserva.detalles?.[0]?.equipoUnidad?.id;
    if (!primeraUnidadId) return '';
    return eas.find(ea => ea.equipoUnidad?.id === primeraUnidadId)?.laboratorio?.nomAula ?? '';
  }

  getLaboratorioDeReserva(reserva: LbReservaEquipo): string {
    return this.resolverLaboratorioNombre(reserva, this.todosEquiposAula()) || '—';
  }

  private parseTimeToDate(time: string): Date | null {
    if (!time) return null;
    const parts = time.split(':');
    const d = new Date();
    d.setHours(parseInt(parts[0] ?? '0', 10));
    d.setMinutes(parseInt(parts[1] ?? '0', 10));
    d.setSeconds(0);
    return d;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  esInvalidoEdit(ctrl: string): boolean {
    const c = this.editForm.get(ctrl);
    return !!(c && c.invalid && c.touched);
  }

  navegarADevolucion(reservaId?: string): void {
    this.router.navigate(['/app/devolucion-equipo'], { queryParams: { reservaId } });
  }

  get hayFiltrosActivos(): boolean {
    return !!this.filtroSolicitante() || !!this.filtroFecha() || !!this.filtroLaboratorio();
  }

  limpiarFiltros(): void {
    this.filtroSolicitante.set('');
    this.filtroFecha.set('');
    this.filtroLaboratorio.set('');
  }

  private mostrarError(msg: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }
}
