import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { LbDevolucionEquipoService } from '../../core/services/lb-devolucion-equipo.service';
import { LbDevolucionEquipo, LbDevolucionEquipoDetalle } from '../../core/models/lb-devolucion-equipo.model';
import { LbReservaEquipoService } from '../../core/services/lb-reserva-equipo.service';
import { LbReservaEquipo } from '../../core/models/lb-reserva-equipo.model';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';

@Component({
  selector: 'app-lb-devolucion-equipo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    DatePickerModule,
    TextareaModule,
    SelectModule,
    InputTextModule,
    SelectComponent,
    DatepickerComponent,
  ],
  providers: [MessageService],
  templateUrl: './lb-devolucion-equipo.component.html',
})
export class LbDevolucionEquipoComponent implements OnInit {

  private fb                = inject(FormBuilder);
  private destroyRef        = inject(DestroyRef);
  private route             = inject(ActivatedRoute);
  private devolucionSvc     = inject(LbDevolucionEquipoService);
  private reservaSvc        = inject(LbReservaEquipoService);
  private usuariosOracleSvc = inject(UsuariosOracleService);
  private messageService    = inject(MessageService);

  cargando = false;

  // Hora como Date para el datepicker
  horaDevolucionDate: Date | null = null;

  // Reservas pendientes de devolución
  reservasPendientes: LbReservaEquipo[] = [];
  cargandoReservas = false;

  // Equipos de la reserva seleccionada
  equiposReserva: { id: string; nombre: string; placa?: string }[] = [];

  // Estado por cada equipo (id -> estado)
  estadosEquipos: Record<string, string> = {};
  observacionesEquipos: Record<string, string> = {};

  // Usuarios Oracle
  usuariosTodos: UsuarioOracle[] = [];     // para resolver nombres
  laboratoristas: UsuarioOracle[] = [];    // para el dropdown "Recibido por"
  cargandoUsuarios = false;

  readonly estadosOpciones = [
    { label: 'Bueno', value: 'bueno' },
    { label: 'Con daños', value: 'con_daños' },
    { label: 'Incompleto', value: 'incompleto' },
    { label: 'Dado de baja', value: 'dado_de_baja' },
  ];

  get reservaOpciones(): { label: string; value: string }[] {
    return [
      { label: 'Seleccionar reserva...', value: '' },
      ...this.reservasPendientes.map(r => ({
        label: `${this.getNombreUsuario(r.identificacion)} — ${r.fecha} — ${this.formatTimeDisplay(r.horaFin)}`,
        value: r.id ?? '',
      })),
    ];
  }

  get usuarioOpciones(): { label: string; value: string }[] {
    return [
      { label: 'Seleccionar responsable...', value: '' },
      ...this.laboratoristas.map(u => ({ label: u.nombre, value: u.identificacion })),
    ];
  }

  form = this.fb.group({
    reservaId:              ['', Validators.required],
    fechaDevolucion:        ['', Validators.required],
    horaDevolucion:         ['', Validators.required],
    identificacionRecibe:   ['', [Validators.required, Validators.maxLength(50)]],
    observacionesGenerales: [''],
  });

