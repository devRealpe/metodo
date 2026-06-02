import {
  Component,
  OnInit,
  signal,
  computed,
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
import { Checkbox, CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Profesor } from '../../../core/models/profesor.model';
import { ProfesorService } from '../../../core/services/profesor.service';
import { PlanDeTrabajoService } from '../../../core/services/planDeTrabajo.service';
import { PlanDeTrabajoModel } from '../../../core/models/planDeTrabajo.model';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { ActividadService } from '../../../core/services/actividad.service';
import { ActividadesPlanDeTrabajoService } from '../../../core/services/actividadesPlanDeTrabajo.service';
import { NotificacionesPlanTrabajoService } from '../../../core/services/notificaciones-plan-trabajo.service';
import { PlanTrabajoRealtimeService } from '../../../core/services/plan-trabajo-realtime.service';
import { firstValueFrom } from 'rxjs';
import { PlanTrabajoViewerComponent } from '../modales/plan-trabajo-viewer/plan-trabajo-viewer.component';
import { ModalConfirmacionComponent } from '../modales/modal-confirmacion/modal-confirmacion';
import { InvestigacioneService } from '../../../core/services/investigaciones.service';
import { FacultadService } from '../../../core/services/facultad.service';
import { Facultad } from '../../../core/models/facultad.model';
import { ProgramasService } from '../../../core/services/programas.service';

type CampoFiltro = 'facultad' | 'programa' | 'nombres' | 'numIdentificacion';

interface ProfesorConPlan extends Omit<Profesor, 'dedicacion'> {
  planDeTrabajo: PlanDeTrabajoModel | null;
  estado: string;
  severityEstado?: 'success' | 'info' | 'warn' | 'danger';
  id: string;
  documento: string;
  dedicacion: 'TIEMPO COMPLETO' | 'MEDIO TIEMPO';
}

interface PeriodoAcademico {
  label: string;
  anio: number;
  periodo: number;
}

@Component({
  selector: 'app-vicerrectoria-home',
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
    DialogModule,
    InputTextModule,
    SelectModule,
    PlanTrabajoViewerComponent,
    InputComponent,
    SelectComponent,
    CheckboxModule,
    ModalConfirmacionComponent,
  ],
  providers: [MessageService],
  templateUrl: './vicerrectoria-home.html',
  styleUrl: './vicerrectoria-home.scss',
})
export class VicerrectoriaHome implements OnInit {

  // Planes que están en estado "Enviado a Vicerrectoría" 
  planesListosParaPlaneacion = computed(() => {
    return this.allData().filter(
      (p) => p.planDeTrabajo && p.estado === 'Enviado a Vicerrectoría'
    );
  });

  /** Planes de la facultad seleccionada listos para enviar a planeación */
  profesoresParaEnviarPlaneacion = computed(() => {
    const facultadSeleccionada = this.filtros().facultad;
    if (!facultadSeleccionada) return [];
    return this.allData().filter(
      (p) => p.planDeTrabajo && p.facultad === facultadSeleccionada && p.estado === 'Enviado a Vicerrectoría'
    );
  });

  /** Total de planes recibidos de la facultad seleccionada */
  totalPlanesFacultad = computed(() => {
    const facultadSeleccionada = this.filtros().facultad;
    if (!facultadSeleccionada) return 0;
    return this.allData().filter((p) => p.planDeTrabajo && p.facultad === facultadSeleccionada).length;
  });

  /**
   * El botón solo se habilita si TODOS los planes recibidos de la facultad seleccionada
   * están en estado "Enviado a Vicerrectoría".
   */
  puedeEnviarPlaneacion = computed(() => {
    const facultadSeleccionada = this.filtros().facultad;
    if (!facultadSeleccionada) return false;
    const planesRecibidos = this.allData().filter(
      (p) => p.planDeTrabajo && p.facultad === facultadSeleccionada
    );
    if (planesRecibidos.length === 0) return false;
    return planesRecibidos.every((p) => p.estado === 'Enviado a Vicerrectoría');
  });

  /** Mensaje descriptivo para el tooltip cuando el botón está deshabilitado */
  motivoDeshabilitadoPlaneacion = computed(() => {
    const facultadSeleccionada = this.filtros().facultad;
    if (!facultadSeleccionada) {
      return 'Seleccione una facultad para enviar los planes.';
    }

    const planesRecibidos = this.allData().filter(
      (p) => p.planDeTrabajo && p.facultad === facultadSeleccionada
    );
    if (planesRecibidos.length === 0) {
      return 'No hay planes recibidos en la facultad seleccionada.';
    }

    const noListos = planesRecibidos.filter((p) => p.estado !== 'Enviado a Vicerrectoría');
    if (noListos.length > 0) {
      return `${noListos.length} plan(es) no están en estado 'Enviado a Vicerrectoría'. Todos los planes recibidos deben estar en ese estado para enviar masivamente a Planeación.`;
    }

    return 'Todos los planes están listos para enviar a Planeación.';
  });

