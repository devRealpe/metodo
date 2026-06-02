import { Component, inject, signal, computed, effect, OnInit, OnDestroy, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { Profesor } from '../../../core/models/profesor.model';
import { ProfesorService } from '../../../core/services/profesor.service';
import { FacultadService } from '../../../core/services/facultad.service';
import { SistemasService } from '../../../core/services/sistemas.service';
import { NovedadService } from '../../../core/services/novedad.service';
import { Facultad } from '../../../core/models/facultad.model';
import { PlanDeTrabajoModel } from '../../../core/models/planDeTrabajo.model';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { PlanTrabajoViewerComponent } from '../modales/plan-trabajo-viewer/plan-trabajo-viewer.component';
import { ModalAgregarObservacionesComponent } from '../modales/modal-agregar-observaciones/modal-agregar-observaciones.component';
import { PlanTrabajoDescargarService } from '../../../core/services/plan-trabajo-descargar.service';
import { PlanTrabajoRealtimeService } from '../../../core/services/plan-trabajo-realtime.service';


interface ProfesorConPlan extends Profesor {
  planDeTrabajo?: PlanDeTrabajoModel;
}

interface PeriodoAcademico {
  label: string;
  anio: number;
  periodo: number;
}

@Component({
  selector: 'app-sistemas-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ToastModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
    SelectModule,
    InputTextModule,
    CheckboxModule,
    DialogModule,
    PlanTrabajoViewerComponent,
    ModalAgregarObservacionesComponent
  ],
  providers: [MessageService],
  templateUrl: './sistemas-home.component.html'
})
export class SistemasHomeComponent implements OnInit, OnDestroy {

  private readonly profesorService = inject(ProfesorService);
  private readonly facultadService = inject(FacultadService);
  private readonly sistemasService = inject(SistemasService);
  private readonly novedadesService = inject(NovedadService);
  private readonly messageService = inject(MessageService);
  private readonly planTrabajoDescargarService = inject(PlanTrabajoDescargarService);
  private readonly realtimeService = inject(PlanTrabajoRealtimeService);

  private readonly subscriptions = new Subscription();

  readonly allProfesores = signal<Profesor[]>([]);
  readonly profesoresAprobados = signal<Profesor[]>([]);
  readonly facultades = signal<Facultad[]>([]);
  readonly numIdentificacion = signal<string>('');
  readonly nombreCompleto = signal<string>('');
  readonly selectedFacultad = signal<string>('');
  readonly selectedPrograma = signal<string>('');
  readonly periodosAcademicos = signal<PeriodoAcademico[]>([]);
  readonly periodoSeleccionado = signal<PeriodoAcademico | null>(null);

  profesorParaVisualizar: ProfesorConPlan | null = null;
  showPlanViewer = false;
  showObservacionesModal = false;
  isLoadingPlans = signal<boolean>(false);

  novedadesSeleccionadas: any = null;
  displayModalNovedades = signal<boolean>(false);
  cargandoNovedades = signal<boolean>(false);

  readonly currentPage = signal<number>(0);
  readonly rowsPerPage = signal<number>(10);

  readonly paginationInfo = computed(() => {
    const total = this.displayUsers().length;
    const page = this.currentPage();
    const rows = this.rowsPerPage();
    const first = total === 0 ? 0 : page * rows + 1;
    const last = Math.min((page + 1) * rows, total);
    return { first, last, total };
  });

  readonly facultadOptions = computed(() =>
    this.facultades().map(f => ({
      label: f.nomFacultad,
      value: f.idFacultad,
    }))
  );

  readonly filteredProfesores = computed(() =>
    this.sistemasService.filterByCargo(this.profesoresAprobados())
  );

  readonly programaOptions = computed(() =>
    this.sistemasService.extractProgramasByFacultad(
      this.filteredProfesores(),
      this.selectedFacultad()
    )
  );

  readonly displayUsers = computed(() =>
    this.sistemasService.filterProfesoresByCriteria(
      this.filteredProfesores(),
      {
        identificacion: this.numIdentificacion(),
        nombreCompleto: this.nombreCompleto(),
        facultad: this.selectedFacultad(),
        programa: this.selectedPrograma(),
        novedades: this.showNovedades()
      }
    )
  );