  ngOnInit(): void {
    this.cargarReservasPendientes();
    this.cargarUsuarios();

    this.form.get('reservaId')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      distinctUntilChanged()
    ).subscribe(id => this.onReservaChange(id ?? ''));
  }

  cargarReservasPendientes(): void {
    this.cargandoReservas = true;
    this.reservaSvc.getAll().subscribe({
      next: data => {
        this.reservasPendientes = data.filter(r => !r.devuelta);
        this.cargandoReservas = false;
        const reservaIdParam = this.route.snapshot.queryParamMap.get('reservaId');
        if (reservaIdParam) {
          this.form.get('reservaId')?.setValue(reservaIdParam);
        }
      },
      error: () => {
        this.cargandoReservas = false;
        this.mostrarError('No se pudo cargar la lista de reservas.');
      },
    });
  }

  cargarUsuarios(): void {
    this.cargandoUsuarios = true;
    this.usuariosOracleSvc.getAll().subscribe({
      next: data => { this.usuariosTodos = data; },
      error: () => { /* ignorar, solo afecta resolución de nombres */ },
    });
    this.usuariosOracleSvc.getByCargo('LABORATORISTA').subscribe({
      next: data => {
        this.laboratoristas = data;
        this.cargandoUsuarios = false;
      },
      error: () => { this.cargandoUsuarios = false; },
    });
  }

  onReservaChange(reservaId: string): void {
    this.equiposReserva = [];
    this.estadosEquipos = {};
    this.observacionesEquipos = {};
    if (!reservaId) return;

    const reserva = this.reservasPendientes.find(r => r.id === reservaId);
    if (!reserva?.detalles) return;

    this.equiposReserva = reserva.detalles.map(d => ({
      id: d.equipoUnidad.id,
      nombre: d.equipoUnidad.equipoAlmacen?.nombre ?? 'Equipo',
      placa: d.equipoUnidad.placa,
    }));

    for (const eq of this.equiposReserva) {
      this.estadosEquipos[eq.id] = 'bueno';
      this.observacionesEquipos[eq.id] = '';
    }
  }

  onHoraChange(date: Date | null): void {
    this.horaDevolucionDate = date;
    this.form.get('horaDevolucion')?.setValue(date ? this.formatTime(date) : '');
    this.form.get('horaDevolucion')?.markAsTouched();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;

    const fechaRaw = v.fechaDevolucion as unknown;
    let fechaStr = '';
    if (fechaRaw instanceof Date) {
      const y  = fechaRaw.getFullYear();
      const mo = String(fechaRaw.getMonth() + 1).padStart(2, '0');
      const d  = String(fechaRaw.getDate()).padStart(2, '0');
      fechaStr = `${y}-${mo}-${d}`;
    } else {
      fechaStr = (fechaRaw as string) ?? '';
    }

    const detalles: LbDevolucionEquipoDetalle[] = this.equiposReserva.map(eq => ({
      equipoUnidad: { id: eq.id },
      estadoDevuelto: this.estadosEquipos[eq.id] ?? 'bueno',
      observaciones: this.observacionesEquipos[eq.id] || undefined,
    }));

    const payload: LbDevolucionEquipo = {
      reserva:                { id: v.reservaId ?? '' },
      fechaDevolucion:        fechaStr,
      horaDevolucion:         v.horaDevolucion ?? '',
      identificacionRecibe:   v.identificacionRecibe ?? '',
      observacionesGenerales: v.observacionesGenerales || undefined,
      detalles,
    };

    this.cargando = true;
    this.devolucionSvc.create(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Devolución registrada correctamente.' });
        this.limpiarFormulario();
        this.cargarReservasPendientes();
      },
      error: err => {
        this.cargando = false;
        this.mostrarError(err.error?.mensaje ?? 'Error al registrar la devolución.');
      },
    });
  }

  limpiarFormulario(): void {
    this.form.reset({ reservaId: '', fechaDevolucion: '', horaDevolucion: '', identificacionRecibe: '', observacionesGenerales: '' });
    this.horaDevolucionDate = null;
    this.equiposReserva = [];
    this.estadosEquipos = {};
    this.observacionesEquipos = {};
    this.cargando = false;
  }

  getNombreUsuario(identificacion: string): string {
    const u = this.usuariosTodos.find(x => x.identificacion === identificacion);
    return u ? u.nombre : identificacion;
  }

  esInvalido(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c && c.invalid && c.touched);
  }

  formatTimeDisplay(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    let h = parseInt(parts[0] ?? '0', 10);
    const m = parts[1] ?? '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  }

  private formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}:00`;
  }

  private mostrarError(msg: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }
}