  showModalEnviarPlaneacion = false;
  cantidadPlanesParaEnviar = 0;

  onEnviarAPlaneacionClick(): void {
    this.cantidadPlanesParaEnviar = this.profesoresParaEnviarPlaneacion().length;
    this.showModalEnviarPlaneacion = true;
  }

  async onConfirmarEnviarPlaneacion() {
    const planes = this.profesoresParaEnviarPlaneacion();
    if (planes.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin planes',
        detail: 'No hay planes de trabajo para enviar a Planeación',
      });
      return;
    }

    let planesEnviados = 0;
    let planesConError = 0;

    for (const prof of planes) {
      if (prof.planDeTrabajo) {
        try {
          await firstValueFrom(
            this.planDeTrabajoService.updateFirmas(prof.planDeTrabajo.id, {
              estado: 'Enviado a planeacion',
            })
          );
          planesEnviados++;
        } catch (error) {
          planesConError++;
        }
      }
    }

    if (this.notificacionesService && planesEnviados > 0) {
      const vicerrector = this.vicerrector();
      const primerPlan = planes.find((p) => p.planDeTrabajo)?.planDeTrabajo;
      if (vicerrector && primerPlan) {
        this.notificacionesService
          .notificarEnvioPlaneacion({
            emailDecano: vicerrector.numIdentificacion,
            nombreDecano: `${vicerrector.nombres} ${vicerrector.apellidos}`,
            programa: primerPlan.idPrograma || vicerrector.programa,
            periodo: primerPlan.periodo,
            anio: primerPlan.anio,
            cantidadPlanes: planesEnviados,
          })
          .subscribe({
            next: () => {},
            error: () => {},
          });
      }
    }

    if (planesConError === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Envío Exitoso',
        detail: `Se enviaron ${planesEnviados} planes de trabajo a planeación`,
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Envío Parcial',
        detail: `Se enviaron ${planesEnviados} planes. ${planesConError} tuvieron errores.`,
      });
    }

    this.showModalEnviarPlaneacion = false;
    this.cargarPlanesEnviadosAVicerrectoria();
  }

  onCancelarEnviarPlaneacion() {
    this.showModalEnviarPlaneacion = false;
  }
  vicerrector = signal<Profesor | null>(null);
  data = signal<ProfesorConPlan[]>([]);
  allData = signal<ProfesorConPlan[]>([]);
  cargando = signal<boolean>(false);
  facultadesConPlanes = signal<{ label: string; value: string; id: string }[]>([]);

  filtros = signal<{
    facultad: string; // ahora almacena el idFacultad
    programa: string;
    nombres: string;
    numIdentificacion: string;
  }>({
    facultad: '',
    programa: '',
    nombres: '',
    numIdentificacion: '',
  });

  periodosAcademicos: PeriodoAcademico[] = [];
  periodoSeleccionado = signal<PeriodoAcademico | null>(null);

  profesorSeleccionado: ProfesorConPlan | null = null;
  mostrarModalObservaciones = false;
  profesorParaObservar: ProfesorConPlan | null = null;
  motivoObservacion = '';
  showPlanViewer = false;
  planTrabajoIdViewer = '';
  profesorIdViewer = '';
  mostrarModalCambioHoras = false;
  sinObservaciones = false;
  solicitudCambioHoras: {
    descripcion: string;
    actividadAumento: {
      id: string;
      nombre: string;
      horasActuales: number;
      horasNuevas: number;
      tipo: 'ACTIVIDAD' | 'INVESTIGACION';
    } | null;
    actividadesAumento?: {
      id: string;
      nombre: string;
      horasActuales: number;
      horasNuevas: number;
      tipo: 'ACTIVIDAD' | 'INVESTIGACION';
    }[];
    actividadesDisminucion: {
      id: string;
      nombre: string;
      horasActuales: number;
      horasNuevas: number;
      tipo: 'ACTIVIDAD' | 'INVESTIGACION';
    }[];
    planId: string;
    profesor: ProfesorConPlan;
  } | null = null;
  mostrarModalRechazoCambioHoras = false;
  motivoRechazoCambioHoras = '';
  private searchSubject = new Subject<{ campo: CampoFiltro; valor: string }>();
  private searchSubscription?: Subscription;

  constructor(
    private messageService: MessageService,
    private profesorService: ProfesorService,
    private planDeTrabajoService: PlanDeTrabajoService,
    private auditoriaService: AuditoriaService,
    private actividadService: ActividadService,
    private actividadesPlanDeTrabajoService: ActividadesPlanDeTrabajoService,
    private notificacionesService: NotificacionesPlanTrabajoService,
    private authService: AuthService,
    private investigacionService: InvestigacioneService,
    private realtimeService: PlanTrabajoRealtimeService,
    private facultadService: FacultadService,
    private programasService: ProgramasService
  ) {
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();

      if (trigger > 0) {
        untracked(() => {
          const vicerrector = this.vicerrector();
          if (!vicerrector) return;

          const planAprobado = this.realtimeService.planAprobado();
          const planRechazado = this.realtimeService.planRechazado();

          if (planAprobado) {
            this.messageService.add({
              severity: 'success',
              summary: 'Plan Aprobado',
              detail: 'Un decano ha aprobado un plan de trabajo',
              life: 5000,
            });
            this.realtimeService.resetSignal('aprobado');
          }

          if (planRechazado) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Plan Rechazado',
              detail: 'Un decano ha rechazado un plan de trabajo',
              life: 5000,
            });
            this.realtimeService.resetSignal('rechazado');
          }

          this.cargarPlanesEnviadosAVicerrectoria(); // Recargar lista de planes
        });
      }
    });
  }

  ngOnInit(): void {
    this.generarPeriodosAcademicos();
    this.cargarVicerrector();
    this.cargarFacultadesConPlanes();
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

    const periodos: PeriodoAcademico[] = [];

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

  private cargarVicerrector(): void {
    const authUser = this.authService.getCurrentUser();
    if (!authUser?.username) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de autenticación',
        detail: 'No se pudo identificar al usuario actual.',
      });
      return;
    }

    this.profesorService.getById(authUser.username).subscribe({
      next: (profesor) => {
        if (profesor) {
          this.vicerrector.set(profesor);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Usuario no encontrado',
            detail: 'No se encontró el perfil de Vicerrectoría.',
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar el perfil de Vicerrectoría.',
        });
      },
    });
  }


  opcionesFacultades = computed(() => {
    return this.facultadesConPlanes;
  });

  private async cargarFacultadesConPlanes(): Promise<void> {
    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      this.facultadesConPlanes.set([]);
      return;
    }
    // Obtener todas las facultades
    const facultades = await firstValueFrom(this.facultadService.getAll());
    // Para cada facultad, verificar si tiene profesores con planes en el periodo
    const facultadesConPlanes: { label: string; value: string; id: string }[] = [];
    for (const facultad of facultades) {
      // Buscar profesores por nombre de facultad (p.facultad === facultad.nomFacultad)
      const profesores = await firstValueFrom(this.profesorService.getAll());
      const profesoresFacultad = profesores.filter(p => (p.facultad || '').trim() === facultad.nomFacultad.trim());
      if (!profesoresFacultad.length) continue;
      const profesoresIds = profesoresFacultad.map((p) => p.numIdentificacion);
      const planes: PlanDeTrabajoModel[] =
        (await this.planDeTrabajoService
          .getBatchPlanes(profesoresIds, periodo.anio, periodo.periodo)
          .toPromise()) || [];
      if (planes.length > 0) {
        facultadesConPlanes.push({ label: facultad.nomFacultad, value: facultad.nomFacultad, id: facultad.idFacultad });
      }
    }
    this.facultadesConPlanes.set(facultadesConPlanes);

    if (!facultadesConPlanes.some(f => f.value === this.filtros().facultad)) {
      this.filtros.update(f => ({ ...f, facultad: '' }));
    }
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
        next: ({ campo, valor }) => this.aplicarFiltros(),
      });
  }

  async aplicarFiltroTexto(campo: CampoFiltro, valor: string): Promise<void> {
    // Si cambia la facultad, limpiar programa, recargar datos y cargar programas desde la API local
    if (campo === 'facultad') {
      this.filtros.update((f) => ({ ...f, facultad: valor, programa: '' }));
      this.cargarPlanesEnviadosAVicerrectoria();
      // Generar dinámicamente los programas a partir de los profesores de la facultad seleccionada
      if (valor) {
        // Esperar a que se cargue allData (profesores de la facultad)
        setTimeout(() => {
          const profesoresFacultad = this.allData();
          // Solo programas de profesores con plan de trabajo creado
          const programas = profesoresFacultad
            .filter((p) => p.planDeTrabajo)
            .map((p) => p.programa);
          const programasUnicos = [...new Set(programas)].sort();
          this.programasPorFacultad.set(programasUnicos.map((p) => ({ label: p, value: p })));
        }, 200); // pequeño delay para asegurar que allData esté actualizado
      } else {
        this.programasPorFacultad.set([]);
      }
    } else {
      this.filtros.update((f) => ({ ...f, [campo]: valor }));
      this.aplicarFiltros();
    }
    this.searchSubject.next({ campo, valor });
  }

  limpiarFiltros(): void {
    this.filtros.set({
      facultad: '',
      programa: '',
      nombres: '',
      numIdentificacion: '',
    });
    this.onlyNumbers.set(true);
    this.data.set([]); // Tabla vacía si no hay filtros
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

  private aplicarFiltros(): void {
    const filtrosActuales = this.filtros();
    // Si no hay ningún filtro activo, la tabla debe estar vacía
    const hayFiltro =
      filtrosActuales.facultad ||
      filtrosActuales.programa ||
      filtrosActuales.nombres.trim() ||
      filtrosActuales.numIdentificacion.trim();
    if (!hayFiltro) {
      this.data.set([]);
      return;
    }
    // Filtrar solo los profesores con plan en estado válido para Vicerrectoría
    const estadosValidos = [
      'Solicitud enviada a Vicerrectoría',
      'Observaciones de Vicerrectoría',
      'Enviado a Vicerrectoría',
      'Enviado a planeacion',
    ];
    let datos = this.allData().filter(
      (p) =>
        p.planDeTrabajo &&
        p.estado &&
        estadosValidos.includes(p.estado)
    );
    if (filtrosActuales.facultad) {
      datos = datos.filter((p) => p.facultad === filtrosActuales.facultad);
    }
    if (filtrosActuales.programa) {
      datos = datos.filter((p) => p.programa === filtrosActuales.programa);
    }
    if (filtrosActuales.nombres.trim()) {
      const nombreBusqueda = filtrosActuales.nombres.toLowerCase().trim();
      datos = datos.filter(
        (p) =>
          p.nombres.toLowerCase().includes(nombreBusqueda) ||
          p.apellidos.toLowerCase().includes(nombreBusqueda)
      );
    }
    if (filtrosActuales.numIdentificacion.trim()) {
      const cedulaBusqueda = filtrosActuales.numIdentificacion.trim();
      datos = datos.filter((p) => p.documento.includes(cedulaBusqueda));
    }
    this.data.set(datos);
  }

  opcionesProgramas = computed(() => {
    // Ahora los programas se cargan desde la API de Oracle por facultad
    return this.programasPorFacultad();
  });

  onVerDetalles(profesor: ProfesorConPlan): void {
    if (!profesor.planDeTrabajo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin plan de trabajo',
        detail: `${profesor.nombres} no tiene un plan asignado`,
      });
      return;
    }
    this.planTrabajoIdViewer = profesor.planDeTrabajo.id;
    this.profesorIdViewer = profesor.numIdentificacion;
    this.showPlanViewer = true;
  }

  onCerrarPlanViewer(): void {
    this.showPlanViewer = false;
    this.planTrabajoIdViewer = '';
    this.profesorIdViewer = '';
  }

  onCambioPeriodo(periodo: PeriodoAcademico): void {
    this.periodoSeleccionado.set(periodo);
    this.cargarFacultadesConPlanes();
    this.cargarPlanesEnviadosAVicerrectoria();
  }

  async cargarPlanesEnviadosAVicerrectoria(): Promise<void> {
    this.cargando.set(true);
    try {
      const periodo = this.periodoSeleccionado();
      const facultadNombre = this.filtros().facultad;
      if (!periodo || !facultadNombre) {
        this.data.set([]);
        this.allData.set([]);
        return;
      }

      // Obtener todos los profesores y filtrar por nombre de facultad
      const profesores = await firstValueFrom(this.profesorService.getAll());
      const profesoresFacultad = profesores.filter(p => (p.facultad || '').trim() === facultadNombre.trim());
      if (!profesoresFacultad.length) {
        this.data.set([]);
        this.allData.set([]);
        return;
      }

      // Obtener los planes de trabajo de esos profesores para el periodo
      const profesoresIds = profesoresFacultad.map((p) => p.numIdentificacion);
      const planes: PlanDeTrabajoModel[] =
        (await this.planDeTrabajoService
          .getBatchPlanes(profesoresIds, periodo.anio, periodo.periodo)
          .toPromise()) || [];

      // Unir datos de profesor y plan
      const profesoresConPlan: ProfesorConPlan[] = profesoresFacultad.map(
        (profesor) => {
          const plan = planes.find(
            (p: PlanDeTrabajoModel) =>
              p.idProfesor === profesor.numIdentificacion
          );
          const dedicacion: 'TIEMPO COMPLETO' | 'MEDIO TIEMPO' =
            this.determinarDedicacion(profesor);
          if (plan) {
            return {
              ...profesor,
              id: profesor.numIdentificacion,
              documento: profesor.numIdentificacion,
              dedicacion,
              planDeTrabajo: plan,
              estado: plan.estado,
              severityEstado:
                plan.estado === 'Solicitud enviada a Vicerrectoría'
                  ? 'warn'
                  : 'info',
            };
          } else {
            return {
              ...profesor,
              id: profesor.numIdentificacion,
              documento: profesor.numIdentificacion,
              dedicacion,
              planDeTrabajo: null,
              estado: 'Sin plan',
              severityEstado: 'danger',
            };
          }
        }
      );

      this.allData.set(profesoresConPlan);
      // La tabla solo se llena si hay algún filtro activo
      this.aplicarFiltros();
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los planes enviados a vicerrectoría',
      });
    } finally {
      this.cargando.set(false);
    }
  }

  determinarDedicacion(profesor: Profesor): 'TIEMPO COMPLETO' | 'MEDIO TIEMPO' {
    const dedicacionUpper = profesor.dedicacion?.toUpperCase() || '';
    return dedicacionUpper.includes('TIEMPO COMPLETO') ||
      dedicacionUpper === 'TC'
      ? 'TIEMPO COMPLETO'
      : 'MEDIO TIEMPO';
  }

  seleccionarProfesor(profesor: ProfesorConPlan): void {
    this.profesorSeleccionado =
      this.profesorSeleccionado?.id === profesor.id ? null : profesor;
  }

  onAgregarObservaciones(profesor: ProfesorConPlan): void {
    this.profesorParaObservar = profesor;
    this.motivoObservacion = '';
    this.mostrarModalObservaciones = true;
  }

  async onConfirmarObservaciones(): Promise<void> {
    if (!this.profesorParaObservar?.planDeTrabajo) return;

    const planId = this.profesorParaObservar.planDeTrabajo.id;

    try {
        if (!this.motivoObservacion.trim()) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Debe ingresar observaciones',
          });
          return;
        }
        await firstValueFrom(
          this.planDeTrabajoService.updateFirmas(planId, {
            estado: 'Observaciones de Vicerrectoría',
          })
        );
        await firstValueFrom(
          this.planDeTrabajoService.asignarMotivoRechazo(
            planId,
            this.motivoObservacion
          )
        );

      // Enviar notificación al decano
      this.enviarNotificacionObservaciones(this.profesorParaObservar);

      this.mostrarModalObservaciones = false;

      this.cargarPlanesEnviadosAVicerrectoria();
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la observación',
      });
    }
  }

  onCancelarObservaciones(): void {
    this.mostrarModalObservaciones = false;
    this.profesorParaObservar = null;
    this.motivoObservacion = '';
  }

  async onVerSolicitudCambioHoras(profesor: ProfesorConPlan): Promise<void> {
    if (!profesor.planDeTrabajo?.motivoRechazo) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se encontró información de la solicitud de cambio',
      });
      return;
    }

    try {
      const partes = profesor.planDeTrabajo.motivoRechazo.split(' | ');

      if (partes.length < 3) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Formato de solicitud inválido',
        });
        return;
      }

      const descripcion = partes[0].trim();

      // Parse activities with increased hours (pueden ser varios)
      const actividadesAumento: {
        id: string;
        nombre: string;
        horasActuales: number;
        horasNuevas: number;
        tipo: 'ACTIVIDAD' | 'INVESTIGACION';
      }[] = [];
      let partesAumento: string[] = [];
      if (partes[1]) {
        // Soporta separadores ';' o ',' para múltiples incrementos
        if (partes[1].includes(';')) {
          partesAumento = partes[1].split(';');
        } else if (partes[1].includes(',')) {
          partesAumento = partes[1].split(',');
        } else {
          partesAumento = [partes[1]];
        }
      }
      for (const parteAumento of partesAumento) {
        if (parteAumento && parteAumento.trim()) {
          const aumentoParts = parteAumento.trim().split(' ');
          if (aumentoParts.length >= 2) {
            let actividadId = aumentoParts[0];
            const horasNuevas = Number(aumentoParts[1]);
            let tipo: 'ACTIVIDAD' | 'INVESTIGACION' = 'ACTIVIDAD';

            if (actividadId.startsWith('I')) {
              tipo = 'INVESTIGACION';
              actividadId = actividadId.substring(1);
            }

            let nombre = '';
            let horasActuales = 0;

            if (tipo === 'ACTIVIDAD') {
              const actividad = await firstValueFrom(
                this.actividadService.getActividadesById(actividadId)
              );
              nombre = actividad.nombre;

              const actividadesPlan = await firstValueFrom(
                this.actividadesPlanDeTrabajoService.getByPtId(
                  profesor.planDeTrabajo.id
                )
              );
              const actPlan = actividadesPlan.find(
                (a) => a.actividades.id === actividadId
              );
              horasActuales = actPlan?.horas || 0;
            } else {
              const investigacion = await firstValueFrom(
                this.investigacionService.getById(actividadId)
              );
              nombre = investigacion.nombreProyecto;
              horasActuales = investigacion.horas;
            }

            actividadesAumento.push({
              id: actividadId,
              nombre,
              horasActuales,
              horasNuevas,
              tipo,
            });
          }
        }
      }

      // Parse activities with decreased hours
      const actividadesDisminucion: {
        id: string;
        nombre: string;
        horasActuales: number;
        horasNuevas: number;
        tipo: 'ACTIVIDAD' | 'INVESTIGACION';
      }[] = [];
      let partesDisminucion: string[] = [];
      if (partes[2]) {
        if (partes[2].includes(';')) {
          partesDisminucion = partes[2].split(';');
        } else if (partes[2].includes(',')) {
          partesDisminucion = partes[2].split(',');
        } else {
          partesDisminucion = [partes[2]];
        }
      }
      for (const parteDisminucion of partesDisminucion) {
        if (parteDisminucion && parteDisminucion.trim()) {
          const disminucionParts = parteDisminucion.trim().split(' ');
          if (disminucionParts.length >= 2) {
            let actividadId = disminucionParts[0];
            const horasNuevas = Number(disminucionParts[1]);
            let tipo: 'ACTIVIDAD' | 'INVESTIGACION' = 'ACTIVIDAD';

            if (actividadId.startsWith('I')) {
              tipo = 'INVESTIGACION';
              actividadId = actividadId.substring(1);
            }

            let nombre = '';
            let horasActuales = 0;

            if (tipo === 'ACTIVIDAD') {
              const actividad = await firstValueFrom(
                this.actividadService.getActividadesById(actividadId)
              );
              nombre = actividad.nombre;

              const actividadesPlan = await firstValueFrom(
                this.actividadesPlanDeTrabajoService.getByPtId(
                  profesor.planDeTrabajo.id
                )
              );
              const actPlan = actividadesPlan.find(
                (a) => a.actividades.id === actividadId
              );
              horasActuales = actPlan?.horas || 0;
            } else {
              const investigacion = await firstValueFrom(
                this.investigacionService.getById(actividadId)
              );
              nombre = investigacion.nombreProyecto;
              horasActuales = investigacion.horas;
            }

            actividadesDisminucion.push({
              id: actividadId,
              nombre,
              horasActuales,
              horasNuevas,
              tipo,
            });
          }
        }
      }

      this.solicitudCambioHoras = {
        descripcion,
        actividadAumento:
          actividadesAumento.length === 1 ? actividadesAumento[0] : null,
        actividadesAumento: actividadesAumento,
        actividadesDisminucion,
        planId: profesor.planDeTrabajo.id,
        profesor: profesor,
      };

      this.mostrarModalCambioHoras = true;
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar la información de la actividad',
      });
    }
  }

  async onAceptarCambioHoras(): Promise<void> {
    if (!this.solicitudCambioHoras) return;

    try {
      const { planId, actividadesAumento, actividadesDisminucion, profesor } =
        this.solicitudCambioHoras;

      console.log('[CambioHoras] Procesando aceptación:', {
        planId,
        aumentos: actividadesAumento,
        disminuciones: actividadesDisminucion,
      });

      // 1. Primero actualizar estado del plan (antes de modificar actividades)
      //    para evitar interferencias del CascadeType.ALL de JPA
      await firstValueFrom(
        this.planDeTrabajoService.updateFirmas(planId, {
          enviadoProfesor: false,
          firmaProfesor: false,
          firmaDirector: false,
          firmaDecano: false,
          estado: 'Cambio de Horas Aprobado - Pendiente Revisión',
          rechazado: false,
          motivoRechazo: '',
        })
      );

      // 2. Cargar actividades del plan DESPUÉS de actualizar firmas
      const actividadesPlan = await firstValueFrom(
        this.actividadesPlanDeTrabajoService.getByPtId(planId)
      );

      console.log(
        '[CambioHoras] Actividades del plan cargadas:',
        actividadesPlan.map((a) => ({
          id: a.id,
          actividadId: a.actividades?.id,
          horas: a.horas,
        }))
      );

      // 3. Procesar TODAS las actividades con aumento de horas
      if (actividadesAumento && actividadesAumento.length > 0) {
        for (const actAumento of actividadesAumento) {
          try {
            if (actAumento.tipo === 'ACTIVIDAD') {
              const actividadExistente = actividadesPlan.find(
                (act) => act.actividades?.id === actAumento.id
              );

              console.log(
                '[CambioHoras] Aumento - buscando actividad:',
                actAumento.id,
                'encontrada:',
                !!actividadExistente,
                'horasNuevas:',
                actAumento.horasNuevas
              );

              if (actividadExistente) {
                if (actAumento.horasNuevas === 0) {
                  await firstValueFrom(
                    this.actividadesPlanDeTrabajoService.delete(
                      actividadExistente.id
                    )
                  );
                } else {
                  await firstValueFrom(
                    this.actividadesPlanDeTrabajoService.update(
                      actividadExistente.id,
                      {
                        horas: actAumento.horasNuevas,
                        descripcion: actividadExistente.descripcion,
                        numeroProyectosJurado:
                          actividadExistente.numeroProyectosJurado,
                      }
                    )
                  );
                  console.log(
                    '[CambioHoras] Aumento aplicado:',
                    actividadExistente.id,
                    'horas:',
                    actAumento.horasNuevas
                  );
                }
              } else {
                // La actividad NO tiene registro en el plan: crear uno nuevo
                console.warn(
                  '[CambioHoras] Actividad NO encontrada en plan, creando registro:',
                  actAumento.id
                );
                await firstValueFrom(
                  this.actividadesPlanDeTrabajoService.create({
                    horas: actAumento.horasNuevas,
                    descripcion: null,
                    numeroProyectosJurado: null,
                    planDeTrabajoId: planId,
                    actividadId: actAumento.id,
                  })
                );
                console.log(
                  '[CambioHoras] Nuevo registro creado para actividad:',
                  actAumento.id,
                  'horas:',
                  actAumento.horasNuevas
                );
              }
            } else {
              // Es Investigacion
              await firstValueFrom(
                this.investigacionService.update(actAumento.id, {
                  horas: actAumento.horasNuevas,
                })
              );
              console.log(
                '[CambioHoras] Aumento investigación aplicado:',
                actAumento.id,
                'horas:',
                actAumento.horasNuevas
              );
            }
          } catch (err) {
            console.error(
              '[CambioHoras] Error procesando aumento:',
              actAumento,
              err
            );
          }
        }
      } else {
        console.warn(
          '[CambioHoras] No hay actividades de aumento para procesar'
        );
      }

      // 4. Procesar actividades con disminución
      for (const actDisminucion of actividadesDisminucion) {
        try {
          if (actDisminucion.tipo === 'ACTIVIDAD') {
            const actividadExistente = actividadesPlan.find(
              (act) => act.actividades?.id === actDisminucion.id
            );

            console.log(
              '[CambioHoras] Disminución - buscando actividad:',
              actDisminucion.id,
              'encontrada:',
              !!actividadExistente,
              'horasNuevas:',
              actDisminucion.horasNuevas
            );

            if (actividadExistente) {
              if (actDisminucion.horasNuevas === 0) {
                await firstValueFrom(
                  this.actividadesPlanDeTrabajoService.delete(
                    actividadExistente.id
                  )
                );
              } else {
                await firstValueFrom(
                  this.actividadesPlanDeTrabajoService.update(
                    actividadExistente.id,
                    {
                      horas: actDisminucion.horasNuevas,
                      descripcion: actividadExistente.descripcion,
                      numeroProyectosJurado:
                        actividadExistente.numeroProyectosJurado,
                    }
                  )
                );
              }
            }
          } else {
            // Es Investigacion
            await firstValueFrom(
              this.investigacionService.update(actDisminucion.id, {
                horas: actDisminucion.horasNuevas,
              })
            );
          }
        } catch (err) {
          console.error(
            '[CambioHoras] Error procesando disminución:',
            actDisminucion,
            err
          );
        }
      }

      // 5. Verificar que los cambios se aplicaron correctamente
      const actividadesVerificacion = await firstValueFrom(
        this.actividadesPlanDeTrabajoService.getByPtId(planId)
      );
      console.log(
        '[CambioHoras] Verificación post-actualización:',
        actividadesVerificacion.map((a) => ({
          id: a.id,
          actividadId: a.actividades?.id,
          horas: a.horas,
        }))
      );

      this.auditoriaService
        .create({
          idPt: planId,
          tipoCambio: 'Cambio de horas aceptado',
          accion:
            'Vicerrectoría aceptó solicitud de cambio de horas - Plan reinicia flujo de aprobación',
        })
        .subscribe();

      // Enviar notificación al director para que revise y reinicie el flujo
      this.enviarNotificacionAprobacionDirector(profesor);

      this.mostrarModalCambioHoras = false;
      this.solicitudCambioHoras = null;

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'El cambio de horas ha sido aceptado',
      });

      this.cargarPlanesEnviadosAVicerrectoria();
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo procesar la aceptación del cambio',
      });
    }
  }

  async onRechazarCambioHoras(): Promise<void> {
    if (!this.solicitudCambioHoras) return;
    // Mostrar modal para ingresar motivo
    this.motivoRechazoCambioHoras = '';
    this.mostrarModalRechazoCambioHoras = true;
  }

  async onConfirmarRechazoCambioHoras(): Promise<void> {
    if (!this.solicitudCambioHoras) return;
    const motivo = this.motivoRechazoCambioHoras?.trim();
    if (!motivo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Motivo requerido',
        detail: 'Debe ingresar el motivo de rechazo.',
      });
      return;
    }
    try {
      const { planId, profesor } = this.solicitudCambioHoras;
      await firstValueFrom(
        this.planDeTrabajoService.updateFirmas(planId, {
          estado: 'Observaciones de Vicerrectoría',
        })
      );
      await firstValueFrom(
        this.planDeTrabajoService.asignarMotivoRechazo(planId, motivo)
      );
      this.auditoriaService
        .create({
          idPt: planId,
          tipoCambio: 'Cambio de horas rechazado',
          accion: 'Vicerrectoría rechazó solicitud de cambio de horas',
        })
        .subscribe();
      // Enviar notificación al decano con el motivo real
      this.enviarNotificacionRechazo(profesor, motivo);
      this.mostrarModalCambioHoras = false;
      this.mostrarModalRechazoCambioHoras = false;
      this.solicitudCambioHoras = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'El cambio de horas ha sido rechazado',
      });
      this.cargarPlanesEnviadosAVicerrectoria();
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo procesar el rechazo del cambio',
      });
    }
  }

  onCancelarRechazoCambioHoras(): void {
    this.mostrarModalRechazoCambioHoras = false;
    this.motivoRechazoCambioHoras = '';
  }

  onCerrarModalCambioHoras(): void {
    this.mostrarModalCambioHoras = false;
    this.solicitudCambioHoras = null;
  }

  private enviarNotificacionAprobacion(profesor: ProfesorConPlan): void {
    if (!profesor.planDeTrabajo) return;

    const vicerrectoria = this.vicerrector();
    if (!vicerrectoria) return;
    if (!profesor.planDeTrabajo.idDecano) return;

    this.notificacionesService
      .notificarAprobacionVicerrectoria({
        emailDecano: profesor.planDeTrabajo.idDecano,
        nombreVicerrectoria: `${vicerrectoria.nombres} ${vicerrectoria.apellidos}`,
        programa: profesor.planDeTrabajo.idPrograma || profesor.programa,
        periodo: profesor.planDeTrabajo.periodo.toString(),
        anio: profesor.planDeTrabajo.anio.toString(),
        nombreProfesor: `${profesor.nombres} ${profesor.apellidos}`,
      })
      .subscribe();
  }

  /**
   * Notifica al director cuando se aprueba un cambio de horas
   * para que revise el plan y reinicie el flujo de aprobación
   */
  private enviarNotificacionAprobacionDirector(
    profesor: ProfesorConPlan
  ): void {
    if (!profesor.planDeTrabajo) return;

    const vicerrectoria = this.vicerrector();
    if (!vicerrectoria) return;
    if (!profesor.planDeTrabajo.idDirector) return;

    this.notificacionesService
      .notificarCambioHorasAprobadoDirector({
        emailDirector: profesor.planDeTrabajo.idDirector,
        nombreVicerrectoria: `${vicerrectoria.nombres} ${vicerrectoria.apellidos}`,
        programa: profesor.planDeTrabajo.idPrograma || profesor.programa,
        periodo: profesor.planDeTrabajo.periodo.toString(),
        anio: profesor.planDeTrabajo.anio.toString(),
        nombreProfesor: `${profesor.nombres} ${profesor.apellidos}`,
      })
      .subscribe();
  }

  private enviarNotificacionRechazo(
    profesor: ProfesorConPlan,
    motivo: string
  ): void {
    if (!profesor.planDeTrabajo) return;

    const vicerrectoria = this.vicerrector();
    if (!vicerrectoria) return;
    if (!profesor.planDeTrabajo.idDecano) return;

    this.notificacionesService
      .notificarRechazoVicerrectoria({
        emailDecano: profesor.planDeTrabajo.idDecano,
        nombreVicerrectoria: `${vicerrectoria.nombres} ${vicerrectoria.apellidos}`,
        programa: profesor.planDeTrabajo.idPrograma || profesor.programa,
        periodo: profesor.planDeTrabajo.periodo.toString(),
        anio: profesor.planDeTrabajo.anio.toString(),
        nombreProfesor: `${profesor.nombres} ${profesor.apellidos}`,
        motivo: motivo,
      })
      .subscribe();
  }

  private enviarNotificacionObservaciones(profesor: ProfesorConPlan): void {
    const planDeTrabajo = profesor.planDeTrabajo;
    if (!planDeTrabajo) return;

    this.notificacionesService
      .notificarObservacionesVicerrectoria({
        emailDecano: planDeTrabajo.idDecano,
        nombreProfesor: `${profesor.nombres} ${profesor.apellidos}`,
        programa: profesor.programa,
        periodo: planDeTrabajo.periodo.toString(),
        anio: planDeTrabajo.anio.toString(),
        conObservaciones: !this.sinObservaciones,
        observaciones: this.motivoObservacion || undefined,
      })
      .subscribe();
  }

  get nombreVicerrector(): string {
    const v = this.vicerrector();
    return v ? `${v.nombres} ${v.apellidos}` : 'Cargando...';
  }

  get facultad(): string {
    return this.vicerrector()?.facultad || 'Cargando...';
  }

  get programa(): any {
    const periodo = this.periodoSeleccionado();
    return {
      facultad: this.facultad,
      periodo: periodo ? `${periodo.anio}-${periodo.periodo}` : 'Cargando...',
    };
  }

  programasPorFacultad = signal<{ label: string; value: string }[]>([]);
}
