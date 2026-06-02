import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { StepperModule } from 'primeng/stepper';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { RegistroExternoService } from '../../core/services/registro-externo.service';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';
import { TipoPracticaService } from '../../core/services/tipo-practica.service';
import { TipoPractica } from '../../core/models/tipo-practica.model';
import { UsosLaboratorioService, EntradaPayload, SalidaPayload } from '../../core/services/usos-laboratorio.service';
import { ReservasAulaService } from '../../core/services/reservas-aula.service';
import { OraAulasService } from '../../core/services/ora-aulas.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { RegistroExterno } from '../../core/models/registro-externo.model';
import { UsuarioExterno } from '../../core/models/usuario-externos.model';
import { ReservaAula, ReservaAsistente, ReservaEquipo, ReservaSuministro, CierreReservaDTO } from '../../core/models/reserva-aula.model';
import { OraAulas } from '../../core/models/ora-aulas.model';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';
import { LbSuministroAulaService } from '../../core/services/lb-suministro-aula.service';
import { LbEquipoAula } from '../../core/models/lb-equipo-aula.model';
import { LbSuministroAula } from '../../core/models/lb-suministro-aula.model';

type Modo = 'reserva' | 'ingreso';

@Component({
  selector: 'app-registro-externos.component',
  standalone: true,
  imports: [
    CommonModule, HttpClientModule, ReactiveFormsModule,
    StepperModule, PanelModule, CardModule, ButtonModule,
    ToastModule, DividerModule, TagModule,
    InputComponent, SelectComponent, DatepickerComponent
  ],
  providers: [MessageService],
  templateUrl: './registro-externos.component.html',
  styleUrl: './registro-externos.component.scss',
})
export class RegistroExternosComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private registroExternoSvc = inject(RegistroExternoService);
  private usuariosExternosSvc = inject(UsuariosExternosService);
  private usosLaboratorioSvc = inject(UsosLaboratorioService);
  private reservasSvc = inject(ReservasAulaService);
  private oraAulasSvc = inject(OraAulasService);
  private horariosSvc = inject(HorariosOracleService);
  private lbAulasSvc = inject(LbLaboratoriosAulasService);
  private messageService = inject(MessageService);
  private tipoPracticaSvc = inject(TipoPracticaService);
  private equipoAulaSvc = inject(LbEquipoAulaService);
  private suministroAulaSvc = inject(LbSuministroAulaService);
  private destroy$ = new Subject<void>();

  modo: Modo = 'reserva';
  hoy = new Date();
  step = 1;
  cargando = false;

  // Paso 1
  empresaEncontrada: RegistroExterno | null = null;
  esEmpresaNueva = false;

  // Paso 2
  usuariosEmpresa: UsuarioExterno[] = [];
  cargandoUsuarios = false;
  mostrarFormPersona = false;

  // Paso 3
  aulasOracleData: OraAulas[] = [];
  aulasOptions: { label: string; value: string; numCapacidad: number }[] = [];
  lbAulas: LbLaboratoriosAulas[] = [];
  aulaSeleccionada: OraAulas | null = null;
  cargandoAulas = false;
  conflictoHorario = false;
  mensajeConflicto = '';

  // Tipo de práctica (filtrado NO_ESTRUCTURADA)
  tipoPracticaOpciones: { label: string; value: string }[] = [];
  cargandoTipoPractica = false;
  tipoPracticaCtrl = new FormControl('', Validators.required);

  // Equipos y suministros del laboratorio seleccionado
  equiposLab: LbEquipoAula[] = [];
  suministrosLab: LbSuministroAula[] = [];
  equiposSeleccionados: { equipoAula: LbEquipoAula; cantidad: number }[] = [];
  suministrosSeleccionados: { suministroAula: LbSuministroAula; cantidad: number }[] = [];
  cargandoInventario = false;

  // Modo ingreso
  reservasHoy: ReservaAula[] = [];
  reservaSeleccionada: ReservaAula | null = null;
  usuarioIngreso: UsuarioExterno | null = null;
  cargandoIngreso = false;
  entradaMarcada = false;

  tiposUsuario = [
    { label: 'Externo', value: 'Externo' },
    { label: 'Visitante', value: 'Visitante' },
    { label: 'Terceros', value: 'Terceros' }
  ];
  generos = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Femenino', value: 'Femenino' },
    { label: 'Otro', value: 'Otro' }
  ];

  formEmpresa = this.fb.group({
    nitEmpresa: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    direccion: ['', Validators.maxLength(200)],
    telefono: ['', Validators.maxLength(20)],
    correo: ['', [Validators.email, Validators.maxLength(100)]]
  });

  formPersona = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    identificacion: ['', [Validators.required, Validators.maxLength(50)]],
    cargo: ['', Validators.maxLength(100)],
    genero: [''],
    tipoUsuario: ['Externo', Validators.required]
  });

  formReserva = this.fb.group({
    laboratorioId: ['', Validators.required],
    fecha: [new Date() as Date | null, Validators.required],
    horaInicio: [null as Date | null, Validators.required],
    horaFin: [null as Date | null, Validators.required]
  });

  formIngreso = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]]
  });

  ngOnInit(): void {
    this.cargarAulas();
    this.cargarTipoPractica();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private hoyStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private hms(hhmm: string): string {
    return hhmm && hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  }

  private dateToHHmm(d: Date | null): string {
    if (!d) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private toMin(hhmm: string): number {
    if (!hhmm) return 0;
    const upper = hhmm.trim().toUpperCase();
    const isPM = upper.includes('PM');
    const isAM = upper.includes('AM');
    const clean = upper.replace('AM', '').replace('PM', '').trim();
    const [hPart, mPart] = clean.split(':');
    let h = parseInt(hPart, 10);
    const m = parseInt(mPart, 10);
    if (isNaN(h)) return 0;
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + (isNaN(m) ? 0 : m);
  }

  private getDiaNombreES(d: Date): string {
    return ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'][d.getDay()];
  }

  private toast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'registro-externos', life: 5000, severity, summary, detail });
  }

  cambiarModo(m: Modo): void {
    this.modo = m;
    this.step = 1;
  }

  // ─── CARGA TIPO DE PRÁCTICA ─────────────────────────────────────────────────

  private cargarTipoPractica(): void {
    this.cargandoTipoPractica = true;
    this.tipoPracticaSvc.getByTipo('NO_ESTRUCTURADA').pipe(
      takeUntil(this.destroy$),
      finalize(() => this.cargandoTipoPractica = false),
      catchError(() => of([] as TipoPractica[]))
    ).subscribe((items) => {
      this.tipoPracticaOpciones = [
        { label: 'Seleccione tipo de práctica...', value: '' },
        ...items.map(i => ({ label: i.nombre, value: i.id }))
      ];
    });
  }

  // ─── CARGA DE AULAS ──────────────────────────────────────────────────────────

  private cargarAulas(): void {
    this.cargandoAulas = true;
    this.oraAulasSvc.getAll().pipe(
      takeUntil(this.destroy$),
      finalize(() => this.cargandoAulas = false)
    ).subscribe({
      next: (aulas) => {
        this.aulasOracleData = aulas;
        const norm = (t?: string) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const tipos = new Set(['laboratorio', 'laboratorio de informatica', 'sala de juntas', 'sala de estudio']);
        const filtradas = aulas.filter(a => {
          const tipo = norm(a.tipoAula);
          if (tipos.has(tipo)) return true;
          if (tipo === 'sala especial' && norm(a.nomAula).includes('salon de investigacion')) return true;
          return false;
        });
        this.aulasOptions = filtradas
          .map(a => ({ label: `${a.codAula} - ${a.nomAula} (Cap: ${a.numCapacidad})`, value: a.codAula, numCapacidad: a.numCapacidad }))
          .sort((a, b) => a.label.localeCompare(b.label, 'es'));
        this.lbAulasSvc.getAll().pipe(takeUntil(this.destroy$), catchError(() => of([]))).subscribe(lb => this.lbAulas = lb ?? []);
      },
      error: () => this.toast('error', 'Error', 'No se pudieron cargar las aulas')
    });
  }

  onAulaChange(codAula: string): void {
    this.aulaSeleccionada = this.aulasOracleData.find(a => a.codAula === codAula) ?? null;
    this.conflictoHorario = false;
    this.mensajeConflicto = '';
    this.equiposSeleccionados = [];
    this.suministrosSeleccionados = [];

    // Forzar reselección de hora al cambiar aula
    this.formReserva.patchValue({ horaInicio: null, horaFin: null });

    // Cargar equipos y suministros del laboratorio
    const lbAula = this.lbAulas.find(a => a.codAula === codAula);
    if (lbAula) {
      this.cargarInventarioLab(lbAula.id);
    } else {
      this.equiposLab = [];
      this.suministrosLab = [];
    }

    setTimeout(() => this.verificarDisponibilidad(), 10);
  }

  get capacidadAula(): number { return this.aulaSeleccionada?.numCapacidad ?? 0; }
  get numAsistentes(): number { return this.usuariosEmpresa.length; }
  get capacidadOk(): boolean { return !this.aulaSeleccionada || this.numAsistentes <= this.capacidadAula; }

  // ─── PASO 1: EMPRESA ─────────────────────────────────────────────────────────

  buscarEmpresa(): void {
    const nit = this.formEmpresa.get('nitEmpresa')?.value?.trim();
    if (!nit) { this.toast('warn', 'Atención', 'Ingrese el NIT de la empresa'); return; }
    this.cargando = true;
    this.registroExternoSvc.getByNit(nit).pipe(finalize(() => this.cargando = false)).subscribe({
      next: (empresa) => {
        if (empresa) {
          this.empresaEncontrada = empresa;
          this.esEmpresaNueva = false;
          this.formEmpresa.patchValue({ nitEmpresa: empresa.nitEmpresa, nombre: empresa.nombre, direccion: empresa.direccion ?? '', telefono: empresa.telefono ?? '', correo: empresa.correo ?? '' });
          this.formEmpresa.get('nitEmpresa')?.disable();
          this.toast('success', 'Empresa encontrada', empresa.nombre);
          this.cargarUsuariosEmpresa(empresa.id!);
        } else {
          this.empresaEncontrada = null;
          this.esEmpresaNueva = true;
          this.toast('info', 'Empresa nueva', 'Complete los datos para registrarla');
        }
      },
      error: () => this.toast('error', 'Error', 'Error al buscar la empresa')
    });
  }

  limpiarEmpresa(): void {
    this.empresaEncontrada = null;
    this.esEmpresaNueva = false;
    this.usuariosEmpresa = [];
    this.formEmpresa.reset();
    this.formEmpresa.get('nitEmpresa')?.enable();
  }

  procederPaso2(): void {
    if (this.esEmpresaNueva) {
      if (this.formEmpresa.invalid) { this.formEmpresa.markAllAsTouched(); return; }
      this.cargando = true;
      const v = this.formEmpresa.value;
      const datos: RegistroExterno = { nitEmpresa: v.nitEmpresa?.trim() ?? '', nombre: v.nombre?.trim() ?? '', direccion: v.direccion?.trim() || null, telefono: v.telefono?.trim() || null, correo: v.correo?.trim() || null };
      this.registroExternoSvc.create(datos).pipe(finalize(() => this.cargando = false)).subscribe({
        next: (e) => { this.empresaEncontrada = e; this.esEmpresaNueva = false; this.toast('success', 'Empresa registrada', ''); this.step = 2; },
        error: (e) => this.toast('error', 'Error', e?.error?.mensaje ?? 'No se pudo registrar')
      });
    } else if (this.empresaEncontrada) {
      this.step = 2;
    } else {
      this.toast('warn', 'Atención', 'Busque primero una empresa por NIT');
    }
  }

  // ─── PASO 2: USUARIOS ─────────────────────────────────────────────────────────

  private cargarUsuariosEmpresa(registroId: string): void {
    if (!registroId) {
      this.usuariosEmpresa = [];
      this.toast('warn', 'Atención', 'ID de empresa inválido');
      return;
    }

    this.cargandoUsuarios = true;
    this.usuariosEmpresa = [];

    this.usuariosExternosSvc.getByRegistroId(registroId).pipe(finalize(() => this.cargandoUsuarios = false)).subscribe({
      next: (u) => {
        this.usuariosEmpresa = u ?? [];
        if (!this.usuariosEmpresa.length) {
          this.toast('info', 'Sin asistentes', 'No hay asistentes registrados para esta empresa');
        }
      },
      error: (err) => {
        console.error('Error cargando usuarios externos', err);
        this.toast('error', 'Error', 'No se pudieron cargar los usuarios de la empresa');
      }
    });
  }

  mostrarAgregarPersona(): void { this.mostrarFormPersona = true; this.formPersona.reset({ tipoUsuario: 'Externo' }); }
  cancelarAgregarPersona(): void { this.mostrarFormPersona = false; }

  agregarPersona(): void {
    if (this.formPersona.invalid) { this.formPersona.markAllAsTouched(); return; }
    if (!this.empresaEncontrada?.id) { this.toast('error', 'Error', 'Sin empresa seleccionada'); return; }
    this.cargando = true;
    const v = this.formPersona.value;
    const u: UsuarioExterno = { nombre: v.nombre?.trim() ?? '', identificacion: v.identificacion?.trim() ?? '', cargo: v.cargo?.trim() || null, genero: v.genero || null, tipoUsuario: v.tipoUsuario ?? 'Externo', registroExterno: { id: this.empresaEncontrada.id! } };
    this.usuariosExternosSvc.create(u).pipe(finalize(() => this.cargando = false)).subscribe({
      next: (creado) => { this.usuariosEmpresa = [...this.usuariosEmpresa, creado]; this.mostrarFormPersona = false; this.toast('success', 'Usuario agregado', creado.nombre); },
      error: (e) => this.toast('error', 'Error', e?.error?.mensaje ?? 'No se pudo agregar')
    });
  }

  eliminarUsuario(u: UsuarioExterno, idx: number): void {
    if (!u.id) { this.usuariosEmpresa = this.usuariosEmpresa.filter((_, i) => i !== idx); return; }
    this.usuariosExternosSvc.delete(u.id).subscribe({
      next: () => { this.usuariosEmpresa = this.usuariosEmpresa.filter((_, i) => i !== idx); this.toast('info', 'Eliminado', u.nombre); },
      error: () => this.toast('error', 'Error', 'No se pudo eliminar')
    });
  }

  procederPaso3(): void {
    if (this.usuariosEmpresa.length === 0) { this.toast('warn', 'Sin asistentes', 'Agregue al menos un usuario'); return; }
    this.step = 3;
  }

  // ─── PASO 3: RESERVA ──────────────────────────────────────────────────────────

  private cargarInventarioLab(labId: string): void {
    this.cargandoInventario = true;
    this.equiposLab = [];
    this.suministrosLab = [];
    this.equipoAulaSvc.getByLaboratorio(labId).pipe(
      takeUntil(this.destroy$), catchError(() => of([] as LbEquipoAula[]))
    ).subscribe(e => {
      this.equiposLab = (e ?? []).filter(eq => (eq.cantidadDisponible ?? 0) > 0);
      this.cargandoInventario = false;
    });
    this.suministroAulaSvc.getByLaboratorio(labId).pipe(
      takeUntil(this.destroy$), catchError(() => of([] as LbSuministroAula[]))
    ).subscribe(s => {
      this.suministrosLab = (s ?? []).filter(su => (su.cantidadDisponible ?? 0) > 0);
    });
  }

  toggleEquipo(eq: LbEquipoAula): void {
    const idx = this.equiposSeleccionados.findIndex(e => e.equipoAula.id === eq.id);
    if (idx >= 0) {
      this.equiposSeleccionados.splice(idx, 1);
    } else {
      this.equiposSeleccionados.push({ equipoAula: eq, cantidad: 1 });
    }
  }

  toggleSuministro(su: LbSuministroAula): void {
    const idx = this.suministrosSeleccionados.findIndex(s => s.suministroAula.id === su.id);
    if (idx >= 0) {
      this.suministrosSeleccionados.splice(idx, 1);
    } else {
      this.suministrosSeleccionados.push({ suministroAula: su, cantidad: 1 });
    }
  }

  isEquipoSelected(eq: LbEquipoAula): boolean {
    return this.equiposSeleccionados.some(e => e.equipoAula.id === eq.id);
  }

  isSuministroSelected(su: LbSuministroAula): boolean {
    return this.suministrosSeleccionados.some(s => s.suministroAula.id === su.id);
  }

  getEquipoCantidad(eq: LbEquipoAula): number {
    return this.equiposSeleccionados.find(e => e.equipoAula.id === eq.id)?.cantidad ?? 0;
  }

  setEquipoCantidad(eq: LbEquipoAula, cant: number): void {
    const item = this.equiposSeleccionados.find(e => e.equipoAula.id === eq.id);
    if (item) { item.cantidad = Math.max(1, Math.min(cant, eq.cantidadDisponible ?? 1)); }
  }

  getSuministroCantidad(su: LbSuministroAula): number {
    return this.suministrosSeleccionados.find(s => s.suministroAula.id === su.id)?.cantidad ?? 0;
  }

  setSuministroCantidad(su: LbSuministroAula, cant: number): void {
    const item = this.suministrosSeleccionados.find(s => s.suministroAula.id === su.id);
    if (item) { item.cantidad = Math.max(1, Math.min(cant, su.cantidadDisponible ?? 1)); }
  }

  verificarDisponibilidad(): void {
    const codAula = this.formReserva.get('laboratorioId')?.value;
    const fechaVal = this.formReserva.get('fecha')?.value as Date | null;
    const horaIni = this.dateToHHmm(this.formReserva.get('horaInicio')?.value as Date | null);
    const horaFin = this.dateToHHmm(this.formReserva.get('horaFin')?.value as Date | null);
    if (!codAula || !fechaVal || !horaIni || !horaFin) return;
    const dia = this.getDiaNombreES(fechaVal instanceof Date ? fechaVal : new Date(fechaVal));
    this.horariosSvc.getHorasByAula(codAula, dia).pipe(takeUntil(this.destroy$), catchError(() => of([]))).subscribe((h: HorarioItem[]) => {
      const iniMin = this.toMin(horaIni);
      const finMin = this.toMin(horaFin);
      const c = h.find(x => this.toMin(x.horaInicio) < finMin && this.toMin(x.horaFin) > iniMin);
      this.conflictoHorario = !!c;
      this.mensajeConflicto = c ? `Clase programada: ${c.horaInicio} - ${c.horaFin}${c.materia ? ' (' + c.materia + ')' : ''}` : '';
    });
  }

  crearReserva(): void {
    if (this.formReserva.invalid) { this.formReserva.markAllAsTouched(); return; }
    if (!this.empresaEncontrada) { this.toast('error', 'Error', 'Sin empresa'); return; }
    if (this.usuariosEmpresa.length === 0) { this.toast('warn', 'Sin asistentes', 'Agregue usuarios'); return; }
    if (!this.capacidadOk) { this.toast('warn', 'Cupos insuficientes', `El aula tiene capacidad para ${this.capacidadAula}, hay ${this.numAsistentes} asistentes`); return; }
    if (this.conflictoHorario) { this.toast('warn', 'Conflicto de horario', this.mensajeConflicto); return; }
    if (this.tipoPracticaCtrl.invalid) { this.tipoPracticaCtrl.markAsTouched(); this.toast('warn', 'Atención', 'Seleccione el tipo de práctica'); return; }

    const codAula = this.formReserva.get('laboratorioId')?.value ?? '';
    const lbAula = this.lbAulas.find(a => a.codAula === codAula);
    if (!lbAula) { this.toast('error', 'Aula no sincronizada', 'El aula no está en el sistema local'); return; }

    const fechaVal = this.formReserva.get('fecha')?.value as Date;
    const fechaStr = `${fechaVal.getFullYear()}-${String(fechaVal.getMonth() + 1).padStart(2, '0')}-${String(fechaVal.getDate()).padStart(2, '0')}`;
    const horaInicio = this.hms(this.dateToHHmm(this.formReserva.get('horaInicio')?.value as Date | null));
    const horaFin = this.hms(this.dateToHHmm(this.formReserva.get('horaFin')?.value as Date | null));
    if (this.toMin(horaFin) - this.toMin(horaInicio) < 1) {
      this.toast('warn', 'Horario inválido', 'La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    const asistentes: ReservaAsistente[] = this.usuariosEmpresa.map(u => ({ identificacion: u.identificacion }));

    const equipos: ReservaEquipo[] = this.equiposSeleccionados.map(e => ({
      equipoAula: { id: e.equipoAula.id },
      cantidad: e.cantidad
    }));
    const suministros: ReservaSuministro[] = this.suministrosSeleccionados.map(s => ({
      suministroAula: { id: s.suministroAula.id },
      cantidad: s.cantidad
    }));

    const reserva: ReservaAula = {
      laboratorio: { id: lbAula.id },
      identificacion: this.empresaEncontrada.nitEmpresa,
      fecha: fechaStr,
      horaInicio,
      horaFin,
      cantidadAsistentes: asistentes.length,
      cantidadEquipos: equipos.reduce((sum, e) => sum + e.cantidad, 0),
      cantidadSuministros: suministros.reduce((sum, s) => sum + s.cantidad, 0),
      aprobado: true,
      tipoPractica: this.tipoPracticaCtrl.value || undefined,
      motivo: this.tipoPracticaOpciones.find(o => o.value === this.tipoPracticaCtrl.value)?.label || undefined,
      asistentes,
      equipos: equipos.length > 0 ? equipos : undefined,
      suministros: suministros.length > 0 ? suministros : undefined
    };

    this.cargando = true;
    this.reservasSvc.create(reserva).pipe(finalize(() => this.cargando = false)).subscribe({
      next: () => { this.toast('success', 'Reserva creada', 'El aula fue reservada correctamente'); this.reiniciar(); },
      error: (e) => this.toast('error', 'Error al reservar', e?.error?.mensaje ?? 'No se pudo crear la reserva')
    });
  }

  // ─── MODO INGRESO ─────────────────────────────────────────────────────────────

  buscarIngresoIdentificacion(): void {
    const id = this.formIngreso.get('identificacion')?.value?.trim();
    if (!id) return;
    this.cargandoIngreso = true;
    this.usuarioIngreso = null;
    this.reservaSeleccionada = null;
    this.entradaMarcada = false;
    this.usuariosExternosSvc.getByIdentificacion(id).pipe(finalize(() => this.cargandoIngreso = false)).subscribe({
      next: (usuarios) => {
        if (!usuarios?.length) { this.toast('warn', 'No encontrado', 'Identificación no registrada en ninguna empresa'); return; }
        this.usuarioIngreso = usuarios[0];
        const re = (usuarios[0].registroExterno as any);
        const nit = re?.nitEmpresa ?? '';
        if (!nit) { this.toast('warn', 'Sin empresa', 'El usuario no tiene empresa asociada'); return; }

        // DESACTIVADO: filtrado por fecha (hoy) en ingreso para permitir cualquier reserva
        // this.reservasSvc.getByIdentificacionYFecha(nit, this.hoyStr()).subscribe({
        //   next: (r) => {
        //     this.reservasHoy = r ?? [];
        //     if (!this.reservasHoy.length) { this.toast('info', 'Sin reserva', 'No hay reserva activa hoy para esta empresa'); return; }
        //     this.reservaSeleccionada = this.reservasHoy[0];
        //     this.toast('success', 'Reserva encontrada', `${this.reservasHoy.length} reserva(s) hoy`);
        //   }
        // });

        this.reservasSvc.getByIdentificacion(nit).subscribe({
          next: (r) => {
            this.reservasHoy = r ?? [];
            if (!this.reservasHoy.length) { this.toast('info', 'Sin reserva', 'No hay reserva registrada para esta empresa'); return; }
            this.reservaSeleccionada = this.reservasHoy[0];

            // Verificar si ya tiene una entrada activa para mostrar directamente el botón de salida
            this.usosLaboratorioSvc.estadoPorPath(id).pipe(catchError(() => of(null))).subscribe(estado => {
              if (estado?.activo) {
                this.entradaMarcada = true;
                this.toast('info', 'Entrada activa', 'El visitante ya tiene una entrada registrada. Puede marcar la salida.');
              } else {
                this.toast('success', 'Reserva encontrada', `${this.reservasHoy.length} reserva(s) encontradas`);
              }
            });
          }
        });
      },
      error: () => this.toast('error', 'Error', 'No se pudo buscar la identificación')
    });
  }

  marcarEntradaIngreso(): void {
    if (!this.usuarioIngreso?.identificacion) return;
    const ahora = new Date();
    const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    const laboratorioId = this.reservaSeleccionada?.laboratorio?.codAula ?? this.reservaSeleccionada?.laboratorio?.id ?? '';
    if (!laboratorioId) { this.toast('warn', 'Sin aula', 'No hay aula seleccionada para registrar ingreso'); return; }

    const payload: EntradaPayload = {
      identificacion: this.usuarioIngreso.identificacion,
      laboratorioId,
      fechaUso: this.hoyStr(),
      horaInicio: this.hms(hhmm),
      semestre: 'N/A',
      genero: this.usuarioIngreso.genero || 'N/A',
      rol: this.usuarioIngreso.tipoUsuario || 'CONTRATISTA',
      programa: 'N/A',
      facultad: 'N/A',
      motivo: this.reservaSeleccionada?.motivo
        || this.tipoPracticaOpciones.find(o => o.value === this.reservaSeleccionada?.tipoPractica)?.label
        || 'Visita externa',
      observaciones: null,
      reservaId: this.reservaSeleccionada?.id ?? undefined
    };

    this.usosLaboratorioSvc.marcarEntrada(payload).subscribe({
      next: () => { this.entradaMarcada = true; this.toast('success', 'Entrada registrada', `Bienvenido, ${this.usuarioIngreso!.nombre}`); },
      error: (err) => {
        const msg: string = err?.error?.error ?? err?.error?.mensaje ?? '';
        if (msg.toLowerCase().includes('registro activo') || msg.toLowerCase().includes('marcar salida')) {
          this.entradaMarcada = true;
          this.toast('warn', 'Entrada previa activa', 'Ya existe una entrada activa. Use el botón para marcar la salida.');
        } else {
          this.toast('error', 'Error', msg || 'No se pudo registrar la entrada');
        }
      }
    });
  }

  marcarSalidaIngreso(): void {
    if (!this.usuarioIngreso?.identificacion) return;
    const ahora = new Date();
    const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    const payload: SalidaPayload = {
      identificacion: this.usuarioIngreso.identificacion,
      horaFin: this.hms(hhmm),
      semestre: 'N/A',
      genero: this.usuarioIngreso.genero || 'N/A',
      rol: this.usuarioIngreso.tipoUsuario || 'CONTRATISTA',
      programa: 'N/A',
      facultad: 'N/A',
      motivo: this.reservaSeleccionada?.motivo
        || this.tipoPracticaOpciones.find(o => o.value === this.reservaSeleccionada?.tipoPractica)?.label
        || 'Visita externa',
      observaciones: null
    };

    this.usosLaboratorioSvc.marcarSalida(payload).subscribe({
      next: () => {
        // Cerrar la reserva y restaurar inventario (consumibles no se devuelven)
        if (this.reservaSeleccionada?.id) {
          const devolucion: CierreReservaDTO = { suministros: {} };
          this.reservasSvc.cerrar(this.reservaSeleccionada.id, devolucion)
            .pipe(catchError(() => of(null)))
            .subscribe();
        }
        this.toast('success', 'Salida registrada', `Hasta pronto, ${this.usuarioIngreso!.nombre}`);
        this.reiniciarIngreso();
      },
      error: (err) => this.toast('error', 'Error', err?.error?.error ?? 'No se pudo registrar la salida')
    });
  }

  reiniciarIngreso(): void {
    this.formIngreso.reset();
    this.usuarioIngreso = null;
    this.reservaSeleccionada = null;
    this.reservasHoy = [];
    this.entradaMarcada = false;
  }

  reiniciar(): void {
    this.step = 1;
    this.empresaEncontrada = null;
    this.esEmpresaNueva = false;
    this.usuariosEmpresa = [];
    this.mostrarFormPersona = false;
    this.conflictoHorario = false;
    this.mensajeConflicto = '';
    this.aulaSeleccionada = null;
    this.equiposLab = [];
    this.suministrosLab = [];
    this.equiposSeleccionados = [];
    this.suministrosSeleccionados = [];
    this.formEmpresa.reset();
    this.formEmpresa.get('nitEmpresa')?.enable();
    this.formPersona.reset({ tipoUsuario: 'Externo' });
    this.formReserva.reset({ fecha: new Date() });
    this.tipoPracticaCtrl.reset('');
    this.reiniciarIngreso();
  }

  // ─── HELPERS UI ───────────────────────────────────────────────────────────────

  invalidEmpresa(ctrl: string): boolean { const c = this.formEmpresa.get(ctrl); return !!(c && c.invalid && (c.touched || c.dirty)); }
  invalidPersona(ctrl: string): boolean { const c = this.formPersona.get(ctrl); return !!(c && c.invalid && (c.touched || c.dirty)); }
  invalidReserva(ctrl: string): boolean { const c = this.formReserva.get(ctrl); return !!(c && c.invalid && (c.touched || c.dirty)); }
  invalidIngreso(ctrl: string): boolean { const c = this.formIngreso.get(ctrl); return !!(c && c.invalid && (c.touched || c.dirty)); }
}
