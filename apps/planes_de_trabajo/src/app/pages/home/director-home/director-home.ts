import { Component, inject, OnInit, signal, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ProfesorService } from '../../../core/services/profesor.service';
import { PlanDeTrabajoService } from '../../../core/services/planDeTrabajo.service';
import { FirmaService } from '../../../core/services/firma.service';
import { Profesor } from '../../../core/models/profesor.model';
import { CrearPlanDeTrabajo, PlanDeTrabajoModel } from '../../../core/models/planDeTrabajo.model';
import { ModalCrearPTComponent } from '../modales/modal-crear-pt/modal-crear-pt';
import { ModalConfirmacionComponent } from '../modales/modal-confirmacion/modal-confirmacion';
import { PlanTrabajoViewerComponent } from '../modales/plan-trabajo-viewer/plan-trabajo-viewer.component';
import { ModalMostrarRechazoComponent } from '../modales/modal-mostrar-rechazo/modal-mostrar-rechazo.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { PlanTrabajoDescargarService } from '../../../core/services/plan-trabajo-descargar.service';
import { AuthService } from '@microfrontends/shared-services';
import { CreateAuditoria } from '../../../core/models/auditoria.model';
import { NotificacionesPlanTrabajoService } from '../../../core/services/notificaciones-plan-trabajo.service';
import { PlanTrabajoRealtimeService } from '../../../core/services/plan-trabajo-realtime.service';

interface ProfesorConPlan extends Profesor {
  planDeTrabajo: PlanDeTrabajoModel | null;
  estado: string;
  severityEstado?: 'success' | 'info' | 'warn' | 'danger';
}

interface PeriodoAcademico {
  label: string;
  anio: number;
  periodo: number;
}

type CampoFiltro = 'nombres' | 'numIdentificacion';

@Component({
  selector: 'app-director-home',
  styleUrls: ['../modales/modal-crear-pt/modal-crear-pt.scss'],
  templateUrl: './director-home.html',
  standalone: true,
  imports: [
    TableModule,
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    DialogModule,
    AvatarModule,
    TooltipModule,
    ModalCrearPTComponent,
    ModalConfirmacionComponent,
    PlanTrabajoViewerComponent,
    ModalMostrarRechazoComponent,
    ToastModule,
    InputTextModule,
    FormsModule,
    SelectModule
  ],
  providers: [
    MessageService
  ]
})
export class DirectorHome implements OnInit {

  fotoPerfilUrl: string | null = null;

  data = signal<ProfesorConPlan[]>([]);
  allData = signal<ProfesorConPlan[]>([]);
  cargando = signal<boolean>(false);
  profesorDirector = signal<Profesor | null>(null);

  filtros = signal<{
    programa: string | null;
    nombres: string;
    numIdentificacion: string;
  }>({
    programa: null,
    nombres: '',
    numIdentificacion: ''
  });

  private searchSubject = new Subject<{ campo: CampoFiltro; valor: string }>();
  private searchSubscription?: Subscription;

  motivoRechazoSeleccionado = signal<string | null>(null);
  displayModalMotivo = signal<boolean>(false);
  cargandoMotivo = signal<boolean>(false);
  private readonly messageService = inject(MessageService);
  profesorSeleccionado: ProfesorConPlan | null = null;
  displayModalVisualizacion = false;
  profesorParaVisualizar: ProfesorConPlan | null = null;
  displayModalCrear = false;
  displayModalConfirmacion = false;
  profesorParaCrear: Profesor | null = null;
  cargandoCreacion = false;
  cargandoAprobacion = false;
  showPlanViewer = false;

  periodosAcademicos: PeriodoAcademico[] = [];
  periodoSeleccionado = signal<PeriodoAcademico | null>(null);
  mostrarDropdownPeriodo = signal<boolean>(false);

