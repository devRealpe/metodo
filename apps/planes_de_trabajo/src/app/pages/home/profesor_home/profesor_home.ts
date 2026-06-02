import { Component, OnInit, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SeccionService } from '../../../core/services/seccion.service';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ModalConfirmacionComponent } from '../modales/modal-confirmacion/modal-confirmacion';
import { PlanTrabajoViewerComponent } from '../modales/plan-trabajo-viewer/plan-trabajo-viewer.component';
import { ModalRechazarPtComponent } from '../modales/modal-rechazar-pt/modal-rechazar-pt.component';
import { PlanDeTrabajoService } from '../../../core/services/planDeTrabajo.service';
import { FirmaService } from '../../../core/services/firma.service';
import { ProfesorService } from '../../../core/services/profesor.service';
import { PlanDeTrabajoModel, UpdateFirmasPlanDeTrabajo } from '../../../core/models/planDeTrabajo.model';
import { Profesor } from '../../../core/models/profesor.model';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { CreateAuditoria } from '../../../core/models/auditoria.model';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { PlanTrabajoDescargarService } from '../../../core/services/plan-trabajo-descargar.service';
import { AuthService } from '@microfrontends/shared-services';
import { ActivatedRoute } from '@angular/router';
import { ActividadesPlanDeTrabajoService } from '../../../core/services/actividadesPlanDeTrabajo.service';
import { CursoService } from '../../../core/services/curso.service';
import { InvestigacioneService } from '../../../core/services/investigaciones.service';
import { NotificacionesPlanTrabajoService } from '../../../core/services/notificaciones-plan-trabajo.service';
import { PlanTrabajoRealtimeService } from '../../../core/services/plan-trabajo-realtime.service';

@Component({
  selector: 'app-profesor-home',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    AvatarModule,
    ToastModule,
    DialogModule,
    ModalConfirmacionComponent,
    ModalRechazarPtComponent,
    PlanTrabajoViewerComponent,
    SelectModule,
    FormsModule
  ],
  providers: [MessageService],
  templateUrl: './profesor_home.html',
  styleUrl: './profesor_home.scss',
})
export class ProfesorHome implements OnInit {
  profesor: Profesor | null = null;


  fotoPerfilUrl: string | null = null;

  planTrabajo: PlanDeTrabajoModel | null = null;
  planTrabajoId: string = '';
  totalHoras = 40;
  porcentajeAsignado = 100;
  profesorId: string = '';
  showPlanViewer = false;
  showModalConfirmacion = false;
  showModalRechazar = false;
  firmaProfesor = '';
  loading = false;
  cargandoAprobacion = false;
  periodosAcademicos: { label: string; anio: number; periodo: number }[] = [];
  periodoSeleccionado = signal<{ label: string; anio: number; periodo: number } | null>(null);
  mostrarDropdownPeriodo = signal<boolean>(false);
  seccionesReales: { id: string; nombre: string; icono: string; color: string }[] = [];
  actividadesPlanDeTrabajo: any[] = [];
  asignaturas: any[] = [];
  investigaciones: any[] = [];

