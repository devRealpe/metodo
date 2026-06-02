import {
  Component,
  OnInit,
  signal,
  computed,
  OnDestroy,
  inject,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import {
  PdfExportService,
  ProfesorData,
  PlanDeTrabajoCompleto,
} from '../../../core/services/pdf-export.service';
import {
  PlanDeTrabajoModel,
  UpdateFirmasPlanDeTrabajo,
} from '../../../core/models/planDeTrabajo.model';
import { Profesor } from '../../../core/models/profesor.model';
import { ProfesorService } from '../../../core/services/profesor.service';
import { PlanDeTrabajoService } from '../../../core/services/planDeTrabajo.service';
import { FirmaService } from '../../../core/services/firma.service';
import { ModalConfirmacionComponent } from '../modales/modal-confirmacion/modal-confirmacion';
import { ModalRechazarPtComponent } from '../modales/modal-rechazar-pt/modal-rechazar-pt.component';
import { PlanTrabajoViewerComponent } from '../modales/plan-trabajo-viewer/plan-trabajo-viewer.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SeccionService } from '../../../core/services/seccion.service';
import { ActividadesPlanDeTrabajoService } from '../../../core/services/actividadesPlanDeTrabajo.service';
import { CursoService } from '../../../core/services/curso.service';
import { InvestigacioneService } from '../../../core/services/investigaciones.service';
import {
  SeccionPadreData,
  SeccionHijoData,
  ResumenProfesor,
} from '../../../core/services/pdf-export.service';
import { NovedadService } from '../../../core/services/novedad.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { PlanTrabajoDescargarService } from '../../../core/services/plan-trabajo-descargar.service';
import { CreateAuditoria } from '../../../core/models/auditoria.model';
import { AuthService } from '@microfrontends/shared-services';
import { ActivatedRoute } from '@angular/router';
import { NotificacionesPlanTrabajoService } from '../../../core/services/notificaciones-plan-trabajo.service';
import { PlanTrabajoRealtimeService } from '../../../core/services/plan-trabajo-realtime.service';

type CampoFiltro = 'programa' | 'nombres' | 'numIdentificacion';

interface ProfesorConPlan extends Omit<Profesor, 'dedicacion'> {
  planDeTrabajo: PlanDeTrabajoModel | null;
  estado: string;
  severityEstado?: 'success' | 'info' | 'warn' | 'danger';
  id: string;
  documento: string;
  rol: string;
  dedicacion: 'TIEMPO COMPLETO' | 'MEDIO TIEMPO';
}

interface PeriodoAcademico {
  label: string;
  anio: number;
  periodo: number;
}

@Component({
  selector: 'app-decano-home',
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    TableModule,
    TagModule,
    AvatarModule,
    TooltipModule,
    ProgressSpinnerModule,
    InputTextModule,
    DialogModule,
    InputComponent,
    SelectComponent,
    ModalConfirmacionComponent,
    ModalRechazarPtComponent,
    PlanTrabajoViewerComponent,
    SelectModule,
  ],
  providers: [MessageService],
  templateUrl: './decano_home.html',
  styleUrl: './decano_home.scss',
})
export class DecanoHome implements OnInit, OnDestroy {
  private readonly novedadesService = inject(NovedadService);

  profesorDecano = signal<Profesor | null>(null);

  data = signal<ProfesorConPlan[]>([]);
  allData = signal<ProfesorConPlan[]>([]);
  todosLosProfesoresFacultad = signal<ProfesorConPlan[]>([]);
  cargando = signal<boolean>(false);
  cargandoFiltros = signal<boolean>(false);
  novedadesSeleccionadas: any = null;
  displayModalNovedades = signal<boolean>(false);
  cargandoNovedades = signal<boolean>(false);
  mostrarModalMotivo = false;
  profesorMotivoRechazo: ProfesorConPlan | null = null;
  periodosAcademicos: PeriodoAcademico[] = [];
  periodoSeleccionado = signal<PeriodoAcademico | null>(null);
  mostrarDropdownPeriodo = signal<boolean>(false);

  filtros = signal<{
    programa: string;
    nombres: string;
    numIdentificacion: string;
  }>({
    programa: '',
    nombres: '',
    numIdentificacion: '',
  });

  private searchSubject = new Subject<{ campo: CampoFiltro; valor: string }>();
  private searchSubscription?: Subscription;

  fotoPerfilUrl: string | null = null;
  profesorSeleccionado: ProfesorConPlan | null = null;
  showModalConfirmacion = false;
  showPlanViewer = false;
  planTrabajoIdViewer: string = '';
  profesorIdViewer: string = '';
  showModalEnviarPlaneacion = false;
  cargandoEnvioPlaneacion = false;
  showModalEnviarVicerrectoria = false;
  cargandoEnvioVicerrectoria = false;
  mostrarModalObservacionesVicerrectoria = false;
  observacionesVicerrectoria = '';
  profesorSeleccionadoParaObservaciones: ProfesorConPlan | null = null;
  cargandoAprobacion = false;

  // Propiedades para el modo edición
  showPlanViewerEdicion = false;
  planTrabajoIdEdicion: string = '';
  profesorIdEdicion: string = '';

  totalHoras = 40;
  porcentajeAsignado = 100;

  opcionesProgramas = computed(() => {
    const programas = this.allData().map((p) => p.programa);
    const programasUnicos = [...new Set(programas)].sort();
    return programasUnicos.map((p) => ({ label: p, value: p }));
  });

  profesoresPendientes = computed(() => {
    return this.data().filter(
      (profesor) =>
        profesor.estado === 'Esperando aprobación de decanatura' ||
        profesor.estado === 'Revisado'
    );
  });

  profesoresAprobadosDecanatura = computed(() => {
    return this.data().filter(
      (profesor) =>
        profesor.estado === 'Aprobado por Decanatura' &&
        profesor.planDeTrabajo?.estado !== 'Enviado a sistemas'
    );
  });

  profesoresConObservaciones = computed(() => {
    return this.data().filter(
      (p) => p.estado === 'Observaciones de Vicerrectoría'
    );
  });

