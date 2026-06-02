import { Component, Input, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { SeccionService } from '../../../../core/services/seccion.service';
import { SeccionHijo, SeccionPadre } from 'apps/planes_de_trabajo/src/app/core/models/seccion.model';
import { PlanDeTrabajoService } from '../../../../core/services/planDeTrabajo.service';
import { ActividadesPlanDeTrabajoService } from '../../../../core/services/actividadesPlanDeTrabajo.service';
import { CursoService } from '../../../../core/services/curso.service';
import { FirmaService } from '../../../../core/services/firma.service';
import { PlanDeTrabajoModel } from '../../../../core/models/planDeTrabajo.model';
import { ActividadPlanDeTrabajo } from '../../../../core/models/actividadesPlanDeTrabajo.model';
import { Curso } from '../../../../core/models/curso.model';
import { Profesor } from 'apps/planes_de_trabajo/src/app/core/models/profesor.model';
import { ProfesorService } from 'apps/planes_de_trabajo/src/app/core/services/profesor.service';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { InvestigacioneService } from 'apps/planes_de_trabajo/src/app/core/services/investigaciones.service';
import { Investigaciones } from 'apps/planes_de_trabajo/src/app/core/models/investigaciones.model';
import { Message } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NotificacionesPlanTrabajoService } from '../../../../core/services/notificaciones-plan-trabajo.service';

@Component({
  selector: 'app-plan-trabajo-viewer',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    DividerModule,
    PanelModule,
    ScrollPanelModule,
    BadgeModule,
    SkeletonModule,
    DialogModule,
    ToastModule,
    TooltipModule,
    FormsModule,
    InputNumberModule,
    TextareaModule,
    Message
  ],
  templateUrl: './plan-trabajo-viewer.component.html',
  styleUrl: './plan-trabajo-viewer.component.scss'
})
export class PlanTrabajoViewerComponent implements OnInit, OnDestroy {
  @Input() planDeTrabajoId!: string;
  @Input() profesorId!: string;
  @Input() rolUsuario: 'DECANO' | 'DIRECTOR' | 'PROFESOR' | string = 'PROFESOR';
  @Input() modoEdicion: boolean = false;

  seccionesPadres: SeccionPadre[] = [];
  planDeTrabajo: PlanDeTrabajoModel | null = null;
  actividadesPlanDeTrabajo: ActividadPlanDeTrabajo[] = [];
  asignaturas: Curso[] = [];
  loading = true;
  error = '';
  totalHorasAsignadas = 0;
  totalHorasDisponibles = 40;
  porcentajeCompletado = 0;

  profesorInfo: Profesor | null = null;
  directorInfo: Profesor | null = null;
  decanoInfo: Profesor | null = null;
  rechazadoPorDecano = false;
  mostrarModalMotivoRechazo = false;
  get modoResumido(): boolean { return !this.modoEdicion; }
  investigacionesPorSeccion: Map<string, Investigaciones[]> = new Map();
  mostrarModalConfirmacionCambio = false;
  descripcionCambio = '';

  horasCursos = 0;
  horasNormales = 0;
  horasInvestigacion = 0;
  horasTotales = 40;

  estadoFirmas: {
    enviadoProfesor: boolean;
    firmaProfesor: boolean;
    firmaDirector: boolean;
    firmaDecano: boolean;
  } = {
      enviadoProfesor: false,
      firmaProfesor: false,
      firmaDirector: false,
      firmaDecano: false
    };

  // Debounce para evitar toasts duplicados 
  private toastSuccessSubject = new Subject<string>();
  private toastSuccessSubscription = this.toastSuccessSubject.pipe(
    debounceTime(600),
    distinctUntilChanged()
  ).subscribe(detail => {
    if (detail) {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail,
        life: 3000
      });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    private seccionService: SeccionService,
    private planDeTrabajoService: PlanDeTrabajoService,
    private actividadesPlanDeTrabajoService: ActividadesPlanDeTrabajoService,
    private investigacionService: InvestigacioneService,
    private cursoService: CursoService,
    private firmaService: FirmaService,
    private profesorService: ProfesorService,
    private messageService: MessageService,
    private notificacionesService: NotificacionesPlanTrabajoService
  ) { }

  @ViewChild('planContent') planContent?: ElementRef;
  @Output() estadoCambiado = new EventEmitter<string>();

