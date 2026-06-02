import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { QrTokenService } from '../../core/services/qr-token.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { EstudiantesOracleService } from '../../core/services/estudiantes-oracle.service';
import { HorariosOracleService, HorarioItem } from '../../core/services/horarios-oracle.service';
import { UsosLaboratorioService, RegistroUsoDTO, EntradaPayload, SalidaPayload } from '../../core/services/usos-laboratorio.service';
import { LaboratoriosService } from '../../core/services/laboratorios.service';
import { AsistenciaPublicaService, UsuarioOraclePublico, AsignacionEstudiante, HorarioAulaPublico, CircuitBreakerAbiertaError } from '../../core/services/asistencia-publica.service';
import { RegistroAsistenciaPublicaPayload } from '../../core/models/registro-asistencia-publica.model';
import { normalizarHorarios, aulaCoincide as aulaCoincideUtil, scoreMatch, diffMinutosDesdeRef, minRefPara } from '../../core/utils/horarios-utils';
import { Laboratorio } from '../../core/models/laboratorio.model';
import { environment } from '@shared/shared-environments';

import { of, firstValueFrom, forkJoin, throwError } from 'rxjs';
import { catchError, map, timeout, finalize, switchMap } from 'rxjs/operators';

type EstadoClase = 'NINGUNO' | 'ANTES' | 'DURANTE' | 'DESPUES';

