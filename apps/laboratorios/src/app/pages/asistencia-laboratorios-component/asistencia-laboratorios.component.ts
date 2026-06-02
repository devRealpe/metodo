import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { StepperModule } from 'primeng/stepper';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';
import { EstudiantesOracleService } from '../../core/services/estudiantes-oracle.service';
import { UsosLaboratorioService, RegistroUsoDTO } from '../../core/services/usos-laboratorio.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { AsistenciaTimerService, AsistenciaTimerConfig, TimerStatus } from '../../core/services/asistencia-timer.service';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { environment } from '@shared/shared-environments';
import { of, firstValueFrom } from 'rxjs';
import { catchError, map, timeout, finalize } from 'rxjs/operators';

type OpcionAula = { id: string; nombre: string };
type HorarioExtendido = HorarioItem & { nombreClase?: string; materia?: string };
type EstadoClase = 'NINGUNO' | 'ANTES' | 'DURANTE' | 'DESPUES';

@Component({
  selector: 'app-asistencia-laboratorios',
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
    DatepickerComponent
  ],
  providers: [
    MessageService,
    UsuariosOracleService,
    HorariosOracleService,
    EstudiantesOracleService,
    UsosLaboratorioService,
    AsistenciaTimerService
  ],
  templateUrl: './asistencia-laboratorios.component.html'
})
export class AsistenciaLaboratoriosComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(MessageService);
  private readonly route = inject(ActivatedRoute);

  private readonly usuariosSrv = inject(UsuariosOracleService);
  private readonly horariosSrv = inject(HorariosOracleService);
  private readonly estudiantesSrv = inject(EstudiantesOracleService);
  private readonly usosSrv = inject(UsosLaboratorioService);
  private readonly labsService = inject(LaboratoriosService);
  private readonly timerService = inject(AsistenciaTimerService);

  activeStep = 1;
  readonly minDate = this.onlyDate(new Date());

  cargandoUsuario = false;
  cargandoAulas = false;
  cargandoCruce = false;
  cargandoRegistro = false;

  nombreUsuario = '';
  esEstudianteValido = false;

  timerStatus: TimerStatus = {
    activo: false,
    tiempoRestante: 0,
    horaFin: '',
    autoMarcadoRealizado: false
  };

  tieneRegistroHoy = false;
  nombreLaboratorioExistente = '';

  private readonly cacheRegistrosHoy = new Set<string>();

  estadoClase: EstadoClase = 'NINGUNO';
  hayMatchHorarioDia = false;

  laboratorios: OpcionAula[] = [];
  private labsLocales: Laboratorio[] = [];
  private labIdPorNombre = new Map<string, string>();
  private laboratorioCodigoSeleccionado: string | null = null;

  formUsuario = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(4)]],
    nombre: [{ value: '', disabled: true }],
    genero: [{ value: '', disabled: true }],
    cargo: [{ value: '', disabled: true }],
    programa: [{ value: '', disabled: true }],
    facultad: [{ value: '', disabled: true }],
    semestre: [{ value: '', disabled: true }]
  });

  formUso = this.fb.group({
    laboratorio_id: ['', Validators.required],
    nombre_laboratorio: [''],
    materia: ['', Validators.required],
    fecha_uso: [this.minDate as Date | null, Validators.required],
    hora_inicio: ['', Validators.required],
    hora_fin: ['', Validators.required]
  });

  ngOnInit(): void {
    const ahora = new Date();
    this.formUso.patchValue({ hora_inicio: this.a12hFromDate(ahora), hora_fin: '' }, { emitEvent: false });

    this.cargarAulas();
    this.cargarLaboratoriosLocales();
    this.procesarParametrosQR();

    this.timerService.getTimerStatus().subscribe((status) => (this.timerStatus = status));

    const fechaUsoControl = this.formUso.get('fecha_uso');
    if (fechaUsoControl) {
      fechaUsoControl.valueChanges.subscribe(async () => {
        const id = (this.formUsuario.value.identificacion ?? '').toString().trim();
        if (this.esEstudianteValido && /^\d{5,}$/.test(id)) await this.cruzarPorIdentificacion(id);
      });
    }
  }

  ngOnDestroy(): void {
    this.timerService.detenerTimer();
  }

  get puedeContinuarPaso2(): boolean {
    return !!this.nombreUsuario && this.esEstudianteValido && this.estadoClase === 'DURANTE' && this.hayMatchHorarioDia && !this.tieneRegistroHoy;
  }

  get puedeRegistrar(): boolean {
    if (!this.esEstudianteValido || this.tieneRegistroHoy || !this.hayMatchHorarioDia || this.estadoClase !== 'DURANTE') return false;

    const identificacion = String(this.formUsuario.value.identificacion ?? '').trim();
    const fechaUso = this.aYMD((this.formUso.value.fecha_uso as Date) || this.minDate);
    return !this.cacheRegistrosHoy.has(`${identificacion}_${fechaUso}`);
  }

  get estadoDescriptivo(): string {
    if (!this.esEstudianteValido) return 'Estudiante no validado';
    if (this.tieneRegistroHoy) return `Ya registrado en ${this.nombreLaboratorioExistente}`;
    if (!this.hayMatchHorarioDia) return 'Sin horario coincidente para hoy';

    const horaInicio = String(this.formUso.value.hora_inicio || '');
    const horaFin = String(this.formUso.value.hora_fin || '');
    const fechaSel = (this.formUso.value.fecha_uso as Date) || this.minDate;
    const fechaEsHoy = this.onlyDate(fechaSel).getTime() === this.onlyDate(new Date()).getTime();

    if (this.estadoClase === 'ANTES') {
      return fechaEsHoy && horaInicio ? `Clase inicia a las ${this.a12h(horaInicio)} - debes esperar` : 'Antes del horario de clase';
    }
    if (this.estadoClase === 'DESPUES') return horaFin ? `Clase terminó a las ${this.a12h(horaFin)}` : 'Después del horario de clase';
    if (this.estadoClase === 'DURANTE') return 'Durante horario de clase - puede registrar';
    return 'Estado no determinado';
  }

  formatTiempoRestante(minutos: number): string {
    if (minutos <= 0) return '00:00';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  }

  private mostrarMensaje(
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail: string,
    life = 4000
  ): void {
    this.toast.add({
      key: 'asistencia-labs',
      life,
      severity,
      summary,
      detail,
      sticky: severity === 'error' && life > 5000,
      closable: true
    });
  }

  limpiarCacheRegistros(): void {
    this.cacheRegistrosHoy.clear();
    this.tieneRegistroHoy = false;
    this.nombreLaboratorioExistente = '';
    this.mostrarMensaje('info', 'Caché limpiado', 'El caché de registros ha sido reiniciado');
  }

  marcarSalidaManual(): void {
    if (!this.timerStatus.activo) return;
    this.timerService.detenerTimer();
    this.mostrarMensaje('info', 'Timer detenido', 'Puedes salir del laboratorio cuando lo desees');
  }

  buscarIdentificacion(): void {
    const id = (this.formUsuario.value.identificacion ?? '').toString().trim();
    if (!/^\d{5,}$/.test(id)) {
      this.mostrarMensaje('warn', 'Formato inválido', 'Ingrese una identificación válida (solo números)');
      return;
    }

    this.cargandoUsuario = true;
    this.consultarUsuario(id)
      .pipe(finalize(() => (this.cargandoUsuario = false)))
      .subscribe({
        next: async (u: UsuarioOracle | null) => {
          this.resetUsuario();
          if (!u) {
            this.mostrarMensaje('info', 'No encontrado', 'No se encontró la identificación');
            this.formUsuario.setErrors({ noAccess: true });
            return;
          }

          const normal = this.normalizarUsuario(u);
          const rol = (normal.rol || '').toString().trim().toUpperCase();
          if (rol !== 'ESTUDIANTE') {
            this.mostrarMensaje('error', 'Acceso restringido', 'Asistencia solo para usuarios estudiantes');
            this.formUsuario.setErrors({ noAccess: true });
            return;
          }

          this.esEstudianteValido = true;
          this.nombreUsuario = normal.nombre;
          this.formUsuario.setErrors(null);
          this.formUsuario.patchValue(
            {
              nombre: normal.nombre,
              genero: normal.genero,
              cargo: normal.rol,
              programa: normal.programa,
              facultad: normal.facultad,
              semestre: (u as { semestre?: string }).semestre || ''
            },
            { emitEvent: false }
          );

          this.mostrarMensaje('success', 'Estudiante válido', 'Datos cargados correctamente');

          await this.verificarRegistrosDelDia(id);
          await this.cruzarPorIdentificacion(id);
        },
        error: (e) => {
          this.mostrarMensaje('error', 'Error de consulta', this.describirErrorHttp(e));
          this.formUsuario.setErrors({ noAccess: true });
        }
      });
  }

  private async verificarRegistrosDelDia(identificacion: string): Promise<void> {
    const fechaHoy = this.aYMD(new Date());
    try {
      const registros = await firstValueFrom(
        this.usosSrv.verificarRegistroExistentePorIdentificacion(identificacion, fechaHoy).pipe(timeout(10000))
      );

      if (registros && registros.length > 0) {
        this.tieneRegistroHoy = true;
        const primer = registros[0];
        this.nombreLaboratorioExistente = this.obtenerNombreLaboratorio(primer.laboratorioId) || 'Laboratorio no identificado';
        this.mostrarMensaje('warn', 'Registro existente', `Ya tienes asistencia registrada para hoy en: ${this.nombreLaboratorioExistente}`);
      } else {
        this.tieneRegistroHoy = false;
        this.nombreLaboratorioExistente = '';
      }
    } catch {
      this.tieneRegistroHoy = false;
      this.nombreLaboratorioExistente = '';
      this.mostrarMensaje('warn', 'Error de verificación', 'No se pudo verificar registros existentes. Verifica con el administrador antes de registrar asistencia.');
    }
  }

  async registrarAsistencia(): Promise<void> {
    if (this.cargandoRegistro) return;

    if (!this.esEstudianteValido) {
      this.mostrarMensaje('warn', 'Validación requerida', 'Primero busca y valida la identificación del estudiante');
      return;
    }
    if (!this.hayMatchHorarioDia) {
      this.mostrarMensaje('error', 'Sin horario de clase', 'No tienes horarios de clase programados para hoy. Solo puedes registrar asistencia si tienes una clase asignada.', 5000);
      return;
    }

    this.cargandoRegistro = true;

    const identificacion = this.formUsuario.value.identificacion?.toString().trim() || '';
    const fechaHoy = this.aYMD(new Date());

    try {
      const registros = await firstValueFrom(this.usosSrv.verificarRegistroExistentePorIdentificacion(identificacion, fechaHoy).pipe(timeout(5000)));
      if (registros && registros.length > 0) {
        this.tieneRegistroHoy = true;
        const lab = this.obtenerNombreLaboratorio(registros[0].laboratorioId) || 'Laboratorio no identificado';
        this.mostrarMensaje('error', 'Registro duplicado detectado', `Ya tienes un registro de asistencia para hoy en: ${lab}. No se puede registrar nuevamente.`, 6000);
        this.cargandoRegistro = false;
        return;
      }
    } catch {
      this.mostrarMensaje('error', 'Error de verificación', 'No se pudo verificar registros duplicados. Contacta al administrador.', 5000);
      this.cargandoRegistro = false;
      return;
    }

    if (this.formUso.invalid) {
      this.mostrarMensaje('warn', 'Formulario incompleto', 'Completa laboratorio, materia, fecha y horas');
      this.formUso.markAllAsTouched();
      this.cargandoRegistro = false;
      return;
    }

    const fechaSel = (this.formUso.value.fecha_uso as Date) || this.minDate;
    const horaInicio = String(this.formUso.value.hora_inicio || '');
    const horaFin = String(this.formUso.value.hora_fin || '');
    const estado = this.evaluarEstadoClase(fechaSel, horaInicio, horaFin);

    if (estado !== 'DURANTE') {
      const inicio12 = this.a12h(horaInicio);
      const fin12 = this.a12h(horaFin);
      const esHoy = this.onlyDate(fechaSel).getTime() === this.onlyDate(new Date()).getTime();

      if (estado === 'ANTES') {
        this.mostrarMensaje('error', esHoy ? 'Clase no ha comenzado' : 'Fecha futura', esHoy ? `Tu clase inicia a las ${inicio12}. No puedes marcar asistencia antes.` : 'No puedes marcar asistencia para fechas futuras', 6000);
      } else if (estado === 'DESPUES') {
        this.mostrarMensaje('error', 'Clase finalizada', `Tu clase terminó a las ${fin12}. No puedes marcar asistencia después del horario.`);
      } else {
        this.mostrarMensaje('error', 'Horario inválido', 'Los horarios configurados no son válidos. Verifica la información.');
      }
      this.cargandoRegistro = false;
      return;
    }

    if (this.estadoClase !== 'DURANTE') {
      this.mostrarMensaje('error', 'Estado de clase inválido', 'Solo puedes registrar asistencia cuando estés dentro del horario de tu clase programada.', 5000);
      this.cargandoRegistro = false;
      return;
    }

    this.verificarRegistroExistenteYRegistrar();
  }

  private verificarRegistroExistenteYRegistrar(): void {
    const identificacion = String(this.formUsuario.value.identificacion ?? '').trim();
    const fechaSel = (this.formUso.value.fecha_uso as Date) || this.minDate;
    const fechaUso = this.aYMD(fechaSel);
    const clave = `${identificacion}_${fechaUso}`;

    if (this.cacheRegistrosHoy.has(clave)) {
      this.mostrarMensaje('error', 'Ya hiciste el registro', 'Ya registraste tu asistencia en esta sesión. Solo puedes registrar una asistencia por día');
      this.cargandoRegistro = false;
      return;
    }

    this.usosSrv.verificarRegistroExistentePorIdentificacion(identificacion, fechaUso).subscribe({
      next: (registros) => {
        if (registros && registros.length > 0) {
          this.cacheRegistrosHoy.add(clave);
          const lab = this.obtenerNombreLaboratorio(registros[0].laboratorioId);
          this.mostrarMensaje(
            'error',
            'Ya hiciste el registro',
            `Ya tienes ${registros.length > 1 ? `${registros.length} registros` : 'un registro'} de asistencia para hoy${lab ? ' en ' + lab : ''}.`
          );
          this.cargandoRegistro = false;
          return;
        }
        this.procederConRegistro();
      },
      error: () => {
        this.mostrarMensaje('warn', 'Advertencia', 'No se pudo verificar registros previos. Se procederá con el registro');
        this.procederConRegistro();
      }
    });
  }

  private procederConRegistro(): void {
    try {
      const dto = this.buildRegistroDTO();

      this.usosSrv.crear(dto).subscribe({
        next: () => {
          const identificacion = String(this.formUsuario.value.identificacion ?? '').trim();
          const fechaUso = this.aYMD((this.formUso.value.fecha_uso as Date) || this.minDate);
          this.cacheRegistrosHoy.add(`${identificacion}_${fechaUso}`);

          this.mostrarMensaje('success', 'Asistencia registrada', 'Asistencia registrada correctamente');

          this.iniciarTimerAutomatico();
          this.tieneRegistroHoy = true;
          this.nombreLaboratorioExistente = String(this.formUso.value.laboratorio_id ?? '');

          this.reiniciarUso();
          this.cargandoRegistro = false;
        },
        error: (e) => {
          const serverMsg = e?.error?.message || e?.message || 'No se pudo registrar la asistencia.';
          this.mostrarMensaje('error', `Error ${e?.status || ''}`.trim(), serverMsg);
          this.cargandoRegistro = false;
        }
      });
    } catch {
      this.mostrarMensaje('error', 'Registro bloqueado', 'No puedes registrar asistencia sin tener una clase programada en este momento.', 6000);
      this.estadoClase = 'NINGUNO';
      this.hayMatchHorarioDia = false;
      this.activeStep = 1;
    }
  }

  private async cruzarPorIdentificacion(idEstudiante: string): Promise<void> {
    this.cargandoCruce = true;
    this.hayMatchHorarioDia = false;
    this.estadoClase = 'NINGUNO';
    this.laboratorioCodigoSeleccionado = null;

    try {
      let asignaciones = await firstValueFrom(this.estudiantesSrv.getByIdEstudiante(idEstudiante).pipe(catchError(() => of([]))));
      if ((!asignaciones || !asignaciones.length) && this.nombreUsuario) {
        asignaciones = await firstValueFrom(this.estudiantesSrv.searchByNombre(this.nombreUsuario).pipe(catchError(() => of([]))));
      }
      if (!asignaciones || !asignaciones.length) {
        this.mostrarMensaje('info', 'Sin asignaciones', 'No hay asignaciones (asignatura/aula) para este estudiante');
        this.activeStep = 1;
        return;
      }

      interface Candidato { materiaNom?: string; materiaCod?: string; aulaNombre?: string; aulaCodigo?: string }
      const candidatos: Candidato[] = asignaciones
        .map((c: { nomAsignatura?: string; codAsignatura?: string; nomAula?: string; codAula?: string }) => ({
          materiaNom: c?.nomAsignatura || '',
          materiaCod: c?.codAsignatura || '',
          aulaNombre: c?.nomAula && String(c?.nomAula).trim() || undefined,
          aulaCodigo: c?.codAula && String(c?.codAula).trim() || undefined
        }))
        .filter(c => !!(c.aulaNombre || c.aulaCodigo));

      if (!candidatos.length) {
        this.mostrarMensaje('warn', 'Sin aula asignada', 'No hay aula en los registros del estudiante');
        this.activeStep = 1;
        return;
      }

      const fechaSel = (this.formUso.value.fecha_uso as Date) || this.minDate;
      const dia = this.getDiaNombreES(fechaSel);
      
     
      
      const horariosDiaRaw = await firstValueFrom(this.horariosSrv.getHoras(dia).pipe(catchError(() => of([]))));
      
      
      if (horariosDiaRaw?.length > 0) {
     
      }
      
      const horariosDia = this.normalizarHorarios(horariosDiaRaw);
      
      

      if (!horariosDia.length) {
       
        this.mostrarMensaje('info', 'Sin horarios', `No hay horarios configurados para ${dia}`);
        this.activeStep = 1;
        return;
      }

      const nowMin = this.minRefPara(fechaSel);

      const puntuados: Array<{ cand: Candidato; horario: HorarioExtendido; score: number; diffMin: number }> = [];
      for (const cand of candidatos) {
        const matches = horariosDia.filter(h => this.aulaCoincide(h, cand.aulaNombre, cand.aulaCodigo));
        for (const h of matches) {
          const score = this.scoreMatch(h, cand, nowMin);
          const diffMin = this.diffMinutosDesdeRef(h, nowMin);
          puntuados.push({ cand, horario: h, score, diffMin });
        }
      }

    
      if (puntuados.length > 0) {
        
      }

      if (!puntuados.length) {
        
        const c0 = candidatos[0];
        const aulaVisible = c0.aulaNombre || c0.aulaCodigo || '';
        const materiaVisible = c0.materiaNom || c0.materiaCod || '';
        this.asegurarLaboratorioEnLista(aulaVisible);
        this.laboratorioCodigoSeleccionado = c0.aulaCodigo || null;

        this.formUso.patchValue(
          { laboratorio_id: aulaVisible, nombre_laboratorio: aulaVisible, materia: materiaVisible, hora_inicio: '', hora_fin: '' },
          { emitEvent: false }
        );

        this.mostrarMensaje('info', 'Sin coincidencias', `No se encontraron horarios que coincidan con las aulas del estudiante en ${dia}`);
        this.activeStep = 1;
        this.estadoClase = 'NINGUNO';
        this.hayMatchHorarioDia = false;
        return;
      }

      puntuados.sort((a, b) => (b.score - a.score) || (a.diffMin - b.diffMin));
      const best = puntuados[0];

      const aulaVisible =
        (best.horario.nomAula && best.horario.nomAula.trim()) || best.cand.aulaNombre || best.cand.aulaCodigo || '';
      const materiaVisible =
        (this.matchesMateria(best.horario.materia, best.cand.materiaNom, best.cand.materiaCod) && (best.horario.materia || '')) ||
        best.cand.materiaNom || best.cand.materiaCod || '';

      this.asegurarLaboratorioEnLista(aulaVisible);
      this.laboratorioCodigoSeleccionado = best.horario.codAula || best.cand.aulaCodigo || null;

      const hIni12 = this.a12h(best.horario.horaInicio || '');
      const hFin12 = this.a12h(best.horario.horaFin || '');

      this.formUso.patchValue(
        {
          laboratorio_id: aulaVisible,
          nombre_laboratorio: aulaVisible,
          materia: materiaVisible,
          hora_inicio: hIni12,
          hora_fin: hFin12
        },
        { emitEvent: false }
      );

      this.estadoClase = this.evaluarEstadoClase(fechaSel, best.horario.horaInicio || '', best.horario.horaFin || '');
      this.hayMatchHorarioDia = true;

      if (this.estadoClase === 'ANTES') {
        this.mostrarMensaje('info', 'Clase no ha comenzado', `Tu clase inicia a las ${hIni12}. Debes esperar hasta el inicio.`, 6000);
        this.activeStep = 1;
        return;
      }

      if (this.estadoClase === 'DESPUES') {
        this.mostrarMensaje('info', 'Clase finalizada', `Tu clase terminó a las ${hFin12}. Ya no puedes marcar.`);
        this.activeStep = 1;
        return;
      }

      if (this.estadoClase === 'DURANTE') {
        this.activeStep = 2;
        this.mostrarMensaje('success', 'Cruce OK', `Clase en progreso (${hIni12} - ${hFin12}).`);
      } else {
        this.activeStep = 1;
        this.mostrarMensaje('warn', 'Estado indeterminado', 'No se pudo determinar el estado de la clase.');
      }
    } finally {
      this.cargandoCruce = false;
    }
  }

  private cargarAulas(): void {
    this.cargandoAulas = true;
    this.horariosSrv.getAulasNombres()
      .pipe(finalize(() => (this.cargandoAulas = false)))
      .subscribe({
        next: (names: string[]) => {
          const arr = (names ?? []).map(n => ({ id: n, nombre: n }));
          const vistos = new Set<string>();
          this.laboratorios = arr.filter(x => {
            const k = this.normalizar(x.id);
            if (vistos.has(k)) return false;
            vistos.add(k);
            return true;
          });
        },
        error: () => {
          this.mostrarMensaje('warn', 'Error cargando aulas', 'No se pudieron cargar las aulas');
        }
      });
  }

  private cargarLaboratoriosLocales(): void {
    this.labsService.getAll().subscribe({
      next: (lista) => {
        this.labsLocales = lista ?? [];
        this.labIdPorNombre = new Map(this.labsLocales.map(l => [this.normalizar(l.nombre || ''), String(l.id)]));
      },
      error: () => {
      }
    });
  }

  private procesarParametrosQR(): void {
    this.route.queryParams.subscribe(params => {
      if (!(params['lab'] || params['materia'] || params['fecha'] || params['inicio'] || params['fin'])) return;

      const updates: Partial<{ laboratorio_id: string; materia: string; fecha_uso: Date; hora_inicio: string; hora_fin: string }> = {};
      if (params['lab']) updates.laboratorio_id = params['lab'];
      if (params['materia']) updates.materia = params['materia'];

      if (params['fecha']) {
        const fecha = new Date(params['fecha']);
        if (!isNaN(fecha.getTime())) updates.fecha_uso = fecha;
      }
      if (params['inicio']) updates.hora_inicio = this.a12h(params['inicio']);
      if (params['fin']) updates.hora_fin = this.a12h(params['fin']);

      if (params['lab']) this.asegurarLaboratorioEnLista(params['lab']);

      if (Object.keys(updates).length > 0) {
        this.formUso.patchValue(updates, { emitEvent: false });
        this.mostrarMensaje('info', 'Información del QR cargada', 'Datos pre-cargados desde el código QR');
      }
    });
  }

  private iniciarTimerAutomatico(): void {
    const u = this.formUsuario.getRawValue();
    const f = this.formUso.value;
    const fechaSel = (this.formUso.value.fecha_uso as Date) || this.minDate;

    if (!f.hora_fin) return;

    const config: AsistenciaTimerConfig = {
      identificacion: String(u.identificacion ?? '').trim(),
      laboratorioId: this.laboratorioCodigoSeleccionado || String(f.laboratorio_id ?? ''),
      horaFin: this.ensureHms(String(f.hora_fin)),
      fechaUso: this.aYMD(fechaSel),
      estudianteData: {
        semestre: String(u.semestre ?? ''),
        genero: String(u.genero ?? ''),
        rol: 'ESTUDIANTE',
        programa: String(u.programa ?? ''),
        facultad: String(u.facultad ?? '')
      }
    };

    this.timerService.iniciarTimer(config);
    this.mostrarMensaje('info', 'Timer iniciado', `Se marcará automáticamente tu salida a las ${this.a12h(String(f.hora_fin))}`);
  }

  private consultarUsuario(codigo: string) {
    return this.usuariosSrv.getByCodigo(codigo).pipe(
      catchError(() => {
        const base = (environment as { apiOracle?: string }).apiOracle || '';
        const url = `${base.replace(/\/$/, '')}/usuarios/${encodeURIComponent(codigo)}`;
        return this.http.get<UsuarioOracle>(url, { observe: 'response' }).pipe(
          timeout(8000),
          map((res) => (res.status === 204 ? null : (res.body as UsuarioOracle))),
          catchError(() => of(null))
        );
      })
    );
  }

  private describirErrorHttp(e: { name?: string; status?: number; statusText?: string }): string {
    if (e?.name === 'TimeoutError') return 'Timeout consultando el backend.';
    if (e?.status === 0) return 'No hay conexión con el servidor (red/firewall/proxy).';
    if (e?.status) return `HTTP ${e.status}${e.statusText ? ' - ' + e.statusText : ''}`;
    return 'Error de red o CORS.';
  }

  private obtenerNombreLaboratorio(laboratorioId: string): string | null {
    const labLocal = this.labsLocales.find(l => String(l.id) === laboratorioId);
    if (labLocal) return labLocal.nombre;

    const aula = this.laboratorios.find(l => l.id === laboratorioId);
    if (aula) return aula.nombre;

    return laboratorioId || null;
  }

  private buildRegistroDTO(): RegistroUsoDTO {
    if (!this.esEstudianteValido) throw new Error('SECURITY: estudiante inválido');
    if (!this.hayMatchHorarioDia) throw new Error('SECURITY: sin horarios coincidentes');
    if (this.estadoClase !== 'DURANTE') throw new Error(`SECURITY: estado inválido ${this.estadoClase}`);
    if (this.tieneRegistroHoy) throw new Error('SECURITY: ya existe registro hoy');

    const u = this.formUsuario.getRawValue();
    const f = this.formUso.value;
    const fechaSel = (this.formUso.value.fecha_uso as Date) || this.minDate;

    const horaInicio = String(f.hora_inicio ?? '');
    const horaFin = String(f.hora_fin ?? '');
    const estadoActual = this.evaluarEstadoClase(fechaSel, horaInicio, horaFin);
    if (estadoActual !== 'DURANTE') throw new Error(`SECURITY: estado cambió a ${estadoActual}`);

    const horaInicio24 = this.ensureHms(horaInicio);
    const horaFin24 = this.ensureHms(horaFin);

    const aulaVisible = String(f.laboratorio_id ?? '');
    const idLocalPorNombre = this.labIdPorNombre.get(this.normalizar(aulaVisible)) || null;
    const laboratorioId = idLocalPorNombre ?? this.laboratorioCodigoSeleccionado ?? aulaVisible;

    const dto: RegistroUsoDTO = {
      identificacion: String(u.identificacion ?? ''),
      semestre: String(u.semestre ?? ''),
      genero: String(u.genero ?? ''),
      rol: 'ESTUDIANTE',
      programa: String(u.programa ?? ''),
      facultad: String(u.facultad ?? ''),
      motivo: 'ASISTENCIA',
      observaciones: `Validado - Estado: ${estadoActual}, Match: ${this.hayMatchHorarioDia}`,
      fechaUso: this.aYMD(fechaSel),
      horaInicio: horaInicio24,
      horaFin: horaFin24,
      laboratorioId
    };

    return dto;
  }

  private resetUsuario(): void {
    this.esEstudianteValido = false;
    this.nombreUsuario = '';
    this.estadoClase = 'NINGUNO';
    this.hayMatchHorarioDia = false;
    this.laboratorioCodigoSeleccionado = null;
    this.tieneRegistroHoy = false;
    this.nombreLaboratorioExistente = '';
    this.formUsuario.patchValue(
      { nombre: '', genero: '', cargo: '', programa: '', facultad: '', semestre: '' },
      { emitEvent: false }
    );
  }

  private normalizarUsuario(u: UsuarioOracle) {
    let genero = (u.genero ?? '').trim();
    let rol = ((u as { cargo?: string; rol?: string }).cargo ?? (u as { cargo?: string; rol?: string }).rol ?? '').trim();
    let programa = (u.programa ?? '').trim();
    let facultad = (u.facultad ?? '').trim();

    const generosValid = ['Masculino', 'Femenino', 'Otro'];
    const rolesValid = ['Estudiante', 'Docente', 'Administrativo'];

    if (!generosValid.includes(genero) && generosValid.includes(programa)) [genero, programa] = [programa, genero];
    if (!rolesValid.includes(rol) && rolesValid.includes(facultad)) [rol, facultad] = [facultad, rol];

    return { nombre: (u.nombre ?? '').trim(), genero, rol, programa, facultad };
  }

  private reiniciarUso(): void {
    const ahora = new Date();
    this.estadoClase = 'NINGUNO';
    this.hayMatchHorarioDia = false;
    this.laboratorioCodigoSeleccionado = null;

    this.formUso.reset(
      {
        laboratorio_id: '',
        nombre_laboratorio: '',
        materia: '',
        fecha_uso: this.minDate,
        hora_inicio: this.a12hFromDate(ahora),
        hora_fin: ''
      },
      { emitEvent: false } 
    );
  }

  private onlyDate(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  a12h(hhmm: string): string {
    const norm = this.aHHMMDesdeEntrada(hhmm);
    const [hStr, mStr] = norm.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return hhmm;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  private a12hFromDate(d: Date): string { return this.a12h(this.aHHMM(d)); }

  private aHHMM(date: Date): string {
    const hora = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${hora}:${minutos}`;
  }

  private aHHMMDesdeEntrada(v: string | Date | unknown): string {
    if (v instanceof Date) return this.aHHMM(v);
    const s = (v ?? '').toString().trim();
    if (!s) return '';
    let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (m) { let h = (+m[1]) % 12; if (m[3].toUpperCase() === 'PM') h += 12; return `${String(h).padStart(2, '0')}:${m[2]}`; }
    m = s.match(/^(\d{1,2}):(\d{2})(?::\d{1,2})?$/); if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})(\d{2})$/); if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
    const d = new Date(`1970-01-01T${s}`); if (!isNaN(d.getTime())) return this.aHHMM(d);
    return s;
  }

  private ensureHms(hhmmOr12h: string): string {
    const hhmm24 = this.aHHMMDesdeEntrada(hhmmOr12h);
    return hhmm24 && hhmm24.length === 5 ? `${hhmm24}:00` : hhmm24;
  }

  private aYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private normalizar(s: string): string {
    return (s || '')
      .toString()
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ');
  }

  invalidUsuario(nombreControl: string): boolean {
    const c = this.formUsuario.get(nombreControl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  invalidUso(nombreControl: string): boolean {
    const c = this.formUso.get(nombreControl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  obtenerMensajeErrorIdentificacion(): string {
    const c = this.formUsuario.get('identificacion');
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'La identificación es requerida';
    if (c.errors['minlength']) return 'Mínimo 4 caracteres';
    if (c.errors['maxlength']) return 'Máximo 20 caracteres';
    if (c.errors['pattern']) return 'Solo se permiten números';
    return 'Formato inválido';
  }

  obtenerMensajeError(nombreControl: string): string {
    const c = this.formUsuario.get(nombreControl) || this.formUso.get(nombreControl);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Este campo es requerido';
    if (c.errors['minlength']) return `Mínimo ${c.errors['minlength'].requiredLength} caracteres`;
    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres`;
    if (c.errors['min']) return `Valor mínimo: ${c.errors['min'].min}`;
    if (c.errors['max']) return `Valor máximo: ${c.errors['max'].max}`;
    if (c.errors['pattern']) return 'Formato inválido';
    return 'Campo inválido';
  }

  private aulaCoincide(h: HorarioExtendido, aulaNombre?: string, aulaCodigo?: string): boolean {
    const hNom = this.normalizar(h.nomAula || '');
    const hCod = this.normalizar(h.codAula || '');
    const n = this.normalizar(aulaNombre || '');
    const c = this.normalizar(aulaCodigo || '');
    return (!!n && hNom === n) || (!!c && hCod === c);
  }

  private matchesMateria(mHor?: string, mNom?: string, mCod?: string): boolean {
    const H = this.normalizar(mHor || '');
    const N = this.normalizar(mNom || '');
    const C = this.normalizar(mCod || '');
    if (!H) return false;
    if (N && (H === N || H.includes(N) || N.includes(H))) return true;
    if (C && (H === C || H.includes(C) || C.includes(H))) return true;
    return false;
  }

  private hhmmAMinutos(hhmm: string): number {
    const hhmm24 = this.aHHMMDesdeEntrada(hhmm);
    const [h, m] = (hhmm24 || '0:0').split(':').map(n => parseInt(n, 10));
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  }

  private diffMinutosDesdeRef(h: HorarioExtendido, refMin: number): number {
    const ini = this.hhmmAMinutos(h.horaInicio || '00:00');
    if (refMin < 0) return ini;
    return Math.max(0, ini - refMin);
  }

  private scoreMatch(
    h: HorarioExtendido,
    cand: { materiaNom?: string; materiaCod?: string; aulaNombre?: string; aulaCodigo?: string },
    refMin: number
  ): number {
    let s = 0;
    if (this.normalizar(h.nomAula || '') && this.normalizar(cand.aulaNombre || '') && this.normalizar(h.nomAula || '') === this.normalizar(cand.aulaNombre || '')) s += 1;
    if (this.normalizar(h.codAula || '') && this.normalizar(cand.aulaCodigo || '') && this.normalizar(h.codAula || '') === this.normalizar(cand.aulaCodigo || '')) s += 1;
    if (this.matchesMateria(h.materia, cand.materiaNom, cand.materiaCod)) s += 2;

    const ini = this.hhmmAMinutos(h.horaInicio || '');
    const fin = this.hhmmAMinutos(h.horaFin || '');
    if (refMin >= 0) {
      if (ini <= refMin && refMin <= fin) s += 3;
      else if (ini > refMin) s += 2;
    } else {
      s += 2;
    }
    return s;
  }

  private minRefPara(fechaSel: Date): number {
    const hoy = this.onlyDate(new Date()).getTime();
    const sel = this.onlyDate(fechaSel).getTime();
    if (hoy === sel) {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
    return -1;
  }

  private evaluarEstadoClase(fecha: Date, horaInicio: string, horaFin: string): EstadoClase {
    const hoyMs = this.onlyDate(new Date()).getTime();
    const selMs = this.onlyDate(fecha).getTime();

    if (selMs > hoyMs) return 'ANTES';
    if (selMs < hoyMs) return 'DESPUES';

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const inicioMin = this.hhmmAMinutos(horaInicio || '00:00');
    const finMin = this.hhmmAMinutos(horaFin || '00:00');

    if (inicioMin < 0 || finMin < 0 || inicioMin >= finMin) return 'NINGUNO';
    if (nowMin < inicioMin) return 'ANTES';
    if (nowMin > finMin) return 'DESPUES';
    return 'DURANTE';
  }

  private asegurarLaboratorioEnLista(nombreVisible: string) {
    if (!this.laboratorios.some(l => this.normalizar(l.id) === this.normalizar(nombreVisible))) {
      this.laboratorios = [{ id: nombreVisible, nombre: nombreVisible }, ...this.laboratorios];
    }
  }

  private normalizarHorarios(items: unknown[] | null | undefined): HorarioExtendido[] {
    if (!items || !Array.isArray(items)) return [];
    return items.map((raw) => {
      const rawObj = raw as Record<string, unknown>;
      const codAula: string = (rawObj['codAula'] ?? rawObj['aula'] ?? rawObj['codigoAula'] ?? '').toString();
      const nomAula: string = (rawObj['nomAula'] ?? rawObj['nombreAula'] ?? rawObj['aulaNombre'] ?? '').toString();
      const diaSemana: string = (rawObj['diaSemana'] ?? rawObj['dia'] ?? '').toString();
      const horaInicio = this.aHHMMDesdeEntrada(rawObj['horaInicio'] ?? rawObj['inicio'] ?? rawObj['hora_ini']);
      const horaFin = this.aHHMMDesdeEntrada(rawObj['horaFin'] ?? rawObj['fin'] ?? rawObj['hora_fin']);
      const nombreClase = rawObj['nombreClase'] ?? rawObj['asignatura'] ?? rawObj['nombreAsignatura'] ?? rawObj['materia'] ?? rawObj['clase'] ?? rawObj['descripcion'] ?? rawObj['nombre'] ?? '';
      const materia = rawObj['materia'] ?? rawObj['asignatura'] ?? rawObj['nombreAsignatura'] ?? rawObj['nombre'] ?? undefined;
      return { codAula, nomAula, diaSemana, horaInicio, horaFin, nombreClase, materia } as HorarioExtendido;
    });
  }

  private getDiaNombreES(fecha: Date): string {
    const es = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    return es[fecha.getDay()];
  }
}