  ngAfterViewInit(): void {
    const seccionObjetivo = localStorage.getItem('seccionObjetivo');
    if (seccionObjetivo) {
      setTimeout(() => {
        const elemento = document.getElementById(seccionObjetivo);
        if (elemento) {
          const originalBg = elemento.style.backgroundColor;
          elemento.style.backgroundColor = 'rgba(79, 195, 247, 0.2)';
          elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            elemento.style.backgroundColor = originalBg;
          }, 1500);
        }
        localStorage.removeItem('seccionObjetivo');
      }, 100);
    }
  }

  ngOnInit() {
    this.cargarPlanDeTrabajo();
    const checkAndScroll = () => {
      const seccionId = localStorage.getItem('seccionObjetivo');
      if (seccionId && !this.loading && this.planDeTrabajo) {
        setTimeout(() => {
          const elemento = document.getElementById(seccionId);
          if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
            elemento.style.backgroundColor = 'rgba(79, 195, 247, 0.2)';
            setTimeout(() => {
              elemento.style.backgroundColor = '';
            }, 1500);
          }
          localStorage.removeItem('seccionObjetivo');
        }, 300);
      }
    };
    checkAndScroll();
  }

  ngOnDestroy() {
    this.toastSuccessSubscription.unsubscribe();
  }

  cargarPlanDeTrabajo() {
    this.loading = true;
    this.error = '';

    this.planDeTrabajoService.getById(this.planDeTrabajoId)
      .subscribe({
        next: (planDeTrabajo: PlanDeTrabajoModel) => {
          this.planDeTrabajo = planDeTrabajo;
          this.rechazadoPorDecano = (planDeTrabajo.rechazado === true &&
            planDeTrabajo.estado !== 'RECHAZADO'
          );
          this.cargarSecciones(planDeTrabajo.plantilla.id);
          this.cargarActividadesPlanDeTrabajo();
          this.cargarAsignaturas();
          this.cargarEstadoFirmas();
          this.cargarInformacionFirmantes(planDeTrabajo);
        },
        error: (error: any) => {
          this.error = 'Error al cargar el plan de trabajo';
          this.loading = false;
        }
      });
  }

  private cargarEstadoFirmas(): void {
    if (!this.planDeTrabajo) return;
    if (this.rechazadoPorDecano) {
      this.estadoFirmas = {
        enviadoProfesor: this.planDeTrabajo.enviadoProfesor || false,
        firmaProfesor: this.planDeTrabajo.firmaProfesor || false,
        firmaDirector: this.planDeTrabajo.firmaDirector || false,
        firmaDecano: this.planDeTrabajo.firmaDecano || false
      };
    } else {
      this.firmaService.getEstadoPlanDeTrabajo(this.planDeTrabajoId)
        .subscribe({
          next: (estado) => {
            this.estadoFirmas = {
              enviadoProfesor: estado.enviadoProfesor,
              firmaProfesor: estado.firmaProfesor,
              firmaDirector: estado.firmaDirector,
              firmaDecano: estado.firmaDecano
            };
          },
          error: (error) => { }
        });
    }
  }

  private cargarInformacionFirmantes(planDeTrabajo: PlanDeTrabajoModel): void {
    this.profesorService.getById(this.profesorId).subscribe({
      next: (profesor) => {
        this.profesorInfo = profesor;
        if (profesor) {
          this.totalHorasDisponibles = this.determinarHorasDisponibles(profesor);
          this.horasTotales = this.totalHorasDisponibles;
          this.calcularTotales();
        }
      },
      error: (error) => { }
    });

    if (planDeTrabajo.idDirector) {
      this.profesorService.getById(planDeTrabajo.idDirector).subscribe({
        next: (director) => { this.directorInfo = director; },
        error: (error) => { }
      });
    }

    if (planDeTrabajo.idDecano) {
      this.profesorService.getById(planDeTrabajo.idDecano).subscribe({
        next: (decano) => { this.decanoInfo = decano; },
        error: (error) => { }
      });
    }
  }

  private determinarHorasDisponibles(profesor: Profesor): number {
    if (profesor.dedicacion) {
      const dedicacionUpper = profesor.dedicacion.toUpperCase();
      if (dedicacionUpper.includes('TIEMPO COMPLETO') || dedicacionUpper === 'TC') {
        return 40;
      }
      if (dedicacionUpper.includes('MEDIO TIEMPO') || dedicacionUpper === 'MT') {
        return 20;
      }
    }

    if (profesor.escalafon) {
      const escalafonUpper = profesor.escalafon.toUpperCase();
      if (escalafonUpper.includes('TC') || escalafonUpper.includes('TIEMPO COMPLETO')) {
        return 40;
      }
      if (escalafonUpper.includes('MT') || escalafonUpper.includes('MEDIO TIEMPO')) {
        return 20;
      }
    }
    return 20;
  }

  cargarSecciones(plantillaId: string) {
    this.seccionService.getByPlantilla(plantillaId)
      .subscribe({
        next: (secciones: SeccionPadre[]) => {
          this.seccionesPadres = secciones;
          this.cargarInvestigaciones();
        },
        error: (error: any) => { }
      });
  }

  cargarInvestigaciones(): void {
    if (!this.planDeTrabajo) return;
    const seccionesInvestigativas = this.obtenerSeccionesInvestigativas();

    if (seccionesInvestigativas.length === 0) {
      this.investigacionesPorSeccion.clear();
      this.calcularTotales();
      return;
    }
    this.investigacionesPorSeccion.clear();
    const cargas = seccionesInvestigativas.map(seccion =>
      this.investigacionService.getByPt(this.planDeTrabajoId, seccion.id)
        .toPromise()
        .then(resultado => {
          const investigaciones = (!resultado) ? [] : (Array.isArray(resultado) ? resultado : [resultado]);
          this.investigacionesPorSeccion.set(seccion.id, investigaciones.filter(inv => inv != null));
          return { seccionId: seccion.id, investigaciones };
        })
        .catch(error => {
          this.investigacionesPorSeccion.set(seccion.id, []);
          return { seccionId: seccion.id, investigaciones: [] };
        })
    );

    Promise.all(cargas).then(() => {
      this.calcularTotales();
    }).catch(error => {
      this.investigacionesPorSeccion.clear();
      this.calcularTotales();
    });
  }

  cargarActividadesPlanDeTrabajo() {
    this.actividadesPlanDeTrabajoService.getByPtId(this.planDeTrabajoId)
      .subscribe({
        next: (actividades: ActividadPlanDeTrabajo[]) => {
          this.actividadesPlanDeTrabajo = actividades;
          this.calcularTotales();
          this.loading = false;
        },
        error: (error: any) => {
          this.loading = false;
        }
      });
  }

  cargarAsignaturas() {
    this.cursoService.getByProfesor(this.profesorId)
      .subscribe({
        next: (asignaturas: Curso[]) => {
          this.asignaturas = asignaturas;
          this.calcularTotales();
        },
        error: (error: any) => { }
      });
  }

