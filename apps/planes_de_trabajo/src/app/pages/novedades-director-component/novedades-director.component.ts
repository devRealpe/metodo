import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@microfrontends/shared-services';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
import { ProfesorService } from '../../core/services/profesor.service';
import { PlanDeTrabajoService } from '../../core/services/planDeTrabajo.service';
import { NovedadService } from '../../core/services/novedad.service';
import { FirmaService } from '../../core/services/firma.service';
import { Profesor } from '../../core/models/profesor.model';
import { PlanDeTrabajoModel, UpdateFirmasPlanDeTrabajo } from '../../core/models/planDeTrabajo.model';
import { CrearNovedad, Novedad, ActualizarNovedad } from '../../core/models/novedad.model';
import { ModalRegistrarNovedadComponent } from '../home/modales/modal-registrar-novedad/modal-registrar-novedad.component';
import { PlanTrabajoViewerComponent } from '../home/modales/plan-trabajo-viewer/plan-trabajo-viewer.component';
import { ModalConfirmacionComponent } from '../home/modales/modal-confirmacion/modal-confirmacion';
import { ModalReasignarPtComponent } from '../home/modales/modal-reasignar-pt/modal-reasignar-pt.component';
import { ModalActivarNovedadComponent, PlanOpcion } from '../home/modales/modal-activar-novedad/modal-activar-novedad.component';

interface PlanTrabajoConNovedad {
  id: string;
  profesor: Profesor;
  planDeTrabajo: PlanDeTrabajoModel;
  periodo: string;
  estado: string;
  severityEstado: 'success' | 'info' | 'warn' | 'danger';
  novedades: Novedad[];
  internalId: string;
  esHistorico: boolean;
}

@Component({
  selector: 'app-novedades-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    BadgeModule,
    TooltipModule,
    InputTextModule,
    ToastModule,
    DialogModule,
    SelectModule,
    ModalRegistrarNovedadComponent,
    PlanTrabajoViewerComponent,
    ModalConfirmacionComponent,
    ModalReasignarPtComponent,
    ModalActivarNovedadComponent
  ],
  providers: [MessageService],
  styleUrls: ['./novedades-director.component.scss'],
  templateUrl: './novedades-director.component.html',
})
export class NovedadesDirectorComponent implements OnInit {

  busqueda = signal('');
  cargando = signal(false);
  planesTrabajoConNovedades = signal<PlanTrabajoConNovedad[]>([]);
  planesTrabajoFiltrados = signal<PlanTrabajoConNovedad[]>([]);

  // Filtro por estado
  estadoSeleccionado = signal<string>('TODOS');
  estadosDisponibles = [
    { label: 'Todos los estados', value: 'TODOS' },
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Resuelta', value: 'RESUELTA' }
  ];

  mostrarModalRegistrarNovedad = false;
  planSeleccionadoParaNovedad: PlanTrabajoConNovedad | null = null;
  mostrarModalActivarNovedad = false;
  registradoPorNombreCedula = '';

  mostrarPlanViewer = false;
  planTrabajoIdViewer: string = '';
  profesorIdViewer: string = '';

  mostrarModalReasignar = signal<boolean>(false);
  profesorParaReasignar = signal<PlanTrabajoConNovedad | null>(null);
  profesoresDisponibles = signal<Profesor[]>([]);
  cargandoProfesoresDisponibles = signal<boolean>(false);
  modalReasignarKey = signal<number>(0);
  profesorParaReasignarOriginal = signal<Profesor | null>(null);
  filasExpandidas = new Set<string>();
  registrandoNovedad = signal<boolean>(false);

  displayModalActivar = false;
  displayModalInactivar = false;
  displayModalEliminarNovedad = false;
  novedadSeleccionadaParaEliminar: Novedad | null = null;
  cargandoEliminarNovedad = false;
  displayModalDesactivarNovedades = false;
  cargandoDesactivarNovedades = false;

  cargandoActivar = false;
  cargandoInactivar = false;
  planSeleccionadoParaAccion: PlanTrabajoConNovedad | null = null;
  opcionesPtActivos: PlanOpcion[] = [];

  periodosAcademicos: { label: string; anio: number; periodo: number }[] = [];

  constructor(
    private profesorService: ProfesorService,
    private planDeTrabajoService: PlanDeTrabajoService,
    private novedadService: NovedadService,
    private firmaService: FirmaService,
    private messageService: MessageService,
    private authService: AuthService
  ) { }

  getDirectorId(): string | null {
    const authUser = this.authService.getCurrentUser();
    return authUser?.username || null;
  }

  get directorIdSeguro(): string {
    return this.getDirectorId() || '';
  }

  private nombresRegistradores = new Map<string, string>();