  constructor(
    private profesorService: ProfesorService,
    private planDeTrabajoService: PlanDeTrabajoService,
    private firmaService: FirmaService,
    private auditoriaService: AuditoriaService,
    private router: Router,
    private planTrabajoDescargarService: PlanTrabajoDescargarService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private notificacionesService: NotificacionesPlanTrabajoService,
    private realtimeService: PlanTrabajoRealtimeService
  ) { 
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      
      // Si hay un cambio relevante, recargar datos
      if (trigger > 0) {
        untracked(() => {
          
          const planAprobado = this.realtimeService.planAprobado();
          const planRechazado = this.realtimeService.planRechazado();

          // Mostrar notificación al usuario
          if (planAprobado) {
            this.messageService.add({
              severity: 'success',
              summary: 'Plan Aprobado',
              detail: 'Un profesor ha aprobado su plan de trabajo',
              life: 5000
            });
            this.realtimeService.resetSignal('aprobado');
          }
          
          if (planRechazado) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Plan Rechazado',
              detail: 'Un profesor ha rechazado su plan de trabajo',
              life: 5000
            });
            this.realtimeService.resetSignal('rechazado');
          }
          
          // Recargar los profesores y sus planes
          const profesor = this.profesorDirector();
          if (profesor?.programa) {
            this.cargarProfesoresPrograma(profesor.programa);
          }
        });
      }
    });
  }

  ngOnInit(): void {
    this.generarPeriodosAcademicos();
    this.cargarDirectorSegunRol();
    this.configurarBusqueda();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  private cargarDirectorSegunRol(): void {
    const roles = this.authService.getUserRoles();
    const esAdmin = roles.includes('ADMIN');
    const idFromUrl = this.route.snapshot.queryParamMap.get('id');

    if (esAdmin) {
      if (idFromUrl) {
        this.cargarDirectorPorId(idFromUrl);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin selección',
          detail: 'Seleccione un director desde el panel de administración.'
        });
      }
    } else {
      const authUser = this.authService.getCurrentUser();
      if (authUser?.username) {
        this.cargarDirectorPorId(authUser.username);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo identificar al director.'
        });
      }
    }
  }

  private cargarDirectorPorId(id: string): void {
    this.cargando.set(true);
    this.profesorService.getById(id).subscribe({
      next: (profesor) => {
        if (profesor && profesor.cargo === 'DIRECTOR DE PROGRAMA') {
          this.profesorDirector.set(profesor);
          this.filtros.update(f => ({ ...f, programa: profesor.programa }));
          this.cargarProfesoresPrograma(profesor.programa);
        } else {
          this.cargando.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Acceso inválido',
            detail: 'El usuario no es un Director de Programa.'
          });
        }
      },
      error: (error) => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar al director.'
        });
      }
    });
  }

  private getDirectorIdFromAuth(): string | null {
    const authUser = this.authService.getCurrentUser();
    return authUser?.username || null;
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

  aplicarFiltroTexto(campo: CampoFiltro, valor: string): void {
    this.filtros.update((f) => ({ ...f, [campo]: valor }));
    this.searchSubject.next({ campo, valor });
  }

  private aplicarFiltros(): void {
    let datos = this.allData();
    const filtrosActuales = this.filtros();

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
      datos = datos.filter((p) => p.numIdentificacion.includes(cedulaBusqueda));
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
    this.filtros.update(f => ({
      ...f,
      nombres: '',
      numIdentificacion: ''
    }));
    this.onlyNumbers.set(true);
    this.data.set(this.allData());
    this.profesorSeleccionado = null;
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

    const periodoDefault = periodos.find(p => p.anio === anioDefecto && p.periodo === periodoDefecto)
      || periodos[0];

    this.periodosAcademicos = periodos;
    this.periodoSeleccionado.set(periodoDefault);
  }

  async cargarDatos(): Promise<void> {
    try {
      this.cargando.set(true);
      const directorId = this.getDirectorIdFromAuth();

      if (!directorId) {
        this.showError('Acceso denegado: no se pudo identificar al director.');
        this.cargando.set(false);
        return;
      }

      this.profesorService.getById(directorId).subscribe({
        next: (profesor) => {
          if (profesor && profesor.cargo === 'DIRECTOR DE PROGRAMA') {
            this.profesorDirector.set(profesor);
            this.filtros.update(f => ({ ...f, programa: profesor.programa }));
            this.cargarProfesoresPrograma(profesor.programa);
          } else {
            this.showError('Acceso inválido: el usuario no es un director de programa registrado.');
            this.cargando.set(false);
          }
        },
        error: (error) => {
          this.showError('Error al cargar información del director');
          this.cargando.set(false);
        }
      });
    } catch (error) {
      this.showError('Error al cargar datos');
      this.cargando.set(false);
    }
  }

  cargarProfesoresPrograma(programa: string): void {
    this.profesorService.getByPrograma(programa).subscribe({
      next: async (profesores) => {

        const profesoresProgram = this.profesorService.filterByCargo(profesores);

        const profesoresConPlan = await this.cargarPlanesDeTrabajoParaProfesores(profesoresProgram);
        const profesoresOrdenados = this.ordenarPorCargo(profesoresConPlan);

        this.allData.set(profesoresOrdenados);
        this.data.set(profesoresOrdenados);
        this.cargando.set(false);
      },
      error: (error) => {
        this.showError('Error al cargar profesores del programa');
        this.cargando.set(false);
      }
    });
  }

  cargarMotivoRechazo(idPt: string): void {
    this.cargandoMotivo.set(true);
    this.planDeTrabajoService.getMotivoByPtId(idPt)
      .subscribe({
        next: (motivo) => {
          this.motivoRechazoSeleccionado.set(motivo);
          this.displayModalMotivo.set(true);
          this.cargandoMotivo.set(false);
        },
        error: (error) => {
          this.showError('Error al cargar motivo de rechazo');
          this.motivoRechazoSeleccionado.set('No se pudo cargar el motivo de rechazo');
          this.displayModalMotivo.set(true);
          this.cargandoMotivo.set(false);
        }
      });
  }

  onVerMotivoRechazo(profesor: ProfesorConPlan): void {
    if (profesor.planDeTrabajo?.id) {
      this.cargarMotivoRechazo(profesor.planDeTrabajo.id);
    } else {
      this.showError('No se encontró el plan de trabajo del profesor');
    }
  }

  cerrarModalMotivo(): void {
    this.displayModalMotivo.set(false);
    this.motivoRechazoSeleccionado.set(null);
  }

  tieneRechazo(profesor: ProfesorConPlan): boolean {
    return profesor.planDeTrabajo?.rechazado === true;
  }

  puedeEditarPlan(profesor: ProfesorConPlan): boolean {
    if (!profesor.planDeTrabajo) return false;
    const plan = profesor.planDeTrabajo;
    if (plan.estado === 'Suspendido' || plan.estado === 'Inactivado') return false;
    return !plan.enviadoProfesor || plan.rechazado === true;
  }

  async onDescargarPTIndividual(profesor: ProfesorConPlan): Promise<void> {
    const periodo = this.periodoSeleccionado();
    const director = this.profesorDirector();

    if (!periodo || !director) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Faltan datos de contexto (período o director)'
      });
      return;
    }
    const dedicacion = profesor.dedicacion?.toUpperCase().includes('COMPLETO')
      ? 'TIEMPO COMPLETO'
      : 'MEDIO TIEMPO';

    const profesorCompatible: import('../../../core/services/plan-trabajo-descargar.service').ProfesorConPlan = {
      numIdentificacion: profesor.numIdentificacion,
      nombres: profesor.nombres,
      apellidos: profesor.apellidos,
      programa: profesor.programa,
      facultad: profesor.facultad,
      cargo: profesor.cargo,
      dedicacion: dedicacion,
      planDeTrabajo: profesor.planDeTrabajo,
      nivelEducativo: profesor.nivelEducativo,
      escalafon: profesor.escalafon,
      vinculacion: profesor.vinculacion,
    };

    const contexto = {
      periodo: { anio: periodo.anio, periodo: periodo.periodo },
      decano: {
        nombres: director.nombres,
        apellidos: director.apellidos,
        facultad: director.facultad
      }
    };

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Generando PT',
        detail: `Generando PDF de ${profesor.nombres} ${profesor.apellidos}...`,
        life: 3000
      });

      await this.planTrabajoDescargarService.descargarPTIndividual(profesorCompatible, contexto);

      this.messageService.add({
        severity: 'success',
        summary: 'PT descargado',
        detail: `Se descargó el PT de ${profesor.nombres} ${profesor.apellidos}`
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo generar el PT. Inténtelo de nuevo.'
      });
    }
  }

  async cargarPlanesDeTrabajoParaProfesores(profesores: Profesor[]): Promise<ProfesorConPlan[]> {
    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      return profesores.map(profesor => ({
        ...profesor,
        planDeTrabajo: null,
        estado: 'Sin periodo seleccionado',
        severityEstado: 'danger'
      }));
    }

    const profesoresIds = profesores.map((p) => p.numIdentificacion);
    try {
      const planes: PlanDeTrabajoModel[] = (await this.planDeTrabajoService
        .getBatchPlanes(profesoresIds, periodo.anio, periodo.periodo)
        .toPromise()) || [];
      return profesores.map((profesor) => {
        const plan = planes.find((p: PlanDeTrabajoModel) => p.idProfesor === profesor.numIdentificacion);
        if (plan) {
          const estadoInfo = this.calcularEstado(plan);
          return {
            ...profesor,
            planDeTrabajo: plan,
            estado: estadoInfo.estado,
            severityEstado: estadoInfo.severity
          };
        } else {
          return {
            ...profesor,
            planDeTrabajo: null,
            estado: 'Sin plan',
            severityEstado: 'danger'
          };
        }
      });
    } catch (error) {
      return profesores.map((profesor) => ({
        ...profesor,
        planDeTrabajo: null,
        estado: 'Sin plan',
        severityEstado: 'danger'
      }));
    }
  }

  calcularEstado(plan: PlanDeTrabajoModel | null | undefined): { estado: string, severity: 'success' | 'info' | 'warn' | 'danger' } {
    if (!plan) {
      return { estado: 'Sin plan', severity: 'danger' };
    }

    if (plan.rechazado) {
      return { estado: 'Rechazado', severity: 'danger' };
    }

    if (plan.estado === 'Suspendido') {
      return { estado: 'Suspendido', severity: 'warn' };
    }

    if (plan.estado === 'Inactivado') {
      return { estado: 'Inactivado', severity: 'danger' };
    }

    // Estado especial: Cambio de horas aprobado por Vicerrectoría
    if (plan.estado === 'Cambio de Horas Aprobado - Pendiente Revisión') {
      return { estado: 'Cambio de Horas Aprobado - Requiere Revisión', severity: 'info' };
    }

    const { enviadoProfesor, firmaProfesor, firmaDirector, firmaDecano } = plan;

    if (enviadoProfesor && firmaProfesor && firmaDirector && firmaDecano) {
      return { estado: 'Aprobado por Decanatura', severity: 'success' };
    }

    if (enviadoProfesor && firmaProfesor && firmaDirector && !firmaDecano) {
      return { estado: 'Esperando aprobación de decanatura', severity: 'warn' };
    }

    if (enviadoProfesor && firmaProfesor && !firmaDirector) {
      return { estado: 'Esperando envío a decanatura', severity: 'info' };
    }

    if (enviadoProfesor && !firmaProfesor) {
      return { estado: 'Esperando aprobación profesor', severity: 'info' };
    }

    return { estado: 'Sin enviar al profesor', severity: 'warn' };
  }

  onCambioPeriodo(periodo: PeriodoAcademico): void {
    this.periodoSeleccionado.set(periodo);
    this.mostrarDropdownPeriodo.set(false);
    const programa = this.filtros().programa;
    if (programa) {
      this.cargando.set(true);
      this.cargarProfesoresPrograma(programa);
    }
  }

  toggleDropdownPeriodo(): void {
    this.mostrarDropdownPeriodo.update(valor => !valor);
  }

  cerrarDropdownPeriodo(): void {
    this.mostrarDropdownPeriodo.set(false);
  }

  seleccionarProfesor(profesor: ProfesorConPlan): void {
    this.profesorSeleccionado = profesor;
  }

  onCerrarPlanViewer(): void {
    this.showPlanViewer = false;
  }

  onVer(profesor: ProfesorConPlan): void {
    if (profesor.planDeTrabajo) {
      this.profesorParaVisualizar = profesor;
      this.showPlanViewer = true;
    } else {
      this.showWarn('El profesor no tiene un plan de trabajo para visualizar');
    }
  }

  onEditar(profesor: ProfesorConPlan): void {
    if (profesor.planDeTrabajo) {
      sessionStorage.setItem('planDeTrabajoActual', JSON.stringify(profesor.planDeTrabajo));

      this.router.navigate(['/app/plan-de-trabajo'], {
        state: { planDeTrabajo: profesor.planDeTrabajo }
      });
    }
  }

  onCrearPlan(profesor: ProfesorConPlan): void {
    this.profesorParaCrear = profesor;
    this.displayModalCrear = true;
  }

  async handleCrearPlan(data: { plantilla: string }): Promise<void> {
    if (!this.profesorParaCrear) {
      this.showError('No hay profesor seleccionado');
      return;
    }

    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      this.showError('No hay periodo académico seleccionado');
      return;
    }

    this.cargandoCreacion = true;

    try {
      const decano = await this.profesorService
        .getDecanoByFacultad(this.profesorParaCrear.facultad)
        .toPromise();

      if (!decano || !decano.numIdentificacion) {
        this.showError('No se encontró un decano para la facultad seleccionada');
        this.cargandoCreacion = false;
        return;
      }

      const esDirector = this.profesorParaCrear.cargo === "DIRECTOR DE PROGRAMA";

      const nuevoPlan: CrearPlanDeTrabajo = {
        idFacultad: this.profesorParaCrear.facultad,
        idDecano: decano.numIdentificacion,
        idPrograma: this.profesorParaCrear.programa,
        idDirector: this.getDirectorIdFromAuth()!,
        idProfesor: this.profesorParaCrear.numIdentificacion,
        anio: periodo.anio,
        periodo: periodo.periodo,
        idPlantilla: data.plantilla,
        esDirector: esDirector
      };

      this.planDeTrabajoService.create(nuevoPlan).subscribe({
        next: (planCreado) => {
          if (planCreado) {
            this.showSuccess('Plan de trabajo creado exitosamente');
          }

          this.displayModalCrear = false;
          this.profesorParaCrear = null;
          this.cargandoCreacion = false;

          const programa = this.filtros().programa;
          if (programa) {
            this.cargarProfesoresPrograma(programa);
          }
        },
        error: (error) => {
          this.showError('Error al crear plan de trabajo');
          this.cargandoCreacion = false;
        }
      });

    } catch (error) {
      this.showError('Error al obtener información del decano');
      this.cargandoCreacion = false;
    }
  }

  handleCancelarCrear(): void {
    this.displayModalCrear = false;
    this.profesorParaCrear = null;
  }

  tienePlanDeTrabajo(profesor: ProfesorConPlan): boolean {
    return !!profesor.planDeTrabajo;
  }

  onAprobarPlanesClick(): void {
    this.displayModalConfirmacion = true;
  }

  handleConfirmarAprobacion(): void {
    const planesParaAprobar = this.obtenerPlanesParaAprobar();

    if (planesParaAprobar.length === 0) {
      this.showWarn('No hay planes de trabajo pendientes de aprobación');
      return;
    }

    this.cargandoAprobacion = true;
    let planesAprobados = 0;
    let planesConError = 0;

    planesParaAprobar.forEach((plan) => {
      this.firmaService.firmarComoDirector(plan.id).subscribe({
        next: () => {
          planesAprobados++;
          this.auditoriaService.create({
            idPt: plan.id,
            tipoCambio: 'Enviado',
            accion: `Enviado a decanatura por ${this.nombreDirector}`
          }).subscribe();

          if (planesAprobados + planesConError === planesParaAprobar.length) {
            this.enviarNotificacionDecano(planesAprobados);
            this.finalizarAprobacionMasiva(planesAprobados, planesConError);
          }
        },
        error: (error) => {
          planesConError++;

          if (planesAprobados + planesConError === planesParaAprobar.length) {
            this.finalizarAprobacionMasiva(planesAprobados, planesConError);
          }
        }
      });
    });
  }

  private enviarNotificacionDecano(cantidadPlanes: number): void {
    const director = this.profesorDirector();
    if (!director) {
      return;
    }



    this.profesorService.getByFacultad(director.facultad).subscribe({
      next: (profesores) => {
        const decano = profesores.find(p => p.cargo === 'DECANO (A)');
        if (decano && this.periodoSeleccionado()) {


          this.notificacionesService.notificarAprobacionDirector({
            emailDirector: director.numIdentificacion,
            nombreDirector: `${director.nombres} ${director.apellidos}`,
            emailDecano: decano.numIdentificacion,
            nombreDecano: `${decano.nombres} ${decano.apellidos}`,
            programa: director.programa,
            periodo: this.periodoSeleccionado()!.periodo,
            anio: this.periodoSeleccionado()!.anio,
            cantidadPlanes: cantidadPlanes
          }).subscribe({
            next: (response) => {},
            error: (err) => {}
          });
        } else {
          // No se encontró decano para la facultad
        }
      },
      error: (err) => {}
    });
  }

  get profesoresAprobados(): ProfesorConPlan[] {
    return this.data().filter(
      profesor =>
        profesor.planDeTrabajo &&
        profesor.planDeTrabajo.enviadoProfesor &&
        profesor.planDeTrabajo.firmaProfesor &&
        profesor.planDeTrabajo.firmaDirector &&
        profesor.planDeTrabajo.firmaDecano
    );
  }

  private mapearProfesorParaDescarga(profesor: ProfesorConPlan): import('../../../core/services/plan-trabajo-descargar.service').ProfesorConPlan {
    const dedicacion = profesor.dedicacion?.toUpperCase().includes('COMPLETO')
      ? 'TIEMPO COMPLETO'
      : 'MEDIO TIEMPO';

    return {
      numIdentificacion: profesor.numIdentificacion,
      nombres: profesor.nombres,
      apellidos: profesor.apellidos,
      programa: profesor.programa,
      facultad: profesor.facultad,
      cargo: profesor.cargo,
      dedicacion: dedicacion,
      planDeTrabajo: profesor.planDeTrabajo,
      nivelEducativo: profesor.nivelEducativo,
      escalafon: profesor.escalafon,
      vinculacion: profesor.vinculacion,
    };
  }

  async onExportarPTClick(): Promise<void> {
    const profesores = this.profesoresAprobados;
    if (profesores.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin PTs', detail: 'No hay planes aprobados para exportar' });
      return;
    }

    const periodo = this.periodoSeleccionado();
    const director = this.profesorDirector();
    if (!periodo || !director) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Faltan datos de contexto (período o director)' });
      return;
    }

    const contexto = {
      periodo: { anio: periodo.anio, periodo: periodo.periodo },
      decano: {
        nombres: director.nombres,
        apellidos: director.apellidos,
        facultad: director.facultad
      }
    };

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Generando PDF',
        detail: `Generando consolidado con ${profesores.length} planes...`,
        life: 3000
      });
      const profesoresParaDescarga = profesores.map(p => this.mapearProfesorParaDescarga(p));
      await this.planTrabajoDescargarService.exportarPTConsolidado(profesoresParaDescarga, contexto);

      this.messageService.add({
        severity: 'success',
        summary: 'PDF generado',
        detail: `Se descargó el consolidado con ${profesores.length} planes de trabajo`
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al generar PDF',
        detail: error.message || 'Ocurrió un error. Inténtelo de nuevo.'
      });
    }
  }

  async onExportarZIPClick(): Promise<void> {
    const profesores = this.profesoresAprobados;
    if (profesores.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin PTs', detail: 'No hay planes aprobados para exportar' });
      return;
    }

    const periodo = this.periodoSeleccionado();
    const director = this.profesorDirector();
    if (!periodo || !director) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Faltan datos de contexto (período o director)' });
      return;
    }

    const contexto = {
      periodo: { anio: periodo.anio, periodo: periodo.periodo },
      decano: {
        nombres: director.nombres,
        apellidos: director.apellidos,
        facultad: director.facultad
      }
    };

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Generando ZIP',
        detail: `Generando ZIP con ${profesores.length} planes... Esto puede tardar unos momentos.`,
        life: 3000
      });

      const profesoresParaDescarga = profesores.map(p => this.mapearProfesorParaDescarga(p));
      await this.planTrabajoDescargarService.exportarZIP(profesoresParaDescarga, contexto);

      this.messageService.add({
        severity: 'success',
        summary: 'ZIP generado',
        detail: `Se descargó el archivo ZIP con los planes de trabajo`
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al generar ZIP',
        detail: error.message || 'Ocurrió un error. Inténtelo de nuevo.'
      });
    }
  }

  private finalizarAprobacionMasiva(aprobados: number, errores: number): void {
    this.cargandoAprobacion = false;
    this.displayModalConfirmacion = false;

    if (errores === 0) {
      this.showSuccess(`${aprobados} plan${aprobados > 1 ? 'es' : ''} aprobado${aprobados > 1 ? 's' : ''} exitosamente`);
    } else if (aprobados === 0) {
      this.showError(`Error al aprobar ${errores} plan${errores > 1 ? 'es' : ''}`);
    } else {
      this.showWarn(`${aprobados} plan${aprobados > 1 ? 'es' : ''} aprobado${aprobados > 1 ? 's' : ''}, ${errores} con error${errores > 1 ? 'es' : ''}`);
    }

    const programa = this.filtros().programa;
    if (programa) {
      this.cargarProfesoresPrograma(programa);
    }
  }

  handleCancelarAprobacion(): void {
    this.displayModalConfirmacion = false;
  }

  obtenerPlanesParaAprobar(): PlanDeTrabajoModel[] {
    return this.data()
      .filter(profesor =>
        profesor.planDeTrabajo &&
        profesor.planDeTrabajo.enviadoProfesor &&
        profesor.planDeTrabajo.firmaProfesor &&
        !profesor.planDeTrabajo.firmaDirector
      )
      .map(profesor => profesor.planDeTrabajo as PlanDeTrabajoModel);
  }

  handleCerrarVisualizacion(): void {
    this.showPlanViewer = false;
    this.profesorParaVisualizar = null;
  }

  get cantidadPlanesParaAprobar(): number {
    return this.obtenerPlanesParaAprobar().length;
  }

  get puedeAprobarPlanes(): boolean {
    // Lógica extendida:
    // 1. Permitir enviar individualmente planes con motivo de rechazo solo si NO hay otros planes activos sin motivo de rechazo.
    // 2. Si hay otros activos sin motivo de rechazo, solo permitir si todos están aprobados y listos para enviar.
    // 3. Si ya existen planes enviados a decanatura (firmaDirector=true), permitir aprobar individualmente los que aún no tienen la firma del director.
    const profesores = this.data();
    if (profesores.length === 0) return false;

    // 1. Planes con motivo de rechazo y listos para enviar
    const planesConMotivoRechazo = profesores.filter(p => {
      const plan = p.planDeTrabajo;
      return plan && plan.motivoRechazo && plan.enviadoProfesor && plan.firmaProfesor && !plan.firmaDirector;
    });

    // 2. Planes activos sin motivo de rechazo (y no aprobados para enviar)
    const planesActivosSinMotivo = profesores.filter(p => {
      const plan = p.planDeTrabajo;
      return plan && !plan.motivoRechazo && (!plan.firmaDirector) && plan.enviadoProfesor && plan.firmaProfesor;
    });

    // 3. Planes ya enviados a decanatura (firmaDirector=true)
    const planesEnviadosDecanatura = profesores.filter(p => {
      const plan = p.planDeTrabajo;
      return plan && plan.firmaDirector;
    });

    // Si hay al menos un plan con motivo de rechazo listo para enviar
    if (planesConMotivoRechazo.length > 0) {
      // Solo permitir si NO hay otros planes activos sin motivo de rechazo
      if (planesActivosSinMotivo.length === 0) {
        return true;
      } else {
        // Si hay otros activos sin motivo de rechazo, solo permitir si todos están aprobados y listos para enviar
        return profesores.every(p => {
          const plan = p.planDeTrabajo;
          if (!plan) return false;
          return plan.enviadoProfesor && plan.firmaProfesor && !plan.firmaDirector;
        });
      }
    }

    // Si ya existen planes enviados a decanatura, permitir aprobar individualmente los que aún no tienen la firma del director
    if (planesEnviadosDecanatura.length > 0) {
      // Si hay al menos un plan pendiente de firma de director, permitir aprobar individualmente
      const hayPendientesFirmaDirector = profesores.some(p => {
        const plan = p.planDeTrabajo;
        return plan && plan.enviadoProfesor && plan.firmaProfesor && !plan.firmaDirector;
      });
      if (hayPendientesFirmaDirector) {
        return true;
      }
    }

    // Si no hay planes con motivo de rechazo ni enviados a decanatura, solo permitir si todos están aprobados y listos para enviar
    return profesores.every(p => {
      const plan = p.planDeTrabajo;
      if (!plan) return false;
      return plan.enviadoProfesor && plan.firmaProfesor && !plan.firmaDirector;
    });
  }

  get nombreDirector(): string {
    const director = this.profesorDirector();
    return director ? `${director.nombres} ${director.apellidos}` : '';
  }

  get mensajeConfirmacion(): string {
    const cantidad = this.cantidadPlanesParaAprobar;
    return `¿Está seguro de que desea enviar ${cantidad} plan${cantidad > 1 ? 'es' : ''} de trabajo a decanatura? Esta acción aprobará todos los planes pendientes.`;
  }

  get periodoSeleccionadoLabel(): string {
    const periodo = this.periodoSeleccionado();
    return periodo ? periodo.label : 'Seleccione un periodo';
  }

  get mensajeTablaVacia(): string {
    const filtrosActuales = this.filtros();
    if (filtrosActuales.nombres || filtrosActuales.numIdentificacion) {
      return 'No se encontraron resultados con los filtros aplicados';
    }
    return 'No hay profesores para mostrar';
  }

  private ordenarPorCargo(profesores: ProfesorConPlan[]): ProfesorConPlan[] {
    const ordenCargos: Record<string, number> = {
      'DIRECTOR DE PROGRAMA': 1,
      'ASISTENTE DE PROGRAMA': 2,
      'PROFESOR': 3
    };

    return profesores.sort((a, b) => {
      const ordenA = ordenCargos[a.cargo] || 999;
      const ordenB = ordenCargos[b.cargo] || 999;
      return ordenA - ordenB;
    });
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
      life: 2000
    });
  }

  private showWarn(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: message,
      life: 2000
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 2000
    });
  }
}