  profesoresAprobadosYEnviados = computed(() => {
    return this.data().filter(
      (profesor) =>
        profesor.estado === 'Aprobado por Decanatura' ||
        profesor.planDeTrabajo?.estado === 'Enviado a sistemas'
    );
  });

  profesoresRechazados = computed(() => {
    return this.data().filter(
      (profesor) =>
        profesor.estado?.toLowerCase().includes('rechazado') ||
        profesor.planDeTrabajo?.rechazado === true
    );
  });

  constructor(
    private messageService: MessageService,
    private pdfExportService: PdfExportService,
    private firmaService: FirmaService,
    private profesorService: ProfesorService,
    private planDeTrabajoService: PlanDeTrabajoService,
    private seccionService: SeccionService,
    private actividadesPlanDeTrabajoService: ActividadesPlanDeTrabajoService,
    private cursoService: CursoService,
    private investigacionService: InvestigacioneService,
    private auditoriaService: AuditoriaService,
    private planTrabajoDescargarService: PlanTrabajoDescargarService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private notificacionesService: NotificacionesPlanTrabajoService,
    private realtimeService: PlanTrabajoRealtimeService
  ) {
    // ⚡ Effect para detectar cambios en tiempo real
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();

      if (trigger > 0) {
        // Usar untracked() para leer signals sin crear dependencias reactivas
        untracked(() => {
          const decano = this.profesorDecano();
          if (!decano) return;

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

          this.cargarDatos(); // Recargar toda la lista de profesores
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarDecanoSegunRol();
    this.configurarBusqueda();
    this.generarPeriodosAcademicos();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  private getDecanoIdFromAuth(): string | null {
    const authUser = this.authService.getCurrentUser();
    return authUser?.username || null; // preferred_username del token
  }

  private cargarDecanoSegunRol(): void {
    const roles = this.authService.getUserRoles();
    const esAdmin = roles.includes('ADMIN');
    const idFromUrl = this.route.snapshot.queryParamMap.get('id');

    if (esAdmin) {
      if (idFromUrl) {
        this.cargarDecanoPorId(idFromUrl);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin selección',
          detail: 'Seleccione un decano desde el panel de administración.',
        });
      }
    } else {
      const authUser = this.authService.getCurrentUser();
      if (authUser?.username) {
        this.cargarDecanoPorId(authUser.username);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo identificar al decano.',
        });
      }
    }
  }