calcularTotales() {
  // Base: valores originales de BD sin ningún cambio pendiente
  let horasActividades = this.actividadesPlanDeTrabajo.reduce((total, actividad) => {
    return total + (actividad.horas || 0);
  }, 0);

  const horasCursos = this.asignaturas.reduce((total, asignatura) => {
    return total + (asignatura.horasPresenciales || 0);
  }, 0);

  let horasInvestigacion = 0;
  this.investigacionesPorSeccion.forEach((investigaciones) => {
    horasInvestigacion += investigaciones.reduce((total, inv) => {
      return total + (inv.horas || 0);
    }, 0);
  });

  // Aplicar cambios pendientes: restar el valor BD y sumar el nuevo
  for (const [idCambio, nuevoValor] of Object.entries(this.cambiosHoras)) {
    // ¿Es una actividad normal?
    const actividad = this.actividadesPlanDeTrabajo.find(
      a => a.actividades?.id === idCambio
    );
    if (actividad) {
      horasActividades = horasActividades - (actividad.horas || 0) + nuevoValor;
      continue;
    }

    // ¿Es una investigación?
    let encontrado = false;
    for (const [, investigaciones] of this.investigacionesPorSeccion) {
      const inv = investigaciones.find(i => i.id === idCambio);
      if (inv) {
        horasInvestigacion = horasInvestigacion - (inv.horas || 0) + nuevoValor;
        encontrado = true;
        break;
      }
    }
    // Si no es actividad ni investigación existente, es una nueva actividad normal
    if (!actividad && !encontrado) {
      horasActividades += nuevoValor;
    }
  }

  this.horasCursos = Math.max(0, horasCursos);
  this.horasNormales = Math.max(0, horasActividades);
  this.horasInvestigacion = Math.max(0, horasInvestigacion);

  this.totalHorasAsignadas = this.horasCursos + this.horasNormales + this.horasInvestigacion;
  this.porcentajeCompletado = this.horasTotales > 0
    ? Math.min(100, Math.round((this.totalHorasAsignadas / this.horasTotales) * 100))
    : 0;
}

  // ─── Horas disponibles actuales (reactivo a cambiosHoras) ─────────────────
  calcularHorasDisponibles(): number {
    return this.horasTotales - this.totalHorasAsignadas;
  }
  // ─────────────────────────────────────────────────────────────────────────

  getActividadesPorSeccion(seccionHijo: SeccionHijo): ActividadPlanDeTrabajo[] {
    if (!seccionHijo.actividades || !Array.isArray(seccionHijo.actividades)) {
      return [];
    }

    return this.actividadesPlanDeTrabajo.filter(actividad => {
      if (!actividad.actividades || !actividad.actividades.id) {
        return false;
      }
      return seccionHijo.actividades.some(actRef => actRef.id === actividad.actividades.id);
    });
  }

  getTotalHorasSeccion(seccionHijo: SeccionHijo): number {
    let totalHoras = 0;

    if (seccionHijo.seccionCursos) {
      totalHoras = this.getAsignaturasPorSeccion(seccionHijo).reduce((total, asignatura) =>
        total + (asignatura.horasPresenciales || 0), 0);
    } else if (seccionHijo.seccionInvestigativa) {
      totalHoras = this.getInvestigacionesPorSeccion(seccionHijo).reduce((total, inv) =>
        total + (inv.horas || 0), 0);
    } else {
      const actividades = this.getActividadesPorSeccion(seccionHijo);
      totalHoras = actividades.reduce((total, actividad) => total + (actividad.horas || 0), 0);
    }

    return totalHoras;
  }

  getAsignaturasPorSeccion(seccionHijo: SeccionHijo): Curso[] {
    if (seccionHijo.seccionCursos) {
      return this.asignaturas;
    }
    return [];
  }

  getTotalHorasAsignaturas(): number {
    return this.asignaturas.reduce((total, asignatura) => total + (asignatura.horasPresenciales || 0), 0);
  }

  getNombreProfesor(): string {
    if (this.profesorInfo) {
      return `${this.profesorInfo.nombres} ${this.profesorInfo.apellidos}`;
    }
    return 'Cargando...';
  }

  getNombreDirector(): string {
    if (this.directorInfo) {
      return `${this.directorInfo.nombres} ${this.directorInfo.apellidos}`;
    }
    return this.planDeTrabajo?.idDirector || 'No asignado';
  }

  getNombreDecano(): string {
    if (this.decanoInfo) {
      return `${this.decanoInfo.nombres} ${this.decanoInfo.apellidos}`;
    }
    return this.planDeTrabajo?.idDecano || 'No asignado';
  }

  getEstadoFirmaProfesor(): string {
    if (this.planDeTrabajo?.rechazado && !this.estadoFirmas.firmaProfesor && this.planDeTrabajo?.estado === 'RECHAZADO') {
      return 'Rechazado';
    }
    return this.estadoFirmas.firmaProfesor ? 'Firmado' : 'Pendiente';
  }

  getEstadoFirmaDirector(): string {
    return this.estadoFirmas.firmaDirector ? 'Firmado' : 'Pendiente';
  }

  getEstadoFirmaDecano(): string {
    if (this.planDeTrabajo?.rechazado && !this.estadoFirmas.firmaDecano && this.planDeTrabajo?.estado === 'Rechazado por Decanatura') {
      return 'Rechazado';
    }
    return this.estadoFirmas.firmaDecano ? 'Firmado' : 'Pendiente';
  }

  getSeveridadFirmaProfesor(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (this.planDeTrabajo?.rechazado && this.planDeTrabajo?.estado === 'RECHAZADO') {
      return 'danger';
    }
    return this.estadoFirmas.firmaProfesor ? 'success' : 'warn';
  }

  getSeveridadFirmaDirector(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    return this.estadoFirmas.firmaDirector ? 'success' : 'warn';
  }

  getSeveridadFirmaDecano(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (this.planDeTrabajo?.rechazado && this.planDeTrabajo?.estado === 'Rechazado por Decanatura') {
      return 'danger';
    }
    return this.estadoFirmas.firmaDecano ? 'success' : 'warn';
  }

  getEstadoPlan(): 'completo' | 'incompleto' | 'vacio' {
    if (this.totalHorasAsignadas === 0) return 'vacio';
    if (this.totalHorasAsignadas === this.totalHorasDisponibles) return 'completo';
    return 'incompleto';
  }

  getSeveridadEstado(): 'success' | 'warn' | 'danger' {
    const estado = this.getEstadoPlan();
    switch (estado) {
      case 'completo': return 'success';
      case 'incompleto': return 'warn';
      case 'vacio': return 'danger';
      default: return 'danger';
    }
  }

  getTextoEstado(): string {
    const estado = this.getEstadoPlan();
    switch (estado) {
      case 'completo': return 'Completo';
      case 'incompleto': return 'En progreso';
      case 'vacio': return 'Sin asignar';
      default: return 'Desconocido';
    }
  }

  obtenerSeccionesInvestigativas(): SeccionHijo[] {
    const seccionesInvestigativas: SeccionHijo[] = [];

    this.seccionesPadres.forEach(seccionPadre => {
      seccionPadre.hijos.forEach(hijo => {
        if (hijo.seccionInvestigativa) {
          seccionesInvestigativas.push(hijo);
        }
      });
    });

    return seccionesInvestigativas;
  }

  getInvestigacionesPorSeccion(seccionHijo: SeccionHijo): Investigaciones[] {
    return this.investigacionesPorSeccion.get(seccionHijo.id) || [];
  }

  getTotalHorasInvestigacionSeccion(seccionHijo: SeccionHijo): number {
    const investigaciones = this.getInvestigacionesPorSeccion(seccionHijo);
    return investigaciones.reduce((total, inv) => total + (inv.horas || 0), 0);
  }

  puedeRevisar(): boolean {
    return this.totalHorasAsignadas > 0;
  }

  tieneSeccionesHijasVisibles(seccionPadre: SeccionPadre): boolean {
    return seccionPadre.hijos.some(hijo => this.tieneContenidoSeccionHijo(hijo));
  }

  tieneContenidoSeccionHijo(seccionHijo: SeccionHijo): boolean {
    const esRolConAccesoCompleto = ['DECANO', 'PROFESOR'].includes(this.rolUsuario);
    if (esRolConAccesoCompleto && !this.modoResumido) {
      return true;
    }
    return this.getTotalHorasSeccion(seccionHijo) > 0;
  }

  getHorasAsignadasActividad(actividadId: string): number | null {
    const actividadAsignada = this.actividadesPlanDeTrabajo.find(
      a => a.actividades?.id === actividadId
    );
    return actividadAsignada ? actividadAsignada.horas : null;
  }

  getDescripcionActividad(actividadId: string): string | null {
    const actividadAsignada = this.actividadesPlanDeTrabajo.find(
      a => a.actividades?.id === actividadId
    );
    return actividadAsignada ? actividadAsignada.descripcion : null;
  }

  getAsesoriasActividad(actividadId: string): any[] {
    const actividadAsignada = this.actividadesPlanDeTrabajo.find(
      a => a.actividades?.id === actividadId
    );
    return actividadAsignada?.asesorias || [];
  }

  getSeccionesHijasConContenido(seccionPadre: SeccionPadre): SeccionHijo[] {
    return seccionPadre.hijos.filter(hijo => this.tieneContenidoSeccionHijo(hijo));
  }

  tieneAsesorias(actividadId: string): boolean {
    const asesorias = this.getAsesoriasActividad(actividadId);
    return Array.isArray(asesorias) && asesorias.length > 0;
  }

  tieneSeccionesVisibles(): boolean {
    const esRolConAccesoCompleto = ['DECANO', 'PROFESOR'].includes(this.rolUsuario);
    if (esRolConAccesoCompleto && !this.modoResumido) {
      return true;
    }
    return this.seccionesPadres.some(padre => this.tieneSeccionesHijasVisibles(padre));
  }

  obtenerProductosTexto(productos: any[]): string {
    if (!productos || productos.length === 0) {
      return 'Sin productos';
    }
    return productos.map(p => p.nombre + ' (' + (p.tipoProducto?.nombre || 'Sin tipo') + ')').join(', ');
  }

  obtenerNombresProductos(productos: any[]): string[] {
    if (!productos || productos.length === 0) {
      return [];
    }
    const nombres = productos.map(p => p.nombre).filter(nombre => nombre);
    return nombres.length > 0 ? nombres : [];
  }

  obtenerTiposProductosTexto(productos: any[]): string {
    if (!productos || productos.length === 0) {
      return 'Sin tipos de productos';
    }
    const tipos = productos
      .map(p => p.tipoProducto?.nombre)
      .filter((tipo, index, self) => tipo && self.indexOf(tipo) === index);
    return tipos.length > 0 ? tipos.join(', ') : 'Sin tipo';
  }

  getTipoContenidoSeccion(seccionHijo: SeccionHijo): string {
    if (seccionHijo.seccionCursos) return 'asignaturas';
    if (seccionHijo.seccionInvestigativa) return 'investigacion';
    return 'actividades';
  }

  getNombreActividad(actividad: ActividadPlanDeTrabajo): string {
    const nombre = actividad.actividades?.nombre || '';
    return nombre.trim().length > 1 ? nombre : 'TOTAL';
  }

  puedeVerMotivoRechazoProfesor(): boolean {
    const estaRechazado = this.planDeTrabajo?.rechazado === true;
    const tieneMotivo = !!this.planDeTrabajo?.motivoRechazo?.trim();
    const profesorRechazo = this.planDeTrabajo?.estado === 'RECHAZADO';
    return estaRechazado && tieneMotivo && profesorRechazo;
  }

  puedeVerMotivoRechazoDirector(): boolean {
    const estaRechazado = this.planDeTrabajo?.rechazado === true;
    const tieneMotivo = !!this.planDeTrabajo?.motivoRechazo?.trim();
    const profesorRechazo = this.planDeTrabajo?.estado === 'RECHAZADO';
    const decanoRechazo = this.planDeTrabajo?.estado === 'Rechazado por Decanatura' || !this.estadoFirmas.firmaDecano;
    const directorRechazo = !this.estadoFirmas.firmaDirector && estaRechazado;
    return estaRechazado && tieneMotivo && directorRechazo && !profesorRechazo && !decanoRechazo;
  }

  puedeVerMotivoRechazoDecano(): boolean {
    const estaRechazado = this.planDeTrabajo?.rechazado === true;
    const tieneMotivo = !!this.planDeTrabajo?.motivoRechazo?.trim();
    const decanoRechazo = this.planDeTrabajo?.estado === 'Rechazado por Decanatura' || (!this.estadoFirmas.firmaDecano && estaRechazado);
    const profesorRechazo = this.planDeTrabajo?.estado === 'RECHAZADO';
    return estaRechazado && tieneMotivo && decanoRechazo && !profesorRechazo;
  }

  mostrarMotivoRechazo(): void {
    if (this.puedeVerMotivoRechazoProfesor() || this.puedeVerMotivoRechazoDirector() || this.puedeVerMotivoRechazoDecano()) {
      this.mostrarModalMotivoRechazo = true;
    }
  }

  cerrarModalMotivoRechazo(): void {
    this.mostrarModalMotivoRechazo = false;
  }

  getQuienRechazo(): string {
    if (this.puedeVerMotivoRechazoProfesor()) return 'Profesor';
    if (this.puedeVerMotivoRechazoDirector()) return 'Director';
    if (this.puedeVerMotivoRechazoDecano()) return 'Decano';
    return '';
  }

  getNombreQuienRechazo(): string {
    if (this.puedeVerMotivoRechazoProfesor()) return this.getNombreProfesor();
    if (this.puedeVerMotivoRechazoDirector()) return this.getNombreDirector();
    if (this.puedeVerMotivoRechazoDecano()) return this.getNombreDecano();
    return 'No especificado';
  }

  marcarComoRevisado(): void {
    if (!this.planDeTrabajoId) return;

    this.planDeTrabajoService.updateFirmas(this.planDeTrabajoId, { estado: 'REVISADO' }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Plan revisado',
          detail: 'El estado del plan ha sido actualizado a REVISADO'
        });
        if (this.planDeTrabajo) {
          this.planDeTrabajo.estado = 'REVISADO';
        }
        this.cargarEstadoFirmas();
        this.estadoCambiado.emit('Revisado');
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado del plan'
        });
      }
    });
  }

  // Control de cambios de horas
  cambiosHoras: { [id: string]: number } = {};
  idActividadEditando: string | null = null;
  mostrarModalProductos = false;
  productosSeleccionados: any[] = [];
  private ultimoIdToastEmitido = '';