  constructor(
    private messageService: MessageService,
    private planDeTrabajoService: PlanDeTrabajoService,
    private firmaService: FirmaService,
    private profesorService: ProfesorService,
    private auditoriaService: AuditoriaService,
    private planTrabajoDescargarService: PlanTrabajoDescargarService,
    private seccionService: SeccionService,
    private notificacionesService: NotificacionesPlanTrabajoService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private actividadesPlanDeTrabajoService: ActividadesPlanDeTrabajoService,
    private cursoService: CursoService,
    private investigacionService: InvestigacioneService,
    private realtimeService: PlanTrabajoRealtimeService
  ) { 
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      
      // Si hay un cambio relevante, recargar datos
      if (trigger > 0 && this.profesorId) {
        untracked(() => {
          
          const planEnviado = this.realtimeService.planEnviado();
          const planAprobado = this.realtimeService.planAprobado();

          // Mostrar notificación al usuario
          if (planEnviado) {
            this.messageService.add({
              severity: 'info',
              summary: 'Plan Actualizado',
              detail: 'Se ha recibido un nuevo plan de trabajo',
              life: 5000
            });
            this.realtimeService.resetSignal('enviado');
          }
          
          if (planAprobado) {
            this.messageService.add({
              severity: 'success',
              summary: 'Plan Aprobado',
              detail: 'Tu plan de trabajo ha sido aprobado',
              life: 5000
            });
            this.realtimeService.resetSignal('aprobado');
          }
          
          // Recargar el plan de trabajo
          this.cargarPlanDeTrabajoDelProfesor();
        });
      }
    });
  }

  seccionesDisponibles = [
    { id: 'seccion-1', nombre: 'Labores formativas, académicas y docentes', icono: 'pi pi-graduation-cap', color: '#4FC3F7' },
    { id: 'seccion-2', nombre: 'Labores científicas', icono: 'pi pi-book', color: '#81C784' },
    { id: 'seccion-3', nombre: 'Labores culturales y de extensión', icono: 'pi pi-users', color: '#FFB74D' },
    { id: 'seccion-4', nombre: 'Otras actividades', icono: 'pi pi-cog', color: '#F06292' }
  ];

  ngOnInit() {
    const id = this.getProfesorIdFromAuth();
    if (!id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Acceso denegado',
        detail: 'Debe iniciar sesión como profesor'
      });
      return;
    }
    this.profesorId = id;
    this.cargarProfesor();
    this.generarPeriodosAcademicos();
    this.cargarProfesorSegunRol();
  }

  private cargarProfesorSegunRol(): void {
    const roles = this.authService.getUserRoles();
    const esAdmin = roles.includes('ADMIN');
    const idFromUrl = this.route.snapshot.queryParamMap.get('id');

    if (esAdmin) {
      if (idFromUrl) {
        this.profesorId = idFromUrl;
        this.cargarProfesor();
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin selección',
          detail: 'Seleccione un profesor desde el panel de administración.'
        });
      }
    } else {
      const authUser = this.authService.getCurrentUser();
      if (authUser?.username) {
        this.profesorId = authUser.username;
        this.cargarProfesor();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo identificar al usuario.'
        });
      }
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

    const periodoDefault = periodos.find(p => p.anio === anioDefecto && p.periodo === periodoDefecto)
      || periodos[0];

    this.periodosAcademicos = periodos;
    this.periodoSeleccionado.set(periodoDefault);
  }

  toggleDropdownPeriodo(): void {
    this.mostrarDropdownPeriodo.update(valor => !valor);
  }

  onCambioPeriodo(periodo: { label: string; anio: number; periodo: number }): void {
    this.periodoSeleccionado.set(periodo);
    this.mostrarDropdownPeriodo.set(false);
    this.cargarPlanDeTrabajoDelProfesor();
  }

  get periodoSeleccionadoLabel(): string {
    const periodo = this.periodoSeleccionado();
    return periodo ? periodo.label : 'Seleccione un periodo';
  }

  private getProfesorIdFromAuth(): string | null {
    const authUser = this.authService.getCurrentUser();
    return authUser?.username || null;
  }

  cargarProfesor() {
    this.loading = true;
    this.profesorService.getById(this.profesorId)
      .subscribe({
        next: (profesor) => {
          if (profesor) {
            this.profesor = profesor;
            this.cargarPlanDeTrabajoDelProfesor();
          } else {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se encontró el profesor'
            });
          }
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la información del profesor'
          });
        }
      });
  }

  cargarPlanDeTrabajoDelProfesor() {
    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      this.planTrabajo = null;
      this.loading = false;
      return;
    }

    this.loading = true;
    this.planDeTrabajoService.getByProfesorPeriodo(this.profesorId, periodo.anio, periodo.periodo)
      .subscribe({
        next: async (planDeTrabajo: PlanDeTrabajoModel | null) => {
          if (!planDeTrabajo) {
            this.loading = false;
            this.messageService.add({
              severity: 'warn',
              summary: 'Sin plan de trabajo',
              detail: `No tienes un plan de trabajo para el periodo ${periodo.label}`
            });
            this.planTrabajo = null;
            this.seccionesReales = [];
            return;
          }

          this.planTrabajo = planDeTrabajo;
          this.planTrabajoId = planDeTrabajo.id;
          this.cargarEstadoFirmas();

          try {
            const secciones = await this.seccionService.getByPlantilla(planDeTrabajo.plantilla.id).toPromise();

            this.actividadesPlanDeTrabajo = [];
            await this.actividadesPlanDeTrabajoService.getByPtId(this.planTrabajoId)
              .toPromise()
              .then(actividades => {
                this.actividadesPlanDeTrabajo = actividades || [];
              })
              .catch(error => {
                this.actividadesPlanDeTrabajo = [];
              });

            this.asignaturas = [];
            await this.cursoService.getByProfesor(this.profesorId)
              .toPromise()
              .then(asignaturas => {
                this.asignaturas = asignaturas || [];
              })
              .catch(error => {
                this.asignaturas = [];
              });

            this.investigaciones = [];

            if (secciones && secciones.length > 0) {
              const iconos = ['pi pi-graduation-cap', 'pi pi-book', 'pi pi-users', 'pi pi-cog'];
              const colores = ['#4FC3F7', '#81C784', '#FFB74D', '#F06292'];

              this.seccionesReales = secciones
                .filter(seccionPadre => {
                  return seccionPadre.hijos.some(hijo => {
                    if (hijo.seccionCursos) {
                      return this.asignaturas.length > 0;
                    } else if (hijo.seccionInvestigativa) {
                      return this.investigaciones.length > 0;
                    } else {
                      return this.actividadesPlanDeTrabajo.some(actividad =>
                        hijo.actividades?.some(ref => ref.id === actividad.actividades?.id)
                      );
                    }
                  });
                })
                .map((seccion, index) => ({
                  id: `seccion-${seccion.id}`,
                  nombre: seccion.nombre,
                  icono: iconos[index % iconos.length],
                  color: colores[index % colores.length]
                }));
            } else {
              this.seccionesReales = [];
            }

            this.loading = false;
          } catch (error) {
            this.seccionesReales = [];
            this.loading = false;
          }

        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el plan de trabajo'
          });
          this.planTrabajo = null;
          this.seccionesReales = [];
        }
      });
  }

  async onDescargarPT(): Promise<void> {
    if (!this.profesor || !this.planTrabajo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No hay datos suficientes para generar el PT'
      });
      return;
    }

    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No hay período académico seleccionado'
      });
      return;
    }

    const dedicacion = this.profesor.dedicacion?.toUpperCase().includes('COMPLETO')
      ? 'TIEMPO COMPLETO' as const
      : 'MEDIO TIEMPO' as const;

    const profesorCompatible = {
      numIdentificacion: this.profesor.numIdentificacion,
      nombres: this.profesor.nombres,
      apellidos: this.profesor.apellidos,
      programa: this.profesor.programa,
      facultad: this.profesor.facultad,
      cargo: this.profesor.cargo,
      dedicacion,
      planDeTrabajo: this.planTrabajo,
      nivelEducativo: this.profesor.nivelEducativo,
      escalafon: this.profesor.escalafon,
      vinculacion: this.profesor.vinculacion
    };

    try {
      const decano = await this.profesorService
        .getDecanoByFacultad(this.profesor.facultad)
        .toPromise();

      if (!decano) {
        throw new Error('No se encontró decano para la facultad');
      }

      const contexto = {
        periodo: { anio: periodo.anio, periodo: periodo.periodo },
        decano: {
          nombres: decano.nombres,
          apellidos: decano.apellidos,
          facultad: decano.facultad
        }
      };

      await this.planTrabajoDescargarService.descargarPTIndividual(profesorCompatible, contexto);

    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo generar el PT. Inténtelo de nuevo.'
      });
    }
  }

  private cargarEstadoFirmas(): void {
    if (!this.planTrabajoId) return;

    this.firmaService.getEstadoPlanDeTrabajo(this.planTrabajoId)
      .subscribe({
        next: (estado) => {
          if (this.planTrabajo) {
            this.planTrabajo.enviadoProfesor = estado.enviadoProfesor;
            this.planTrabajo.firmaProfesor = estado.firmaProfesor;
            this.planTrabajo.firmaDirector = estado.firmaDirector;
            this.planTrabajo.firmaDecano = estado.firmaDecano;
          }
        },
      });
  }

  onRevisarPT(seccionId?: string): void {
    if (this.planTrabajoId && this.profesorId) {
      if (seccionId) {
        localStorage.setItem('seccionObjetivo', seccionId);
      } else {
        localStorage.removeItem('seccionObjetivo');
      }
      this.showPlanViewer = true;
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Aún se están cargando los datos del plan de trabajo'
      });
    }
  }

  get puedeDescargarPT(): boolean {
    return !!this.planTrabajo &&
      this.planTrabajo.firmaProfesor === true &&
      this.planTrabajo.firmaDirector === true &&
      this.planTrabajo.firmaDecano === true;
  }

  onCerrarPlanViewer(): void {
    this.showPlanViewer = false;
  }

  onAprobarClick(): void {
    this.showModalConfirmacion = true;
  }

  onRechazarClick(): void {
    this.showModalRechazar = true;
  }

  onConfirmarAprobar(): void {
    this.showModalConfirmacion = false;
    this.aprobarPlanDeTrabajo();
  }

  onCancelarConfirmacion(): void {
    this.showModalConfirmacion = false;
  }

  aprobarPlanDeTrabajo(): void {
    if (!this.planTrabajoId || !this.profesor || !this.planTrabajo) return;

    this.cargandoAprobacion = true;
    this.firmaService.firmarComoProfesor(this.planTrabajoId).subscribe({
      next: () => {
        this.auditoriaService.create({
          idPt: this.planTrabajoId,
          tipoCambio: 'Aprobado',
          accion: `Aprobado por Profesor ${this.profesorNombre}`
        }).subscribe();

        this.enviarNotificacionAprobacion();

        this.cargandoAprobacion = false;
        this.mostrarNotificacionExito();
        this.cargarPlanDeTrabajoDelProfesor();
      },
      error: (error) => {
        this.cargandoAprobacion = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error al firmar',
          detail: 'No se pudo procesar la firma. Inténtelo de nuevo.'
        });
      }
    });
  }

  private enviarNotificacionAprobacion(): void {
    if (!this.profesor || !this.planTrabajo) {
      return;
    }


    this.profesorService.getByPrograma(this.profesor.programa).subscribe({
      next: (profesores) => {
        const director = profesores.find(p => p.cargo === 'DIRECTOR DE PROGRAMA');
        if (director) {
          this.notificacionesService.notificarAprobacionProfesorAlDirector({
            emailProfesor: this.profesor!.numIdentificacion,
            nombreProfesor: `${this.profesor!.nombres} ${this.profesor!.apellidos}`,
            emailDirector: director.numIdentificacion,
            nombreDirector: `${director.nombres} ${director.apellidos}`,
            programa: this.profesor!.programa,
            periodo: this.planTrabajo!.periodo,
            anio: this.planTrabajo!.anio
          }).subscribe({
            next: (response) => {},
            error: (err) => {}
          });
        } else {
        }
      },
      error: (err) => {}
    });
  }

  private enviarNotificacionRechazo(): void {
    if (!this.profesor || !this.planTrabajo) {
      return;
    }

    // Obtener el motivo del rechazo que fue guardado previamente
    const motivo = this.planTrabajo.motivoRechazo || 'El profesor ha rechazado el plan de trabajo';



    this.profesorService.getByPrograma(this.profesor.programa).subscribe({
      next: (profesores) => {
        const director = profesores.find(p => p.cargo === 'DIRECTOR DE PROGRAMA');
        if (director) {

          this.notificacionesService.notificarRechazoProfesor({
            emailProfesor: this.profesor!.numIdentificacion,
            nombreProfesor: `${this.profesor!.nombres} ${this.profesor!.apellidos}`,
            emailDirector: director.numIdentificacion,
            nombreDirector: `${director.nombres} ${director.apellidos}`,
            programa: this.profesor!.programa,
            periodo: this.planTrabajo!.periodo,
            anio: this.planTrabajo!.anio,
            motivo: motivo
          }).subscribe({
            next: (response) => {},
            error: (err) => {}
          });
        } else {
        }
      },
      error: (err) => {}
    });
  }

  onConfirmarRechazar(motivo: string): void {
    if (!this.planTrabajoId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se encontró el plan de trabajo'
      });
      return;
    }

    this.showModalRechazar = false;
    this.planDeTrabajoService.asignarMotivoRechazo(this.planTrabajoId, motivo)
      .subscribe({
        next: () => {
          this.rechazarPlanDeTrabajo();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar el motivo de rechazo'
          });
        }
      });
  }

  private rechazarPlanDeTrabajo(): void {
    if (!this.planTrabajoId) return;

    const firmaData: UpdateFirmasPlanDeTrabajo = {
      enviadoProfesor: false,
      firmaProfesor: false,
      firmaDirector: null,
      firmaDecano: null,
      rechazado: true,
      estado: 'RECHAZADO'
    };

    this.firmaService.actualizarFirmas(this.planTrabajoId, firmaData)
      .subscribe({
        next: () => {
          this.auditoriaService.create({
            idPt: this.planTrabajoId,
            tipoCambio: 'Rechazado',
            accion: `Rechazado por Profesor ${this.profesorNombre}`
          }).subscribe();

          // Enviar notificación al director sobre el rechazo
          this.enviarNotificacionRechazo();

          this.cargandoAprobacion = false;
          this.mostrarNotificacionRechazo();
          this.cargarPlanDeTrabajoDelProfesor();
        },
        error: (error) => {
          this.cargandoAprobacion = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error al firmar',
            detail: 'No se pudo procesar la firma. Inténtelo de nuevo.'
          });
        }
      });
  }

  private mostrarNotificacionExito(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Aprobación Exitosa',
      detail: 'El plan de trabajo ha sido aprobado y firmado correctamente'
    });
  }

  private mostrarNotificacionRechazo(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Plan Rechazado',
      detail: 'El plan de trabajo ha sido rechazado'
    });
  }

  onExportarPT(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportación',
      detail: 'Funcionalidad de exportación en desarrollo'
    });
  }

  onEnviarADireccion(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Envío',
      detail: 'Funcionalidad de envío en desarrollo'
    });
  }

  onActivityMouseEnter(event: Event, color: string): void {
    const target = event.target as HTMLElement;
    if (target) {
      target.style.borderColor = color;
      target.style.transform = 'translateY(-2px)';
    }
  }

  onActivityMouseLeave(event: Event): void {
    const target = event.target as HTMLElement;
    if (target) {
      target.style.borderColor = 'var(--p-surface-200)';
      target.style.transform = 'translateY(0)';
    }
  }

  get puedeRevisar(): boolean {
    return this.planTrabajo !== null && this.planTrabajo.enviadoProfesor === true;
  }

  get puedeAprobar(): boolean {
    const puedeAprobar = this.planTrabajo !== null &&
      this.planTrabajo.enviadoProfesor === true &&
      this.porcentajeAsignado === 100 &&
      !this.planTrabajo.firmaProfesor &&
      !this.planTrabajo.rechazado;
    return puedeAprobar;
  }

  get profesorNombre(): string {
    if (!this.profesor) return '';
    return `${this.profesor.nombres} ${this.profesor.apellidos}`;
  }

  get profesorFacultad(): string {
    return this.profesor?.facultad || '';
  }

  get profesorPrograma(): string {
    return this.profesor?.programa || '';
  }

  get profesorCargo(): string {
    return this.profesor?.dedicacion || '';
  }

  get profesorEstado(): string {
    return this.profesor?.estado && 'ACTIVO' || 'INACTIVO';
  }
}