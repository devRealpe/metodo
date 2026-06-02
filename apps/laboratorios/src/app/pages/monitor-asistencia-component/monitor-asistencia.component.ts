import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { AuthService } from '@microfrontends/shared-services';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';
import { EstudiantesOracleService } from '../../core/services/estudiantes-oracle.service';
import { UsosLaboratorioService, RegistroUsoDTO } from '../../core/services/usos-laboratorio.service';
import { UsosLaboratorioQueryService, UsoLaboratorioView } from '../../core/services/usos-laboratorio-query.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { QrTokenService } from '../../core/services/qr-token.service';
import { environment } from '@shared/shared-environments';

import { Subject, interval, of, firstValueFrom } from 'rxjs';
import { takeUntil, catchError, map, timeout, switchMap } from 'rxjs/operators';

type Opt = { label: string; value: string };

interface AsistenciaRegistro {
  identificacion: string;
  nombre: string;
  programa: string;
  facultad: string;
  semestre: string;
  genero: string;
  materia: string;
  horaRegistro: string;
  fechaRegistro: string;
  estado: 'presente' | 'tarde';
}

@Component({
  selector: 'app-monitor-asistencia',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    PanelModule,
    CardModule,
    TableModule,
    ButtonModule,
    ToastModule,
    ProgressSpinnerModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    DialogModule
  ],
  providers: [
    MessageService,
    UsuariosOracleService,
    HorariosOracleService,
    EstudiantesOracleService,
    UsosLaboratorioService,
    LaboratoriosService,
    QrTokenService
  ],
  templateUrl: './monitor-asistencia.component.html',
  styleUrls: ['./monitor-asistencia.component.scss']
})
export class MonitorAsistenciaComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly usuariosSrv = inject(UsuariosOracleService);
  private readonly horariosSrv = inject(HorariosOracleService);
  private readonly estudiantesSrv = inject(EstudiantesOracleService);
  private readonly usosSrv = inject(UsosLaboratorioService);
  private readonly usosQuerySrv = inject(UsosLaboratorioQueryService);
  private readonly labsService = inject(LaboratoriosService);
  private readonly qrTokenService = inject(QrTokenService);

  private readonly destroy$ = new Subject<void>();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private qrTimer: ReturnType<typeof setInterval> | null = null;

  estadoVista: 'validacion' | 'monitor' = 'validacion';
  cargandoUsuario = false;
  cargandoAsistencias = false;
  esDocenteValido = false;
  autoLoginIntentado = false;

  nombreDocente = '';
  identificacionDocente = '';
  datosDocente: UsuarioOracle | null = null;

  estudiantesDocente: Set<string> = new Set();

  horariosDocente: HorarioItem[] = [];
  horariosDocenteTodos: HorarioItem[] = [];
  aulasDocente: Opt[] = [];
  aulasHoy: Opt[] = [];
  aulasTodas: Opt[] = [];
  aulaSeleccionada: string | null = null;
  horarioActual: HorarioItem | null = null;

  asistencias: AsistenciaRegistro[] = [];
  totalEsperados = 0;

  modoVista: 'hoy' | 'historico' = 'hoy';
  fechaFiltroInicio: Date | null = null;
  fechaFiltroFin: Date | null = null;

  filtroSemestre: string | null = null;
  filtroMateria: string | null = null;
  filtroPrograma: string | null = null;
  filtroGenero: string | null = null;
  opcionesSemestre: Opt[] = [];
  opcionesMateria: Opt[] = [];
  opcionesPrograma: Opt[] = [];
  opcionesGenero: Opt[] = [];
  private asistenciasRaw: AsistenciaRegistro[] = [];

  qrDataUrl: string | null = null;
  qrDataUrlGrande: string | null = null;
  qrValue: string | null = null;
  countdown = 0;
  private slotEndMs: number | null = null;
  private sessionSalt = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  validityMinutes = 5;
  qrExpandido = false;
  linkCopiado = false;

  private laboratorios: Laboratorio[] = [];
  private labIdPorNombre = new Map<string, string>();

  private qrBaseUrl =
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:4203/asistencia-qr'
      : 'https://apps.umariana.edu.co/laboratorios/asistencia-qr';

  formDocente = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(4)]]
  });

  formFiltro = this.fb.group({
    aula: [''],
    fecha: [new Date()]
  });

  readonly minDate = this.onlyDate(new Date());

  get cantidadPresentes(): number {
    return this.asistencias.filter(a => a.estado === 'presente').length;
  }

  get cantidadTarde(): number {
    return this.asistencias.filter(a => a.estado === 'tarde').length;
  }

  private labCodigoOraclePorUUID = new Map<string, string>();
  private labNombreVisiblePorUUID = new Map<string, string>();

  async ngOnInit(): Promise<void> {
    await this.cargarLaboratorios();
    this.intentarAutoLogin();
  }

  private async intentarAutoLogin(): Promise<void> {
    try {
      let identificacion: string | null = null;
      let source = 'none';

      const tokenInfo: any = (this.authService as any).getUserInfo ? (this.authService as any).getUserInfo() : null;
      if (tokenInfo) {
        const idFromToken = tokenInfo.identificacion || tokenInfo.preferred_username || tokenInfo.sub || tokenInfo.id;
        if (idFromToken && /^\d{4,}$/.test(idFromToken.toString().trim())) {
          identificacion = idFromToken.toString().trim();
          source = 'auth';
        }
      }

      if (!identificacion) {
        const currentUser: any = (this.authService as any).getCurrentUser ? (this.authService as any).getCurrentUser() : null;
        if (currentUser?.identificacion && /^\d{4,}$/.test(currentUser.identificacion.trim())) {
          identificacion = currentUser.identificacion.trim();
          source = 'auth_fallback';
        }
      }

      if (!identificacion) {
        const identLS = localStorage.getItem('identificacion')?.toString().trim();
        if (identLS && /^\d{4,}$/.test(identLS)) {
          identificacion = identLS;
          source = 'local';
        } else {
          const possibleUserJson = localStorage.getItem('user') || localStorage.getItem('currentUser') || localStorage.getItem('current_user');
          if (possibleUserJson) {
            try {
              const parsed = JSON.parse(possibleUserJson);
              const idFromJson = parsed?.identificacion || parsed?.id || parsed?.identification;
              if (idFromJson && /^\d{4,}$/.test(idFromJson.toString().trim())) {
                identificacion = idFromJson.toString().trim();
                source = 'local_json';
              }
            } catch {
            }
          }
        }
      }

      if (!identificacion) return;
      if (!/^\d{4,}$/.test(identificacion)) return;

      this.cargandoUsuario = true;
      const usuario = await firstValueFrom(this.consultarUsuario(identificacion));
      if (!usuario) {
        this.cargandoUsuario = false;
        return;
      }

      const rol = this.obtenerRol(usuario);
      if (this.esRolDocente(rol)) {
        this.formDocente.patchValue({ identificacion });
        this.autoLoginIntentado = true;
        this.cargandoUsuario = false;
        await this.buscarDocente();
      } else {
        this.cargandoUsuario = false;
      }
    } catch {
      this.cargandoUsuario = false;
    }
  }

  get asistenciasFiltradas(): AsistenciaRegistro[] {
    if (this.modoVista !== 'historico') return this.asistencias;
    return this.asistencias.filter(a => {
      if (this.filtroSemestre && a.semestre !== this.filtroSemestre) return false;
      if (this.filtroMateria && a.materia !== this.filtroMateria) return false;
      if (this.filtroPrograma && a.programa !== this.filtroPrograma) return false;
      if (this.filtroGenero && a.genero !== this.filtroGenero) return false;
      return true;
    });
  }

  get cantidadPresentesFiltrados(): number {
    return this.asistenciasFiltradas.filter(a => a.estado === 'presente').length;
  }
  get cantidadTardeFiltrados(): number {
    return this.asistenciasFiltradas.filter(a => a.estado === 'tarde').length;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.detenerRefreshAutomatico();
    this.limpiarQr();
  }

  async buscarDocente(): Promise<void> {
    const identificacion = (this.formDocente.value.identificacion || '').toString().trim();
    
    if (!/^\d{4,}$/.test(identificacion)) {
      this.toast.add({
        severity: 'warn',
        summary: 'Identificación inválida',
        detail: 'Ingresa una identificación válida (mínimo 4 dígitos)'
      });
      return;
    }

    this.cargandoUsuario = true;
    this.esDocenteValido = false;
    this.nombreDocente = '';
    this.identificacionDocente = '';
    this.estudiantesDocente.clear();

    try {
      const usuario = await firstValueFrom(this.consultarUsuario(identificacion));
      
      if (!usuario) {
        this.toast.add({
          severity: 'info',
          summary: 'No encontrado',
          detail: 'No se encontró un usuario con esa identificación'
        });
        return;
      }

      const rol = this.obtenerRol(usuario);
      if (!this.esRolDocente(rol)) {
        this.toast.add({
          severity: 'error',
          summary: 'Acceso restringido',
          detail: 'Esta funcionalidad es solo para docentes'
        });
        return;
      }

      this.datosDocente = usuario;
      this.nombreDocente = usuario.nombre || '';
      this.identificacionDocente = identificacion;
      this.esDocenteValido = true;

      await this.cargarEstudiantesDocente(identificacion);

      await this.cargarHorariosDocente(identificacion);

      await this.cargarTodosLaboratoriosDocente(identificacion);

      this.estadoVista = 'monitor';
      this.iniciarRefreshAutomatico();

      if (this.horariosDocente.length === 0) {
        this.modoVista = 'historico';
        this.aulasDocente = [...this.aulasTodas];
        this.toast.add({
          severity: 'info',
          summary: 'Sin horarios hoy',
          detail: 'No tienes horarios para hoy. Mostrando vista histórica.'
        });
      }

    } catch (error) {
   
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al consultar los datos'
      });
    } finally {
      this.cargandoUsuario = false;
    }
  }

  private async cargarEstudiantesDocente(identificacion: string): Promise<void> {
    try {
      const estudiantes = await firstValueFrom(
        this.estudiantesSrv.getByProfesor(identificacion).pipe(
          timeout(15000),
          catchError(() => of([]))
        )
      );

      this.estudiantesDocente.clear();
      
      estudiantes.forEach((est: any) => {
        const idEstudiante = (est.idEstudiante || '').toString().trim();
        if (idEstudiante) {
          this.estudiantesDocente.add(idEstudiante);
        }
      });

      this.totalEsperados = this.estudiantesDocente.size;

    } catch (error) {
      
    }
  }

  private async cargarHorariosDocente(identificacion: string): Promise<void> {
    const dia = this.getDiaNombreES(new Date());

    try {
      const horarios = await firstValueFrom(
        this.horariosSrv.getHoras(dia).pipe(
          timeout(10000),
          catchError(() => of([]))
        )
      );

      this.horariosDocente = horarios.filter((h: HorarioItem) => {
        return this.esHorarioDelDocente(h, identificacion, this.nombreDocente);
      });

      const aulasSet = new Map<string, { label: string; codigoOracle: string }>();
      this.horariosDocente.forEach(h => {
        const codigoOracle = h.codAula || '';
        const visible = (h.nomAula && h.nomAula.trim()) ? h.nomAula.trim() : h.codAula;
        const key = this.normalizar(visible);
        if (codigoOracle && !aulasSet.has(key)) {
          aulasSet.set(key, { label: visible, codigoOracle });
        }
      });

      const aulasHoyTemp: Opt[] = [];

      aulasSet.forEach(({ label, codigoOracle }) => {
        let uuid = this.obtenerLabIdPorCodigo(label);
        if (uuid === label) {
          uuid = this.obtenerLabIdPorCodigo(codigoOracle);
        }
        const labelNorm = this.normalizar(label);
        const codigoNorm = this.normalizar(codigoOracle);
        const displayLabel = labelNorm.includes(codigoNorm) ? label : `${codigoOracle} ${label}`.trim();
        
        const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
        if (esUUID) {
          this.labCodigoOraclePorUUID.set(uuid, codigoOracle);
          this.labNombreVisiblePorUUID.set(uuid, label);
        }

        aulasHoyTemp.push({
          label: displayLabel,
          value: uuid
        });
      });

      this.aulasHoy = aulasHoyTemp;
      if (this.modoVista === 'hoy') {
        this.aulasDocente = aulasHoyTemp.length > 0 ? [...aulasHoyTemp] : [...this.aulasTodas];
      }

      if (this.horariosDocente.length > 0 && this.aulasHoy.length > 0) {
        const primerUuid = this.aulasHoy[0].value;
        if (primerUuid) {
          setTimeout(() => this.seleccionarAula(primerUuid), 100);
        }
      }

    } catch (error) {
      
    }
  }

  private async cargarTodosLaboratoriosDocente(identificacion: string): Promise<void> {
    try {
      const todosHorarios = await firstValueFrom(
        this.horariosSrv.getHoras().pipe(
          timeout(15000),
          catchError(() => of([]))
        )
      );

      const horariosDocente = todosHorarios.filter((h: HorarioItem) => {
        return this.esHorarioDelDocente(h, identificacion, this.nombreDocente);
      });

      const aulasSet = new Map<string, { label: string; codigoOracle: string }>();

      horariosDocente.forEach((h: HorarioItem) => {
        const codigoOracle = h.codAula || '';
        const visible = (h.nomAula && h.nomAula.trim()) ? h.nomAula.trim() : h.codAula;
        const key = this.normalizar(visible);
        if (codigoOracle && !aulasSet.has(key)) {
          aulasSet.set(key, { label: visible, codigoOracle });
        }
      });

      this.horariosDocente.forEach(h => {
        const codigoOracle = h.codAula || '';
        const visible = (h.nomAula && h.nomAula.trim()) ? h.nomAula.trim() : h.codAula;
        const key = this.normalizar(visible);
        if (codigoOracle && !aulasSet.has(key)) {
          aulasSet.set(key, { label: visible, codigoOracle });
        }
      });

      const aulasTodasTemp: Opt[] = [];

      aulasSet.forEach(({ label, codigoOracle }) => {
        let uuid = this.obtenerLabIdPorCodigo(label);
        if (uuid === label) {
          uuid = this.obtenerLabIdPorCodigo(codigoOracle);
        }
        const labelNorm = this.normalizar(label);
        const codigoNorm = this.normalizar(codigoOracle);
        const displayLabel = labelNorm.includes(codigoNorm) ? label : `${codigoOracle} ${label}`.trim();
        
        const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
        if (esUUID) {
          this.labCodigoOraclePorUUID.set(uuid, codigoOracle);
          this.labNombreVisiblePorUUID.set(uuid, label);
        }

        aulasTodasTemp.push({
          label: displayLabel,
          value: uuid
        });
      });

      this.aulasTodas = aulasTodasTemp;
      this.horariosDocenteTodos = todosHorarios.filter((h: HorarioItem) => {
        return this.esHorarioDelDocente(h, identificacion, this.nombreDocente);
      });

    

    } catch (error) {
      
    }
  }

  private extraerNombreDocente(h: HorarioItem): string {
    const raw = h as unknown as Record<string, unknown>;
    return String(
      raw['docente'] ?? raw['docenteNombre'] ?? raw['profesor'] ?? raw['nombreProfesor'] ?? ''
    );
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

  private esHorarioDelDocente(h: HorarioItem, identificacion: string, nombreDocente: string): boolean {
    const docenteRaw = this.extraerNombreDocente(h);
    if (!docenteRaw) return false;
    return this.nombresCoinciden(docenteRaw, nombreDocente);
  }

  async seleccionarAula(labIdOCodigo: string): Promise<void> {
    const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(labIdOCodigo);
    
    if (esUUID) {
      this.aulaSeleccionada = labIdOCodigo;
    } else {
      this.aulaSeleccionada = this.obtenerLabIdPorCodigo(labIdOCodigo);
    }
    
    const codigoOracle = this.labCodigoOraclePorUUID.get(this.aulaSeleccionada) || '';
    const nombreVisible = this.labNombreVisiblePorUUID.get(this.aulaSeleccionada) || '';
    
    const labLocal = this.laboratorios.find(l => String(l.id) === this.aulaSeleccionada);
    const nombrePostgres = labLocal?.nombre || '';
    
    const nombresParaBuscar = new Set<string>();
    if (codigoOracle) nombresParaBuscar.add(this.normalizar(codigoOracle));
    if (nombreVisible) nombresParaBuscar.add(this.normalizar(nombreVisible));
    if (nombrePostgres) nombresParaBuscar.add(this.normalizar(nombrePostgres));
    if (!esUUID) nombresParaBuscar.add(this.normalizar(labIdOCodigo));
    
    const horariosDeEstaAula = this.horariosDocente.filter(h => {
      const codAulaNorm = this.normalizar(h.codAula || '');
      const nomAulaNorm = this.normalizar(h.nomAula || '');
      for (const nombre of nombresParaBuscar) {
        if (!nombre) continue;
        if (codAulaNorm === nombre || nomAulaNorm === nombre ||
            codAulaNorm.includes(nombre) || nombre.includes(codAulaNorm) ||
            nomAulaNorm.includes(nombre) || nombre.includes(nomAulaNorm)) {
          return true;
        }
      }
      return false;
    });

    const horario = this.elegirHorarioActual(horariosDeEstaAula);
    this.horarioActual = horario || null;
    
    if (this.modoVista === 'hoy') {
      if (horario) {
        await this.generarQr();
      } else if (horariosDeEstaAula.length > 0) {
        this.horarioActual = horariosDeEstaAula[0];
        await this.generarQr();
      } else {
        const horariosGlobal = (this.horariosDocenteTodos || []).filter(h => {
          const codAulaNorm = this.normalizar(h.codAula || '');
          const nomAulaNorm = this.normalizar(h.nomAula || '');
          for (const nombre of nombresParaBuscar) {
            if (!nombre) continue;
            if (codAulaNorm === nombre || nomAulaNorm === nombre ||
                codAulaNorm.includes(nombre) || nombre.includes(codAulaNorm) ||
                nomAulaNorm.includes(nombre) || nombre.includes(nomAulaNorm)) {
              return true;
            }
          }
          return false;
        });

        if (horariosGlobal.length > 0) {
          this.horarioActual = horariosGlobal[0];
        } else {
          const primerHorarioHoy = this.horariosDocente[0];
          this.horarioActual = {
            codAula: codigoOracle || nombreVisible,
            nomAula: nombreVisible || codigoOracle,
            diaSemana: this.getDiaNombreES(new Date()),
            horaInicio: primerHorarioHoy?.horaInicio || this.formatearHoraActual(),
            horaFin: primerHorarioHoy?.horaFin || this.calcularHoraFin(),
            materia: primerHorarioHoy?.materia || 'Clase',
            docente: this.nombreDocente
          };
        }
        await this.generarQr();
      }
      await this.cargarAsistencias();
    } else {
      await this.cargarAsistencias();
    }
  }

  private elegirHorarioActual(horarios: HorarioItem[]): HorarioItem | null {
    if (!horarios.length) return null;
    const ahora = new Date();
    const nowMin = ahora.getHours() * 60 + ahora.getMinutes();

    const enCurso = horarios.find(h => {
      const inicio = this.horaAMinutos(h.horaInicio || '');
      const fin = this.horaAMinutos(h.horaFin || '');
      return nowMin >= (inicio - 15) && nowMin <= (fin + 15);
    });
    if (enCurso) return enCurso;

    const proxima = horarios
      .filter(h => this.horaAMinutos(h.horaInicio || '') > nowMin)
      .sort((a, b) => this.horaAMinutos(a.horaInicio || '') - this.horaAMinutos(b.horaInicio || ''))[0];
    if (proxima) return proxima;

    const masProximo = [...horarios].sort((a, b) => {
      const diffA = Math.min(
        Math.abs(this.horaAMinutos(a.horaInicio || '') - nowMin),
        Math.abs(this.horaAMinutos(a.horaFin || '') - nowMin)
      );
      const diffB = Math.min(
        Math.abs(this.horaAMinutos(b.horaInicio || '') - nowMin),
        Math.abs(this.horaAMinutos(b.horaFin || '') - nowMin)
      );
      return diffA - diffB;
    });
    return masProximo[0] || horarios[0];
  }

  private formatearHoraActual(): string {
    const ahora = new Date();
    return `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
  }

  private calcularHoraFin(): string {
    const ahora = new Date();
    ahora.setHours(ahora.getHours() + 2);
    return `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
  }

  private async generarQr(): Promise<void> {
    if (!this.horarioActual || !this.aulaSeleccionada) return;

    this.limpiarQr();

    const ahora = new Date();
    const expDate = new Date(ahora.getTime() + this.validityMinutes * 60 * 1000);
    this.slotEndMs = expDate.getTime();

    const labLocal = this.laboratorios.find(l => String(l.id) === this.aulaSeleccionada);
    const labName = this.labNombreVisiblePorUUID.get(this.aulaSeleccionada)
      || labLocal?.nombre
      || this.horarioActual.nomAula
      || this.horarioActual.codAula
      || this.aulaSeleccionada;

    const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.aulaSeleccionada);
    const labCode = esUUID ? this.aulaSeleccionada : (labLocal ? String(labLocal.id) : this.aulaSeleccionada);

    try {
      const token = await this.qrTokenService.generateToken({
        labName,
        labCode,
        slot: `${this.horarioActual.horaInicio}-${this.horarioActual.horaFin}`,
        exp: expDate.toISOString(),
        salt: this.sessionSalt
      });

      this.qrValue = `${this.qrBaseUrl}?qrToken=${encodeURIComponent(token)}`;
      await this.construirImagenQr(this.qrValue);
      await this.construirImagenQrGrande(this.qrValue);

      this.actualizarCountdown();
      this.qrTimer = setInterval(() => {
        this.actualizarCountdown();
        if (this.countdown <= 0) {
          this.generarQr();
        }
      }, 1000);

    } catch (error) {

    }
  }

  async cargarAsistencias(): Promise<void> {
    if (!this.aulaSeleccionada) return;

    this.cargandoAsistencias = true;

    try {
      const labId = this.aulaSeleccionada;
      const labLocal = this.laboratorios.find(l => String(l.id) === labId);
      const nombreLab = labLocal?.nombre || labId;
      
      

      let registrosFiltrados: any[] = [];
      
      if (this.modoVista === 'hoy') {
        const registros = await firstValueFrom(
          this.usosSrv.getAll().pipe(
            timeout(15000),
            catchError(err => {
              
              return of([]);
            })
          )
        );
        

        const fechaHoy = this.formatearFecha(new Date());
        const labIdsValidos = new Set<string>();
        labIdsValidos.add(labId);
        const codOracle = this.labCodigoOraclePorUUID.get(labId);
        if (codOracle) labIdsValidos.add(codOracle);
        const nomVisible = this.labNombreVisiblePorUUID.get(labId);
        if (nomVisible) labIdsValidos.add(nomVisible);
        if (labLocal) labIdsValidos.add(labLocal.nombre || '');

        registrosFiltrados = registros.filter((r: RegistroUsoDTO) => {
          const fechaRegistro = r.fechaUso;
          const labRegistro = (
            (r as any).laboratorioId ?? (r as any).laboratorio_id ?? (r as any).labId ?? (r as any).codAula ?? (r as any).cod_aula ?? (r as any).nomAula ?? (r as any).nom_aula
          )?.toString() || '';
          const idEstudiante = (r.identificacion || '').toString().trim();
          
          if (this.estudiantesDocente.size > 0 && !this.estudiantesDocente.has(idEstudiante)) {
            return false;
          }
          
          const coincideLab = labIdsValidos.has(labRegistro) ||
            Array.from(labIdsValidos).some(id =>
              id && labRegistro && (this.normalizar(id) === this.normalizar(labRegistro))
            );
          
          return fechaRegistro === fechaHoy && coincideLab;
        });
      } else {
        const desde = this.fechaFiltroInicio ? this.formatearFecha(this.fechaFiltroInicio) : this.formatearFecha(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const hasta = this.fechaFiltroFin ? this.formatearFecha(this.fechaFiltroFin) : this.formatearFecha(new Date());
        
        const registros = await firstValueFrom(
          this.usosQuerySrv.porRangoFechas(desde, hasta).pipe(
            timeout(30000),
            catchError(err => {
     
              return of([]);
            })
          )
        );
        
        if (registros.length > 0) {
          
        }
        
        const labIdsValidos = new Set<string>();
        labIdsValidos.add(labId);
        const codOracle = this.labCodigoOraclePorUUID.get(labId);
        if (codOracle) labIdsValidos.add(codOracle);
        const nomVisible = this.labNombreVisiblePorUUID.get(labId);
        if (nomVisible) labIdsValidos.add(nomVisible);
        const labLocalHist = this.laboratorios.find(l => String(l.id) === labId);
        if (labLocalHist?.nombre) labIdsValidos.add(labLocalHist.nombre);

        registrosFiltrados = registros.filter((r: UsoLaboratorioView) => {
          const idEstudiante = ((r as any).identificacion || '').toString().trim();
          
          if (this.estudiantesDocente.size > 0 && !this.estudiantesDocente.has(idEstudiante)) {
            return false;
          }
          
          const registroLab = String(
            (r as any).laboratorioId ?? (r as any).laboratorio_id ?? (r as any).labId ?? (r as any).codAula ?? (r as any).cod_aula ?? (r as any).nomAula ?? (r as any).nom_aula ?? ''
          );
          
          const coincide = labIdsValidos.has(registroLab) ||
            Array.from(labIdsValidos).some(id =>
              id && registroLab && (this.normalizar(id) === this.normalizar(registroLab))
            );
          
          return coincide;
        });
        
     
      }

      this.asistencias = await Promise.all(
        registrosFiltrados.map(async (r: any) => {
          let nombre = 'Estudiante';
          const identificacion = r.identificacion || '';
          if (identificacion) {
            try {
              const usuario = await firstValueFrom(
                this.consultarUsuario(identificacion).pipe(catchError(() => of(null)))
              );
              nombre = usuario?.nombre || 'Estudiante';
            } catch {
              nombre = 'Estudiante';
            }
          }

          const horaRegistro = (r.horaInicio && String(r.horaInicio).trim()) ? String(r.horaInicio).trim() : '';
          const inicioHorario = this.horarioActual?.horaInicio || '';
          const esLlegadaTarde = horaRegistro ? this.esLlegadaTarde(horaRegistro, inicioHorario) : false;

          const materia = this.extraerMateriaDeObservaciones(r.observaciones || '');

          return {
            identificacion: identificacion,
            nombre: nombre,
            programa: r.programa || '',
            facultad: r.facultad || '',
            semestre: r.semestre || '',
            genero: r.genero || '',
            materia: materia,
            horaRegistro: this.formatearHora12h(horaRegistro),
            fechaRegistro: this.formatearFechaDisplay(r.fechaUso),
            estado: esLlegadaTarde ? 'tarde' : 'presente'
          } as AsistenciaRegistro;
        })
      );

      this.actualizarOpcionesFiltros();

      if (this.modoVista === 'historico') {
        this.asistencias.sort((a, b) => {
          return b.fechaRegistro.localeCompare(a.fechaRegistro);
        });
      }

      this.toast.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: `${this.asistencias.length} registros encontrados`,
        life: 2000
      });

    } catch (error) {
    
    } finally {
      this.cargandoAsistencias = false;
    }
  }

  private coincideLaboratorio(labRegistro: string | undefined, labId: string): boolean {
    if (!labRegistro) return false;

    const esLabIdUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(labId);
    if (esLabIdUUID) {
      const coincide = labRegistro === labId;
      if (!coincide) {
        
      }
      return coincide;
    }
    
    return false;
  }

  cambiarAHistorico(): void {
    this.modoVista = 'historico';
    this.limpiarQr();
    this.detenerRefreshAutomatico();
    this.aulasDocente = this.aulasTodas;
    this.filtroSemestre = null;
    this.filtroMateria = null;
    this.filtroPrograma = null;
    this.filtroGenero = null;
    const hoy = new Date();
    this.fechaFiltroFin = hoy;
    this.fechaFiltroInicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.cargarAsistencias();
  }

  cambiarAHoy(): void {
    this.modoVista = 'hoy';
    this.fechaFiltroInicio = null;
    this.fechaFiltroFin = null;
    this.aulasDocente = this.aulasHoy.length > 0 ? [...this.aulasHoy] : [...this.aulasTodas];
    if (this.aulaSeleccionada) {
      this.generarQr();
      this.iniciarRefreshAutomatico();
    }
    this.cargarAsistencias();
  }

  aplicarFiltroFechas(): void {
    if (this.modoVista === 'historico') {
      this.cargarAsistencias();
    }
  }

  async exportarExcel(): Promise<void> {
    const datos = this.asistenciasFiltradas;
    if (datos.length === 0) {
      this.toast.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay registros para exportar'
      });
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const datosExport = datos.map((a, i) => ({
        '#': i + 1,
        'Identificacion': a.identificacion,
        'Nombre': a.nombre,
        'Programa': a.programa,
        'Facultad': a.facultad,
        'Semestre': a.semestre,
        'Genero': a.genero,
        'Materia': a.materia,
        'Fecha': a.fechaRegistro,
        'Hora': a.horaRegistro,
        'Estado': a.estado === 'presente' ? 'Presente' : 'Tarde'
      }));

      const ws = XLSX.utils.json_to_sheet(datosExport);
      ws['!cols'] = [
        { wch: 5 }, { wch: 16 }, { wch: 35 }, { wch: 30 }, { wch: 25 },
        { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 14 }, { wch: 12 }, { wch: 10 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

      const labLocal = this.laboratorios.find(l => String(l.id) === this.aulaSeleccionada);
      const nombreBase = labLocal?.nombre ?? this.aulaSeleccionada ?? 'laboratorio';
      const nombreLab = nombreBase.replace(/[^a-zA-Z0-9]/g, '_');
      XLSX.writeFile(wb, `asistencias_${nombreLab}_${this.formatearFecha(new Date())}.xlsx`);

      this.toast.add({
        severity: 'success',
        summary: 'Exportado',
        detail: `Archivo Excel descargado con ${datos.length} registros`
      });
    } catch (error) {
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el archivo Excel'
      });
    }
  }

  private extraerMateriaDeObservaciones(obs: string): string {
    if (!obs) return '';
    const match = obs.match(/Materia:\s*(.+?)$/i);
    return match ? match[1].trim() : '';
  }

  private actualizarOpcionesFiltros(): void {
    const semestres = new Set<string>();
    const materias = new Set<string>();
    const programas = new Set<string>();
    const generos = new Set<string>();

    this.asistencias.forEach(a => {
      if (a.semestre) semestres.add(a.semestre);
      if (a.materia) materias.add(a.materia);
      if (a.programa) programas.add(a.programa);
      if (a.genero) generos.add(a.genero);
    });

    this.opcionesSemestre = Array.from(semestres).sort().map(v => ({ label: v, value: v }));
    this.opcionesMateria = Array.from(materias).sort().map(v => ({ label: v, value: v }));
    this.opcionesPrograma = Array.from(programas).sort().map(v => ({ label: v, value: v }));
    this.opcionesGenero = Array.from(generos).sort().map(v => ({ label: v, value: v }));
  }

  limpiarFiltros(): void {
    this.filtroSemestre = null;
    this.filtroMateria = null;
    this.filtroPrograma = null;
    this.filtroGenero = null;
  }

  abrirQrExpandido(): void {
    if (this.qrDataUrl) {
      this.qrExpandido = true;
    }
  }

  async copiarLinkQr(): Promise<void> {
    if (!this.qrValue) return;
    try {
      await navigator.clipboard.writeText(this.qrValue);
      this.linkCopiado = true;
      this.toast.add({
        severity: 'success',
        summary: 'Copiado',
        detail: 'Enlace del QR copiado al portapapeles',
        life: 2000
      });
      setTimeout(() => this.linkCopiado = false, 2000);
    } catch {
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo copiar el enlace'
      });
    }
  }

  async refrescarAsistencias(): Promise<void> {
    await this.cargarAsistencias();
  }

  volverAValidacion(): void {
    this.estadoVista = 'validacion';
    this.esDocenteValido = false;
    this.nombreDocente = '';
    this.horariosDocente = [];
    this.asistencias = [];
    this.aulaSeleccionada = null;
    this.horarioActual = null;
    this.detenerRefreshAutomatico();
    this.limpiarQr();
    this.formDocente.reset();
  }

  private cargarLaboratorios(): Promise<void> {
    return firstValueFrom(
      this.labsService.getAll().pipe(
        timeout(10000),
        catchError(() => of([]))
      )
    ).then((labs) => {
      this.laboratorios = labs || [];
      this.labIdPorNombre.clear();
      this.laboratorios.forEach(l => {
        if (l.nombre) {
          this.labIdPorNombre.set(this.normalizar(l.nombre), String(l.id));
        }
      });
    }).catch(() => {});
  }

  private consultarUsuario(codigo: string) {
    return this.usuariosSrv.getByCodigo(codigo).pipe(
      catchError(() => {
        const base = (environment as { apiOracle?: string }).apiOracle || '';
        const url = `${base.replace(/\/$/, '')}/usuarios/${encodeURIComponent(codigo)}`;
        return this.http.get<UsuarioOracle>(url, { observe: 'response' }).pipe(
          timeout(8000),
          map(res => res.status === 204 ? null : res.body),
          catchError(() => of(null))
        );
      })
    );
  }

  private obtenerRol(usuario: UsuarioOracle): string {
    return ((usuario as any).cargo || (usuario as any).rol || '').toString().trim().toUpperCase();
  }

  private esRolDocente(rol: string): boolean {
    const rolesDocente = ['DOCENTE', 'PROFESOR', 'PROFESORA'];
    return rolesDocente.includes(rol);
  }

  private iniciarRefreshAutomatico(): void {
    this.detenerRefreshAutomatico();
    this.refreshInterval = setInterval(() => {
      this.cargarAsistencias();
    }, 30000);
  }

  private detenerRefreshAutomatico(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private limpiarQr(): void {
    if (this.qrTimer) {
      clearInterval(this.qrTimer);
      this.qrTimer = null;
    }
    this.qrDataUrl = null;
    this.qrDataUrlGrande = null;
    this.qrValue = null;
    this.countdown = 0;
    this.slotEndMs = null;
    this.qrExpandido = false;
  }

  private actualizarCountdown(): void {
    if (!this.slotEndMs) {
      this.countdown = 0;
      return;
    }
    const diff = Math.max(0, Math.floor((this.slotEndMs - Date.now()) / 1000));
    this.countdown = diff;
  }

  private async construirImagenQr(valor: string): Promise<void> {
    try {
      const QRCode = await import('qrcode');
      this.qrDataUrl = await QRCode.toDataURL(valor, {
        width: 280,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' }
      });
    } catch (error) {
      
    }
  }

  private async construirImagenQrGrande(valor: string): Promise<void> {
    try {
      const QRCode = await import('qrcode');
      this.qrDataUrlGrande = await QRCode.toDataURL(valor, {
        width: 500,
        margin: 3,
        color: { dark: '#1e3a5f', light: '#ffffff' }
      });
    } catch (error) {
      this.qrDataUrlGrande = this.qrDataUrl;
    }
  }

  private estaEnHorario(fecha: Date, horario: HorarioItem): boolean {
    if (!horario.horaInicio || !horario.horaFin) return false;
    
    const ahora = fecha.getHours() * 60 + fecha.getMinutes();
    const inicio = this.horaAMinutos(horario.horaInicio);
    const fin = this.horaAMinutos(horario.horaFin);
    
    return ahora >= inicio - 15 && ahora <= fin + 15;
  }

  private esLlegadaTarde(horaRegistro: string, horaInicio: string): boolean {
    if (!horaRegistro || !horaInicio) return false;
    const registro = this.horaAMinutos(horaRegistro);
    const inicio = this.horaAMinutos(horaInicio);
    return registro > inicio + 15;
  }

  private horaAMinutos(hora: string): number {
    const partes = hora.split(':').map(Number);
    return (partes[0] || 0) * 60 + (partes[1] || 0);
  }

  private obtenerLabIdPorCodigo(codigo: string): string {
    if (!codigo) return codigo;
    
    const codigoNorm = this.normalizar(codigo);
    
    const uuidDesdeNombre = this.labIdPorNombre.get(codigoNorm);
    if (uuidDesdeNombre) {
      return uuidDesdeNombre;
    }
    
    let lab = this.laboratorios.find(l => String(l.id) === codigo);
    if (lab) {
      return String(lab.id);
    }
    
    lab = this.laboratorios.find(l => 
      this.normalizar(l.nombre || '') === codigoNorm
    );
    if (lab) {
      return String(lab.id);
    }
    
    lab = this.laboratorios.find(l => {
      const nombreNorm = this.normalizar(l.nombre || '');
      return nombreNorm.includes(codigoNorm) || codigoNorm.includes(nombreNorm);
    });
    if (lab) {
      return String(lab.id);
    }
    
    const numeroExtraido = codigo.match(/\d+/)?.[0];
    if (numeroExtraido) {
      lab = this.laboratorios.find(l => {
        const nombreNorm = this.normalizar(l.nombre || '');
        return nombreNorm.includes(numeroExtraido) || 
               this.normalizar(l.ubicacion || '').includes(numeroExtraido) ||
               this.normalizar(l.bloque || '').includes(numeroExtraido);
      });
      if (lab) {
        return String(lab.id);
      }
    }
    
    return codigo;
  }

  private getDiaNombreES(fecha: Date): string {
    const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    return dias[fecha.getDay()];
  }

  private onlyDate(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private formatearFecha(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatearFechaDisplay(fechaStr: string): string {
    if (!fechaStr) return '';
    try {
      const date = new Date(fechaStr + 'T00:00:00');
      return date.toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch {
      return fechaStr;
    }
  }

  private formatearHora12h(hora24: string): string {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const suffix = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${suffix}`;
  }

  formatCountdown(): string {
    const mins = Math.floor(this.countdown / 60);
    const secs = this.countdown % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  get horaActual(): string {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  get fechaActual(): string {
    return new Date().toLocaleDateString('es-CO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  private normalizar(str: string): string {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
