import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { StepperModule } from 'primeng/stepper';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';
import { QrTokenService } from '../../core/services/qr-token.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { LbAsistenciaHorarioService, LbAsistenciaHorario } from '../../core/services/lb-asistencia-horario.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { environment } from '@shared/shared-environments';
import { of, firstValueFrom } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

type Opt = { label: string; value: string };
type OpcionAula = { id: string; nombre: string };

type HorarioExt = HorarioItem & {
  primeraHora?: string;
  ultimaHora?: string;
  totalFranjas?: number;
  nombreClase?: string;
  nomAula?: string;
};

@Component({
  selector: 'app-solicitud-laboratorio',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    StepperModule,
    PanelModule,
    CardModule,
    MessageModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    ToastModule,
    InputComponent,
    SelectComponent,
    DatepickerComponent
  ],
  providers: [MessageService, UsuariosOracleService, HorariosOracleService, QrTokenService, LaboratoriosService, LbAsistenciaHorarioService],
  templateUrl: './solicitud-laboratorio.component.html'
})
export class SolicitudLaboratorioComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private usuariosSrv = inject(UsuariosOracleService);
  private horariosSrv = inject(HorariosOracleService);
  private qrTokenService = inject(QrTokenService);
  private labsService = inject(LaboratoriosService);
  private asistenciaHorarioSrv = inject(LbAsistenciaHorarioService);
  private toast = inject(MessageService);

  private labIdPorNombre = new Map<string, string>();
  private labsLocales: Laboratorio[] = [];

  private fechaFuturaValidator() {
    return (control: AbstractControl) => {
      const fecha = control.value as Date;
      if (!fecha) return null;

      const hoy = this.onlyDate(new Date());
      const fechaSeleccionada = this.onlyDate(fecha);

      return fechaSeleccionada.getTime() >= hoy.getTime() ? null : { fechaPasada: true };
    };
  }

  activeStep = 1;

  private readonly ROLES_DOCENTE = new Set(['DOCENTE', 'PROFESOR', 'PROFESORA']);
  public esDocenteValido = false;

  public minDate = this.onlyDate(new Date());

  generos: Opt[] = [
    { label: 'Seleccionar...', value: '' },
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
    { label: 'Otro', value: 'O' }
  ];
  cargos: Opt[] = [
    { label: 'Seleccionar...', value: '' },
    { label: 'Docente', value: 'PROFESOR' },
    { label: 'Estudiante', value: 'ESTUDIANTE' },
    { label: 'Administrativo', value: 'ADMINISTRATIVO' }
  ];
  programas: Opt[] = [{ label: 'Seleccionar...', value: '' }];
  facultades: Opt[] = [{ label: 'Seleccionar...', value: '' }];

  laboratorios: OpcionAula[] = [];
  seleccionadoId: string | null = null;

  horariosDocenteDia: HorarioExt[] = [];
  horariosAula: HorarioExt[] = [];
  claseSeleccionada: string | null = null;
  loadingHorarios = false;
  horariosMsg = '';

  nombreUsuario = '';
  loadingUsuario = false;
  private docenteNombreActual = '';

  // ─── No-uso ──────────────────────────────────────────────────────────────
  enviandoNoUso = false;
  noUsoDeclarado = false;

  qrValue: string | null = null;
  qrDataUrl: string | null = null;
  validityMinutes = 5;
  private slotEndMs: number | null = null;
  countdown = 0;
  private qrTimer: ReturnType<typeof setInterval> | null = null;
  private sessionSalt = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  private qrBaseUrl =
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:4203/asistencia-qr'
      : 'https://apps.umariana.edu.co/laboratorios/asistencia-qr';

  formUsuario = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(4)]],
    nombre:    [{ value: '', disabled: true }],
    genero:    [{ value: '', disabled: true }],
    cargo:     [{ value: '', disabled: true }],
    programa:  [{ value: '', disabled: true }],
    facultad:  [{ value: '', disabled: true }],
    semestre:  [{ value: '', disabled: true }]
  });

  formUso = this.fb.group({
    fecha_uso: [null as Date | null, [Validators.required, this.fechaFuturaValidator()]],
    hora_inicio: ['', Validators.required],
    hora_fin: [''],
    laboratorio_id: ['', Validators.required]
  });

  get canIrPaso2(): boolean {
    return !!this.nombreUsuario && this.esDocenteValido && !!this.horariosDocenteDia.length;
  }

  get laboratorioActualNombre(): string {
    return this.seleccionadoId || '—';
  }

  ngOnInit(): void {
    this.cargarLaboratoriosLocales();

    const ahora = new Date();
    this.formUso.patchValue({ fecha_uso: this.minDate, hora_inicio: this.aHHMM(ahora), hora_fin: '' }, { emitEvent: false });

    const labControl = this.formUso.get('laboratorio_id');
    if (labControl) {
      labControl.valueChanges.subscribe((nombreSel) => {
        this.seleccionadoId = nombreSel ? String(nombreSel) : null;

        if (!this.seleccionadoId) {
          this.limpiarQr();
          this.horariosAula = [];
          this.claseSeleccionada = null;
          return;
        }

        this.horariosAula = this.horariosDocenteDia.filter(h =>
          this.mismaAula(h.nomAula, this.seleccionadoId || '') || this.mismaAula(h.codAula, this.seleccionadoId || '')
        );

        if (this.horariosAula.length) {
          const elegido = this.elegirClaseDelMomento(this.horariosAula);
          if (elegido) this.setDesdeHorario(elegido);
        }

        this.generarORotarQr();
        this.activeStep = 2;
      });
    }

    const fechaControl = this.formUso.get('fecha_uso');
    if (fechaControl) {
      fechaControl.valueChanges.subscribe(async (val) => {
        if (!val) return;

        const sel = this.onlyDate(val as Date);
        const hoy = this.onlyDate(new Date());

        if (sel.getTime() < hoy.getTime()) {
          this.formUso.patchValue({ fecha_uso: hoy }, { emitEvent: false });
          this.toast.add({ severity: 'warn', summary: 'Fecha inválida', detail: 'No puedes seleccionar fechas pasadas. Se ha establecido la fecha actual.' });
          return;
        }

        if (this.docenteNombreActual) {
          await this.cargarHorarioPorNombre(this.docenteNombreActual, sel);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.detenerTemporizadorQr();
  }

  private onlyDate(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private aHHMM(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private aHHMMDesdeEntrada(v: Date | string | number | null | undefined): string {
    if (v instanceof Date) return this.aHHMM(v);
    const s = (v ?? '').toString().trim();
    if (!s) return '';
    let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (m) {
      let h = (+m[1]) % 12;
      if (m[3].toUpperCase() === 'PM') h += 12;
      return `${String(h).padStart(2, '0')}:${m[2]}`;
    }
    m = s.match(/^(\d{1,2}):(\d{2})(?::\d{1,2})?$/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})(\d{2})$/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
    const d = new Date(`1970-01-01T${s}`);
    if (!isNaN(d.getTime())) return this.aHHMM(d);
    return s;
  }

  private hhmmAMinutos(hhmm: string): number {
    const [h, m] = (hhmm || '0:0').split(':').map(n => parseInt(n, 10));
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  }

  private getDiaNombreES(fecha: Date): string {
    const es = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    return es[fecha.getDay()];
  }

  private normalizar(s: string): string {
    return (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');
  }

  private mismaAula(a?: string, b?: string): boolean {
    return this.normalizar(a ?? '') === this.normalizar(b ?? '');
  }

  private nombresCoinciden(docenteRaw: string, nombreUsuario: string): boolean {
    const A = this.normalizar(docenteRaw);
    const B = this.normalizar(nombreUsuario);
    if (!A || !B) return false;
    if (A === B) return true;
    const toks = B.split(' ').filter(Boolean);
    if (toks.length >= 2 && toks.every(t => A.includes(t))) return true;
    return A.includes(B) || B.includes(A);
  }

  private consultarUsuario(codigo: string) {
    return this.usuariosSrv.getByCodigo(codigo).pipe(
      catchError(() => {
        const url = `${environment.apiOracle}/usuarios/${encodeURIComponent(codigo)}`;
        return this.http.get<UsuarioOracle>(url, { observe: 'response' }).pipe(
          timeout(8000),
          map(res => (res.status === 204 ? null : (res.body as UsuarioOracle))),
          catchError(() => of(null))
        );
      })
    );
  }

  public buscarIdentificacion() {
    const id = (this.formUsuario.value.identificacion ?? '').toString().trim();
    if (!/^\d{5,}$/.test(id)) {
      this.toast.add({ severity: 'warn', summary: 'Atención', detail: 'Ingrese una identificación válida (solo números).' });
      return;
    }

    this.loadingUsuario = true;
    this.consultarUsuario(id).subscribe({
      next: async (u: UsuarioOracle | null) => {
        this.esDocenteValido = false;
        this.nombreUsuario = '';
        this.docenteNombreActual = '';
        this.horariosDocenteDia = [];
        this.horariosAula = [];
        this.laboratorios = [];
        this.seleccionadoId = null;
        this.limpiarQr();

        if (!u) {
          this.toast.add({ severity: 'info', summary: 'No encontrado', detail: 'No se encontró la identificación.' });
          this.formUsuario.setErrors({ noAccess: true });
          return;
        }

        const norm = this.normalizarUsuario(u);
        this.nombreUsuario = norm.nombre;
        this.docenteNombreActual = norm.nombre;

        const rolNorm = (norm.rol || '').toString().trim().toUpperCase();
        if (rolNorm === 'ESTUDIANTE') {
          this.toast.add({ severity: 'error', summary: 'Acceso restringido', detail: 'El acceso es solo para docentes.' });
          this.formUsuario.setErrors({ noAccess: true });
          return;
        }

        this.esDocenteValido = this.ROLES_DOCENTE.has(rolNorm);
        if (!this.esDocenteValido) {
          this.toast.add({ severity: 'error', summary: 'Acceso restringido', detail: 'El acceso es solo para docentes.' });
          this.formUsuario.setErrors({ noAccess: true });
          return;
        }
        this.formUsuario.setErrors(null);

        const usuarioRecord = u as unknown as Record<string, unknown>;
        this.formUsuario.patchValue({
          nombre: norm.nombre,
          genero: norm.genero,
          cargo: norm.rol,
          programa: norm.programa,
          facultad: norm.facultad,
          semestre: (usuarioRecord['semestre'] as string) || ''
        }, { emitEvent: false });
        this.asegurarOpcion(this.programas, norm.programa);
        this.asegurarOpcion(this.facultades, norm.facultad);

        const fecha = (this.formUso.value.fecha_uso as Date) || this.minDate;
        await this.cargarHorarioPorNombre(norm.nombre, fecha);

        if (this.horariosDocenteDia.length) {
          this.toast.add({ severity: 'success', summary: 'Perfecto', detail: 'Profesor y horario cargados.' });
        } else {
          this.toast.add({ severity: 'info', summary: 'Horario', detail: 'No se encontraron clases para el profesor en la fecha seleccionada.' });
        }
      },
      error: (e) => {
        this.toast.add({ severity: 'error', summary: 'Error consultando usuario', detail: this.describirErrorHttp(e) });
        this.formUsuario.setErrors({ noAccess: true });
      },
      complete: () => (this.loadingUsuario = false)
    });
  }

  private describirErrorHttp(e: { name?: string; status?: number; statusText?: string }): string {
    if (e?.name === 'TimeoutError') return 'Timeout consultando el backend.';
    if (e?.status === 0) return 'No hay conexión con el servidor (red/firewall/proxy).';
    if (e?.status) return `HTTP ${e.status}${e.statusText ? ' - ' + e.statusText : ''}`;
    return 'Error de red o CORS.';
  }

  private validarFechaSeleccionada(fecha: Date | null): boolean {
    if (!fecha) return false;

    const hoy = this.onlyDate(new Date());
    const fechaSeleccionada = this.onlyDate(fecha);

    if (fechaSeleccionada.getTime() < hoy.getTime()) {
      this.toast.add({ severity: 'warn', summary: 'Fecha inválida', detail: 'No puedes seleccionar fechas pasadas' });
      return false;
    }
    return true;
  }

  private normalizarUsuario(u: UsuarioOracle) {
    let genero = (u.genero || '').trim();
    let rol = (u.cargo || '').trim();
    let programa = (u.programa || '').trim();
    let facultad = (u.facultad || '').trim();

    const generosValid = ['Masculino', 'Femenino', 'Otro'];
    const rolesValid = ['Estudiante', 'Docente', 'Administrativo'];

    if (!generosValid.includes(genero) && generosValid.includes(programa)) [genero, programa] = [programa, genero];
    if (!rolesValid.includes(rol) && rolesValid.includes(facultad)) [rol, facultad] = [facultad, rol];

    return { nombre: (u.nombre || '').trim(), genero, rol, programa, facultad };
  }

  private asegurarOpcion(list: Opt[], value?: string) {
    const v = value?.trim();
    if (!v) return;
    if (!list.some(o => o.value === v)) list.push({ label: v, value: v });
  }

  private async cargarHorarioPorNombre(nombre: string, fecha: Date) {
    this.loadingHorarios = true;
    this.horariosDocenteDia = [];
    this.horariosAula = [];
    this.laboratorios = [];
    this.seleccionadoId = null;
    this.claseSeleccionada = null;
    this.limpiarQr();

    const dia = this.getDiaNombreES(fecha);
    const items = await firstValueFrom(this.horariosSrv.getHoras(dia).pipe(catchError(() => of([] as HorarioItem[]))));
    if (!items || !items.length) {
      this.loadingHorarios = false;
      this.horariosMsg = 'Sin horarios para ese día.';
      return;
    }

    const propios = (items as HorarioItem[]).filter(raw => {
      const rawRecord = raw as unknown as Record<string, unknown>;
      const docenteRaw =
        rawRecord['docente'] ?? rawRecord['docenteNombre'] ?? rawRecord['profesor'] ??
        rawRecord['nombreProfesor'] ?? rawRecord['titular'] ?? rawRecord['nombreDocente'] ?? '';
      return this.nombresCoinciden(String(docenteRaw), nombre);
    });

    let normal = this.normalizarHorarios(propios);
    normal = this.quitarDuplicadosHorarios(normal);
    normal.sort((a, b) => this.hhmmAMinutos(a.horaInicio || '') - this.hhmmAMinutos(b.horaInicio || ''));

    this.horariosDocenteDia = normal;

    const aulasUnicas = new Map<string, OpcionAula>();
    for (const h of normal) {
      const visible = (h.nomAula && h.nomAula.trim()) ? h.nomAula.trim() : h.codAula;
      const key = this.normalizar(visible);
      if (!aulasUnicas.has(key)) {
        aulasUnicas.set(key, { id: visible, nombre: visible });
      }
    }
    this.laboratorios = Array.from(aulasUnicas.values());

    if (normal.length) {
      const elegido = this.elegirClaseDelMomento(normal);
      if (elegido) {
        const visible = (elegido.nomAula && elegido.nomAula.trim()) ? elegido.nomAula.trim() : elegido.codAula;
        this.formUso.patchValue({
          laboratorio_id: visible,
          hora_inicio: this.aHHMMDesdeEntrada(elegido.horaInicio || ''),
          hora_fin: this.aHHMMDesdeEntrada(elegido.horaFin || '')
        }, { emitEvent: false });

        this.seleccionadoId = visible;
        this.claseSeleccionada = (elegido.nombreClase || '').toString();

        this.horariosAula = normal.filter(h =>
          this.mismaAula(h.nomAula, visible) || this.mismaAula(h.codAula, visible)
        );

        await this.generarORotarQr();
        this.activeStep = 2;
      }
    } else {
      this.horariosMsg = 'No hay clases para este profesor en la fecha seleccionada.';
    }

    this.loadingHorarios = false;
  }

  private normalizarHorarios(items: HorarioItem[] | null | undefined): HorarioExt[] {
    if (!items || !Array.isArray(items)) return [];
    return items.map((raw) => {
      const rawRecord = raw as unknown as Record<string, unknown>;
      const codAula = String(rawRecord['codAula'] ?? rawRecord['aula'] ?? rawRecord['codigoAula'] ?? '');
      const nomAula = String(rawRecord['nomAula'] ?? rawRecord['nombreAula'] ?? rawRecord['aulaNombre'] ?? '');
      const diaSemana = String(rawRecord['diaSemana'] ?? rawRecord['dia'] ?? '');
      const horaInicio = this.aHHMMDesdeEntrada((rawRecord['horaInicio'] ?? rawRecord['inicio'] ?? rawRecord['hora_ini'] ?? '') as string | number | Date);
      const horaFin = this.aHHMMDesdeEntrada((rawRecord['horaFin'] ?? rawRecord['fin'] ?? rawRecord['hora_fin'] ?? '') as string | number | Date);
      const primeraHora = this.aHHMMDesdeEntrada((rawRecord['primeraHora'] ?? '') as string | number | Date);
      const ultimaHora = this.aHHMMDesdeEntrada((rawRecord['ultimaHora'] ?? '') as string | number | Date);
      const totalFranjas = Number(rawRecord['totalFranjas'] ?? 0);
      const nombreClase = String(
        rawRecord['nombreClase'] ?? rawRecord['asignatura'] ?? rawRecord['nombreAsignatura'] ??
        rawRecord['materia'] ?? rawRecord['clase'] ?? rawRecord['descripcion'] ?? rawRecord['nombre'] ?? ''
      );
      return { codAula, nomAula, diaSemana, horaInicio, horaFin, primeraHora, ultimaHora, totalFranjas, nombreClase } as HorarioExt;
    });
  }

  private quitarDuplicadosHorarios(arr: HorarioExt[]): HorarioExt[] {
    const vistos = new Set<string>();
    return arr.filter(h => {
      const clave = [
        this.normalizar(h.diaSemana || ''),
        this.aHHMMDesdeEntrada(h.horaInicio || ''),
        this.aHHMMDesdeEntrada(h.horaFin || ''),
        this.normalizar(h.codAula || ''),
        this.normalizar(h.nombreClase || '')
      ].join('|');
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  }

  private elegirClaseDelMomento(lista: HorarioExt[]): HorarioExt | null {
    if (!lista.length) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const actual = lista.find(h => {
      const i = this.hhmmAMinutos(h.horaInicio || '');
      const f = this.hhmmAMinutos(h.horaFin || '');
      return i <= nowMin && nowMin <= f;
    });
    if (actual) return actual;

    const proxima = lista.find(h => this.hhmmAMinutos(h.horaInicio || '') >= nowMin);
    return proxima || lista[0];
  }

  public setDesdeHorario(h: HorarioExt) {
    if (!h) return;
    const visible = (h.nomAula && h.nomAula.trim()) ? h.nomAula.trim() : h.codAula;
    const ahora = new Date();
    this.formUso.patchValue({
      laboratorio_id: visible,
      hora_inicio: this.aHHMM(ahora),
      hora_fin: this.aHHMMDesdeEntrada(h.horaFin || '')
    }, { emitEvent: false });
    this.seleccionadoId = visible;
    this.claseSeleccionada = (h.nombreClase || '').toString();
  }

  private obtenerIntervalo(ahoraMs = Date.now()) {
    const ms = this.validityMinutes * 60_000;
    const start = Math.floor(ahoraMs / ms) * ms;
    const end = start + ms;
    return { start, end };
  }

  private async generarORotarQr() {
    if (!this.seleccionadoId) {
      this.limpiarQr();
      return;
    }
    const { start, end } = this.obtenerIntervalo();

    const codAulaOracle =
      this.horariosAula.find(h => this.mismaAula(h.nomAula, this.seleccionadoId || ''))?.codAula
      ?? this.horariosAula[0]?.codAula
      ?? this.seleccionadoId;

    const labUUID = this.resolverLabUUID(this.seleccionadoId);

    const qrParams = {
      labName: this.seleccionadoId,
      labCode: labUUID, 
      labCodeOracle: codAulaOracle,
      slot: new Date(start).toISOString(),
      exp: new Date(end).toISOString(),
      salt: this.sessionSalt
    };

    this.qrValue = await this.qrTokenService.generateQrUrl(this.qrBaseUrl, qrParams);

    await this.construirImagenQr(this.qrValue);
    this.slotEndMs = end;
    this.actualizarCuentaRegresiva();
    this.iniciarTemporizadorQr();
  }

  private actualizarCuentaRegresiva() {
    if (!this.slotEndMs) {
      this.countdown = 0;
      return;
    }
    const ahora = Date.now();
    this.countdown = Math.max(0, Math.floor((this.slotEndMs - ahora) / 1000));
  }

  private iniciarTemporizadorQr() {
    this.detenerTemporizadorQr();
    this.qrTimer = setInterval(async () => {
      this.actualizarCuentaRegresiva();
      if (this.slotEndMs && Date.now() >= this.slotEndMs) {
        await this.generarORotarQr();
      }
    }, 1000);
  }

  private detenerTemporizadorQr() {
    if (this.qrTimer) {
      clearInterval(this.qrTimer);
      this.qrTimer = null;
    }
  }

  private limpiarQr() {
    this.detenerTemporizadorQr();
    this.qrValue = null;
    this.qrDataUrl = null;
    this.slotEndMs = null;
    this.countdown = 0;
  }

  private async construirImagenQr(valor: string) {
    try {
      const { toDataURL } = await import('qrcode');
      this.qrDataUrl = await toDataURL(valor, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });
    } catch {
      this.qrDataUrl = null;
      this.toast.add({ severity: 'error', summary: 'QR', detail: 'No se pudo generar la imagen del QR.' });
    }
  }

  public async descargarQRPNG(): Promise<void> {
    if (!this.qrDataUrl) return;

    const idDocente = (this.formUsuario.value.identificacion ?? '').toString().trim();
    const fecha = this.formUso.value.fecha_uso as Date | null;
    const horarioActual = this.horariosAula.find(h =>
      this.mismaAula(h.nomAula, this.seleccionadoId || '') ||
      this.mismaAula(h.codAula, this.seleccionadoId || '')
    );
    const codAulaOracle = horarioActual?.codAula ?? this.seleccionadoId ?? '';

    // Usar la hora de inicio del HORARIO Oracle (no la hora actual del reloj)
    const horaInicioClase = horarioActual ? this.aHHMMDesdeEntrada(horarioActual.horaInicio || '') : '';
    const horaFinClase    = horarioActual ? this.aHHMMDesdeEntrada(horarioActual.horaFin    || '') : '';

    if (idDocente && fecha && horaInicioClase && codAulaOracle) {
      const fechaStr = [
        fecha.getFullYear(),
        String(fecha.getMonth() + 1).padStart(2, '0'),
        String(fecha.getDate()).padStart(2, '0')
      ].join('-');

      try {
        const registros = await firstValueFrom(
          this.asistenciaHorarioSrv.getByAulaYFecha(codAulaOracle, fechaStr)
            .pipe(catchError(() => of([] as LbAsistenciaHorario[])))
        );

        // Comparar normalizando formato: "08:00:00" y "08:00" deben coincidir
        const reg = registros.find(r =>
          this.aHHMMDesdeEntrada(r.horaInicio) === horaInicioClase
        );

        if (reg?.id) {
          // Registro ya existe en la cache → actualizar asistio = true
          await firstValueFrom(
            this.asistenciaHorarioSrv.confirmarAsistencia(reg.id, {
              asistio: true,
              confirmadoPor: idDocente
            }).pipe(catchError(() => of(null)))
          );
        } else if (horarioActual) {
          // No fue sincronizado aún → crear el registro directamente con asistio = true
          await firstValueFrom(
            this.asistenciaHorarioSrv.crear({
              codAula: codAulaOracle,
              nomAula: horarioActual.nomAula ?? '',
              diaSemana: this.getDiaNombreES(fecha),
              fechaClase: fechaStr,
              horaInicio: horaInicioClase,
              horaFin: horaFinClase,
              materia: horarioActual.nombreClase ?? '',
              docente: this.nombreUsuario,
              identificacionDocente: idDocente,
              asistio: true,
              observacion: 'Asistencia confirmada al descargar QR',
              confirmadoPor: idDocente
            }).pipe(catchError(() => of(null)))
          );
        }
      } catch {
        // Silencioso: el QR se descarga aunque falle el registro de asistencia
      }
    }

    const a = document.createElement('a');
    a.href = this.qrDataUrl;
    a.download = `qr-lab-${this.seleccionadoId}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private cargarLaboratoriosLocales(): void {
    this.labsService.getAll().subscribe({
      next: (lista) => {
        this.labsLocales = lista ?? [];
        this.labIdPorNombre = new Map(
          this.labsLocales.map(l => [this.normalizar(l.nombre || ''), String(l.id)])
        );
      },
      error: () => { /* Silencioso: no crítico */ }
    });
  }

  private resolverLabUUID(nombreVisible: string): string {
    const uuid = this.labIdPorNombre.get(this.normalizar(nombreVisible));
    return uuid ?? nombreVisible;
  }

  private reiniciarTodo() {
    const ahora = new Date();
    this.formUsuario.reset({ identificacion: '', nombre: '', genero: '', cargo: '', programa: '', facultad: '', semestre: '' }, { emitEvent: false });
    this.formUso.reset({ fecha_uso: this.minDate, hora_inicio: this.aHHMM(ahora), hora_fin: '', laboratorio_id: '' }, { emitEvent: false });
    this.nombreUsuario = '';
    this.esDocenteValido = false;
    this.docenteNombreActual = '';
    this.seleccionadoId = null;
    this.horariosDocenteDia = [];
    this.horariosAula = [];
    this.claseSeleccionada = null;
    this.laboratorios = [];
    this.limpiarQr();
    this.noUsoDeclarado = false;
    this.activeStep = 1;
  }

  public activarPaso1YReset(): void {
    this.reiniciarTodo();
  }

  public campoUsuarioInvalido(c: 'identificacion'|'genero'|'cargo'|'programa'|'facultad'|'semestre'): boolean {
    const ctrl = this.formUsuario.get(c);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  public campoUsoInvalido(c: 'fecha_uso'|'hora_inicio'|'hora_fin'|'laboratorio_id'): boolean {
    const ctrl = this.formUso.get(c);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  /**
   * El docente declara que no va a usar el laboratorio.
   * Libera la franja para que pueda ser reservada.
   */
  public declararNoUso(): void {
    const idDocente = (this.formUsuario.value.identificacion ?? '').toString().trim();
    const fecha = this.formUso.value.fecha_uso as Date | null;
    const horaInicio = (this.formUso.value.hora_inicio ?? '').toString().trim();
    const horaFin = (this.formUso.value.hora_fin ?? '').toString().trim();

    // Obtener codAula real del horario (no el nombre visible)
    const horarioActual = this.horariosAula.find(h =>
      this.mismaAula(h.nomAula, this.seleccionadoId || '') ||
      this.mismaAula(h.codAula, this.seleccionadoId || '')
    );
    const codAulaOracle = horarioActual?.codAula ?? this.seleccionadoId ?? '';
    const nomAula = horarioActual?.nomAula ?? this.seleccionadoId ?? '';
    const materia = horarioActual?.nombreClase ?? '';

    if (!idDocente || !fecha || !horaInicio || !codAulaOracle) {
      this.toast.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Complete todos los datos antes de declarar no-uso.'
      });
      return;
    }

    const fechaStr = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');

    this.enviandoNoUso = true;
    this.asistenciaHorarioSrv.declararNoUso({
      identificacionDocente: idDocente,
      codAula: codAulaOracle,
      nomAula,
      materia,
      fechaClase: fechaStr,
      horaInicio,
      horaFin: horaFin || horaInicio,
      nombreDocente: this.nombreUsuario,
      observacion: 'Docente declaró no-uso desde solicitud de laboratorio'
    }).subscribe({
      next: () => {
        this.noUsoDeclarado = true;
        this.enviandoNoUso = false;
        this.toast.add({
          severity: 'success',
          summary: 'Declaración registrada',
          detail: 'El laboratorio quedará disponible para reservas en esa franja.'
        });
      },
      error: (err) => {
        this.enviandoNoUso = false;
        const msg = (err?.error?.error ?? err?.message ?? 'Error desconocido').toString();
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo registrar la declaración: ${msg}`
        });
      }
    });
  }
}