  private cargarDecanoPorId(id: string): void {
    this.cargando.set(true);
    this.profesorService.getById(id).subscribe({
      next: (decano) => {
        if (decano && decano.cargo === 'DECANO (A)') {
          this.profesorDecano.set(decano);
          this.cargarProfesoresFacultad(decano.facultad);
        } else {
          this.cargando.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Acceso inválido',
            detail: 'El usuario no tiene el cargo de Decano (A).',
          });
        }
      },
      error: (error) => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información del decano.',
        });
      },
    });
  }

  private configurarBusqueda(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, curr) => prev.campo === curr.campo && prev.valor === curr.valor
        )
      )
      .subscribe({
        next: ({ campo, valor }) => {
          this.cargandoFiltros.set(true);
          // Usar setTimeout para permitir que el UI se actualice
          setTimeout(() => {
            this.aplicarFiltros();
            this.cargandoFiltros.set(false);
          }, 50);
        },
      });
  }

  async cargarDatos(): Promise<void> {
    const decanoId = this.getDecanoIdFromAuth();
    if (!decanoId) {
      this.cargando.set(false);
      this.messageService.add({
        severity: 'error',
        summary: 'Acceso denegado',
        detail: 'No se pudo identificar al decano. Inicie sesión nuevamente.',
      });
      return;
    }

    try {
      this.cargando.set(true);
      this.profesorService.getById(decanoId).subscribe({
        next: (decano) => {
          if (decano && decano.cargo === 'DECANO (A)') {
            this.profesorDecano.set(decano);
            this.cargarProfesoresFacultad(decano.facultad);
          } else {
            this.cargando.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Acceso inválido',
              detail: 'El usuario no tiene el cargo de Decano en el sistema.',
            });
          }
        },
        error: (error) => {
          this.cargando.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la información del decano',
          });
        },
      });
    } catch (error) {
      this.cargando.set(false);
    }
  }

  generarPeriodosAcademicos(): void {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    const ANIO_MINIMO = 2026;

    let anioDefecto = anioActual;
    let periodoDefecto: 1 | 2 = mes <= 6 ? 1 : 2;

    if (mes >= 5 && mes <= 6) {
      periodoDefecto = 2;
    } else if (mes >= 11) {
      periodoDefecto = 1;
      anioDefecto = anioActual + 1;
    }
    const periodos: { label: string; anio: number; periodo: number }[] = [];

    for (let anio = anioDefecto; anio >= ANIO_MINIMO; anio--) {
      if (anio === anioDefecto) {
        if (periodoDefecto === 2) {
          periodos.push({ label: `${anio} - Periodo 2`, anio, periodo: 2 });
        }
        periodos.push({ label: `${anio} - Periodo 1`, anio, periodo: 1 });
      } else {
        periodos.push({ label: `${anio} - Periodo 2`, anio, periodo: 2 });
        periodos.push({ label: `${anio} - Periodo 1`, anio, periodo: 1 });
      }
    }

    const periodoDefault =
      periodos.find(
        (p) => p.anio === anioDefecto && p.periodo === periodoDefecto
      ) || periodos[0];

    this.periodosAcademicos = periodos;
    this.periodoSeleccionado.set(periodoDefault);
  }

  onCambioPeriodo(periodo: PeriodoAcademico): void {
    this.periodoSeleccionado.set(periodo);
    this.mostrarDropdownPeriodo.set(false);

    const decano = this.profesorDecano();
    if (decano) {
      this.cargando.set(true);
      this.cargarProfesoresFacultad(decano.facultad);
    }
  }

  toggleDropdownPeriodo(): void {
    this.mostrarDropdownPeriodo.update((valor) => !valor);
  }

  cerrarDropdownPeriodo(): void {
    this.mostrarDropdownPeriodo.set(false);
  }

  get periodoSeleccionadoLabel(): string {
    const periodo = this.periodoSeleccionado();
    return periodo ? periodo.label : 'Seleccione un periodo';
  }

  cargarProfesoresFacultad(facultad: string): void {
    this.profesorService.getByFacultad(facultad).subscribe({
      next: async (profesores) => {
        const profesoresConPlan =
          await this.cargarPlanesDeTrabajoParaProfesores(profesores);
        const profesoresConPlanAprobadoPorDirectorORechazados =
          profesoresConPlan.filter(
            (p) =>
              p.planDeTrabajo?.firmaDirector ||
              p.planDeTrabajo?.estado === 'Rechazado por Decanatura'
          );
        this.todosLosProfesoresFacultad.set(profesoresConPlan);
        this.allData.set(profesoresConPlanAprobadoPorDirectorORechazados);
        // No mostrar datos hasta que se seleccione un programa
        this.data.set([]);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar profesores de la facultad',
        });
      },
    });
  }

  async cargarPlanesDeTrabajoParaProfesores(
    profesores: Profesor[]
  ): Promise<ProfesorConPlan[]> {
    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      return profesores.map((profesor) => ({
        ...profesor,
        id: profesor.numIdentificacion,
        documento: profesor.numIdentificacion,
        rol: profesor.cargo === 'DIRECTOR DE PROGRAMA' ? 'Dir' : 'Prof',
        dedicacion: this.determinarDedicacion(profesor),
        planDeTrabajo: null,
        estado: 'Sin periodo seleccionado',
        severityEstado: 'danger',
      }));
    }

    const profesoresIds = profesores.map((p) => p.numIdentificacion);
    try {
      const planes: PlanDeTrabajoModel[] = (await this.planDeTrabajoService
        .getBatchPlanes(profesoresIds, periodo.anio, periodo.periodo)
        .toPromise()) || [];
      return profesores.map((profesor) => {
        const plan = planes.find((p: PlanDeTrabajoModel) => p.idProfesor === profesor.numIdentificacion);
        const dedicacion: 'TIEMPO COMPLETO' | 'MEDIO TIEMPO' = this.determinarDedicacion(profesor);
        if (plan) {
          const estadoInfo = this.calcularEstado(plan);
          return {
            ...profesor,
            id: profesor.numIdentificacion,
            documento: profesor.numIdentificacion,
            rol: profesor.cargo === 'DIRECTOR DE PROGRAMA' ? 'Dir' : 'Prof',
            dedicacion: dedicacion,
            planDeTrabajo: plan,
            estado: estadoInfo.estado,
            severityEstado: estadoInfo.severity,
          };
        } else {
          return {
            ...profesor,
            id: profesor.numIdentificacion,
            documento: profesor.numIdentificacion,
            rol: profesor.cargo === 'DIRECTOR DE PROGRAMA' ? 'Dir' : 'Prof',
            dedicacion: dedicacion,
            planDeTrabajo: null,
            estado: 'Sin plan',
            severityEstado: 'danger',
          };
        }
      });
    } catch (error) {
      return profesores.map((profesor) => ({
        ...profesor,
        id: profesor.numIdentificacion,
        documento: profesor.numIdentificacion,
        rol: profesor.cargo === 'DIRECTOR DE PROGRAMA' ? 'Dir' : 'Prof',
        dedicacion: this.determinarDedicacion(profesor),
        planDeTrabajo: null,
        estado: 'Sin plan',
        severityEstado: 'danger',
      }));
    }
  }

  cargarNovedades(planId: string): void {
    this.cargandoNovedades.set(true);
    this.novedadesService.getByPlanDeTrabajo(planId).subscribe({
      next: (novedades) => {
        if (Array.isArray(novedades) && novedades.length > 0) {
          const novedad = novedades.reduce((latest, current) =>
            new Date(current.fechaRegistro).getTime() >
            new Date(latest.fechaRegistro).getTime()
              ? current
              : latest
          );

          this.profesorService.getByCodigo(novedad.registradoPor).subscribe({
            next: (prof) => {
              this.novedadesSeleccionadas = {
                ...novedad,
                profesorReportante: prof || {
                  nombres: 'Desconocido',
                  apellidos: '',
                  cargo: '',
                  facultad: '',
                  programa: '',
                },
              };
              this.displayModalNovedades.set(true);
              this.cargandoNovedades.set(false);
            },
            error: () => {
              this.novedadesSeleccionadas = {
                ...novedad,
                profesorReportante: {
                  nombres: 'Desconocido',
                  apellidos: '',
                },
              };
              this.displayModalNovedades.set(true);
              this.cargandoNovedades.set(false);
            },
          });
        } else {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin novedades',
            detail: 'No hay novedades registradas para este plan de trabajo',
          });
          this.cargandoNovedades.set(false);
        }
      },
      error: () => {
        this.cargandoNovedades.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las novedades',
        });
      },
    });
  }

  onVerNovedades(profesor: ProfesorConPlan): void {
    if (profesor.planDeTrabajo) {
      this.cargarNovedades(profesor.planDeTrabajo.id);
    }
  }

  cerrarModalNovedades(): void {
    this.displayModalNovedades.set(false);
    this.novedadesSeleccionadas = null;
  }

  mostrarObservacionesVicerrectoria(profesor: ProfesorConPlan): void {
    this.profesorSeleccionadoParaObservaciones = profesor;
    const motivo = profesor.planDeTrabajo?.motivoRechazo || '';
    this.observacionesVicerrectoria = motivo.trim() === '' ? '' : motivo.trim();
    this.mostrarModalObservacionesVicerrectoria = true;
  }

  cerrarModalObservacionesVicerrectoria(): void {
    this.mostrarModalObservacionesVicerrectoria = false;
    this.observacionesVicerrectoria = '';
    this.profesorSeleccionadoParaObservaciones = null;
  }

  aprobarPlanConObservaciones(): void {
    if (!this.profesorSeleccionadoParaObservaciones?.planDeTrabajo) return;

    const planId = this.profesorSeleccionadoParaObservaciones.planDeTrabajo.id;
    this.planDeTrabajoService
      .updateFirmas(planId, {
        estado: 'Aprobado por Decanatura',
        firmaDecano: true,
        motivoRechazo: '',
      })
      .subscribe({
        next: () => {
          this.auditoriaService
            .create({
              idPt: planId,
              tipoCambio: 'Aprobado tras observaciones',
              accion: `Aprobado por Decano ${this.nombreDecano} tras revisión de observaciones de Vicerrectoría`,
            })
            .subscribe();

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Plan aprobado exitosamente',
          });

          this.cerrarModalObservacionesVicerrectoria();
          const facultad = this.profesorDecano()?.facultad || '';
          this.cargarProfesoresFacultad(facultad);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo aprobar el plan',
          });
        },
      });
  }

  rechazarPlanConObservaciones(): void {
    if (!this.profesorSeleccionadoParaObservaciones?.planDeTrabajo) return;

    const planId = this.profesorSeleccionadoParaObservaciones.planDeTrabajo.id;
    const tieneObservaciones = this.observacionesVicerrectoria?.trim() !== '';

    if (tieneObservaciones) {
      this.firmaService
        .rechazarPlanDeTrabajo(planId, this.observacionesVicerrectoria)
        .subscribe({
          next: () => {
            this.auditoriaService
              .create({
                idPt: planId,
                tipoCambio: 'Rechazado tras observaciones',
                accion: `Rechazado por Decano ${this.nombreDecano} tras revisión de observaciones de Vicerrectoría`,
              })
              .subscribe();
            this.messageService.add({
              severity: 'warn',
              summary: 'Plan Rechazado',
              detail: 'El plan ha sido rechazado por el decano',
            });
            this.cerrarModalObservacionesVicerrectoria();
            this.cargarProfesoresFacultad(
              this.profesorDecano()?.facultad || ''
            );
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo rechazar el plan',
            });
          },
        });
    } else {
      this.cerrarModalObservacionesVicerrectoria();
    }
  }

  private determinarDedicacion(
    profesor: Profesor
  ): 'TIEMPO COMPLETO' | 'MEDIO TIEMPO' {
    if (profesor.dedicacion) {
      const dedicacionUpper = profesor.dedicacion.toUpperCase();
      if (
        dedicacionUpper.includes('TIEMPO COMPLETO') ||
        dedicacionUpper === 'TC'
      ) {
        return 'TIEMPO COMPLETO';
      }
    }

    if (profesor.escalafon) {
      const escalafonUpper = profesor.escalafon.toUpperCase();
      if (
        escalafonUpper.includes('TC') ||
        escalafonUpper.includes('TIEMPO COMPLETO')
      ) {
        return 'TIEMPO COMPLETO';
      }
    }

    return 'MEDIO TIEMPO';
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
      } else if (
        plan.estado === 'Rechazado por Decanatura' ||
        !plan.firmaDecano
      ) {
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

  aplicarFiltroTexto(campo: CampoFiltro, valor: string): void {
    // Actualizar filtros inmediatamente
    this.filtros.update((f) => ({ ...f, [campo]: valor }));

    // Para el campo programa, aplicar filtro inmediatamente sin debounce y actualizar la base de profesores
    if (campo === 'programa') {
      this.cargandoFiltros.set(true);
      this.actualizarProfesoresBasePrograma();
      setTimeout(() => {
        this.aplicarFiltros();
        this.cargandoFiltros.set(false);
      }, 50);
    } else {
      // Para otros campos, usar debounce
      setTimeout(() => {
        this.searchSubject.next({ campo, valor });
      }, 0);
    }
  }

  private aplicarFiltros(): void {
    const filtrosActuales = this.filtros();

    // Si no hay programa seleccionado, no mostrar datos
    if (!filtrosActuales.programa) {
      this.data.set([]);
      return;
    }

    let datos = this.allData();

    // Filtrar por programa
    datos = datos.filter((p) => p.programa === filtrosActuales.programa);

    // Filtrar por nombres
    if (filtrosActuales.nombres.trim()) {
      const nombreBusqueda = filtrosActuales.nombres.toLowerCase().trim();
      datos = datos.filter(
        (p) =>
          p.nombres.toLowerCase().includes(nombreBusqueda) ||
          p.apellidos.toLowerCase().includes(nombreBusqueda)
      );
    }

    // Filtrar por identificación
    if (filtrosActuales.numIdentificacion.trim()) {
      const cedulaBusqueda = filtrosActuales.numIdentificacion.trim();
      datos = datos.filter((p) => p.documento.includes(cedulaBusqueda));
    }

    this.data.set(datos);
  }

  readonly onlyNumbers = signal<boolean>(true);

  validateNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, '');

    if (value !== numericValue) {
      this.onlyNumbers.set(false);
      setTimeout(() => {
        this.onlyNumbers.set(true);
      }, 2000);
      input.value = numericValue;
    }

    this.aplicarFiltroTexto('numIdentificacion', numericValue);
  }

  limpiarFiltros(): void {
    this.cargandoFiltros.set(true);
    this.filtros.set({
      programa: '',
      nombres: '',
      numIdentificacion: '',
    });
    this.onlyNumbers.set(true);
    this.profesorSeleccionado = null;
    // Usar setTimeout para asegurar que los filtros se actualicen primero
    setTimeout(() => {
      this.aplicarFiltros();
      this.cargandoFiltros.set(false);
    }, 50);
  }

  seleccionarProfesor(profesor: ProfesorConPlan): void {
    if (
      this.profesorSeleccionado?.numIdentificacion ===
      profesor.numIdentificacion
    ) {
      this.profesorSeleccionado = null;
    } else {
      this.profesorSeleccionado = profesor;
    }
  }

  onVerDetalles(profesor: ProfesorConPlan): void {
    if (!profesor.planDeTrabajo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin plan de trabajo',
        detail: `${profesor.nombres} ${profesor.apellidos} no tiene un plan de trabajo asignado`,
      });
      return;
    }
    this.planTrabajoIdViewer = profesor.planDeTrabajo.id;
    this.profesorIdViewer = profesor.numIdentificacion;
    this.showPlanViewer = true;
  }

  onEstadoPlanCambiado(nuevoEstado: string): void {
    // Determinar cuál modal está abierto basándose en el estado visible
    const profesorId = this.showPlanViewerEdicion ? this.profesorIdEdicion : this.profesorIdViewer;
    
    if (profesorId) {
      const data = this.data();
      const index = data.findIndex(
        (p) => p.numIdentificacion === profesorId
      );

      if (index !== -1) {
        // Create a copy of the professor object
        const updatedProfesor: ProfesorConPlan = { ...data[index] };
        const estadoNormalizado = (nuevoEstado || '').trim().toLowerCase();

        // Update status and severity
        updatedProfesor.estado = nuevoEstado;
        updatedProfesor.severityEstado = this.getEstadoSeverity(
          nuevoEstado
        ) as any;

        // Update planDeTrabajo internal state if it exists
        if (updatedProfesor.planDeTrabajo) {
          const planActualizado = {
            ...updatedProfesor.planDeTrabajo,
            estado: nuevoEstado,
          };

          // Mantener sincronizadas las banderas locales para que los computed
          // (por ejemplo, puedeEnviarAVicerrectoria) reaccionen sin recargar.
          if (estadoNormalizado === 'aprobado por decanatura') {
            planActualizado.firmaDecano = true;
            planActualizado.rechazado = false;
            planActualizado.motivoRechazo = '';
          } else if (estadoNormalizado === 'rechazado por decanatura') {
            planActualizado.firmaDecano = false;
            planActualizado.rechazado = true;
          }

          updatedProfesor.planDeTrabajo = planActualizado;
        }

        // Update signals
        const newData = [...data];
        newData[index] = updatedProfesor;
        this.data.set(newData);

        // Also update allData to ensure consistency
        const allData = this.allData();
        const allIndex = allData.findIndex(
          (p) => p.numIdentificacion === profesorId
        );
        if (allIndex !== -1) {
          const newAllData = [...allData];
          newAllData[allIndex] = updatedProfesor;
          this.allData.set(newAllData);
        }

        // Update todosLosProfesoresFacultad for massive send validation
        const todosProfs = this.todosLosProfesoresFacultad();
        const todosIndex = todosProfs.findIndex(
          (p) => p.numIdentificacion === profesorId
        );
        if (todosIndex !== -1) {
          const newTodos = [...todosProfs];
          newTodos[todosIndex] = updatedProfesor;
          this.todosLosProfesoresFacultad.set(newTodos);
        }

        if (
          this.profesorSeleccionado?.numIdentificacion ===
          updatedProfesor.numIdentificacion
        ) {
          this.profesorSeleccionado = { ...updatedProfesor };
        }
      }
    }
  }

  onCerrarPlanViewer(): void {
    this.showPlanViewer = false;
    this.planTrabajoIdViewer = '';
    this.profesorIdViewer = '';
  }

  puedeAprobar = computed(() => {
    // Debe haber un programa seleccionado
    const programaSeleccionado = this.filtros().programa;
    if (!programaSeleccionado) return false;

    // Debe haber al menos un plan pendiente en la tabla filtrada
    const pendientes = this.data().filter(
      (profesor) =>
        (profesor.estado === 'Esperando aprobación de decanatura' || profesor.estado === 'Revisado') &&
        profesor.programa === programaSeleccionado
    );
    return pendientes.length > 0;
  });

  getEstadoSeverity(
    estado: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const estadoLower = estado?.toLowerCase() || '';

    if (estadoLower.includes('aprobado')) {
      return 'success';
    }
    if (estadoLower.includes('esperando') || estadoLower === 'pendiente') {
      return 'warn';
    }
    if (estadoLower === 'rechazado') {
      return 'danger';
    }
    return 'info';
  }

  onAprobarClick(): void {
    this.showModalConfirmacionAprobarTodos = true;
  }

  onConfirmarAprobarTodos(): void {
    const pendientes = this.profesoresPendientes();
    if (pendientes.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin planes pendientes',
        detail: 'No hay planes pendientes para aprobar.',
      });
      this.showModalConfirmacionAprobarTodos = false;
      return;
    }
    this.cargandoAprobacion = true;
    let aprobados = 0;
    let errores = 0;
    const dataActual = [...this.data()];
    const allDataActual = [...this.allData()];
    const todosProfsActual = [...this.todosLosProfesoresFacultad()];

    pendientes.forEach((profesor) => {
      if (!profesor.planDeTrabajo) {
        errores++;
        if (aprobados + errores === pendientes.length) this.finalizarAprobacionTodos(aprobados, errores);
        return;
      }
      this.planDeTrabajoService
        .updateFirmas(profesor.planDeTrabajo.id, {
          estado: 'Aprobado por Decanatura',
          firmaDecano: true,
          motivoRechazo: '',
        })
        .subscribe({
          next: () => {
            aprobados++;
            // Actualizar estado localmente en data y allData
            const updateProfesor = (arr: ProfesorConPlan[]) => {
              const idx = arr.findIndex(p => p.numIdentificacion === profesor.numIdentificacion);
              if (idx !== -1) {
                const updated = { ...arr[idx] };
                updated.estado = 'Aprobado por Decanatura';
                updated.severityEstado = this.getEstadoSeverity('Aprobado por Decanatura') as any;
                if (updated.planDeTrabajo) {
                  updated.planDeTrabajo = {
                    ...updated.planDeTrabajo,
                    estado: 'Aprobado por Decanatura',
                    firmaDecano: true,
                    rechazado: false,
                    motivoRechazo: ''
                  };
                }
                arr[idx] = updated;
              }
            };
            updateProfesor(dataActual);
            updateProfesor(allDataActual);
            updateProfesor(todosProfsActual);

            this.auditoriaService.create({
              idPt: profesor.planDeTrabajo!.id,
              tipoCambio: 'Aprobado masivo',
              accion: `Aprobado por Decano ${this.nombreDecano} (masivo)`
            }).subscribe();
            if (aprobados + errores === pendientes.length) {
              // Actualizar signals antes de finalizar
              this.data.set(dataActual);
              this.allData.set(allDataActual);
              this.todosLosProfesoresFacultad.set(todosProfsActual);
              this.finalizarAprobacionTodos(aprobados, errores);
            }
          },
          error: () => {
            errores++;
            if (aprobados + errores === pendientes.length) {
              this.data.set(dataActual);
              this.allData.set(allDataActual);
              this.todosLosProfesoresFacultad.set(todosProfsActual);
              this.finalizarAprobacionTodos(aprobados, errores);
            }
          }
        });
    });
  }

  onCancelarAprobarTodos(): void {
    this.showModalConfirmacionAprobarTodos = false;
  }

  private finalizarAprobacionTodos(aprobados: number, errores: number): void {
    this.cargandoAprobacion = false;
    this.showModalConfirmacionAprobarTodos = false;
    if (errores === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Aprobación exitosa',
        detail: `Se aprobaron ${aprobados} planes de trabajo.`
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aprobación parcial',
        detail: `Se aprobaron ${aprobados} planes. ${errores} tuvieron errores.`
      });
    }
    // Ya no recargar toda la data, solo actualizar signals (hecho en onConfirmarAprobarTodos)
  }
  showModalConfirmacionAprobarTodos = false;

  get mensajeTablaVacia(): string {
    const filtrosActuales = this.filtros();

    // Si no hay programa seleccionado
    if (!filtrosActuales.programa) {
      return 'Selecciona un programa para ver los planes de trabajo';
    }

    // Si hay filtros aplicados pero no hay resultados
    if (filtrosActuales.nombres || filtrosActuales.numIdentificacion) {
      return 'No se encontraron resultados con los filtros aplicados';
    }

    return 'No hay planes de trabajo para mostrar';
  }

  async onExportarPTClick(): Promise<void> {
    const profesores = this.profesoresAprobadosYEnviados();
    if (profesores.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin PTs',
        detail: 'No hay planes aprobados',
      });
      return;
    }

    const periodo = this.periodoSeleccionado();
    const decano = this.profesorDecano();
    if (!periodo || !decano) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Faltan datos de contexto',
      });
      return;
    }

    const contexto = {
      periodo: { anio: periodo.anio, periodo: periodo.periodo },
      decano: {
        nombres: decano.nombres,
        apellidos: decano.apellidos,
        facultad: decano.facultad,
      },
    };

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Generando PDF',
        detail: `Generando consolidado con ${profesores.length} planes...`,
        life: 3000,
      });

      await this.planTrabajoDescargarService.exportarPTConsolidado(
        profesores,
        contexto
      );

      this.messageService.add({
        severity: 'success',
        summary: 'PDF generado',
        detail: `Se descargó el consolidado con ${profesores.length} planes de trabajo`,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al generar PDF',
        detail: error.message || 'Ocurrió un error. Inténtelo de nuevo.',
      });
    }
  }

  async onExportarZIPClick(): Promise<void> {
    const profesores = this.profesoresAprobadosYEnviados();
    if (profesores.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin PTs',
        detail: 'No hay planes aprobados',
      });
      return;
    }

    const periodo = this.periodoSeleccionado();
    const decano = this.profesorDecano();
    if (!periodo || !decano) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Faltan datos de contexto',
      });
      return;
    }

    const contexto = {
      periodo: { anio: periodo.anio, periodo: periodo.periodo },
      decano: {
        nombres: decano.nombres,
        apellidos: decano.apellidos,
        facultad: decano.facultad,
      },
    };

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Generando ZIP',
        detail: `Generando ZIP con ${profesores.length} planes... Esto puede tardar unos momentos.`,
        life: 3000,
      });

      await this.planTrabajoDescargarService.exportarZIP(profesores, contexto);

      this.messageService.add({
        severity: 'success',
        summary: 'ZIP generado',
        detail: `Se descargó el archivo ZIP con los planes de trabajo`,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al generar ZIP',
        detail: error.message || 'Ocurrió un error. Inténtelo de nuevo.',
      });
    }
  }

  async onDescargarPT(profesor: ProfesorConPlan): Promise<void> {
    const periodo = this.periodoSeleccionado();
    const decano = this.profesorDecano();
    if (!periodo || !decano) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Faltan datos de contexto',
      });
      return;
    }

    const contexto = {
      periodo: { anio: periodo.anio, periodo: periodo.periodo },
      decano: {
        nombres: decano.nombres,
        apellidos: decano.apellidos,
        facultad: decano.facultad,
      },
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
        summary: 'PT descargado',
        detail: `Se ha descargado el PT de ${profesor.nombres} ${profesor.apellidos}`,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al generar PT',
        detail: error.message || 'Ocurrió un error. Inténtelo de nuevo.',
      });
    }
  }

  cerrarPerfil(): void {
    this.profesorSeleccionado = null;
  }

  mostrarMotivoRechazo(profesor: ProfesorConPlan): void {
    if (!profesor.planDeTrabajo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin plan de trabajo',
        detail: 'No se encontró el plan de trabajo asociado',
      });
      return;
    }

    if (
      !profesor.planDeTrabajo.motivoRechazo ||
      profesor.planDeTrabajo.motivoRechazo.trim() === ''
    ) {
      this.messageService.add({
        severity: 'info',
        summary: 'Sin motivo registrado',
        detail: 'Este plan fue rechazado pero no se especificó un motivo',
      });
    }
    this.profesorMotivoRechazo = profesor;
    this.mostrarModalMotivo = true;
  }

  cerrarModalMotivo(): void {
    this.mostrarModalMotivo = false;
    this.profesorMotivoRechazo = null;
  }

  // Lista base de profesores/directores del programa seleccionado (sin importar si tienen plan)
  profesoresBasePrograma = signal<Profesor[]>([]);

  // Llama a este método cuando cambie el filtro de programa o periodo
  actualizarProfesoresBasePrograma(): void {
    const programa = this.filtros().programa;
    if (!programa) {
      this.profesoresBasePrograma.set([]);
      return;
    }
    this.profesorService.getByPrograma(programa).subscribe({
      next: (profesores) => {
        // Filtra solo profesores y directores
        this.profesoresBasePrograma.set(this.profesorService.filterByCargo(profesores));
      },
      error: () => {
        this.profesoresBasePrograma.set([]);
      }
    });
  }

  /**
   * El botón se habilita SOLO si:
   * 1. Hay un programa seleccionado
   * 2. TODOS los planes del programa están aprobados por decanatura (firmaDecano=true)
   */

  /**
   * El botón se habilita SOLO si:
   * - TODOS los planes de la facultad están aprobados por decanatura (firmaDecano=true y estado correcto)
   * - Se mantiene la validación de que haya al menos uno en "Enviado a Vicerrectoría" o todos aprobados
   */
  /**
   * El botón solo se habilita si TODOS los profesores de la facultad tienen plan de trabajo
   * y TODOS los planes están aprobados por decanatura.
   */
  puedeEnviarAVicerrectoria = computed(() => {
    // Obtener TODOS los profesores de la facultad (incluyendo los que no tienen plan)
    const todosLosProfesores = this.todosLosProfesoresFacultad();
    if (todosLosProfesores.length === 0) return false;

    // Si al menos un plan ya está en "Enviado a Vicerrectoría", habilitar
    const algunoEnviado = todosLosProfesores.some(
      p => p.planDeTrabajo && p.planDeTrabajo.estado === 'Enviado a Vicerrectoría'
    );
    if (algunoEnviado) return true;

    // Validar que TODOS los profesores tengan plan de trabajo
    const profesoresSinPlan = todosLosProfesores.filter(p => !p.planDeTrabajo);
    if (profesoresSinPlan.length > 0) return false;

    // Validar que TODOS los planes estén aprobados por decanatura
    const noAprobados = todosLosProfesores.filter(
      p => !p.planDeTrabajo || p.planDeTrabajo.estado !== 'Aprobado por Decanatura'
    );
    if (noAprobados.length > 0) return false;

    // Si pasa todas las validaciones, habilitar envío masivo
    return true;
  });
  

  /** Mensaje descriptivo para el tooltip cuando el botón está deshabilitado */
  motivoDeshabilitadoVicerrectoria = computed(() => {
    const todosLosProfesores = this.todosLosProfesoresFacultad();
    if (todosLosProfesores.length === 0) {
      return 'No hay profesores en la facultad.';
    }

    const algunoEnviado = todosLosProfesores.some(
      p => p.planDeTrabajo && p.planDeTrabajo.estado === 'Enviado a Vicerrectoría'
    );
    if (!algunoEnviado) {
      const sinPlan = todosLosProfesores.filter(p => !p.planDeTrabajo);
      if (sinPlan.length > 0) {
        return `${sinPlan.length} profesor(es) no tienen plan de trabajo. Todos deben tener plan aprobado para enviar masivamente a Vicerrectoría.`;
      }

      const noAprobados = todosLosProfesores.filter(
        p => !p.planDeTrabajo || p.planDeTrabajo.estado !== 'Aprobado por Decanatura'
      );
      if (noAprobados.length > 0) {
        return `${noAprobados.length} plan(es) no están aprobados por Decanatura. Todos los planes deben estar aprobados para enviar masivamente a Vicerrectoría.`;
      }
    }

    return 'Puede enviar los planes porque al menos uno ya está en "Enviado a Vicerrectoría" o todos están aprobados.';
  });

  onEnviarAVicerrectoriaClick(): void {
    this.showModalEnviarVicerrectoria = true;
  }

  onConfirmarEnviarVicerrectoria(): void {
    const planesPendientes = this.profesoresParaEnviarAVicerrectoria().filter(
      (p) => p.planDeTrabajo
    );
    if (planesPendientes.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin planes',
        detail: 'No hay planes pendientes para enviar a Vicerrectoría',
      });
      return;
    }

    this.cargandoEnvioVicerrectoria = true;
    let planesEnviados = 0;
    let planesConError = 0;

    planesPendientes.forEach((profesor) => {
      const actualizacion: UpdateFirmasPlanDeTrabajo = {
        estado: 'Enviado a Vicerrectoría',
      };
      this.planDeTrabajoService
        .updateFirmas(profesor.planDeTrabajo!.id, actualizacion)
        .subscribe({
          next: () => {
            planesEnviados++;
            if (planesEnviados + planesConError === planesPendientes.length) {
              this.finalizarEnvioVicerrectoria(planesEnviados, planesConError);
            }
          },
          error: (error) => {
            planesConError++;
            if (planesEnviados + planesConError === planesPendientes.length) {
              this.finalizarEnvioVicerrectoria(planesEnviados, planesConError);
            }
          },
        });
    });
  }

  private finalizarEnvioVicerrectoria(enviados: number, errores: number): void {
    this.cargandoEnvioVicerrectoria = false;
    this.showModalEnviarVicerrectoria = false;

    if (errores === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Envío Exitoso',
        detail: `Se enviaron ${enviados} planes de trabajo a Vicerrectoría`,
      });

      // Enviar notificación a Vicerrectoría después de envío exitoso
      if (enviados > 0) {
        this.enviarNotificacionVicerrectoria(enviados);
      }
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Envío Parcial',
        detail: `Se enviaron ${enviados} planes. ${errores} tuvieron errores.`,
      });
    }

    const decano = this.profesorDecano();
    if (decano) {
      this.cargarProfesoresFacultad(decano.facultad);
    }
  }

  onCancelarEnviarVicerrectoria(): void {
    this.showModalEnviarVicerrectoria = false;
  }

  /**
   * Retorna todos los profesores de la facultad cuyos planes están aprobados por decanatura y listos para enviar
   */
  profesoresParaEnviarAVicerrectoria = computed(() => {
    return this.todosLosProfesoresFacultad()
      .filter(p => p.planDeTrabajo && p.planDeTrabajo.estado === 'Aprobado por Decanatura');
  });

  get programa() {
    const decano = this.profesorDecano();
    const periodo = this.periodoSeleccionado();
    return {
      nombre: decano?.programa || 'Cargando...',
      facultad: decano?.facultad || 'Cargando...',
      periodo: periodo ? `${periodo.anio}-${periodo.periodo}` : 'Cargando...',
    };
  }

  get nombreDecano(): string {
    const decano = this.profesorDecano();
    return decano ? `${decano.nombres} ${decano.apellidos}` : 'Cargando...';
  }

  onEnviarAPlaneacionClick(): void {
    this.showModalEnviarPlaneacion = true;
  }

  onConfirmarEnviarPlaneacion(): void {
    const planesAprobados = this.profesoresAprobadosDecanatura().filter(
      (p: ProfesorConPlan) => p.planDeTrabajo
    );

    if (planesAprobados.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin planes',
        detail: 'No hay planes de trabajo aprobados para enviar',
      });
      return;
    }

    this.cargandoEnvioPlaneacion = true;
    let planesEnviados = 0;
    let planesConError = 0;

    planesAprobados.forEach((profesor: ProfesorConPlan) => {
      const actualizacion: UpdateFirmasPlanDeTrabajo = {
        estado: 'Enviado a planeacion',
      };

      this.planDeTrabajoService
        .updateFirmas(profesor.planDeTrabajo!.id, actualizacion)
        .subscribe({
          next: () => {
            planesEnviados++;
            if (planesEnviados + planesConError === planesAprobados.length) {
              // Enviar notificación a sistemas después de actualizar todos los planes
              this.enviarNotificacionPlaneacion(planesEnviados);
              this.finalizarEnvioPlaneacion(planesEnviados, planesConError);
            }
          },
          error: (error) => {
            planesConError++;
            if (planesEnviados + planesConError === planesAprobados.length) {
              // Enviar notificación aunque hubo errores
              if (planesEnviados > 0) {
                this.enviarNotificacionPlaneacion(planesEnviados);
              }
              this.finalizarEnvioPlaneacion(planesEnviados, planesConError);
            }
          },
        });
    });
  }

  private finalizarEnvioPlaneacion(enviados: number, errores: number): void {
    this.cargandoEnvioPlaneacion = false;
    this.showModalEnviarPlaneacion = false;

    if (errores === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Envío Exitoso',
        detail: `Se enviaron ${enviados} planes de trabajo a planeación`,
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Envío Parcial',
        detail: `Se enviaron ${enviados} planes. ${errores} tuvieron errores.`,
      });
    }

    const decano = this.profesorDecano();
    if (decano) {
      this.cargarProfesoresFacultad(decano.facultad);
    }
  }

  private enviarNotificacionPlaneacion(cantidadPlanes: number): void {
    const decano = this.profesorDecano();
    if (!decano) {
      return;
    }

    // Obtener el primer plan aprobado para obtener programa, periodo y año
    const primerPlan = this.profesoresAprobadosDecanatura().find(
      (p: ProfesorConPlan) => p.planDeTrabajo
    )?.planDeTrabajo;
    if (!primerPlan) {
      return;
    }

    this.notificacionesService
      .notificarEnvioPlaneacion({
        emailDecano: decano.numIdentificacion,
        nombreDecano: `${decano.nombres} ${decano.apellidos}`,
        programa: primerPlan.idPrograma || decano.programa,
        periodo: primerPlan.periodo,
        anio: primerPlan.anio,
        cantidadPlanes: cantidadPlanes,
      })
      .subscribe({
        next: (response) => {},
        error: (err) => {},
      });
  }

  private enviarNotificacionVicerrectoria(cantidadPlanes: number): void {
    const decano = this.profesorDecano();
    if (!decano) {
      return;
    }

    // Obtener el primer plan enviado para obtener programa, periodo y año
    const primerPlan = this.profesoresParaEnviarAVicerrectoria().find(
      (p) => p.planDeTrabajo
    )?.planDeTrabajo;
    if (!primerPlan) {
      return;
    }

    this.notificacionesService
      .notificarEnvioVicerrectoria({
        emailDecano: decano.numIdentificacion,
        nombreDecano: `${decano.nombres} ${decano.apellidos}`,
        programa: primerPlan.idPrograma || decano.programa,
        periodo: primerPlan.periodo.toString(),
        anio: primerPlan.anio.toString(),
        cantidadPlanes: cantidadPlanes,
      })
      .subscribe({
        next: (response) => {},
        error: (err) => {},
      });
  }

  onCancelarEnviarPlaneacion(): void {
    this.showModalEnviarPlaneacion = false;
  }

  get cantidadPlanesParaEnviar(): number {
    return this.profesoresAprobadosDecanatura.length;
  }

  get puedeEnviarAPlaneacion(): boolean {
    return this.cantidadPlanesParaEnviar > 0;
  }

  actualizarEstadoPlan(nuevoEstado: string): void {
    const dataActual = this.allData();
    const index = dataActual.findIndex(
      (p) => p.planDeTrabajo?.id === this.planTrabajoIdViewer
    );

    if (index !== -1) {
      const updatedData = [...dataActual];
      const profesor = { ...updatedData[index] };

      if (profesor.planDeTrabajo) {
        profesor.planDeTrabajo = {
          ...profesor.planDeTrabajo,
          estado: nuevoEstado,
        };

        const estadoInfo = this.calcularEstado(profesor.planDeTrabajo);
        profesor.estado = estadoInfo.estado;
        profesor.severityEstado = estadoInfo.severity;

        updatedData[index] = profesor;
        this.allData.set(updatedData);

        // Update todosLosProfesoresFacultad for massive send validation
        const todosProfs = this.todosLosProfesoresFacultad();
        const todosIdx = todosProfs.findIndex(
          (p) => p.planDeTrabajo?.id === this.planTrabajoIdViewer
        );
        if (todosIdx !== -1) {
          const updatedTodos = [...todosProfs];
          updatedTodos[todosIdx] = profesor;
          this.todosLosProfesoresFacultad.set(updatedTodos);
        }

        this.aplicarFiltros();

        if (
          this.profesorSeleccionado &&
          this.profesorSeleccionado.numIdentificacion ===
            profesor.numIdentificacion
        ) {
          this.profesorSeleccionado = profesor;
        }
      }
    }
  }

  // Método para abrir el modo edición
  onEditarHoras(profesor: ProfesorConPlan): void {
    if (!profesor.planDeTrabajo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin plan de trabajo',
        detail: `${profesor.nombres} ${profesor.apellidos} no tiene un plan de trabajo asignado`,
      });
      return;
    }
    this.planTrabajoIdEdicion = profesor.planDeTrabajo.id;
    this.profesorIdEdicion = profesor.numIdentificacion;
    this.showPlanViewerEdicion = true;
  }

  // Nuevo método para cerrar el modo edición
  onCerrarPlanViewerEdicion(): void {
    this.showPlanViewerEdicion = false;
    this.planTrabajoIdEdicion = '';
    this.profesorIdEdicion = '';
  }
}