  readonly selectedFacultadNombre = computed(() => {
    const id = this.selectedFacultad();
    if (!id) return 'Facultad';
    return this.facultades().find(f => f.idFacultad === id)?.nomFacultad || 'Facultad';
  });

  constructor() {
    effect(() => {
      const periodo = this.periodoSeleccionado();
      const profesores = this.allProfesores();

      if (periodo && profesores && profesores.length > 0) {
        this.profesoresAprobados.set([]);
        this.isLoadingPlans.set(true);
        this.loadProfesoresWithPlans();
      } else if (!periodo) {
        this.profesoresAprobados.set([]);
        this.isLoadingPlans.set(false);
      } else if (periodo && (!profesores || profesores.length === 0)) {
        this.isLoadingPlans.set(true);
      }
    });

    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();

      if (trigger > 0) {
        untracked(() => {
          const periodo = this.periodoSeleccionado();
          if (!periodo) return;

          
          const planAprobado = this.realtimeService.planAprobado();
          const planRechazado = this.realtimeService.planRechazado();

          if (planAprobado) {
            this.messageService.add({
              severity: 'success',
              summary: 'Plan Aprobado',
              detail: 'Un plan de trabajo ha sido aprobado',
              life: 5000
            });
            this.realtimeService.resetSignal('aprobado');
          }

          if (planRechazado) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Plan Rechazado',
              detail: 'Un plan de trabajo ha sido rechazado',
              life: 5000
            });
            this.realtimeService.resetSignal('rechazado');
          }

          this.loadProfesoresWithPlans(); // Recargar lista de profesores con planes
        });
      }
    });
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedFacultad() || this.selectedPrograma() || this.numIdentificacion() || this.nombreCompleto());
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.initializePeriodos();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initializePeriodos(): void {
    this.generarPeriodosAcademicos();
  }

  onCambioPeriodo(periodo: PeriodoAcademico): void {
    this.periodoSeleccionado.set(periodo);
  }

  onFacultadChange(id: string): void {
    this.selectedFacultad.set(id);
    this.selectedPrograma.set('');
  }

  onProgramaChange(programa: string): void {
    this.selectedPrograma.set(programa);
  }

  limpiarFiltros(): void {
    this.periodoSeleccionado.set(null);
    this.selectedFacultad.set('');
    this.selectedPrograma.set('');
    this.numIdentificacion.set('');
    this.nombreCompleto.set('');
    this.showNovedades.set(false);
    this.currentPage.set(0);
  }

  limpiarPeriodo(): void {
    this.periodoSeleccionado.set(null);
    this.selectedFacultad.set('');
    this.selectedPrograma.set('');
    this.numIdentificacion.set('');
    this.nombreCompleto.set('');
    this.currentPage.set(0);
  }

  limpiarFacultad(): void {
    this.selectedFacultad.set('');
    this.selectedPrograma.set('');
  }

  limpiarPrograma(): void {
    this.selectedPrograma.set('');
  }

  limpiarNombre(): void {
    this.nombreCompleto.set('');
  }



  readonly onlyNumbers = signal<boolean>(true);
  readonly showNovedades = signal<boolean>(false);

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

    this.numIdentificacion.set(numericValue);
  }

  limpiarIdentificacion(): void {
    this.numIdentificacion.set('');
    this.onlyNumbers.set(true);
  }

  readonly hasPeriodo = computed(() => !!this.periodoSeleccionado());
  readonly hasFacultad = computed(() => !!this.selectedFacultad());
  readonly hasPrograma = computed(() => !!this.selectedPrograma());
  readonly hasNombre = computed(() => !!this.nombreCompleto());
  readonly hasIdentificacion = computed(() => !!this.numIdentificacion());

  readonly first = computed(() => this.currentPage() * this.rowsPerPage());

  onPageChange(event: any): void {
    const page = event.page !== undefined ? event.page : event.first / event.rows;
    this.currentPage.set(page);
    this.rowsPerPage.set(event.rows);
  }

  onVer(profesor: Profesor): void {
    const { anio, periodo } = this.parsePeriodo();

    const planSub = this.sistemasService
      .loadPlanTrabajoForProfesor(profesor.numIdentificacion, anio, periodo)
      .subscribe({
        next: (plan: PlanDeTrabajoModel | null) => {
          if (!plan) {
            this.showWarning(`No hay plan de trabajo para ${profesor.nombres} en ${anio}-P${periodo}`);
            return;
          }
          this.profesorParaVisualizar = { ...profesor, planDeTrabajo: plan };
          this.showPlanViewer = true;
        },
        error: () => this.showWarning('Error al cargar el plan de trabajo')
      });

    this.subscriptions.add(planSub);
  }

  exportarPT(): void {
    if (!this.displayUsers().length) {
      this.showWarning('No hay datos para exportar');
      return;
    }
    this.showObservacionesModal = true;
  }

  onConfirmarObservaciones(observaciones: string): void {
    const { anio, periodo } = this.parsePeriodo();

    this.showExportingMessage();

    const exportSub = this.sistemasService
      .exportProfesorDataToExcel(this.displayUsers(), observaciones, anio, periodo, 'Datos.xlsx')
      .subscribe({
        next: (success: boolean) => {
          if (success) {
            this.showSuccess('Archivo Excel generado y descargado correctamente');
          } else {
            this.showWarning('Error al exportar los datos');
          }
        },
        error: () => this.showWarning('Error al exportar los datos')
      });

    this.subscriptions.add(exportSub);
  }

  private showExportingMessage(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportando',
      detail: 'Generando datos en formato Excel, por favor espere...',
      life: 3000
    });
  }

  onCancelarObservaciones(): void {
    this.showObservacionesModal = false;
  }

  async onDescargar(profesor: Profesor): Promise<void> {
    const { anio, periodo } = this.parsePeriodo();

    const planSub = this.sistemasService
      .loadPlanTrabajoForProfesor(profesor.numIdentificacion, anio, periodo)
      .subscribe({
        next: async (plan: PlanDeTrabajoModel | null) => {
          if (!plan) {
            this.showWarning(`${profesor.nombres} ${profesor.apellidos} no tiene un plan de trabajo asignado`);
            return;
          }

          this.messageService.add({
            severity: 'info',
            summary: 'Generando PT',
            detail: `Generando PDF de ${profesor.nombres} ${profesor.apellidos}...`,
            life: 3000
          });

          try {
            const decano = await this.profesorService.getDecanoByFacultad(profesor.facultad).toPromise();

            const nombreDecano = decano ? {
              nombres: decano.nombres,
              apellidos: decano.apellidos,
              facultad: decano.facultad
            } : {
              nombres: '',
              apellidos: '',
              facultad: profesor.facultad
            };

            const dedicacion = (profesor.dedicacion?.toUpperCase().includes('TIEMPO COMPLETO') ||
              profesor.escalafon?.toUpperCase().includes('TC')) ? 'TIEMPO COMPLETO' : 'MEDIO TIEMPO';

            const profConPlan = {
              numIdentificacion: profesor.numIdentificacion,
              nombres: profesor.nombres,
              apellidos: profesor.apellidos,
              programa: profesor.programa,
              facultad: profesor.facultad,
              cargo: profesor.cargo,
              dedicacion: dedicacion as 'TIEMPO COMPLETO' | 'MEDIO TIEMPO',
              planDeTrabajo: plan,
              nivelEducativo: profesor.nivelEducativo,
              escalafon: profesor.escalafon,
              vinculacion: profesor.vinculacion
            };

            const contexto = {
              periodo: { anio, periodo },
              decano: nombreDecano
            };

            await this.planTrabajoDescargarService.descargarPTIndividual(profConPlan, contexto);
            this.showSuccess(`Se ha descargado el PT de ${profesor.nombres} ${profesor.apellidos}`);
          } catch (error) {
            this.showWarning('Ocurrió un error al generar el PT individual. Inténtelo de nuevo.');
          }
        },
        error: () => this.showWarning('Error al cargar el plan de trabajo')
      });

    this.subscriptions.add(planSub);
  }

  onCerrarPlanViewer(): void {
    this.showPlanViewer = false;
    this.profesorParaVisualizar = null;
  }

  planTrabajoIdViewer(): string | null {
    return this.profesorParaVisualizar?.planDeTrabajo?.id ?? null;
  }

  profesorIdViewer(): string | null {
    return this.profesorParaVisualizar?.numIdentificacion ?? null;
  }

  private parsePeriodo(): { anio: number; periodo: number } {
    const periodo = this.periodoSeleccionado();
    if (!periodo) {
      return { anio: 0, periodo: 0 };
    }
    return {
      anio: periodo.anio,
      periodo: periodo.periodo
    };
  }

  private loadInitialData(): void {
    const facultadesSub = this.facultadService
      .getAll()
      .subscribe({
        next: (data: Facultad[]) => this.facultades.set(data),
        error: () => this.showWarning('Error al cargar facultades')
      });

    const profesoresSub = this.profesorService
      .getAll()
      .subscribe({
        next: (data: Profesor[]) => {
          this.allProfesores.set(data);
        },
        error: () => this.showWarning('Error al cargar profesores')
      });

    this.subscriptions.add(facultadesSub);
    this.subscriptions.add(profesoresSub);
  }

  private ordenarPorCargo(profesores: Profesor[]): Profesor[] {
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

  private loadProfesoresWithPlans(): void {
    if (!this.periodoSeleccionado()) {
      this.profesoresAprobados.set([]);
      this.isLoadingPlans.set(false);
      return;
    }

    const profesores = this.allProfesores();

    if (!profesores || profesores.length === 0) {
      this.profesoresAprobados.set([]);
      this.isLoadingPlans.set(false);
      return;
    }

    const { anio, periodo } = this.parsePeriodo();

    const plansSub = this.sistemasService
      .filterProfesoresWithPlans(profesores, anio, periodo)
      .subscribe({
        next: (profesoresConPlanes: Profesor[]) => {
          const profesoresOrdenados = this.ordenarPorCargo(profesoresConPlanes);
          this.profesoresAprobados.set(profesoresOrdenados);
          this.isLoadingPlans.set(false);
        },
        error: () => {
          this.showWarning('Error al cargar profesores con planes de trabajo');
          this.isLoadingPlans.set(false);
        }
      });

    this.subscriptions.add(plansSub);
  }

  private showWarning(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: message,
      life: 3000,
    });
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: message,
      life: 3000,
    });
  }

  getEstadoProfesor(profesor: ProfesorConPlan): string {
    const estado = profesor.planDeTrabajo?.estado;

    if (estado === 'Enviado a sistemas') {
      return 'Aprobado';
    }

    return estado || 'Sin estado';
  }

  getSeverityEstado(profesor: ProfesorConPlan): 'success' | 'info' | 'warn' | 'danger' {
    const estado = profesor.planDeTrabajo?.estado;

    switch (estado) {
      case 'Enviado a sistemas':
        return 'success';
      case 'Suspendido':
        return 'warn';
      case 'Inactivado':
        return 'danger';
      default:
        return 'info';
    }
  }

  tieneNovedades(profesor: ProfesorConPlan): boolean {
    return profesor.planDeTrabajo?.novedadesActivas === true;
  }

  onVerNovedades(profesor: ProfesorConPlan): void {
    if (profesor.planDeTrabajo) {
      this.cargarNovedades(profesor.planDeTrabajo.id);
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
                  programa: ''
                }
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
                }
              };
              this.displayModalNovedades.set(true);
              this.cargandoNovedades.set(false);
            }
          });
        } else {
          this.messageService.add({
            severity: 'info',
            summary: 'Sin novedades',
            detail: 'No hay novedades pendientes para este plan de trabajo'
          });
          this.cargandoNovedades.set(false);
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las novedades'
        });
        this.cargandoNovedades.set(false);
      }
    });
  }

  cerrarModalNovedades(): void {
    this.displayModalNovedades.set(false);
    this.novedadesSeleccionadas = null;
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

    this.periodosAcademicos.set(periodos);
  }
}