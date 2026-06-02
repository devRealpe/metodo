import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  effect,
  computed,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PlanDeTrabajoService } from '../../../core/services/planDeTrabajo.service';
import { ProfesorService } from '../../../core/services/profesor.service';
import { PlanTrabajoViewerComponent } from '../modales/plan-trabajo-viewer/plan-trabajo-viewer.component';
import {
  PlanDeTrabajoModel,
  UpdateFirmasPlanDeTrabajo,
} from '../../../core/models/planDeTrabajo.model';
import { Profesor } from '../../../core/models/profesor.model';
import { PlanTrabajoDescargarService } from '../../../core/services/plan-trabajo-descargar.service';
import { NotificacionesPlanTrabajoService } from '../../../core/services/notificaciones-plan-trabajo.service';
import { ModalConfirmacionComponent } from '../modales/modal-confirmacion/modal-confirmacion';
import { PlanTrabajoRealtimeService } from '../../../core/services/plan-trabajo-realtime.service';

interface PeriodoAcademico {
  label: string;
  anio: number;
  periodo: number;
}

interface ProfesorConPlan {
  numIdentificacion: string;
  nombres: string;
  apellidos: string;
  programa: string;
  facultad: string;
  cargo: string;
  dedicacion: 'TIEMPO COMPLETO' | 'MEDIO TIEMPO';
  planDeTrabajo: PlanDeTrabajoModel;
  nivelEducativo?: string;
  escalafon?: string;
  vinculacion?: string;
  estado: string;
    severityEstado?: 'success' | 'info' | 'warn' | 'danger';
}

type CampoFiltro = 'nombres' | 'numIdentificacion';

@Component({
  selector: 'app-planeacion-gestion-pt',
  templateUrl: './planeacion-gestion-pt.html',
  styleUrls: ['./planeacion-gestion-pt.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    SelectModule,
    InputTextModule,
    DialogModule,
    PlanTrabajoViewerComponent,
    ModalConfirmacionComponent,
  ],
  providers: [MessageService],
})
export class PlaneacionGestionPtComponent implements OnInit, OnDestroy {
  planeacion = signal<Profesor | null>(null);
  profesorSeleccionado: ProfesorConPlan | null = null;