// En este metodo se realizan las validaciones para el cambio de horas

onHorasChange(id: string, horas: number | null | undefined): void {
  // Si el valor es null o undefined, tomarlo como 0
  if (horas == null || horas === undefined) {
    horas = 0;
  }
  if (horas < 0) return;

  // Obtener horas originales de BD
  let horasOriginales = 0;
  const horasActividadBD = this.getHorasAsignadasActividad(id);
  if (horasActividadBD !== null) {
    horasOriginales = horasActividadBD;
  } else {
    for (const [, inversiones] of this.investigacionesPorSeccion) {
      const inv = inversiones.find(i => i.id === id);
      if (inv) { horasOriginales = inv.horas ?? 0; break; }
    }
  }

  // Simular el estado final con el nuevo valor para validar
  const cambiosSimulados = { ...this.cambiosHoras, [id]: horas };
  const totalSimulado = this.calcularTotalConCambios(cambiosSimulados);

  if (totalSimulado > this.horasTotales) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: 'No hay suficientes horas disponibles',
      life: 3000
    });
    // Forzar revert visual con nueva referencia
    const valorActual = this.cambiosHoras[id] !== undefined
      ? this.cambiosHoras[id]
      : horasOriginales;
    this.cambiosHoras = { ...this.cambiosHoras, [id]: valorActual };
    this.calcularTotales();
    return;
  }

  // Actualizar estado local 
  if (horas === horasOriginales) {
    const nuevosCambios = { ...this.cambiosHoras };
    delete nuevosCambios[id];
    this.cambiosHoras = nuevosCambios;
    this.idActividadEditando = null;
  } else {
    this.cambiosHoras = { ...this.cambiosHoras, [id]: horas };
    this.idActividadEditando = id;
    this.messageService.add({
      severity: 'info',
      summary: 'Cambio pendiente',
      detail: 'Horas modificadas. Recuerda enviar la solicitud.',
      life: 2500
    });
  }

  this.calcularTotales();
}