  ngOnInit(): void {
    const directorId = this.getDirectorId();
    if (!directorId) {
      this.messageService.add({ severity: 'error', detail: 'Usuario no identificado' });
      return;
    }
    this.cargarNombreDirector(directorId);
    this.cargarPlanesConNovedadesPorDirector(directorId);
    this.generarPeriodosAcademicos();
  }

  private async cargarNombreDirector(directorId: string): Promise<void> {
    try {
      const director = await firstValueFrom(this.profesorService.getById(directorId));
      this.registradoPorNombreCedula = director
        ? `${director.nombres} ${director.apellidos} - ${director.numIdentificacion}`
        : directorId;
    } catch {
      this.registradoPorNombreCedula = directorId;
    }
  }

  private async cargarPlanesConNovedadesPorDirector(directorId: string): Promise<void> {
    this.cargando.set(true);
    this.limpiarFilasExpandidas();
    this.nombresRegistradores.clear();

    try {
      const director = await firstValueFrom(this.profesorService.getById(directorId));
      if (!director) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se encontró información del director'
        });
        this.cargando.set(false);
        return;
      }

      if (director.cargo !== 'DIRECTOR DE PROGRAMA') {
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso denegado',
          detail: 'El usuario no tiene el cargo de Director de Programa'
        });
        this.cargando.set(false);
        return;
      }

      const profesores = await firstValueFrom(this.profesorService.getByPrograma(director.programa));
      if (!profesores || profesores.length === 0) {
        this.planesTrabajoConNovedades.set([]);
        this.planesTrabajoFiltrados.set([]);
        this.cargando.set(false);
        return;
      }

      const planesConNovedades: PlanTrabajoConNovedad[] = [];
      const cedulasUnicas = new Set<string>();

      for (const profesor of profesores) {
        try {
          const planes = await firstValueFrom(
            this.planDeTrabajoService.getByProfesorId(profesor.numIdentificacion)
          );
          const planesArray = Array.isArray(planes) ? planes : (planes ? [planes] : []);
          for (const plan of planesArray) {
            if (plan) {
              let novedades: Novedad[] = [];
              novedades = await firstValueFrom(
                this.novedadService.getByPlanDeTrabajo(plan.id)
              ) || [];

              const estadoFiltro = this.estadoSeleccionado();
              if (estadoFiltro && estadoFiltro !== 'TODOS') {
                novedades = novedades.filter(n => n.estado === estadoFiltro);
              }

              for (const novedad of novedades) {
                if (novedad.registradoPor && typeof novedad.registradoPor === 'string') {
                  cedulasUnicas.add(novedad.registradoPor);
                }
              }

              const historialEstados = ['RESUELTA', 'CANCELADA', 'APROBADA', 'RECHAZADA'];
              const novedadesHistoricas = novedades.filter(n => historialEstados.includes(n.estado));
              const novedadesPendientes = novedades.filter(n => n.estado === 'PENDIENTE');

              novedadesHistoricas.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());

              novedadesHistoricas.forEach((nov) => {
                const estadoInfo = this.calcularEstado(plan);
                planesConNovedades.push({
                  id: plan.id,
                  profesor: profesor,
                  planDeTrabajo: plan,
                  periodo: `${plan.anio}-${plan.periodo}`,
                  estado: estadoInfo.estado,
                  severityEstado: estadoInfo.severity,
                  novedades: [nov],
                  internalId: `${plan.id}-HIST-${nov.id}`,
                  esHistorico: true
                });
              });

              const tienePendiente = novedadesPendientes.length > 0;
              const tieneNovedadesActivas = plan.novedadesActivas === true;

              const mostrarFilaActiva = tienePendiente || (tieneNovedadesActivas && (estadoFiltro === 'TODOS' || estadoFiltro === 'PENDIENTE'));

              if (mostrarFilaActiva) {
                const estadoInfo = this.calcularEstado(plan);
                planesConNovedades.push({
                  id: plan.id,
                  profesor: profesor,
                  planDeTrabajo: plan,
                  periodo: `${plan.anio}-${plan.periodo}`,
                  estado: estadoInfo.estado,
                  severityEstado: estadoInfo.severity,
                  novedades: novedadesPendientes,
                  internalId: `${plan.id}-ACTIVE`,
                  esHistorico: false
                });
              }
            }
          }
        } catch (error) {
        }
      }

      if (cedulasUnicas.size > 0) {
        const promesas = Array.from(cedulasUnicas).map(cedula =>
          firstValueFrom(this.profesorService.getById(cedula)).then(
            prof => {
              if (prof) {
                this.nombresRegistradores.set(cedula, `${prof.nombres} ${prof.apellidos}`);
              } else {
                this.nombresRegistradores.set(cedula, cedula);
              }
            },
            () => {
              this.nombresRegistradores.set(cedula, cedula);
            }
          )
        );
        await Promise.all(promesas);
      }

      this.planesTrabajoConNovedades.set(planesConNovedades);
      this.planesTrabajoFiltrados.set(planesConNovedades);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar los planes de trabajo con novedades'
      });
    } finally {
      this.cargando.set(false);
    }
  }

  getNombreRegistrador(cedula: string): string {
    return this.nombresRegistradores.get(cedula) || cedula;
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

    this.periodosAcademicos = periodos;
  }

  get periodosOpciones(): { label: string; value: string }[] {
    return this.periodosAcademicos.map(p => ({
      label: p.label,
      value: `${p.anio}-${p.periodo}`
    }));
  }

  async onClickRegistrarGeneral(): Promise<void> {
    await this.cargarPtActivosParaSeleccion();
    this.mostrarModalActivarNovedad = true;
  }

  private async cargarRegistrador(): Promise<void> {
    const directorId = this.getDirectorId();
    if (!directorId) return;

    try {
      const director = await firstValueFrom(this.profesorService.getById(directorId));
      if (director) {
        this.registradoPorNombreCedula = `${director.nombres} ${director.apellidos} - ${director.numIdentificacion}`;
      } else {
        this.registradoPorNombreCedula = directorId;
      }
    } catch {
      this.registradoPorNombreCedula = directorId;
    }
  }

  private async cargarPtActivosParaSeleccion(): Promise<void> {
    const directorId = this.getDirectorId();
    if (!directorId) {
      this.opcionesPtActivos = [];
      return;
    }

    try {
      const director = await firstValueFrom(this.profesorService.getById(directorId));
      if (!director) {
        this.opcionesPtActivos = [];
        return;
      }

      const profesores = await firstValueFrom(this.profesorService.getByPrograma(director.programa));
      const opciones: PlanOpcion[] = [];

      for (const profesor of profesores || []) {
        try {
          const planes = await firstValueFrom(this.planDeTrabajoService.getByProfesorId(profesor.numIdentificacion));
          const planesArray = Array.isArray(planes) ? planes : (planes ? [planes] : []);
          for (const plan of planesArray) {
            if (plan && plan.firmaDecano) {
              try {
                const novedades = await firstValueFrom(this.novedadService.getByPlanDeTrabajo(plan.id)) || [];
                const tienePendiente = novedades.some(n => n.estado === 'PENDIENTE');
                if (!tienePendiente) {
                  opciones.push({
                    id: plan.id,
                    label: `${profesor.nombres} ${profesor.apellidos}`,
                    periodo: `${plan.anio}-${plan.periodo}`
                  });
                }
              } catch (e) {
                opciones.push({
                  id: plan.id,
                  label: `${profesor.nombres} ${profesor.apellidos}`,
                  periodo: `${plan.anio}-${plan.periodo}`
                });
              }
            }
          }
        } catch { }
      }
      this.opcionesPtActivos = opciones;
    } catch {
      this.opcionesPtActivos = [];
    }
  }

  onConfirmarActivarNovedad(datos: { planId: string }): void {
    if (!datos?.planId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un plan de trabajo'
      });
      return;
    }
    this.planDeTrabajoService.activarNovedades(datos.planId, true).subscribe({
      next: (planActualizado) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Novedades activadas',
          detail: 'Se habilitó el registro de novedades para el PT seleccionado'
        });
        this.mostrarModalActivarNovedad = false;
        this.cargarPlanesConNovedades();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo activar las novedades. Intente nuevamente.'
        });
      }
    });
  }

  onConfirmarRegistrarNovedad(novedad: Novedad): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Novedad Registrada',
      detail: 'La novedad se ha registrado exitosamente y está pendiente de aprobación'
    });
    this.registrandoNovedad.set(false);
    this.cargarPlanesConNovedades();
  }

  getFechaSeleccionada(observaciones: string): string {
    if (!observaciones) return '';

    const regex = /Fecha seleccionada:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/;

    const match = observaciones.match(regex);

    if (match && match[1]) {
      const fechaISO = match[1];
      const fecha = new Date(fechaISO);
      if (!isNaN(fecha.getTime())) {
        return this.formatDate(fecha);
      }
    }

    return 'Fecha no disponible';
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  getTextoObservacion(observaciones: string): string {
    if (!observaciones) return '';
    const regex = /(?:^|\s+)Fecha seleccionada:\s*[^|]*$/g;
    let textoLimpio = observaciones.replace(regex, '').trim();
    const pipeIndex = textoLimpio.indexOf('|');
    if (pipeIndex !== -1) {
      textoLimpio = textoLimpio.substring(0, pipeIndex).trim();
    }
    return textoLimpio;
  }

  async cargarPlanesConNovedades(): Promise<void> {
    this.cargando.set(true);
    this.limpiarFilasExpandidas();
    this.nombresRegistradores.clear();

    const directorId = this.getDirectorId();
    if (!directorId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Usuario no identificado'
      });
      this.cargando.set(false);
      return;
    }

    try {
      const director = await this.profesorService.getById(directorId).toPromise();
      if (!director) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se encontró información del director'
        });
        this.cargando.set(false);
        return;
      }

      const profesores = await this.profesorService.getByPrograma(director.programa).toPromise();
      if (!profesores || profesores.length === 0) {
        this.planesTrabajoConNovedades.set([]);
        this.planesTrabajoFiltrados.set([]);
        this.cargando.set(false);
        return;
      }
      const planesConNovedades: PlanTrabajoConNovedad[] = [];
      const cedulasUnicas = new Set<string>();

      for (const profesor of profesores) {
        try {
          const planes = await this.planDeTrabajoService
            .getByProfesorId(profesor.numIdentificacion)
            .toPromise();
          const planesArray = (planes && Array.isArray(planes))
            ? planes
            : (planes ? [planes] : []);

          for (const plan of planesArray) {
            if (plan) {
              let novedades: Novedad[] = [];
              novedades = await this.novedadService.getByPlanDeTrabajo(plan.id).toPromise() || [];

              const estadoFiltro = this.estadoSeleccionado();
              if (estadoFiltro && estadoFiltro !== 'TODOS') {
                novedades = novedades.filter(n => n.estado === estadoFiltro);
              }

              for (const novedad of novedades) {
                if (novedad.registradoPor && typeof novedad.registradoPor === 'string') {
                  cedulasUnicas.add(novedad.registradoPor);
                }
              }

              const historialEstados = ['RESUELTA', 'CANCELADA', 'APROBADA', 'RECHAZADA'];
              const novedadesHistoricas = novedades.filter(n => historialEstados.includes(n.estado));
              const novedadesPendientes = novedades.filter(n => n.estado === 'PENDIENTE');

              novedadesHistoricas.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());

              novedadesHistoricas.forEach((nov) => {
                const estadoInfo = this.calcularEstado(plan);
                planesConNovedades.push({
                  id: plan.id,
                  profesor: profesor,
                  planDeTrabajo: plan,
                  periodo: `${plan.anio}-${plan.periodo}`,
                  estado: estadoInfo.estado,
                  severityEstado: estadoInfo.severity,
                  novedades: [nov],
                  internalId: `${plan.id}-HIST-${nov.id}`,
                  esHistorico: true
                });
              });

              const tienePendiente = novedadesPendientes.length > 0;
              const tieneNovedadesActivas = plan.novedadesActivas === true;
              const mostrarFilaActiva = tienePendiente || (tieneNovedadesActivas && (estadoFiltro === 'TODOS' || estadoFiltro === 'PENDIENTE'));

              if (mostrarFilaActiva) {
                const estadoInfo = this.calcularEstado(plan);
                planesConNovedades.push({
                  id: plan.id,
                  profesor: profesor,
                  planDeTrabajo: plan,
                  periodo: `${plan.anio}-${plan.periodo}`,
                  estado: estadoInfo.estado,
                  severityEstado: estadoInfo.severity,
                  novedades: novedadesPendientes,
                  internalId: `${plan.id}-ACTIVE`,
                  esHistorico: false
                });
              }
            }
          }
        } catch (error) {
        }
      }

      if (cedulasUnicas.size > 0) {
        const promesas = Array.from(cedulasUnicas).map(cedula =>
          this.profesorService.getById(cedula).toPromise().then(
            prof => {
              if (prof) {
                this.nombresRegistradores.set(cedula, `${prof.nombres} ${prof.apellidos}`);
              } else {
                this.nombresRegistradores.set(cedula, cedula);
              }
            },
            () => {
              this.nombresRegistradores.set(cedula, cedula);
            }
          )
        );
        await Promise.all(promesas);
      }

      this.planesTrabajoConNovedades.set(planesConNovedades);
      this.planesTrabajoFiltrados.set(planesConNovedades);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar los planes de trabajo con novedades'
      });
    } finally {
      this.cargando.set(false);
    }
  }

  onReasignarPT(pt: PlanTrabajoConNovedad): void {
    this.profesorParaReasignar.set(pt);
    this.profesorParaReasignarOriginal.set(pt.profesor);
    this.mostrarModalReasignar.set(false);

    setTimeout(() => {
      this.cargarProfesoresDisponibles(pt.planDeTrabajo.anio, pt.planDeTrabajo.periodo);
      this.mostrarModalReasignar.set(true);
    }, 0);
  }

  private async cargarProfesoresDisponibles(anio: number, periodo: number): Promise<void> {
    this.cargandoProfesoresDisponibles.set(true);
    const directorId = this.getDirectorId();
    if (!directorId) return;
    try {
      const director = await firstValueFrom(this.profesorService.getById(directorId));
      if (!director) return;
      const profesores = await this.profesorService.getByPrograma(director.programa).toPromise();
      const disponibles: Profesor[] = [];
      for (const p of profesores || []) {
        try {
          const plan = await this.planDeTrabajoService
            .getByProfesorPeriodo(p.numIdentificacion, anio, periodo).toPromise();
          if (!plan) disponibles.push(p);
        } catch (e) {
          disponibles.push(p);
        }
      }

      this.profesoresDisponibles.set(disponibles);
    } catch (err) {
      this.messageService.add({ severity: 'error', detail: 'No se pudieron cargar los profesores disponibles' });
    } finally {
      this.cargandoProfesoresDisponibles.set(false);
    }
  }

  onConfirmarReasignacion(nuevoProfesor: Profesor): void {
    const planId = this.profesorParaReasignar()?.planDeTrabajo.id;

    if (!planId || !nuevoProfesor.numIdentificacion) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo reasignar el PT: Información incompleta.'
      });
      return;
    }

    this.planDeTrabajoService.reasignarPlan(planId, nuevoProfesor.numIdentificacion).subscribe({
      next: (response: any) => {
        this.resolverNovedadesDespuesDeReasignacion(planId);

        this.messageService.add({
          severity: 'success',
          summary: 'PT Reasignado',
          detail: `El PT fue asignado a ${nuevoProfesor.nombres} ${nuevoProfesor.apellidos}`
        });
        this.mostrarModalReasignar.set(false);
        this.profesorParaReasignar.set(null);

        setTimeout(() => {
          this.cargarPlanesConNovedades();
        }, 500);
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo reasignar el PT. Inténtelo de nuevo.'
        });
      }
    });
  }

  private resolverNovedadesDespuesDeReasignacion(planId: string): void {
    const plan = this.planesTrabajoConNovedades().find(p => p.planDeTrabajo.id === planId);
    if (!plan || !plan.novedades || plan.novedades.length === 0) {
      return;
    }

    const novedadesActivas = plan.novedades.filter(
      n => n.estado !== 'RESUELTA' && n.estado !== 'CANCELADA'
    );

    if (novedadesActivas.length === 0) {
      return;
    }

    novedadesActivas.forEach(novedad => {
      const actualizacion: ActualizarNovedad = {
        estado: 'RESUELTA',
        fechaResolucion: new Date().toISOString(),
        resueltoPor: this.getDirectorId() || undefined
      };

      this.novedadService.update(novedad.id, actualizacion).subscribe({
        next: () => { },
        error: (error) => { }
      });
    });
  }

  calcularEstado(plan: PlanDeTrabajoModel): { estado: string, severity: 'success' | 'info' | 'warn' | 'danger' } {
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

    const { enviadoProfesor, firmaProfesor, firmaDirector, firmaDecano } = plan;

    if (enviadoProfesor && firmaProfesor && firmaDirector && firmaDecano) {
      return { estado: 'Aprobado por Decanatura', severity: 'success' };
    }

    if (enviadoProfesor && firmaProfesor && firmaDirector && !firmaDecano) {
      return { estado: 'Esperando aprobación de decanatura', severity: 'warn' };
    }

    if (enviadoProfesor && firmaProfesor && !firmaDirector) {
      return { estado: 'Esperando aprobación de director', severity: 'info' };
    }

    if (enviadoProfesor && !firmaProfesor) {
      return { estado: 'Esperando aprobación profesor', severity: 'info' };
    }

    return { estado: 'Sin enviar', severity: 'warn' };
  }

  onEstadoChange(): void {
    const directorId = this.getDirectorId();
    if (directorId) {
      this.cargarPlanesConNovedadesPorDirector(directorId);
    }
  }

  onBuscar(): void {
    const busqueda = this.busqueda().toLowerCase().trim();

    if (!busqueda) {
      this.planesTrabajoFiltrados.set(this.planesTrabajoConNovedades());
      return;
    }

    const filtrados = this.planesTrabajoConNovedades().filter(pt =>
      pt.profesor.nombres.toLowerCase().includes(busqueda) ||
      pt.profesor.apellidos.toLowerCase().includes(busqueda) ||
      pt.profesor.numIdentificacion.includes(busqueda) ||
      pt.planDeTrabajo.id.toLowerCase().includes(busqueda) ||
      pt.periodo.includes(busqueda)
    );

    this.planesTrabajoFiltrados.set(filtrados);
  }

  onRegistrarNovedad(plan: PlanTrabajoConNovedad): void {
    this.planSeleccionadoParaNovedad = plan;
    this.registrandoNovedad.set(true);
    this.mostrarModalRegistrarNovedad = true;
  }

  onCancelarRegistrarNovedad(): void {
    this.mostrarModalRegistrarNovedad = false;
    this.planSeleccionadoParaNovedad = null;
    this.registrandoNovedad.set(false);
  }

  onVerPT(plan: PlanTrabajoConNovedad): void {
    this.planTrabajoIdViewer = plan.planDeTrabajo.id;
    this.profesorIdViewer = plan.profesor.numIdentificacion;
    this.mostrarPlanViewer = true;
  }

  onCerrarPlanViewer(): void {
    this.mostrarPlanViewer = false;
    this.planTrabajoIdViewer = '';
    this.profesorIdViewer = '';
  }

  tieneNovedadesRegistradas(plan: PlanTrabajoConNovedad): boolean {
    return (plan.novedades && plan.novedades.length > 0);
  }

  onActivarPlanClick(plan: PlanTrabajoConNovedad): void {
    this.planSeleccionadoParaAccion = plan;
    this.displayModalActivar = true;
  }

  onInactivarPlanClick(plan: PlanTrabajoConNovedad): void {
    this.planSeleccionadoParaAccion = plan;
    this.displayModalInactivar = true;
  }

  handleConfirmarActivar(): void {
    if (!this.planSeleccionadoParaAccion?.planDeTrabajo?.id) {
      return;
    }

    this.cargandoActivar = true;

    const firmaData: UpdateFirmasPlanDeTrabajo = {
      enviadoProfesor: null,
      firmaProfesor: null,
      firmaDirector: null,
      firmaDecano: null,
      rechazado: null,
      estado: 'Enviado a sistemas',
    };

    this.firmaService.actualizarFirmas(this.planSeleccionadoParaAccion.planDeTrabajo.id, firmaData).subscribe({
      next: (planActualizado) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Plan Activado',
          detail: 'El plan de trabajo ha sido activado exitosamente'
        });

        this.cargandoActivar = false;
        this.displayModalActivar = false;
        this.planSeleccionadoParaAccion = null;

        this.cargarPlanesConNovedades();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo activar el plan de trabajo'
        });
        this.cargandoActivar = false;
        this.displayModalActivar = false;
      }
    });
  }

  handleConfirmarInactivar(): void {
    if (!this.planSeleccionadoParaAccion?.planDeTrabajo?.id) {
      return;
    }

    this.cargandoInactivar = true;

    const firmaData: UpdateFirmasPlanDeTrabajo = {
      estado: 'Inactivado',
    };

    this.firmaService.actualizarFirmas(this.planSeleccionadoParaAccion.planDeTrabajo.id, firmaData).subscribe({
      next: (planActualizado) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Plan Inactivado',
          detail: 'El plan de trabajo ha sido inactivado exitosamente'
        });

        this.cargandoInactivar = false;
        this.displayModalInactivar = false;
        this.planSeleccionadoParaAccion = null;

        this.cargarPlanesConNovedades();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo inactivar el plan de trabajo'
        });
        this.cargandoInactivar = false;
        this.displayModalInactivar = false;
      }
    });
  }

  handleCancelarActivar(): void {
    this.displayModalActivar = false;
    this.planSeleccionadoParaAccion = null;
  }

  handleCancelarInactivar(): void {
    this.displayModalInactivar = false;
    this.planSeleccionadoParaAccion = null;
  }

  estaSuspendido(plan: PlanTrabajoConNovedad): boolean {
    return plan.planDeTrabajo?.estado === 'Suspendido';
  }

  estaInactivado(plan: PlanTrabajoConNovedad): boolean {
    return plan.planDeTrabajo?.estado === 'Inactivado';
  }

  getNombreProfesor(profesor: Profesor): string {
    return `${profesor.nombres} ${profesor.apellidos}`;
  }

  getSeverity(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (estado.toUpperCase()) {
      case 'APROBADO':
        return 'success';
      case 'ESPERANDO APROBACIÓN DE DECANATURA':
      case 'SUSPENDIDO':
      case 'SIN ENVIAR':
        return 'warn';
      case 'RECHAZADO':
      case 'INACTIVADO':
      case 'SIN PLAN':
        return 'danger';
      default:
        return 'info';
    }
  }

  get tienePlanesConNovedades(): boolean {
    return this.planesTrabajoConNovedades().length > 0;
  }

  tieneNovedadesPendientes(plan: PlanTrabajoConNovedad): boolean {
    return plan.novedades?.some(novedad => novedad.estado === 'PENDIENTE') || false;
  }

  getNovedadesPendientes(plan: PlanTrabajoConNovedad): Novedad[] {
    return plan.novedades?.filter(novedad => novedad.estado === 'PENDIENTE') || [];
  }

  onEliminarNovedad(novedad: Novedad, plan: PlanTrabajoConNovedad): void {
    this.novedadSeleccionadaParaEliminar = novedad;
    this.planSeleccionadoParaAccion = plan;
    this.displayModalEliminarNovedad = true;
  }

  handleConfirmarEliminarNovedad(): void {
    if (!this.novedadSeleccionadaParaEliminar?.id) {
      return;
    }

    this.cargandoEliminarNovedad = true;

    this.novedadService.delete(this.novedadSeleccionadaParaEliminar.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Novedad Eliminada',
          detail: 'La novedad ha sido eliminada exitosamente'
        });

        this.cargandoEliminarNovedad = false;
        this.displayModalEliminarNovedad = false;
        this.novedadSeleccionadaParaEliminar = null;
        this.cargarPlanesConNovedades();
      }, error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la novedad'
        });
        this.cargandoEliminarNovedad = false;
        this.displayModalEliminarNovedad = false;
      }
    });
  }

  handleCancelarEliminarNovedad(): void {
    this.displayModalEliminarNovedad = false;
    this.novedadSeleccionadaParaEliminar = null;
    this.planSeleccionadoParaAccion = null;
  }

  onDesactivarNovedadesClick(plan: PlanTrabajoConNovedad): void {
    this.planSeleccionadoParaAccion = plan;
    this.displayModalDesactivarNovedades = true;
  }

  handleConfirmarDesactivarNovedades(): void {
    if (!this.planSeleccionadoParaAccion?.planDeTrabajo?.id) {
      return;
    }

    this.cargandoDesactivarNovedades = true;
    const planId = this.planSeleccionadoParaAccion.planDeTrabajo.id;
    const novedadesPendientes = this.getNovedadesPendientes(this.planSeleccionadoParaAccion);
    if (novedadesPendientes.length > 0) {
      this.eliminarNovedadesPendientesYDesactivar(planId, novedadesPendientes);
    } else {
      this.desactivarNovedadesPlanDirectamente(planId);
    }
  }

  private eliminarNovedadesPendientesYDesactivar(planId: string, novedades: Novedad[]): void {
    let novedadesEliminadas = 0;
    let errores = 0;
    const totalNovedades = novedades.length;
    novedades.forEach((novedad, index) => {
      this.novedadService.delete(novedad.id).subscribe({
        next: () => {
          novedadesEliminadas++;

          if (index === totalNovedades - 1) {
            if (errores === 0) {
              this.desactivarNovedadesPlanDirectamente(planId);
            } else {
              this.finalizarConErrores(novedadesEliminadas, errores);
            }
          }
        },
        error: (error) => {
          errores++;
          if (index === totalNovedades - 1) {
            this.finalizarConErrores(novedadesEliminadas, errores);
          }
        }
      });
    });
  }

  onEliminarNovedadesPendientesClick(plan: PlanTrabajoConNovedad): void {
    this.planSeleccionadoParaAccion = plan;
    this.displayModalInactivar = true;
  }

  private desactivarNovedadesPlanDirectamente(planId: string): void {
    this.planDeTrabajoService.activarNovedades(planId, false).subscribe({
      next: (planActualizado) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Novedades Desactivadas',
          detail: 'Las novedades se desactivaron exitosamente para este plan de trabajo'
        });

        this.finalizarDesactivacion();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo desactivar las novedades. Intente nuevamente.'
        });

        this.cargandoDesactivarNovedades = false;
        this.displayModalDesactivarNovedades = false;
      }
    });
  }

  private finalizarDesactivacion(): void {
    this.cargandoDesactivarNovedades = false;
    this.displayModalDesactivarNovedades = false;
    this.planSeleccionadoParaAccion = null;
    this.cargarPlanesConNovedades();
  }

  private finalizarConErrores(eliminadas: number, errores: number): void {
    if (eliminadas > 0 && errores > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Desactivación Parcial',
        detail: `Se eliminaron ${eliminadas} novedad(es), pero ${errores} fallaron. No se pudo desactivar completamente.`
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron eliminar las novedades pendientes. No se desactivó el plan.'
      });
    }

    this.cargandoDesactivarNovedades = false;
    this.displayModalDesactivarNovedades = false;
    this.planSeleccionadoParaAccion = null;
    this.cargarPlanesConNovedades();
  }

  handleCancelarDesactivarNovedades(): void {
    this.displayModalDesactivarNovedades = false;
    this.planSeleccionadoParaAccion = null;
  }

  handleConfirmarEliminarNovedadesPendientes(): void {
    if (!this.planSeleccionadoParaAccion) {
      return;
    }
    const novedadesPendientes = this.getNovedadesPendientes(this.planSeleccionadoParaAccion);

    if (novedadesPendientes.length === 0) {
      return;
    }

    this.cargandoInactivar = true;
    let novedadesEliminadas = 0;
    let errores = 0;

    novedadesPendientes.forEach((novedad, index) => {
      this.novedadService.delete(novedad.id).subscribe({
        next: () => {
          novedadesEliminadas++;

          if (index === novedadesPendientes.length - 1) {
            this.finalizarEliminacionNovedades(novedadesEliminadas, errores);
          }
        },
        error: (error) => {
          errores++;
          if (index === novedadesPendientes.length - 1) {
            this.finalizarEliminacionNovedades(novedadesEliminadas, errores);
          }
        }
      });
    });
  }

  private finalizarEliminacionNovedades(eliminadas: number, errores: number): void {
    if (errores === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Novedades Eliminadas',
        detail: `Se eliminaron ${eliminadas} novedad(es) pendiente(s) exitosamente`
      });
    } else if (eliminadas > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Eliminación Parcial',
        detail: `Se eliminaron ${eliminadas} novedad(es), pero ${errores} fallaron`
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron eliminar las novedades'
      });
    }

    this.cargandoInactivar = false;
    this.displayModalInactivar = false;
    this.planSeleccionadoParaAccion = null;
    this.cargarPlanesConNovedades();
  }

  getMensajeDesactivarNovedades(): string {
    if (!this.planSeleccionadoParaAccion) {
      return '¿Está seguro de que desea desactivar las novedades para este plan de trabajo?';
    }

    const novedadesPendientes = this.getNovedadesPendientes(this.planSeleccionadoParaAccion);
    const planId = this.planSeleccionadoParaAccion.planDeTrabajo.id;

    if (novedadesPendientes.length > 0) {
      return `¿Está seguro de que desea desactivar las novedades para el plan de trabajo ${planId}?
      
      ATENCIÓN: Este plan tiene ${novedadesPendientes.length} novedad(es) pendiente(s) que será(n) eliminada(s) permanentemente.
      
      Esta acción no se puede deshacer.`;
    }

    return `¿Está seguro de que desea desactivar las novedades para el plan de trabajo ${planId}?`;
  }

  getEstadoNovedadMasReciente(plan: PlanTrabajoConNovedad): string {
    if (plan.esHistorico && plan.novedades.length > 0) {
      return plan.novedades[0].estado;
    }

    if (plan.novedades && plan.novedades.length > 0) {
      const novedadesValidas = plan.novedades.filter(n =>
        n.estado === 'PENDIENTE' || n.estado === 'RESUELTA'
      );

      if (novedadesValidas.length > 0) {
        const novedadesPendientes = novedadesValidas.filter(n => n.estado === 'PENDIENTE');

        if (novedadesPendientes.length > 0) {
          return 'PENDIENTE';
        }

        if (plan.planDeTrabajo.novedadesActivas) {
          return plan.estado;
        }

        const novedadMasReciente = novedadesValidas.sort((a, b) =>
          new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
        )[0];

        return novedadMasReciente.estado;
      }
    }
    return plan.estado;
  }

  getNovedadesFila(plan: PlanTrabajoConNovedad): Novedad[] {
    return plan.novedades || [];
  }

  getSeverityNovedad(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    const estadoUpper = estado.toUpperCase();

    switch (estadoUpper) {
      case 'RESUELTA':
        return 'success';

      case 'PENDIENTE':
        return 'warn';

      case 'CANCELADA':
        return 'danger';

      case 'APROBADO':
        return 'success';

      case 'ESPERANDO APROBACIÓN DE DECANATURA':
      case 'SUSPENDIDO':
      case 'SIN ENVIAR':
        return 'warn';

      case 'RECHAZADO':
      case 'INACTIVADO':
      case 'SIN PLAN':
        return 'danger';

      default:
        return 'info';
    }
  }

  getNovedadesOrdenadas(plan: PlanTrabajoConNovedad): Novedad[] {
    if (!plan.novedades || plan.novedades.length === 0) {
      return [];
    }

    return [...plan.novedades].sort((a, b) =>
      new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
    );
  }

  toggleFilaExpandida(plan: PlanTrabajoConNovedad): void {
    const id = plan.internalId;

    if (this.filasExpandidas.has(id)) {
      this.filasExpandidas.delete(id);
    } else {
      this.filasExpandidas.add(id);
    }
  }

  esFilaExpandida(plan: PlanTrabajoConNovedad): boolean {
    return this.filasExpandidas.has(plan.internalId);
  }

  private limpiarFilasExpandidas(): void {
    this.filasExpandidas.clear();
  }

  tieneNovedadesAprobadas(plan: PlanTrabajoConNovedad): boolean {
    return plan.novedades?.some(novedad => novedad.estado === 'APROBADA') || false;
  }

  private resolverNovedadesAprobadas(planId: string): void {
    const plan = this.planesTrabajoConNovedades().find(p => p.planDeTrabajo.id === planId);
    if (!plan) return;

    const novedadesAprobadas = plan.novedades?.filter(n => n.estado === 'APROBADA') || [];

    novedadesAprobadas.forEach(novedad => {
      const actualizacion: ActualizarNovedad = {
        estado: 'RESUELTA',
        fechaResolucion: new Date().toISOString(),
        resueltoPor: this.getDirectorId() || undefined
      };

      this.novedadService.update(novedad.id, actualizacion).subscribe({
        next: () => { },
        error: () => { }
      });
    });
  }
}