  constructor(
    private planDeTrabajoService: PlanDeTrabajoService,
    private profesorService: ProfesorService,
    private planTrabajoDescargarService: PlanTrabajoDescargarService,
    private notificacionesService: NotificacionesPlanTrabajoService,
    private messageService: MessageService,
    private realtimeService: PlanTrabajoRealtimeService
  ) {
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();

      if (trigger > 0) {
        untracked(() => {
          const planAprobado = this.realtimeService.planAprobado();
          const planRechazado = this.realtimeService.planRechazado();

          if (planAprobado) {
            this.messageService.add({
              severity: 'success',
              summary: 'Plan Aprobado',
              detail: 'Un director ha aprobado un plan de trabajo',
              life: 5000,
            });
            this.realtimeService.resetSignal('aprobado');
          }

          if (planRechazado) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Plan Rechazado',
              detail: 'Un director ha rechazado un plan de trabajo',
              life: 5000,
            });
            this.realtimeService.resetSignal('rechazado');
          }

          this.cargarPlanes();
        });
      }
    });
  }

  // ─── Datos ────────────────────────────────────────────────────────────────
  allData = signal<ProfesorConPlan[]>([]);
  data = signal<ProfesorConPlan[]>([]);
  cargando = signal<boolean>(false);

  // ─── Periodos ─────────────────────────────────────────────────────────────
  periodosAcademicos: PeriodoAcademico[] = [];
  periodoSeleccionado = signal<PeriodoAcademico | null>(null);

  // ─── Filtros ──────────────────────────────────────────────────────────────
  filtros = signal<{
    nombres: string;
    numIdentificacion: string;
    facultad: string;
    programa: string;
  }>({ nombres: '', numIdentificacion: '', facultad: '', programa: '' });

  readonly onlyNumbers = signal<boolean>(true);
  private searchSubject = new Subject<{ campo: CampoFiltro; valor: string }>();
  private searchSubscription?: Subscription;

  // ─── Viewer ───────────────────────────────────────────────────────────────
  showPlanViewer = signal<boolean>(false);
  planTrabajoIdViewer = signal<string>('');
  profesorIdViewer = signal<string>('');

  // ─── Envío a Sistemas ──────────────────────────────────────────
  cargandoEnvioProduccion = signal<boolean>(false);

  // ─── Opciones computed ────────────────────────────────────────────────────
  opcionesFacultades = computed(() => {
    const unicas = [...new Set(this.allData().map((p) => p.facultad))].sort();
    return [
      { label: 'Todas las facultades', value: '' },
      ...unicas.map((f) => ({ label: f, value: f })),
    ];
  });

  opcionesProgramas = computed(() => {
    const filtroFacultad = this.filtros().facultad;
    const base = filtroFacultad
      ? this.allData().filter((p) => p.facultad === filtroFacultad)
      : this.allData();
    const unicos = [...new Set(base.map((p) => p.programa))].sort();
    return [
      { label: 'Todos los programas', value: '' },
      ...unicos.map((p) => ({ label: p, value: p })),
    ];
  });



  ngOnInit(): void {
    this.generarPeriodosAcademicos();
    this.configurarBusqueda();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  // ─── Inicialización ───────────────────────────────────────────────────────

  generarPeriodosAcademicos(): void {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    const ANIO_MINIMO = 2026;

    let anioDefecto = anioActual;
    let periodoDefecto: 1 | 2 = mes <= 6 ? 1 : 2;

    if (mes >= 5 && mes <= 6) periodoDefecto = 2;
    else if (mes >= 11) {
      periodoDefecto = 1;
      anioDefecto = anioActual + 1;
    }

    const periodos: PeriodoAcademico[] = [];
    for (let anio = anioDefecto; anio >= ANIO_MINIMO; anio--) {
      if (anio === anioDefecto) {
        if (periodoDefecto === 2)
          periodos.push({ label: `${anio} - Periodo 2`, anio, periodo: 2 });
        periodos.push({ label: `${anio} - Periodo 1`, anio, periodo: 1 });
      } else {
        periodos.push({ label: `${anio} - Periodo 2`, anio, periodo: 2 });
        periodos.push({ label: `${anio} - Periodo 1`, anio, periodo: 1 });
      }
    }

    this.periodosAcademicos = periodos;
    const def =
      periodos.find(
        (p) => p.anio === anioDefecto && p.periodo === periodoDefecto
      ) || periodos[0];
    this.periodoSeleccionado.set(def);
    this.cargarPlanes();
  }

  private configurarBusqueda(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (p, c) => p.campo === c.campo && p.valor === c.valor
        )
      )
      .subscribe(() => this.aplicarFiltros());
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────

  cargarPlanes(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo) return;

    this.cargando.set(true);

    // Obtener todos los profesores y todos los planes en paralelo
    this.profesorService.getAll().subscribe({
      next: (profesores) => {
        this.planDeTrabajoService
          .getByPeriodoAndEstado(
            periodo.anio,
            periodo.periodo,
            'Enviado a planeacion'
          )
          .subscribe({
            next: (planes) => {
              // Cruzar profesores y planes
              const planesMap = new Map(
                planes.map((plan) => [plan.idProfesor, plan])
              );
              const resultado: ProfesorConPlan[] = profesores
                .filter((prof) => planesMap.has(prof.numIdentificacion))
                .map((prof) => {
                  const plan = planesMap.get(prof.numIdentificacion)!;
                  return {
                    numIdentificacion: prof.numIdentificacion,
                    nombres: prof.nombres,
                    apellidos: prof.apellidos,
                    programa: prof.programa,
                    facultad: prof.facultad,
                    cargo: prof.cargo,
                    dedicacion: this.determinarDedicacion(prof),
                    planDeTrabajo: plan,
                    nivelEducativo: prof.nivelEducativo,
                    escalafon: prof.escalafon,
                    vinculacion: prof.vinculacion,
                    estado: this.calcularEstado(plan).estado,
                    severityEstado: this.calcularEstado(plan).severity,
                  };
                });
              this.allData.set(resultado);
              this.aplicarFiltros();
              this.cargando.set(false);
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los planes de trabajo.',
              });
              this.cargando.set(false);
            },
          });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los profesores.',
        });
        this.cargando.set(false);
      },
    });
  }

  private async enriquecerConDatosProfesor(
    planes: PlanDeTrabajoModel[]
  ): Promise<ProfesorConPlan[]> {
    const resultado: ProfesorConPlan[] = [];
    for (const plan of planes) {
      try {
        const profesor = await this.profesorService
          .getById(plan.idProfesor)
          .toPromise();
        if (profesor) {
          resultado.push({
            numIdentificacion: profesor.numIdentificacion,
            nombres: profesor.nombres,
            apellidos: profesor.apellidos,
            programa: profesor.programa,
            facultad: profesor.facultad,
            cargo: profesor.cargo,
            dedicacion: this.determinarDedicacion(profesor),
            planDeTrabajo: plan,
            nivelEducativo: profesor.nivelEducativo,
            escalafon: profesor.escalafon,
            vinculacion: profesor.vinculacion,
            estado: this.calcularEstado(plan).estado,
            severityEstado: this.calcularEstado(plan).severity,
          });
        }
      } catch {
        // omitir si no se puede obtener el profesor
      }
    }
    return resultado;
  }

  private determinarDedicacion(
    profesor: Profesor
  ): 'TIEMPO COMPLETO' | 'MEDIO TIEMPO' {
    const d = (profesor.dedicacion || '').toUpperCase();
    const e = (profesor.escalafon || '').toUpperCase();
    if (
      d.includes('TIEMPO COMPLETO') ||
      d === 'TC' ||
      e.includes('TC') ||
      e.includes('TIEMPO COMPLETO')
    ) {
      return 'TIEMPO COMPLETO';
    }
    return 'MEDIO TIEMPO';
  }

  // ─── Filtros ──────────────────────────────────────────────────────────────

  onCambioPeriodo(periodo: PeriodoAcademico | null): void {
    if (!periodo) return;
    this.filtros.set({
      nombres: '',
      numIdentificacion: '',
      facultad: '',
      programa: '',
    });
    this.onlyNumbers.set(true);
    this.cargarPlanes();
  }

  aplicarFiltroTexto(campo: CampoFiltro, valor: string): void {
    this.filtros.update((f) => ({ ...f, [campo]: valor }));
    this.searchSubject.next({ campo, valor });
  }

  aplicarFiltroSelect(campo: 'facultad' | 'programa', valor: string): void {
    if (campo === 'facultad') {
      this.filtros.update((f) => ({ ...f, facultad: valor, programa: '' }));
    } else {
      this.filtros.update((f) => ({ ...f, programa: valor }));
    }
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    let datos = this.allData();
    const f = this.filtros();

    if (f.facultad) datos = datos.filter((p) => p.facultad === f.facultad);
    if (f.programa) datos = datos.filter((p) => p.programa === f.programa);
    if (f.nombres.trim()) {
      const b = f.nombres.toLowerCase().trim();
      datos = datos.filter(
        (p) =>
          p.nombres.toLowerCase().includes(b) ||
          p.apellidos.toLowerCase().includes(b)
      );
    }
    if (f.numIdentificacion.trim()) {
      datos = datos.filter((p) =>
        p.numIdentificacion.includes(f.numIdentificacion.trim())
      );
    }
    this.data.set(datos);
  }

  validateNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = input.value.replace(/[^0-9]/g, '');
    if (input.value !== numericValue) {
      this.onlyNumbers.set(false);
      setTimeout(() => this.onlyNumbers.set(true), 2000);
      input.value = numericValue;
    }
    this.aplicarFiltroTexto('numIdentificacion', numericValue);
  }

  limpiarFiltros(): void {
    this.filtros.set({
      nombres: '',
      numIdentificacion: '',
      facultad: '',
      programa: '',
    });
    this.onlyNumbers.set(true);
    this.aplicarFiltros();
  }

  get hayFiltrosActivos(): boolean {
    const f = this.filtros();
    return !!(f.nombres || f.numIdentificacion || f.facultad || f.programa);
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────

  onVerPlan(profesor: ProfesorConPlan): void {
    this.planTrabajoIdViewer.set(profesor.planDeTrabajo.id);
    this.profesorIdViewer.set(profesor.numIdentificacion);
    this.showPlanViewer.set(true);
  }

  onCerrarPlanViewer(): void {
    this.showPlanViewer.set(false);
    this.planTrabajoIdViewer.set('');
    this.profesorIdViewer.set('');
  }

  // ─── Envío masivo a Sistemas por Facultad ──────────────────────────────────
  showModalEnviarFacultad = signal<boolean>(false);

  planesEnviablesFacultad = computed(() => {
    const facultad = this.filtros().facultad;
    if (!facultad) return [];
    return this.allData().filter(
      (p) => p.facultad === facultad && p.estado === 'Enviado a planeación'
    );
  });

  cantidadPlanesEnviablesFacultad = computed(() => {
    return this.planesEnviablesFacultad().length;
  });

  /** Total de planes de la facultad seleccionada */
  totalPlanesFacultad = computed(() => {
    const facultad = this.filtros().facultad;
    if (!facultad) return 0;
    return this.allData().filter((p) => p.facultad === facultad).length;
  });

  /**
   * El botón solo se habilita si TODOS los planes de la facultad seleccionada
   * están en estado "Enviado a planeación".
   */
  puedeEnviarFacultadASistemas = computed(() => {
    const facultad = this.filtros().facultad;
    if (!facultad) return false;
    const profesores = this.allData().filter((p) => p.facultad === facultad);
    if (profesores.length === 0) return false;
    return profesores.every((p) => p.estado === 'Enviado a planeación');
  });

  /** Mensaje descriptivo para el tooltip cuando el botón está deshabilitado */
  motivoDeshabilitadoSistemas = computed(() => {
    const facultad = this.filtros().facultad;
    if (!facultad) {
      return 'Seleccione una facultad para enviar los planes.';
    }
    const profesores = this.allData().filter((p) => p.facultad === facultad);
    if (profesores.length === 0) {
      return 'No hay planes en la facultad seleccionada.';
    }
    const noListos = profesores.filter((p) => p.estado !== 'Enviado a planeación');
    if (noListos.length > 0) {
      return `${noListos.length} plan(es) no están en estado 'Enviado a planeación'. Todos los planes deben estar en ese estado para enviar masivamente a Sistemas.`;
    }
    return 'Todos los planes están listos para enviar a Sistemas.';
  });

  onEnviarFacultadASistemasClick(): void {
    if (!this.puedeEnviarFacultadASistemas()) return;
    this.showModalEnviarFacultad.set(true);
  }

  onCancelarEnvioFacultad(): void {
    this.showModalEnviarFacultad.set(false);
  }

  onConfirmarEnvioFacultad(): void {
    const planesAEnviar = this.planesEnviablesFacultad();
    if (planesAEnviar.length === 0) {
      this.showModalEnviarFacultad.set(false);
      return;
    }

    this.cargandoEnvioProduccion.set(true);
    let planesEnviados = 0;
    let planesConError = 0;

    planesAEnviar.forEach((profesor) => {
      const actualizacion: UpdateFirmasPlanDeTrabajo = {
        estado: 'Enviado a sistemas',
      };

      this.planDeTrabajoService
        .updateFirmas(profesor.planDeTrabajo.id, actualizacion)
        .subscribe({
          next: () => {
            planesEnviados++;
            if (planesEnviados + planesConError === planesAEnviar.length) {
              this.finalizarEnvioFacultad(planesEnviados, planesConError, planesAEnviar);
            }
          },
          error: () => {
            planesConError++;
            if (planesEnviados + planesConError === planesAEnviar.length) {
              this.finalizarEnvioFacultad(planesEnviados, planesConError, planesAEnviar);
            }
          },
        });
    });
  }

  private finalizarEnvioFacultad(
    enviados: number,
    errores: number,
    planes: ProfesorConPlan[]
  ): void {
    this.cargandoEnvioProduccion.set(false);
    this.showModalEnviarFacultad.set(false);

    if (enviados > 0) {
      this.enviarNotificacionSistemas(enviados, planes[0]);
    }

    if (errores === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Envío Exitoso',
        detail: `Se enviaron ${enviados} plan(es) de trabajo de la facultad ${this.filtros().facultad} a sistemas correctamente`,
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Envío Parcial',
        detail: `Se enviaron ${enviados} plan(es). ${errores} tuvieron errores.`,
      });
    }

    this.cargarPlanes();
  }



  // ─── Notificación a Sistemas ──────────────────────────────────────────────
  private enviarNotificacionSistemas(
    cantidadPlanes: number,
    profesorReferencia: ProfesorConPlan
  ): void {
    const primerPlan = profesorReferencia.planDeTrabajo;
    if (!primerPlan) return;

    this.notificacionesService
      .notificarEnvioSistemas({
        emailDecano: 'planeacion@universidad.edu.co', // O un identificador de planeación
        nombreDecano: 'Oficina de Planeación',
        programa: profesorReferencia.programa,
        periodo: primerPlan.periodo,
        anio: primerPlan.anio,
        cantidadPlanes: cantidadPlanes,
      })
      .subscribe({
        error: (err) => {
          console.error('Error al notificar a sistemas:', err);
        },
      });
  }



      calcularEstado(plan: PlanDeTrabajoModel | null | undefined): {
    estado: string;
    severity: 'success' | 'info' | 'warn' | 'danger';
  } {
    if (!plan) {
      return { estado: 'Sin plan', severity: 'danger' };
    }

    if (plan.estado === 'Enviado a Vicerrectoría') {
      return { estado: 'Enviado a Vicerrectoría', severity: 'info' };
    }

    if (plan.estado === 'Solicitud enviada a Vicerrectoría') {
      return { estado: 'Solicitud enviada a Vicerrectoría', severity: 'info' };
    }

    if (plan.estado === 'Enviado a planeacion') {
      return { estado: 'Enviado a planeación', severity: 'success' };
    }

    if (plan.estado === 'Observaciones de Vicerrectoría') {
      return { estado: 'Observaciones de Vicerrectoría', severity: 'warn' };
    }

    if (plan.rechazado === true) {
      if (plan.estado === 'RECHAZADO') {
        return { estado: 'Rechazado por Profesor', severity: 'danger' };
      } else if (plan.estado === 'Rechazado por Decanatura' || !plan.firmaDecano) {
        return { estado: 'Rechazado por Decanatura', severity: 'danger' };
      } else if (!plan.firmaDirector) {
        return { estado: 'Rechazado por Director', severity: 'danger' };
      } else {
        return { estado: 'Rechazado', severity: 'danger' };
      }
    }

    const { enviadoProfesor, firmaProfesor, firmaDirector, firmaDecano } = plan;
    if (enviadoProfesor && firmaProfesor && firmaDirector && firmaDecano) {
      return { estado: 'Aprobado por Decanatura', severity: 'success' };
    }

    if (plan.estado === 'REVISADO') {
      return { estado: 'Revisado', severity: 'info' };
    }

    if (enviadoProfesor && firmaProfesor && firmaDirector && !firmaDecano) {
      return {
        estado: 'Esperando aprobación de decanatura',
        severity: 'warn',
      };
    }
    if (enviadoProfesor && firmaProfesor && !firmaDirector) {
      return { estado: 'Esperando aprobación de director', severity: 'info' };
    }
    if (enviadoProfesor && !firmaProfesor) {
      return { estado: 'Esperando aprobación profesor', severity: 'info' };
    }
    return { estado: 'Sin enviar', severity: 'warn' };
  }



  // ─── Descarga de PDF ──────────────────────────────────────────────────────
  async onDescargarPT(profesor: ProfesorConPlan): Promise<void> {
    const periodo = this.periodoSeleccionado();
    if (!periodo) return;

    let decano = { nombres: '', apellidos: '', facultad: profesor.facultad };
    try {
      const d = await this.profesorService
        .getDecanoByFacultad(profesor.facultad)
        .toPromise();
      if (d)
        decano = {
          nombres: d.nombres,
          apellidos: d.apellidos,
          facultad: d.facultad,
        };
    } catch {}

    const contexto = {
      periodo: { anio: periodo.anio, periodo: periodo.periodo },
      decano,
    };

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Generando PT',
        detail: `Generando PDF de ${profesor.nombres} ${profesor.apellidos}...`,
        life: 3000,
      });
      await this.planTrabajoDescargarService.descargarPTIndividual(
        profesor,
        contexto
      );
      this.messageService.add({
        severity: 'success',
        summary: 'PT Descargado',
        detail: `Se descargó el PT de ${profesor.nombres} ${profesor.apellidos}`,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo generar el PT.',
      });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  getEstadoSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (estado) {
      case 'Enviado a sistemas':
        return 'success';
      case 'Enviado a Planeación':
        return 'info';
      case 'Aprobado por Planeación':
        return 'info';
      default:
        return 'warn';
    }
  }

  get totalPlanes(): number {
    return this.allData().length;
  }

  get planesMostrados(): number {
    return this.data().length;
  }

  get mensajeTablaVacia(): string {
    if (!this.periodoSeleccionado())
      return 'Seleccione un periodo académico para ver los planes.';
    if (this.hayFiltrosActivos)
      return 'No se encontraron resultados con los filtros aplicados.';
    return 'No hay planes de trabajo enviados a Planeación para este periodo.';
  }

}