private calcularTotalConCambios(cambios: { [id: string]: number }): number {
  // Base: valores originales de BD
  let horasActividades = this.actividadesPlanDeTrabajo.reduce((total, a) => {
    return total + (a.horas || 0);
  }, 0);

  const horasCursos = this.asignaturas.reduce((total, a) => {
    return total + (a.horasPresenciales || 0);
  }, 0);

  let horasInvestigacion = 0;
  this.investigacionesPorSeccion.forEach((investigaciones) => {
    horasInvestigacion += investigaciones.reduce((total, inv) => {
      return total + (inv.horas || 0);
    }, 0);
  });

  // Aplicar los cambios del set dado
  for (const [idCambio, nuevoValor] of Object.entries(cambios)) {
    const actividad = this.actividadesPlanDeTrabajo.find(
      a => a.actividades?.id === idCambio
    );
    if (actividad) {
      horasActividades = horasActividades - (actividad.horas || 0) + nuevoValor;
      continue;
    }

    for (const [, investigaciones] of this.investigacionesPorSeccion) {
      const inv = investigaciones.find(i => i.id === idCambio);
      if (inv) {
        horasInvestigacion = horasInvestigacion - (inv.horas || 0) + nuevoValor;
        break;
      }
    }
  }

  return Math.max(0, horasActividades) + horasCursos + Math.max(0, horasInvestigacion);
}
  // ─────────────────────────────────────────────────────────────────────────

  isInputDisabled(id: string): boolean {
    if (!this.modoEdicion) return true;
    if (this.rolUsuario !== 'DECANO') return true;
    if (this.planDeTrabajo?.estado !== 'Activo') return true;
    if (this.planDeTrabajo?.firmaDecano === true) return true;

    return false;
  }

  isInputDisabledInv(): boolean {
    if (!this.modoEdicion) return true;
    if (this.rolUsuario !== 'DECANO') return true;
    if (this.planDeTrabajo?.estado !== 'Activo') return true;
    if (this.planDeTrabajo?.firmaDecano === true) return true;
    return false;
  }

