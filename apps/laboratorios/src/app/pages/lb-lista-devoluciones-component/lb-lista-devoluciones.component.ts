import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';

import { InputComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { LbDevolucionEquipoService } from '../../core/services/lb-devolucion-equipo.service';
import { LbDevolucionEquipo, LbDevolucionEquipoDetalle } from '../../core/models/lb-devolucion-equipo.model';
import { LbReservaEquipo } from '../../core/models/lb-reserva-equipo.model';
import { LbReservaEquipoService } from '../../core/services/lb-reserva-equipo.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';
import { LbEquipoAula } from '../../core/models/lb-equipo-aula.model';
import { LbCoordinadorService } from '../../core/services/lb-coordinador.service';

@Component({
  selector: 'app-lb-lista-devoluciones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    DialogModule,
    InputComponent,
    DatepickerComponent,
    ConfirmDialogModule,
    TooltipModule,
    ProgressSpinnerModule,
    DividerModule,
    DatePickerModule,
    TextareaModule,
    SelectModule,
    InputTextModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-lista-devoluciones.component.html',
})
export class LbListaDevolucionesComponent implements OnInit {

  private fb              = inject(FormBuilder);
  private devolucionSvc   = inject(LbDevolucionEquipoService);
  private reservaSvc      = inject(LbReservaEquipoService);
  private usuariosOracleSvc = inject(UsuariosOracleService);
  private equipoAulaSvc   = inject(LbEquipoAulaService);
  private authService     = inject(AuthService);
  private coordinadorSvc  = inject(LbCoordinadorService);
  private confirmationSvc = inject(ConfirmationService);
  private messageService  = inject(MessageService);

  // Mapa: equipoUnidad.id → laboratorio nombre
  private equipoUnidadLabMap = new Map<string, string>();
  // Mapa: equipoUnidad.id → codAula (para filtrar por coordinador)
  private equipoUnidadToCodAula = new Map<string, string>();
  // Mapa: equipoUnidad.id → LbEquipoAula.id (para devolver inventario)
  private equipoUnidadToAulaId = new Map<string, string>();
  // Mapa: equipoUnidad.id → responsable (identificación del encargado del lab)
  private equipoUnidadResponsable = new Map<string, string>();

  // Roles y coordinador
  private esAdmin = false;
  private misAulasCodigos: string[] = [];

  // ── Tabla: reservas pendientes de devolver ──
  reservas       = signal<LbReservaEquipo[]>([]);
  cargandoLista  = false;
  usuariosTodos: UsuarioOracle[] = [];

  // Filtros
  filtroSolicitante = signal('');
  filtroFecha       = signal('');

  reservasFiltradas = computed<LbReservaEquipo[]>(() => {
    let lista = this.reservas();
    const q1 = this.filtroSolicitante().toLowerCase();
    const q2 = this.filtroFecha();
    if (q1) {
      lista = lista.filter(r => {
        const nombre = this.getNombreUsuario(r.identificacion).toLowerCase();
        return nombre.includes(q1) || r.identificacion.toLowerCase().includes(q1);
      });
    }
    if (q2) {
      lista = lista.filter(r => r.fecha?.includes(q2));
    }
    return lista;
  });

  get hayFiltrosActivos(): boolean {
    return !!this.filtroSolicitante() || !!this.filtroFecha();
  }

  // ── Dialog de devolución ──
  mostrarDialog = false;
  cargandoForm = false;
  reservaSeleccionada: LbReservaEquipo | null = null;

  horaDevolucionDate: Date | null = null;
  equiposReserva: { id: string; nombre: string; placa?: string; laboratorio?: string }[] = [];
  estadosEquipos: Record<string, string> = {};
  observacionesEquipos: Record<string, string> = {};
  laboratoristas: UsuarioOracle[] = [];
  cargandoUsuarios = false;

  responsableOpciones: { label: string; value: string }[] = [];
  minDateDevolucion: Date = new Date();

  readonly estadosOpciones = [
    { label: 'Bueno', value: 'bueno' },
    { label: 'Con daños', value: 'con_daños' },
    { label: 'Incompleto', value: 'incompleto' },
    { label: 'Dado de baja', value: 'dado_de_baja' },
  ];

  formDevolucion = this.fb.group({
    fechaDevolucion:        ['', Validators.required],
    horaDevolucion:         ['', Validators.required],
    identificacionRecibe:   ['', [Validators.required, Validators.maxLength(50)]],
    observacionesGenerales: [''],
  });

  ngOnInit(): void {
    this.cargarUsuarios();

    const user = this.authService.getCurrentUser();
    const roles = this.authService.getUserRoles();
    this.esAdmin = roles.includes('ADMIN') || roles.includes('LAB_LABORATORISTA');

    // Primero cargar mapa de labs, luego determinar si es coordinador y cargar reservas filtradas
    this.cargarMapaLaboratorios(() => {
      if (user && !this.esAdmin) {
        this.coordinadorSvc.getByKeycloakUserId(user.id).subscribe({
          next: asignaciones => {
            this.misAulasCodigos = asignaciones.map(a => a.codAula);
            this.cargarReservasPendientes();
          },
          error: () => this.cargarReservasPendientes(),
        });
      } else {
        this.cargarReservasPendientes();
      }
    });
  }

  // ── Carga de datos ──

  private cargarMapaLaboratorios(callback: () => void): void {
    this.equipoAulaSvc.getAll().subscribe({
      next: data => {
        for (const ea of data) {
          if (ea.equipoUnidad?.id) {
            if (ea.laboratorio?.nomAula) {
              this.equipoUnidadLabMap.set(ea.equipoUnidad.id, `${ea.laboratorio.nomAula} (${ea.laboratorio.codAula})`);
            }
            if (ea.laboratorio?.codAula) {
              this.equipoUnidadToCodAula.set(ea.equipoUnidad.id, ea.laboratorio.codAula);
            }
            if (ea.responsable) {
              this.equipoUnidadResponsable.set(ea.equipoUnidad.id, ea.responsable);
            }
            this.equipoUnidadToAulaId.set(ea.equipoUnidad.id, ea.id);
          }
        }
        callback();
      },
      error: () => callback(),
    });
  }

  getLaboratorioEquipo(equipoUnidadId: string): string {
    return this.equipoUnidadLabMap.get(equipoUnidadId) ?? '—';
  }

  /** Laboratorios únicos de una reserva */
  getLaboratoriosReserva(reserva: LbReservaEquipo): string {
    const labs = new Set<string>();
    for (const d of reserva.detalles ?? []) {
      const lab = this.equipoUnidadLabMap.get(d.equipoUnidad.id);
      if (lab) labs.add(lab);
    }
    return labs.size > 0 ? [...labs].join(', ') : '—';
  }

  cargarReservasPendientes(): void {
    this.cargandoLista = true;
    this.reservaSvc.getAll().subscribe({
      next: data => {
        let pendientes = data.filter(r => !r.devuelta);

        // Coordinador solo ve reservas de sus aulas asignadas
        if (!this.esAdmin && this.misAulasCodigos.length > 0) {
          pendientes = pendientes.filter(r =>
            (r.detalles ?? []).some(d =>
              this.misAulasCodigos.includes(this.equipoUnidadToCodAula.get(d.equipoUnidad.id) ?? '')
            )
          );
        } else if (!this.esAdmin && this.misAulasCodigos.length === 0) {
          // No es admin ni coordinador → no ve nada
          pendientes = [];
        }

        this.reservas.set(pendientes);
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
      next: data => { this.usuariosTodos = data; this.cargandoUsuarios = false; },
      error: () => { this.cargandoUsuarios = false; },
    });
  }

  getNombreUsuario(identificacion: string): string {
    if (!identificacion) return '—';
    const u = this.usuariosTodos.find(x => x.identificacion === identificacion);
    return u ? u.nombre : identificacion;
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'bueno':        return 'Bueno';
      case 'con_daños':    return 'Con daños';
      case 'incompleto':   return 'Incompleto';
      case 'dado_de_baja': return 'Dado de baja';
      default:             return estado;
    }
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

  limpiarFiltros(): void {
    this.filtroSolicitante.set('');
    this.filtroFecha.set('');
  }

  // ── Dialog: abrir para devolver una reserva ──

  abrirDevolucion(reserva: LbReservaEquipo): void {
    this.reservaSeleccionada = reserva;
    this.limpiarFormulario();
    this.minDateDevolucion = new Date();

    // Pre-cargar hora actual
    const ahora = new Date();
    this.horaDevolucionDate = ahora;
    this.formDevolucion.get('horaDevolucion')?.setValue(this.formatTime(ahora));

    // Precargar equipos de la reserva
    this.equiposReserva = (reserva.detalles ?? []).map(d => ({
      id: d.equipoUnidad.id,
      nombre: d.equipoUnidad.equipoAlmacen?.nombre ?? 'Equipo',
      placa: d.equipoUnidad.placa,
      laboratorio: this.equipoUnidadLabMap.get(d.equipoUnidad.id),
    }));
    for (const eq of this.equiposReserva) {
      this.estadosEquipos[eq.id] = 'bueno';
      this.observacionesEquipos[eq.id] = '';
    }

    // Auto-cargar "Recibido por" con el encargado del aula
    this.responsableOpciones = [];
    this.autoCargarRecibidoPor(reserva);

    this.mostrarDialog = true;
  }

  /** Busca el coordinador asignado al aula de los equipos, actualiza opciones y auto-selecciona */
  /** Busca el coordinador asignado al aula de los equipos, actualiza opciones y auto-selecciona */
  private autoCargarRecibidoPor(reserva: LbReservaEquipo): void {
    const codAulas = new Set<string>();
    for (const d of reserva.detalles ?? []) {
      const cod = this.equipoUnidadToCodAula.get(d.equipoUnidad.id);
      if (cod) codAulas.add(cod);
    }
    if (codAulas.size === 0) return;

    const calls = [...codAulas].map(cod => this.coordinadorSvc.getByCodAula(cod));
    forkJoin(calls).subscribe({
      next: results => {
        const todos = results.flat();
        const responsables = todos
          .filter(c => !!c.identificacion)
          .reduce((acc, c) => {
            if (!acc.find(x => x.value === c.identificacion)) {
              const u = this.usuariosTodos.find(x => x.identificacion === c.identificacion);
              acc.push({ label: u ? u.nombre : c.identificacion!, value: c.identificacion! });
            }
            return acc;
          }, [] as { label: string; value: string }[]);

        if (responsables.length > 0) {
          this.responsableOpciones = responsables;
          this.formDevolucion.get('identificacionRecibe')?.setValue(responsables[0].value);
        }
      },
      error: () => {
        console.warn('No se pudo obtener coordinadores del aula.');
      },
    });
  }

  cerrarDialog(): void {
    this.mostrarDialog = false;
    this.reservaSeleccionada = null;
  }

  onHoraChange(date: Date | null): void {
    this.horaDevolucionDate = date;
    this.formDevolucion.get('horaDevolucion')?.setValue(date ? this.formatTime(date) : '');
    this.formDevolucion.get('horaDevolucion')?.markAsTouched();
  }

  guardarDevolucion(): void {
    if (this.formDevolucion.invalid || !this.reservaSeleccionada?.id) {
      this.formDevolucion.markAllAsTouched();
      return;
    }
    const v = this.formDevolucion.value;

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
      reserva:                { id: this.reservaSeleccionada.id },
      fechaDevolucion:        fechaStr,
      horaDevolucion:         v.horaDevolucion ?? '',
      identificacionRecibe:   v.identificacionRecibe ?? '',
      observacionesGenerales: v.observacionesGenerales || undefined,
      detalles,
    };

    this.cargandoForm = true;
    this.devolucionSvc.create(payload).subscribe({
      next: () => {
        // Devolver inventario al laboratorio de origen
        this.devolverInventario();
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Devolución registrada correctamente.' });
        this.cargandoForm = false;
        this.mostrarDialog = false;
        this.reservaSeleccionada = null;
        this.cargarReservasPendientes();
      },
      error: err => {
        this.cargandoForm = false;
        this.mostrarError(err.error?.mensaje ?? 'Error al registrar la devolución.');
      },
    });
  }

  limpiarFormulario(): void {
    this.formDevolucion.reset({ fechaDevolucion: '', horaDevolucion: '', identificacionRecibe: '', observacionesGenerales: '' });
    this.horaDevolucionDate = null;
    this.equiposReserva = [];
    this.estadosEquipos = {};
    this.observacionesEquipos = {};
    this.cargandoForm = false;
  }

  esInvalido(ctrl: string): boolean {
    const c = this.formDevolucion.get(ctrl);
    return !!(c && c.invalid && c.touched);
  }

  private formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}:00`;
  }

  private mostrarError(msg: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  /** Llama devolver(equipoAulaId, 1) por cada equipo para restaurar inventario */
  private devolverInventario(): void {
    const calls = this.equiposReserva
      .map(eq => this.equipoUnidadToAulaId.get(eq.id))
      .filter((aulaId): aulaId is string => !!aulaId)
      .map(aulaId => this.equipoAulaSvc.devolver(aulaId, 1));

    if (calls.length === 0) return;
    forkJoin(calls).subscribe({
      error: () => this.mostrarError('La devolución se registró pero no se pudo actualizar el inventario del laboratorio.'),
    });
  }
}