@Component({
  selector: 'app-asistencia-qr-publica',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    PanelModule,
    CardModule,
    MessageModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [
    MessageService,
    UsuariosOracleService,
    EstudiantesOracleService,
    HorariosOracleService,
    UsosLaboratorioService,
    QrTokenService,
    AsistenciaPublicaService
  ],
  templateUrl: './asistencia-qr-publica.component.html',
  styleUrls: ['./asistencia-qr-publica.component.scss']
})
export class AsistenciaQrPublicaComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly qrTokenService = inject(QrTokenService);
  private readonly usuariosSrv = inject(UsuariosOracleService);
  private readonly estudiantesSrv = inject(EstudiantesOracleService);
  private readonly horariosSrv = inject(HorariosOracleService);
  private readonly usosSrv = inject(UsosLaboratorioService);
  private readonly labsService = inject(LaboratoriosService);
  private readonly asistenciaPublicaSrv = inject(AsistenciaPublicaService);

  estadoActual: 'validando' | 'qr-invalido' | 'formulario' | 'exito' | 'ya-registrado' | 'sin-horario' = 'validando';
  mensajeError = '';
  
  datosQr: {
    labName: string;
    labCode: string;
    slot: string;
    exp: string;
    salt: string;
  } | null = null;

  formEstudiante = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(5)]]
  });

  buscandoEstudiante = false;
  registrandoAsistencia = false;
  
  estudianteEncontrado = false;
  errorEstudiante = '';
  datosEstudiante: {
    identificacion: string;
    nombre: string;
    genero: string;
    programa: string;
    facultad: string;
    semestre: string;
    rol: string;
  } | null = null;

  hayMatchHorario = false;
  estadoClase: EstadoClase = 'NINGUNO';
  horarioEncontrado: { materia: string; horaInicio: string; horaFin: string } | null = null;

  horaRegistro = '';

  // Caché de laboratorios
  private labsLocales: Laboratorio[] = [];

  ngOnInit(): void {
    this.cargarLaboratoriosLocales();
    this.validarTokenQR();
  }

  ngOnDestroy(): void {
  }

  get puedeRegistrar(): boolean {
    return this.estudianteEncontrado && 
           !this.errorEstudiante && 
           !!this.datosQr && 
           this.hayMatchHorario && 
           this.estadoClase === 'DURANTE';
  }

  private async validarTokenQR(): Promise<void> {
    this.route.queryParams.subscribe(async params => {
      const token = params['qrToken'];
      
      if (!token) {
        if (params['labName'] && params['exp']) {
          this.procesarParametrosLegacy(params);
          return;
        }
        
        this.estadoActual = 'qr-invalido';
        this.mensajeError = 'No se encontró un código QR válido en la URL.';
        return;
      }

      try {
        const datos = await this.qrTokenService.validateToken(token);
        
        if (!datos) {
          this.estadoActual = 'qr-invalido';
          this.mensajeError = 'El código QR ha expirado o es inválido. Por favor, escanea un nuevo código.';
          return;
        }

        this.datosQr = datos;
        this.estadoActual = 'formulario';
      } catch (error) {
      
        this.estadoActual = 'qr-invalido';
        this.mensajeError = 'Error al procesar el código QR.';
      }
    });
  }

  private procesarParametrosLegacy(params: any): void {
    const exp = new Date(params['exp']).getTime();
    
    if (Date.now() > exp) {
      this.estadoActual = 'qr-invalido';
      this.mensajeError = 'El código QR ha expirado. Por favor, escanea un nuevo código.';
      return;
    }

    this.datosQr = {
      labName: params['labName'] || '',
      labCode: params['labCode'] || '',
      slot: params['slot'] || '',
      exp: params['exp'] || '',
      salt: params['salt'] || ''
    };
    this.estadoActual = 'formulario';
  }

  async buscarEstudiante(): Promise<void> {
    const identificacion = (this.formEstudiante.value.identificacion || '').toString().trim();
    
    if (!/^\d{5,}$/.test(identificacion)) {
      this.toast.add({
        key: 'asistencia-qr',
        severity: 'warn',
        summary: 'Identificación inválida',
        detail: 'Ingresa un número de identificación válido (mínimo 5 dígitos)'
      });
      return;
    }

    this.buscandoEstudiante = true;
    this.estudianteEncontrado = false;
    this.errorEstudiante = '';
    this.datosEstudiante = null;
    this.hayMatchHorario = false;
    this.estadoClase = 'NINGUNO';
    this.horarioEncontrado = null;

    try {
      const usuario = await firstValueFrom(this.consultarUsuarioPublico(identificacion));
      
      if (!usuario) {
        this.errorEstudiante = 'No se encontró un estudiante con esa identificación.';
        return;
      }

      const rol = this.obtenerRolDeUsuario(usuario);
      if (rol !== 'ESTUDIANTE') {
        this.errorEstudiante = 'Esta funcionalidad es solo para estudiantes.';
        return;
      }

      this.datosEstudiante = {
        identificacion,
        nombre: usuario.nombre || '',
        genero: usuario.genero || '',
        programa: usuario.programa || '',
        facultad: usuario.facultad || '',
        semestre: usuario.semestre?.toString() || '',
        rol: 'ESTUDIANTE'
      };
      this.estudianteEncontrado = true;

      await this.validarHorarioEstudiantePublico(identificacion, usuario.nombre || '');

    } catch (error: any) {
      if (this.esErrorCircuitBreaker(error)) {
        this.errorEstudiante = 'El servicio está momentáneamente saturado. Espera unos 30 segundos e intenta nuevamente.';
      } else {
        this.errorEstudiante = 'Error al consultar los datos. Intenta nuevamente.';
      }
    } finally {
      this.buscandoEstudiante = false;
    }
  }

  private async validarHorarioEstudiantePublico(identificacion: string, nombre: string): Promise<void> {
    if (!this.datosQr) return;

    try {
      let asignaciones: AsignacionEstudiante[] = [];
      
      asignaciones = await firstValueFrom(this.asistenciaPublicaSrv.getAsignacionesPorEstudiante(identificacion));
      
      if ((!asignaciones || !asignaciones.length) && nombre) {
        asignaciones = await firstValueFrom(this.asistenciaPublicaSrv.buscarAsignacionesPorNombre(nombre));
      }

      if (!asignaciones || !asignaciones.length) {
        this.errorEstudiante = 'No tienes asignaturas registradas en el sistema.';
        return;
      }

      const candidatos = asignaciones
        .map((c: AsignacionEstudiante) => ({
          materiaNom: c?.nomAsignatura || '',
          materiaCod: c?.codAsignatura || '',
          aulaNombre: (c?.nomAula && String(c?.nomAula).trim()) || undefined,
          aulaCodigo: (c?.codAula && String(c?.codAula).trim()) || undefined
        }))
        .filter((c: any) => !!(c.aulaNombre || c.aulaCodigo));

      if (!candidatos.length) {
        this.errorEstudiante = 'No tienes aulas asignadas en tus registros.';
        return;
      }

      const labNameQr = this.normalizar(this.datosQr.labName);
      const labCodeQr = this.normalizar(this.datosQr.labCode);

      const ahora = new Date();
      const dia = this.getDiaNombreES(ahora);
      
      const horariosPublicos = await firstValueFrom(this.asistenciaPublicaSrv.getHorariosPorDia(dia));
      
      const horariosDia: HorarioItem[] = horariosPublicos.map(h => ({
        codAula: h.codAula,
        nomAula: h.nomAula,
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
        materia: h.materia,
        docente: h.docente
      }));
      
      const horarioMatch = this.buscarHorarioCoincidente(horariosDia, candidatos, labNameQr, labCodeQr);
      

      if (!horarioMatch) {
        this.errorEstudiante = `No tienes clases programadas en "${this.datosQr.labName}" hoy (${dia}).`;
        return;
      }

      this.estadoClase = this.evaluarEstadoClase(ahora, horarioMatch.horaInicio || '', horarioMatch.horaFin || '');
      this.horarioEncontrado = {
        materia: horarioMatch.materia || 'Clase',
        horaInicio: this.a12h(horarioMatch.horaInicio || ''),
        horaFin: this.a12h(horarioMatch.horaFin || '')
      };

      if (this.estadoClase === 'ANTES') {
        this.errorEstudiante = `Tu clase inicia a las ${this.horarioEncontrado.horaInicio}. Debes esperar.`;
        return;
      }

      if (this.estadoClase === 'DESPUES') {
        this.errorEstudiante = `Tu clase terminó a las ${this.horarioEncontrado.horaFin}. Ya no puedes registrar.`;
        return;
      }

      if (this.estadoClase === 'DURANTE') {
        this.hayMatchHorario = true;
        this.toast.add({
          key: 'asistencia-qr',
          severity: 'success',
          summary: '¡Validación exitosa!',
          detail: `Clase en progreso: ${this.horarioEncontrado.materia} (${this.horarioEncontrado.horaInicio} - ${this.horarioEncontrado.horaFin})`
        });
      }

    } catch (error) {
      if (this.esErrorCircuitBreaker(error)) {
        throw error;
      }
      this.errorEstudiante = 'Error al validar el horario. Intenta nuevamente.';
    }
  }

  private consultarUsuarioPublico(codigo: string) {
    return this.asistenciaPublicaSrv.getUsuarioPorIdentificacion(codigo).pipe(
      map(usuario => usuario as UsuarioOracle | null)
    );
  }

  private async validarHorarioEstudiante(identificacion: string, nombre: string): Promise<void> {
    return this.validarHorarioEstudiantePublico(identificacion, nombre);
  }

  private buscarHorarioCoincidente(
    horarios: HorarioItem[], 
    candidatos: any[], 
    labNameQr: string, 
    labCodeQr: string
  ): HorarioItem | null {
    
    
    if (horarios?.length > 0) {
      
    }

    const ahora = new Date();
    const nowMin = ahora.getHours() * 60 + ahora.getMinutes();
    
    const horariosNorm = normalizarHorarios(horarios as any[]);
    
    const labNameNorm = this.normalizar(labNameQr);
    const labCodeNorm = this.normalizar(labCodeQr);
   

    const puntuados: Array<{ cand: any; horario: any; score: number; diffMin: number }> = [];

    let horariosDelLab = 0;
    for (const h of horariosNorm) {
      const hNom = this.normalizar(h.nomAula || '');
      const hCod = this.normalizar(h.codAula || '');

      const esDelLab = (!!hNom && (hNom === labNameNorm || hNom.includes(labNameNorm) || labNameNorm.includes(hNom))) ||
                       (!!hCod && (hCod === labCodeNorm || hCod.includes(labCodeNorm) || labCodeNorm.includes(hCod)));

      if (!esDelLab) continue;
      horariosDelLab++;

      for (const cand of candidatos) {
        const score = scoreMatch(h, cand, minRefPara(new Date()));
        const diff = diffMinutosDesdeRef(h, nowMin);
        if (score > 0) puntuados.push({ cand, horario: h, score, diffMin: diff });
      }
    }
    
    if (!puntuados.length) {
    
      for (const h of horariosNorm) {
        for (const cand of candidatos) {
          const score = scoreMatch(h, cand, minRefPara(new Date()));
          const diff = diffMinutosDesdeRef(h, nowMin);
          if (score > 0) puntuados.push({ cand, horario: h, score, diffMin: diff });
        }
      }
      
    }

    if (!puntuados.length) {
     
      return null;
    }

    puntuados.sort((a, b) => (b.score - a.score) || (a.diffMin - b.diffMin));
   
    return puntuados[0].horario || null;
  }

  private evaluarEstadoClase(fechaRef: Date, horaInicioStr: string, horaFinStr: string): EstadoClase {
    if (!horaInicioStr || !horaFinStr) return 'NINGUNO';

    const ahora = fechaRef.getHours() * 60 + fechaRef.getMinutes();
    const inicio = this.horaAMinutos(horaInicioStr);
    const fin = this.horaAMinutos(horaFinStr);

    const graciaMinutos = 15;

    if (ahora < inicio - graciaMinutos) return 'ANTES';
    if (ahora > fin + graciaMinutos) return 'DESPUES';
    return 'DURANTE';
  }

  private horaAMinutos(hora: string): number {
    if (!hora) return 0;

    const hora24 = this.convertir12hA24h(hora);
    
    const partes = hora24.split(':').map(Number);
    return (partes[0] || 0) * 60 + (partes[1] || 0);
  }

  private convertir12hA24h(hora: string): string {
    if (!hora) return '00:00';
    
    const horaLower = hora.toLowerCase().trim();

    if (!horaLower.includes('am') && !horaLower.includes('pm') && 
        !horaLower.includes('a.m') && !horaLower.includes('p.m')) {
      return hora;
    }
    
    const esPM = horaLower.includes('pm') || horaLower.includes('p.m');
    const esAM = horaLower.includes('am') || horaLower.includes('a.m');
    
    const soloNumeros = hora.replace(/[^\d:]/g, '').trim();
    const partes = soloNumeros.split(':');
    let horas = parseInt(partes[0], 10) || 0;
    const minutos = parseInt(partes[1], 10) || 0;
    
    if (esPM && horas !== 12) {
      horas += 12;
    } else if (esAM && horas === 12) {
      horas = 0;
    }
    
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  }

  private coincideAula(a: string, b: string): boolean {
    if (!a || !b) return false;
    return a.includes(b) || b.includes(a) || a === b;
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

  private getDiaNombreES(fecha: Date): string {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    return dias[fecha.getDay()];
  }

  private a12h(hora: string): string {
    if (!hora) return '';
    
    const horaLower = hora.toLowerCase();
    if (horaLower.includes('am') || horaLower.includes('pm') || 
        horaLower.includes('a.m') || horaLower.includes('p.m')) {
      return hora.trim();
    }
    
    const [h, m] = hora.split(':').map(Number);
    const suffix = h >= 12 ? 'p.m.' : 'a.m.';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${suffix}`;
  }

  async registrarAsistencia(): Promise<void> {
    if (!this.puedeRegistrar || !this.datosEstudiante || !this.datosQr) return;

    this.registrandoAsistencia = true;

    try {
      const ahora = new Date();
      const fechaUso = this.formatearFecha(ahora);
      const horaInicio = this.formatearHoraHMS(ahora);

      const posibleUuid = String(this.datosQr.labCode || '').trim();
      const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(posibleUuid);
      const laboratorioId = esUuid ? posibleUuid : (this.obtenerLabIdPorNombre(this.datosQr.labName) || posibleUuid);

      const yaRegistrado = await firstValueFrom(
        this.asistenciaPublicaSrv.verificarDuplicado(
          this.datosEstudiante.identificacion,
          laboratorioId,
          fechaUso
        )
      );

      if (yaRegistrado) {
        this.estadoActual = 'ya-registrado';
        this.toast.add({
          key: 'asistencia-qr',
          severity: 'warn',
          summary: 'Ya registrado',
          detail: 'Tu asistencia ya fue registrada anteriormente para este laboratorio hoy.'
        });
        return;
      }
      
      let horaFin: string;
      if (this.horarioEncontrado?.horaFin) {
        const hf24 = this.convertir12hA24h(this.horarioEncontrado.horaFin || '');
        const m = hf24.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (m) {
          const hh = m[1].padStart(2, '0');
          const mm = m[2].padStart(2, '0');
          const ss = (m[3] || '00').padStart(2, '0');
          horaFin = `${hh}:${mm}:${ss}`;
        } else {
          horaFin = this.normalizarHoraAHMS(this.horarioEncontrado.horaFin);
        }
      } else {
        const finDate = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
        horaFin = this.formatearHoraHMS(finDate);
      }
      const payload: RegistroAsistenciaPublicaPayload = {
        identificacion: this.datosEstudiante.identificacion,
        laboratorioId: laboratorioId,
        fechaUso: fechaUso,
        horaInicio: horaInicio,
        horaFin: horaFin,
        semestre: this.datosEstudiante.semestre || '',
        genero: this.datosEstudiante.genero || '',
        programa: this.datosEstudiante.programa || '',
        facultad: this.datosEstudiante.facultad || '',
        materia: this.horarioEncontrado?.materia || ''
      };

     
      
      await firstValueFrom(this.asistenciaPublicaSrv.registrarAsistencia(payload));
      
      this.horaRegistro = this.formatearHoraDisplay(ahora);
      this.estadoActual = 'exito';
      
      this.toast.add({
        key: 'asistencia-qr',
        severity: 'success',
        summary: '¡Registro exitoso!',
        detail: 'Tu asistencia ha sido registrada correctamente.'
      });

    } catch (error: any) {
      const httpStatus = error?.status || 0;
      const errorMsg = error?.error?.error || error?.error?.message || error?.message || '';
      const esDuplicado = httpStatus === 409 
        || errorMsg.toLowerCase().includes('ya existe') 
        || errorMsg.toLowerCase().includes('duplicado')
        || errorMsg.toLowerCase().includes('duplicate');

      if (esDuplicado) {
        this.estadoActual = 'ya-registrado';
        this.toast.add({
          key: 'asistencia-qr',
          severity: 'warn',
          summary: 'Ya registrado',
          detail: 'Tu asistencia ya fue registrada anteriormente para este laboratorio hoy.'
        });
      } else {
        this.toast.add({
          key: 'asistencia-qr',
          severity: 'error',
          summary: 'Error al registrar',
          detail: errorMsg || 'No se pudo registrar la asistencia. Intenta nuevamente.'
        });
      }
    } finally {
      this.registrandoAsistencia = false;
    }
  }

  private cargarLaboratoriosLocales(): void {
    this.labsService.getAll().subscribe({
      next: (lista) => {
        this.labsLocales = lista ?? [];
      },
      error: () => {}
    });
  }

  formatearHora(isoString?: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  }

  private formatearFecha(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatearHoraHMS(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }

  private normalizarHoraAHMS(hora: string): string {
    if (!hora) return '23:59:59';
    
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(hora) && !hora.toLowerCase().includes('am') && !hora.toLowerCase().includes('pm')) {
      const partes = hora.split(':');
      const hh = partes[0].padStart(2, '0');
      const mm = partes[1] || '00';
      const ss = partes[2] || '00';
      return `${hh}:${mm}:${ss}`;
    }
    
    const match = hora.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (match) {
      let hh = parseInt(match[1], 10);
      const mm = match[2];
      const ss = match[3] || '00';
      const period = match[4].toUpperCase();
      
      if (period === 'PM' && hh !== 12) {
        hh += 12;
      } else if (period === 'AM' && hh === 12) {
        hh = 0;
      }
      
      return `${hh.toString().padStart(2, '0')}:${mm}:${ss}`;
    }
    
    return hora.includes(':') ? (hora.split(':').length === 2 ? hora + ':00' : hora) : '23:59:59';
  }

  private formatearHoraDisplay(date: Date): string {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  private obtenerRolDeUsuario(usuario: UsuarioOracle): string {
    const rol = ((usuario as any).cargo || (usuario as any).rol || '').toString().trim().toUpperCase();
    return rol;
  }

  private obtenerLabIdPorNombre(nombre: string): string {
    const lab = this.labsLocales.find(l => 
      (l.nombre || '').toLowerCase().includes(nombre.toLowerCase()) ||
      nombre.toLowerCase().includes((l.nombre || '').toLowerCase())
    );
    return lab ? String(lab.id) : nombre;
  }

  private esErrorCircuitBreaker(error: any): boolean {
    return (
      error instanceof CircuitBreakerAbiertaError ||
      error?.name === 'CircuitBreakerAbiertaError' ||
      error?.name === 'TimeoutError' ||
      (typeof error?.message === 'string' && error.message.startsWith('CIRCUIT_BREAKER_OPEN'))
    );
  }
}