setMinHoras(id: string): number { return 0; }


setMaxHoras(id: string): number {
  const horasActuales = this.cambiosHoras[id] !== undefined
    ? this.cambiosHoras[id]
    : (this.getHorasAsignadasActividad(id) ?? 0);

  // Total SIN contar este id, para calcular cuánto queda disponible
  const cambiosSinId = { ...this.cambiosHoras };
  delete cambiosSinId[id];
  const totalSinId = this.calcularTotalConCambios(cambiosSinId);
  const disponible = Math.max(0, this.horasTotales - totalSinId);
  const maxPosible = horasActuales + disponible;

  // Respetar horasMaximas de la actividad si aplica
  const actividadRef = this.seccionesPadres
    .flatMap(p => p.hijos)
    .flatMap(h => h.actividades || [])
    .find(a => a.id === id);

  if (actividadRef?.horasMaximas && actividadRef.horasMaximas < maxPosible) {
    return actividadRef.horasMaximas;
  }
  return maxPosible;
}


setMinInvestigacion(id: string): number { return 0; }


setMaxInvestigacion(id: string): number {
  let horasActuales = 0;
  if (this.cambiosHoras[id] !== undefined) {
    horasActuales = this.cambiosHoras[id];
  } else {
    for (const [, inversiones] of this.investigacionesPorSeccion) {
      const inv = inversiones.find(i => i.id === id);
      if (inv) { horasActuales = inv.horas; break; }
    }
  }

  const cambiosSinId = { ...this.cambiosHoras };
  delete cambiosSinId[id];
  const totalSinId = this.calcularTotalConCambios(cambiosSinId);
  const disponible = Math.max(0, this.horasTotales - totalSinId);
  return horasActuales + disponible;
}

  esInvestigacion(id: string): boolean {
    for (const [_, inversiones] of this.investigacionesPorSeccion) {
      if (inversiones.some(i => i.id === id)) {
        return true;
      }
    }
    return false;
  }

  hayCambiosConfirmados(idActual: string): boolean {
    return Object.keys(this.cambiosHoras).some(id => id !== idActual);
  }

hasCambios(): boolean {
  return Object.keys(this.cambiosHoras).length > 0;
}

  getTotalHorasSolicitadas(): number {
    const entries = Object.entries(this.cambiosHoras);
    let total = 0;

    for (const [id, horasNuevas] of entries) {
      let horasOriginales: number | null = this.getHorasAsignadasActividad(id);

      if (horasOriginales === null) {
        for (const [seccionId, inversiones] of this.investigacionesPorSeccion) {
          const inv = inversiones.find(i => i.id === id);
          if (inv) {
            horasOriginales = inv.horas;
            break;
          }
        }
      }

      if (horasOriginales !== null) {
        total += (horasNuevas - horasOriginales);
      }
    }

    return total;
  }

  solicitarCambioVicerrectoria(): void {
    if (!this.planDeTrabajoId) return;
    const entries = Object.entries(this.cambiosHoras);
    if (entries.length === 0) return;

    // Nueva validación: permitir si el total de horas asignadas es igual a las horas totales permitidas
    if (this.totalHorasAsignadas !== this.horasTotales) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: 'El total de horas asignadas debe ser igual a las horas permitidas.'
      });
      return;
    }

    this.descripcionCambio = '';
    this.calcularTotales();
    this.mostrarModalConfirmacionCambio = true;
  }

  confirmarEnvioVicerrectoria(): void {
    if (!this.descripcionCambio.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Campo requerido',
        detail: 'Debe ingresar una descripción del cambio.'
      });
      return;
    }

    const entries = Object.entries(this.cambiosHoras);
    const actividadesAumento: string[] = [];
    const actividadesDisminucion: string[] = [];

    for (const [id, horasNuevas] of entries) {
      let horasOriginales: number = 0;
      const horasActividad = this.getHorasAsignadasActividad(id);

      if (horasActividad !== null) {
        horasOriginales = horasActividad;
      } else {
        for (const [, inversiones] of this.investigacionesPorSeccion) {
          const inv = inversiones.find(i => i.id === id);
          if (inv) {
            horasOriginales = inv.horas ?? 0;
            break;
          }
        }
      }

      if (horasNuevas > horasOriginales) {
        actividadesAumento.push(`${this.esInvestigacion(id) ? 'I' : ''}${id} ${horasNuevas}`);
      } else if (horasNuevas < horasOriginales) {
        actividadesDisminucion.push(`${this.esInvestigacion(id) ? 'I' : ''}${id} ${horasNuevas}`);
      }
    }

    const motivoRechazo = `${this.descripcionCambio.trim()} | ${actividadesAumento.join(';')} | ${actividadesDisminucion.join(';')}`;

    this.planDeTrabajoService.updateFirmas(this.planDeTrabajoId, {
      estado: 'Solicitud enviada a Vicerrectoría',
      motivoRechazo: motivoRechazo
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud enviada',
          detail: 'Se ha solicitado el cambio de horas a Vicerrectoría.'
        });

        this.enviarNotificacionVicerrectoria();

        if (this.planDeTrabajo) {
          this.planDeTrabajo.estado = 'Solicitud enviada a Vicerrectoría';
          this.planDeTrabajo.motivoRechazo = motivoRechazo;
        }
        this.estadoCambiado.emit('Solicitud enviada a Vicerrectoría');
        this.cambiosHoras = {};
        this.idActividadEditando = null;
        this.mostrarModalConfirmacionCambio = false;
        this.descripcionCambio = '';
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo enviar la solicitud.'
        });
      }
    });
  }

  cancelarEnvioVicerrectoria(): void {
    this.mostrarModalConfirmacionCambio = false;
    this.descripcionCambio = '';
    this.ultimoIdToastEmitido = '';
  }

  private enviarNotificacionVicerrectoria(): void {
    if (!this.decanoInfo || !this.planDeTrabajo || !this.profesorInfo) {
      return;
    }

    this.notificacionesService.notificarEnvioVicerrectoria({
      emailDecano: this.decanoInfo.numIdentificacion,
      nombreDecano: `${this.decanoInfo.nombres} ${this.decanoInfo.apellidos}`,
      programa: this.planDeTrabajo.idPrograma || this.profesorInfo.programa,
      periodo: this.planDeTrabajo.periodo.toString(),
      anio: this.planDeTrabajo.anio.toString(),
      cantidadPlanes: 1
    }).subscribe({
      next: (response) => { },
      error: (err) => { }
    });
  }

  mostrarDetalleProductos(productos: any[]): void {
    this.productosSeleccionados = productos || [];
    this.mostrarModalProductos = true;
  }

  cerrarModalProductos(): void {
    this.mostrarModalProductos = false;
    this.productosSeleccionados = [];
  }

  // Aprobación y rechazo
  mostrarModalConfirmacionAprobar = false;
  mostrarModalRechazar = false;
  cargandoAprobacion = false;
  motivoRechazo = '';

  aprobarPlanConObservaciones(): void {
    if (!this.planDeTrabajo) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se puede aprobar, el plan no está cargado' });
      return;
    }
    this.mostrarModalConfirmacionAprobar = true;
  }

  rechazarPlanConObservaciones(): void {
    if (!this.planDeTrabajo) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se puede rechazar, el plan no está cargado' });
      return;
    }
    this.motivoRechazo = '';
    this.mostrarModalRechazar = true;
  }

  onConfirmarAprobarPlan(): void {
    if (!this.planDeTrabajo) return;

    this.cargandoAprobacion = true;
    this.firmaService.firmarComoDecano(this.planDeTrabajoId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Plan Aprobado', detail: 'El plan de trabajo ha sido aprobado exitosamente' });
        this.mostrarModalConfirmacionAprobar = false;
        this.cargandoAprobacion = false;

        if (this.planDeTrabajo) {
          this.planDeTrabajo.firmaDecano = true;
          this.planDeTrabajo.estado = 'Aprobado por Decanatura';
        }
        this.cargarEstadoFirmas();
        this.estadoCambiado.emit('Aprobado por Decanatura');
        this.ultimoIdToastEmitido = '';
      },
      error: (error) => {
        this.cargandoAprobacion = false;
        this.messageService.add({ severity: 'error', summary: 'Error al aprobar', detail: 'No se pudo aprobar el plan de trabajo' });
      }
    });
  }

  onConfirmarRechazarPlan(): void {
    if (!this.planDeTrabajo) return;

    if (!this.motivoRechazo || this.motivoRechazo.trim() === '') {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Debe proporcionar un motivo de rechazo' });
      return;
    }

    this.cargandoAprobacion = true;
    this.firmaService.rechazarPlanDeTrabajo(this.planDeTrabajoId, this.motivoRechazo.trim()).subscribe({
      next: (planActualizado) => {
        this.messageService.add({ severity: 'warn', summary: 'Plan Rechazado', detail: 'El plan de trabajo ha sido rechazado' });
        this.mostrarModalRechazar = false;
        this.cargandoAprobacion = false;
        this.motivoRechazo = '';

        if (this.planDeTrabajo) {
          this.planDeTrabajo = planActualizado;
        }
        this.cargarEstadoFirmas();
        this.estadoCambiado.emit('Rechazado por Decanatura');
        this.ultimoIdToastEmitido = '';
      },
      error: (error) => {
        this.cargandoAprobacion = false;
        this.messageService.add({ severity: 'error', summary: 'Error al rechazar', detail: 'No se pudo rechazar el plan de trabajo' });
      }
    });
  }

  onCancelarModalAprobar(): void {
    this.mostrarModalConfirmacionAprobar = false;
  }

  onCancelarModalRechazar(): void {
    this.mostrarModalRechazar = false;
    this.motivoRechazo = '';
  }

  puedeAprobarRechazar(): boolean {
    if (this.rolUsuario !== 'DECANO') return false;
    if (!this.planDeTrabajo) return false;
    if (this.planDeTrabajo.firmaDecano === true) return false;
    if (this.planDeTrabajo.estado === 'RECHAZADO') return false;

    const estadosNoPermitidos = ['Aprobado por Decanatura', 'Rechazado por Decanatura'];
    return !estadosNoPermitidos.includes(this.planDeTrabajo.estado || '');
  }

    marcarComoActivo(): void {
    if (!this.planDeTrabajoId) return;

    this.planDeTrabajoService.updateFirmas(this.planDeTrabajoId, { estado: 'Activo' }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Plan activo',
          detail: 'El estado del plan ha sido actualizado a Activo'
        });
        if (this.planDeTrabajo) {
          this.planDeTrabajo.estado = 'Activo';
        }
        this.cargarEstadoFirmas();
        this.estadoCambiado.emit('Esperando aprobación de decanatura');
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado a Activo'
        });
      }
    });
  }
}