import { Component, signal, inject, OnInit, computed, DestroyRef, ElementRef, ViewChild, Injector, effect, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, debounceTime, switchMap, from, mergeMap, of, combineLatest, startWith, Observable, catchError, map, first } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { EstudiantesOracleService } from '../../core/services/estudiantes-oracle.service';
import { EstudiantesOracle } from '../../core/models/estudiantes-oracle.model';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ArchivoPlanoService } from '../../core/services/archivo-plano.service';
import { EstudianteService } from '../../core/services/estudiante.service';
import { Estudiante } from '../../core/models/estudiante.model';
import { MovilidadService } from '../../core/services/movilidad.service';
import { MovilidadEstadoService } from '../../core/services/movilidad-estado.service';
import { Movilidad } from '../../core/models/movilidad.model';
import { Opcion } from '../../core/models/opcion.model';
import { SelectModule } from 'primeng/select';
import { NotificationService } from '@microfrontends/shared-services';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import {  TableColumn, TableAction, InputComponent, SelectComponent, DatepickerComponent, InfoTableComponent } from '@microfrontends/shared-ui';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FormUtilsService } from '../../core/services/form-utils.service';
import { AutorizacionService } from '../../core/services/autorizacion.service';
import { Autorizacion } from '../../core/models/autorizacion.model';
import { ProgramaService } from '../../core/services/programas.service';
import { ModalidadService } from '../../core/services/modalidad.service';
import { TipoActividadService } from '../../core/services/tipo-actividad.service';
import { InstitucionesService } from '@microfrontends/shared-services';
import { TipoMovilidadService } from '../../core/services/tipo-movilidad.service';
import { MovilidadEstudianteService } from '../../core/services/movilidad-estudiante.service';

interface EstudianteOracleData {
  idEstudiante: string;
  nombre: string;
  semestre: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  solicitarAutorizacion?: boolean;
  uniqueId?: string; // ID único para distinguir estudiantes duplicados
}

// Local minimal definition matching other lists that use MovilidadConRelaciones
// Kept here to avoid cross-file type dependency; consider extracting to a shared model
interface MovilidadConRelaciones extends Movilidad {
  estudiantes?: Estudiante[];
  solicitarAutorizacion?: boolean;
  autorizacionCancelada?: boolean;
  movilidadPostulanteId?: string;
  movilidadEstudianteId?: string; // relación auxiliar creada al registrar estudiantes
} 

@Component({
  selector: 'app-estudiantes-oracle-consulta',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    CardModule,
    ProgressBarModule,
    ToastModule,
    SelectModule,
    CheckboxModule,
    DialogModule,
    DatePickerModule,
    ConfirmDialogModule,
    TooltipModule,
    InfoTableComponent,
    InputComponent,
    MessageModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './estudiantes-oracle-consulta.component.html',
})
export class EstudiantesOracleConsultaComponent implements OnInit {
  private readonly api = inject(EstudiantesOracleService);
  private readonly archivoPlanoService = inject(ArchivoPlanoService);
  private readonly movilidadService = inject(MovilidadService);
  private readonly movilidadEstadoService = inject(MovilidadEstadoService);
  private readonly estudianteService = inject(EstudianteService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly autorizacionService = inject(AutorizacionService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formUtilsService = inject(FormUtilsService);
  private readonly messageService = inject(MessageService);
  private readonly injector = inject(Injector);
  private readonly tipoMovilidadService = inject(TipoMovilidadService);
  private readonly modalidadService = inject(ModalidadService);
  private readonly tipoActividadService = inject(TipoActividadService);
  private readonly institucionesService = inject(InstitucionesService);
  private readonly programaService = inject(ProgramaService);
  private readonly movilidadEstudianteService = inject(MovilidadEstudianteService);

  form!: FormGroup;

  // Formulario para crear movilidad básica
  formMovilidadBasica!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  estudiantesSeleccionados = signal<EstudianteOracleData[]>([]);
  busquedaIdEstudiante = signal<string>('');
  estudiantePrevisualizacion = signal<EstudianteOracleData | null>(null);
  identificacionesExtraidas = signal<string[]>([]);
  infoArchivo = signal<any>(null);

  // signal tracks whether the currently selected mobility already has any approved levels
  movilidadSeleccionadaTieneAprobaciones = signal<boolean>(false);
  nombreArchivoValue = signal<string>('');
  tamanoArchivoValue = signal<string>('');
  columnaDetectadaValue = signal<string>('');
  totalRegistrosValue = signal<string>('');
  mensajeDuplicadosValue = signal<string>('');
  cargando = signal(false);

  movilidades = signal<Movilidad[]>([]);
  movilidadSeleccionada = signal<Movilidad | null>(null);

  /** Generates PDF for currently selected mobility */
  generarPDF(): void {
    const mov = this.movilidadSeleccionada();
    if (!mov || !mov.id) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No hay movilidad seleccionada para generar PDF' });
      return;
    }

    this.movilidadService.generatePdf(mov.id).subscribe({
      next: (pdfBlob: Blob) => {
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movilidad-${mov.nombreMovilidad?.replace(/[^a-zA-Z0-9]/g, '-') || 'sin-nombre'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error generando PDF desde formulario estudiantes:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar el PDF. Intente nuevamente.' });
      }
    });
  }
  estudiantesExistentes = signal<Estudiante[]>([]);

  // Propiedades para creación de movilidad básica
  mostrarFormularioMovilidadBasica = signal(false);
  tiposMovilidadOpciones = signal<any[]>([]);
  diasTotalesMovilidadBasica = signal<number | null>(null);
  modalidadOpciones = signal<any[]>([]);
  tipoActividadOpciones = signal<any[]>([]);
  institucionesOpciones = signal<any[]>([]);
  institucionesCargadas = signal<any[]>([]);

  // Filtros de facultad y programa
  filtroFacultad = signal<string>('');
  filtroPrograma = signal<string>('');

  // Listas de programas y facultades para mapeo de nombres
  facultades = signal<Opcion[]>([]);
  programas = signal<{id: string, nombre: string, idFacultad: string}[]>([]);
  programasFiltrados = signal<Opcion[]>([{ label: 'Todos los programas', value: '' }]);

  // Propiedades para selección de estudiante y programa
  selectedEstudiante = signal<Estudiante | null>(null);
  selectedPrograma = signal<{id: string, nombre: string} | null>(null);

  isDatosMovilidadExpanded = signal(true);
  isEstudiantesNuevosExpanded = signal(false);
  mostrarModalMovilidad = signal(false);

  // wizard step indicator: always on student registration step
  pasoActual = 2;

  readonly = signal(false);
  isEditMode = signal(false);
  guardandoMasivo = signal(false);
  isUpdating = signal(false);

  // Caché de estudiantes con límite de 500 entradas
  private estudiantesCache = new Map<string, EstudianteOracleData>();

  movilidadError = signal<string>('');
  estudiantesError = signal<string>('');
  terminosError = signal<string>('');

  cambiosPendientesEstudiantes = signal({ eliminar: [] as string[] });

  // Propiedades para comparar cambios en modo edición
  movilidadOriginal: Movilidad | null = null;
  estudiantesExistentesOriginales: Estudiante[] = [];
  hasChanges = signal(false);

  columnsExistentes: TableColumn[] = [
    { field: 'idEstudiante', header: 'ID Estudiante', sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'semestre', header: 'Semestre', sortable: true },
    { field: 'fechaInicio', header: 'Fecha Inicio', sortable: true },
    { field: 'fechaFin', header: 'Fecha Fin', sortable: true },
    { field: 'solicitarAutorizacion', header: 'Solicitar Autorización', sortable: false }
  ];

  actionsExistentes: TableAction[] = [
    { icon: 'pi pi-check', tooltip: 'Autorizar', severity: 'success', onClick: (row: any) => this.autorizarEstudiante(row), visible: (row: any) => row.solicitarAutorizacion },
    { icon: 'pi pi-trash', tooltip: 'Marcar para eliminar (se eliminará al presionar Actualizar)', severity: 'danger', onClick: (row: any) => this.eliminarEstudianteExistente(row) }
  ];

  columnsNuevos: TableColumn[] = [
    { field: 'idEstudiante', header: 'ID Estudiante', sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'semestre', header: 'Semestre', sortable: true },
    { field: 'fechaInicio', header: 'Fecha Inicio', sortable: true },
    { field: 'fechaFin', header: 'Fecha Fin', sortable: true }
  ];

  actionsNuevos: TableAction[] = [
    { icon: 'pi pi-trash', tooltip: 'Eliminar', severity: 'danger', onClick: (row: any) => this.eliminarEstudiante(row) }
  ];

  // Array de tipos de movilidad que contengan palabras clave de estudiantes (se llena dinámicamente)
  tiposMovilidadEstudiante = computed<string[]>(() => {
    return this.modalidadService.getTiposMovilidadEstudiante(this.movilidades());
  });

  opcionesMovilidad = computed<Opcion[]>(() => {
    const movilidades = this.movilidades();

    // Filtrar movilidades activas para estudiantes
    const filtroFacultad = this.filtroFacultad().trim();
    const filtroPrograma = this.filtroPrograma().trim();

    let filtradas = movilidades.filter(m =>
      m.estado !== 'INACTIVO' &&
      this.tiposMovilidadEstudiante().includes(m.tipoMovilidad?.nombre || '') &&
      (!filtroFacultad || (m.facultad && String(m.facultad).trim() === filtroFacultad)) &&
      (!filtroPrograma || (m.programa && String(m.programa).trim() === filtroPrograma))
    );

    const opciones = filtradas.map((m: Movilidad) => ({
      label: m.nombreMovilidad || 'Sin nombre',
      value: m.id
    }));

    return [
      { label: 'Seleccionar movilidad...', value: '' },
      ...opciones
    ];
  });

  progresoFormulario = computed(() => {
    let progress = 0;
    if (this.movilidadSeleccionada()) progress += 33;
    if (this.estudiantesSeleccionados().length > 0) progress += 34;
    if (this.identificacionesExtraidas().length > 0) progress += 33;
    return progress;
  });

  // Opciones únicas para filtros
  opcionesFacultad = computed<Opcion[]>(() => {
    return [
      { label: 'Todas las facultades', value: '' },
      ...this.facultades()
    ];
  });

  opcionesPrograma = computed<Opcion[]>(() => {
    return [
      { label: 'Todos los programas', value: '' },
      ...this.programasFiltrados()
    ];
  });




  private initForm(): void {
    this.form = this.fb.group({
      terminosCondiciones: [false, Validators.requiredTrue],
      busquedaIdEstudiante: ['']
    });

    // Inicializar formulario de movilidad básica
    this.formMovilidadBasica = this.fb.group({
      nombreMovilidad: ['', Validators.required],
      modalidad: [null, Validators.required],
      tipoActividad: [null, Validators.required],
      lugarDestino: ['', Validators.required],
      tipoMovilidad: [null, Validators.required],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required]
    }, { validators: this.fechaFinDespuesDeFechaInicio });
  }

  private fechaFinDespuesDeFechaInicio(group: FormGroup): ValidationErrors | null {
    const fechaInicio = group.get('fechaInicio')?.value;
    const fechaFin = group.get('fechaFin')?.value;
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      return { fechaFinInvalida: true };
    }
    return null;
  }

  ngOnInit(): void {
    this.movilidadSeleccionada.set(null);
    this.isEditMode.set(false);
    this.cargarMovilidades();

    this.cargarTiposMovilidad();
    this.cargarModalidades();
    this.cargarTipoActividades();
    this.cargarInstituciones();
    this.setupDiasTotalesCalculation();

    // Cargar opciones para filtros
    this.cargarFacultades();
    this.cargarProgramas();

    this.route.queryParams.subscribe(params => {
      const movilidadId = params['id'];
      const readonlyParam = params['readonly'];
      
      const isReadonly = readonlyParam === 'true';
      const isEdit = !!movilidadId && !isReadonly;
      
      this.readonly.set(isReadonly);
      this.isEditMode.set(isEdit);
      
      if (isEdit) {
        this.isEstudiantesNuevosExpanded.set(true);
      }
      
      if (movilidadId) {
        this.cargarMovilidadPorId(movilidadId);
      }
    });

    // Mantener sincronizado `solicitarAutorizacion` cuando se notifique una actualización de movilidad
    this.movilidadEstadoService.movilidadActualizada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((movilidadId) => {
        if (!movilidadId) return;
        const mov = this.movilidades().find(m => m.id === movilidadId || (m as any).movilidadPostulanteId === movilidadId);
        if (!mov) return;

        // autorization status is stored by movilidadId; relationship ids are not used here
        const idToCheck = mov.id;
        if (!idToCheck) return;

        // Consultar el valor autoritativo desde la tabla movilidad_estudiante
        this.estudianteService.getAutorizacionForMovilidad(idToCheck).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (valor: boolean) => {
            mov.solicitarAutorizacion = !!valor;
            const idx = this.movilidades().findIndex(m => m.id === mov.id);
            if (idx !== -1) {
              const arr = [...this.movilidades()];
              arr[idx] = { ...mov };
              this.movilidades.set(arr);
            }
            // Actualizar movilidadSeleccionada si coincide, igual que en postulantes
            const seleccionada = this.movilidadSeleccionada();
            if (seleccionada?.id === mov.id) {
              this.movilidadSeleccionada.set({ ...seleccionada, solicitarAutorizacion: !!valor });
            }
            // adicional: también recalcular señal de aprobaciones para la movilidad
            this.autorizacionService.getAprobacionesPorMovilidad(idToCheck).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (aprobaciones: any[]) => {
                const hayAprob = Array.isArray(aprobaciones) && aprobaciones.some(a => a.estado === 'aprobado');
                this.movilidadSeleccionadaTieneAprobaciones.set(hayAprob);
              },
              error: () => {
                // ignorar error
                this.movilidadSeleccionadaTieneAprobaciones.set(false);
              }
            });
          },
          error: () => {
            // Si falla la consulta autoritativa, no sobrescribir el estado local
          }
        });
      });

    this.form.get('busquedaIdEstudiante')?.valueChanges
      .pipe(
        debounceTime(300),
        switchMap(valor => {
          if (!valor?.trim()) {
            this.estudiantePrevisualizacion.set(null);
            return of(null);
          }
          this.cargando.set(true);
          return this.api.getByIdEstudiante(valor.trim()).pipe(
            finalize(() => this.cargando.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(estudiantes => {
        const estudiante = estudiantes?.[0];
        if (estudiante) {
          const estudianteData = {
            idEstudiante: estudiante.idEstudiante,
            nombre: estudiante.nombre,
            semestre: estudiante.semestre,
            fechaInicio: estudiante.fechaInicio,
            fechaFin: estudiante.fechaFin,
            uniqueId: this.generateUniqueId()
          };
          this.estudiantePrevisualizacion.set(estudianteData);
        } else {
          this.estudiantePrevisualizacion.set(null);
        }
      });

    // Watch for changes to enable/disable update button
    this.formMovilidadBasica.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.checkForChanges();
    });

    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.estudiantesSeleccionados();
        this.checkForChanges();
      });

      effect(() => {
        this.estudiantesExistentes();
        this.checkForChanges();
      });

      effect(() => {
        this.cambiosPendientesEstudiantes();
        this.checkForChanges();
      });
    });
  }

  eliminarEstudiante(e: any): void {
    const idToDelete = String(e.idEstudiante).trim();
    this.estudiantesSeleccionados.update(estudiantes =>
      estudiantes.filter(est => String(est.idEstudiante).trim() !== idToDelete)
    );
  }

  private limpiarBusqueda(): void {
    this.busquedaIdEstudiante.set('');
    this.estudiantePrevisualizacion.set(null);
  }

  confirmarAgregarEstudiante(): void {
    this.ejecutarSeguro(() => {
      const estudiante = this.estudiantePrevisualizacion();
      if (!estudiante) throw new Error('No hay estudiante seleccionado');

      // Verificar si ya está en estudiantesSeleccionados
      if (this.estudiantesSeleccionados().some(e => e.idEstudiante === estudiante.idEstudiante)) {
        throw new Error('Ese estudiante ya fue agregado a la lista de nuevos estudiantes');
      }

      // Verificar si ya está en estudiantesExistentes
      if (this.estudiantesExistentes().some(e => e.idEstudiante === estudiante.idEstudiante)) {
        throw new Error('Ese estudiante ya está registrado como estudiante existente en esta movilidad');
      }

      this.estudiantesSeleccionados.update(estudiantes => [...estudiantes, estudiante]);
      this.limpiarBusqueda();
    });
  }

  cancelarAgregarEstudiante(): void {
    this.limpiarBusqueda();
  }

  private generateUniqueId(): string {
    return `${Date.now()}-${Math.random()}`;
  }

  private scrollToField(fieldName: string): void {
    const element = document.getElementById(fieldName);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private ejecutarSeguro(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      this.notificationService.showNotification('error', (error as Error).message);
    }
  }

  private guardarComponentes(movilidad: Movilidad): Promise<void> {
    return new Promise((resolve, reject) => {
      // Procesar eliminaciones de estudiantes pendientes primero
      if (this.cambiosPendientesEstudiantes().eliminar.length > 0) {
        this.procesarEliminacionesEstudiantes(movilidad).then(() => {
          resolve();
        }).catch((error: any) => {
          reject(error);
        });
      } else {
        resolve();
      }
    });
  }

private procesarEliminacionesEstudiantes(movilidad: Movilidad): Promise<void> {
    return new Promise((resolve, reject) => {
      this.guardandoMasivo.set(true);

      // Procesar eliminación de estudiantes marcados para eliminación
      const promesasEliminacionEstudiantes: Promise<void>[] = [];
      for (const estudianteId of this.cambiosPendientesEstudiantes().eliminar) {
        promesasEliminacionEstudiantes.push(
          this.estudianteService.deleteFromMovilidad(movilidad.id, estudianteId).toPromise()
            .then(() => this.estudianteService.delete(estudianteId).toPromise())
            .then(() => Promise.resolve())
            .catch(error => {
              return Promise.reject(error);
            })
        );
      }

      // Ejecutar eliminación de estudiantes
      Promise.all(promesasEliminacionEstudiantes)
        .then(() => {
          // Limpiar cambios pendientes
          this.cambiosPendientesEstudiantes.set({ eliminar: [] });
          // Actualizar lista de estudiantes existentes
          this.cargarEstudiantesPorMovilidad(movilidad.id);
          this.guardandoMasivo.set(false);
          resolve();
        })
        .catch(error => {
          this.guardandoMasivo.set(false);
          reject(error);
        });
    });
  }

  private mostrarMensaje(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.notificationService.showNotification(severity, { summary, detail });
  }

  private manejarError(error: any, mensajeDefault: string, titulo: string): void {
    const mensajeError = error.status === 0 ? 'No se pudo conectar con el servidor' :
                        (error.status === 401 || error.status === 403) ? 'No tienes permisos. Inicia sesión nuevamente' :
                        error.error?.message || mensajeDefault;
    this.mostrarMensaje('error', titulo, mensajeError);
  }

  autorizarMovilidad(): void {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad?.id) {
      this.mostrarMensaje('warn', 'Advertencia', 'Debe seleccionar una movilidad primero.');
      return;
    }

    const nuevoValor = !movilidad.solicitarAutorizacion;
    const tipoMovilidad = 'ESTUDIANTE';

    // CANCELAR: comprobar aprobaciones y usar API centralizada (update si existe, create si no)
    if (!nuevoValor) {
      this.autorizacionService.getAprobacionesPorMovilidad(movilidad.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (aprobaciones) => {
          const hayNivelesAprobados = Array.isArray(aprobaciones) && aprobaciones.some(a => a.estado === 'aprobado');
          // update disabled signal too
          this.movilidadSeleccionadaTieneAprobaciones.set(hayNivelesAprobados);
          if (hayNivelesAprobados) {
            this.mostrarMensaje('warn', 'Acción no permitida', 'No se puede cancelar la solicitud porque ya existen niveles aprobados');
            return;
          }

          // Ningún nivel aprobado → proceder con la cancelación centralizada
          this.autorizacionService.cancelOrCreateForMovilidad(movilidad.id, 'ESTUDIANTE').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              // Actualizar flags y UI
              this.estudianteService.updateAutorizacionForMovilidad(movilidad.id, false).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: () => {
                  const estudiantesActualizados = this.estudiantesExistentes().map(e => ({ ...e, solicitarAutorizacion: false }));
                  this.estudiantesExistentes.set(estudiantesActualizados);
                  this.actualizarEstadoLocal(movilidad, false);
                  if (this.form) this.form.patchValue({ solicitarAutorizacion: false }, { emitEvent: false });
                  this.cargarEstudiantesPorMovilidad(movilidad.id);
                  this.movilidadEstadoService.notificarMovilidadActualizada(movilidad.id);
                  this.mostrarMensaje('info', 'Solicitud Cancelada', `La solicitud de autorización para "${movilidad.nombreMovilidad}" ha sido cancelada`);
                },
                error: (err) => {
                  const estudiantesActualizados = this.estudiantesExistentes().map(e => ({ ...e, solicitarAutorizacion: false }));
                  this.estudiantesExistentes.set(estudiantesActualizados);
                  this.actualizarEstadoLocal(movilidad, false);
                  this.movilidadEstadoService.notificarMovilidadActualizada(movilidad.id);
                }
              });
            },
            error: (err) => {
              this.mostrarMensaje('error', 'Error al Cancelar', 'No se pudo registrar la cancelación. Intenta nuevamente.');
            }
          });
        },
        error: (err) => {
          // Eliminado fallback tolerante: si no se puede comprobar el estado de aprobaciones, abortar la operación.
          this.movilidadSeleccionadaTieneAprobaciones.set(false);
          this.mostrarMensaje('error', 'Error al cancelar', 'No se pudo verificar el estado de aprobaciones. Intenta nuevamente más tarde.');
          return;
        }
      });

      return;
    }

    // Si llegamos aquí: SOLICITAR (comportamiento igual al de Usuarios)
    // reset aprobaciones flag: nueva solicitud no puede tener aprobaciones previas
    this.movilidadSeleccionadaTieneAprobaciones.set(false);
    this.solicitarAutorizacion();
  }

      
  solicitarAutorizacion(): void {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad?.id) {
      this.mostrarMensaje('warn', 'Advertencia', 'Debe seleccionar una movilidad primero.');
      return;
    }

    // Si ya está solicitada, solo redirigir
    if (movilidad.solicitarAutorizacion) {
      this.router.navigate(['/app/autorizacion'], { queryParams: { movilidadId: movilidad.id } });
      return;
    }

    // Antes de crear la autorización, consultar el valor autoritativo de BD y sincronizar la UI
    this.cargarEstadoAutorizacion(movilidad.id);

    const mov = movilidad as MovilidadConRelaciones;
    // debemos averiguar el id real de la relación estudiante
    this.movilidadEstudianteService.getByMovilidadId(movilidad.id)
      .pipe(first())
      .subscribe(rels => {
        if (!rels || rels.length === 0) {
          // no hay relación, no podemos crear autorización
          this.mostrarMensaje('error', 'Error', 'Agrega al menos un estudiante asociado a la movilidad antes de solicitar autorización');
          return;
        }
        const relacionId = String(rels[0].movilidadEstudianteId);
        mov.movilidadEstudianteId = relacionId;
        this.movilidadSeleccionada.set({ ...mov });

        const autorizacion: Partial<Autorizacion> = {
          estado: 'pendiente',
          movilidadEstudianteId: relacionId
        };

        // PASO 1: Crear o actualizar autorización en BD usando createOrUpdate
        this.autorizacionService.createOrUpdate(autorizacion as Autorizacion).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (autorizacionCreada) => {
        this.mostrarMensaje('success', 'Autorización Creada', `La autorización para "${movilidad.nombreMovilidad}" se guardó correctamente en la base de datos`);

        // Crear aprobaciones automáticas (igual que en Usuarios) — tolerante a fallos
        const tipoMovilidad = 'ESTUDIANTE';
        const crearAprobaciones$ = this.autorizacionService.crearAprobacionesAutomaticas(relacionId, 7, tipoMovilidad, tipoMovilidad).pipe(catchError(() => of([])));

        crearAprobaciones$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            // PASO 2: Actualizar flag solicitarAutorizacion en estudiantes
            this.estudianteService.updateAutorizacionForMovilidad(movilidad.id, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: () => {
                // Actualizar estado local
                const estudiantesActualizados = this.estudiantesExistentes().map(e => ({ ...e, solicitarAutorizacion: true }));
                this.estudiantesExistentes.set(estudiantesActualizados);

                movilidad.solicitarAutorizacion = true;
                this.movilidadSeleccionada.set({ ...movilidad });
                this.movilidadEstadoService.notificarMovilidadActualizada(movilidad.id);

                // Sincronizar inmediatamente con el valor autoritativo en BD
                this.cargarEstadoAutorizacion(movilidad.id);

                // PASO 3: Redirigir a página de autorizaciones
                setTimeout(() => {
                  this.router.navigate(['/app/autorizacion'], { queryParams: { movilidadId: movilidad.id } });
                }, 1000);
              },
              error: (error) => {
                this.mostrarMensaje('warn', 'Advertencia', 'La autorización se creó pero no se pudo actualizar el estado. Recarga la página.');
              }
            });
          },
          error: (err) => {
            // Si falla la creación de aprobaciones, aun así intentamos actualizar flags
            this.estudianteService.updateAutorizacionForMovilidad(movilidad.id, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: () => {
                const estudiantesActualizados = this.estudiantesExistentes().map(e => ({ ...e, solicitarAutorizacion: true }));
                this.estudiantesExistentes.set(estudiantesActualizados);
                movilidad.solicitarAutorizacion = true;
                this.movilidadSeleccionada.set({ ...movilidad });
                this.movilidadEstadoService.notificarMovilidadActualizada(movilidad.id);
                setTimeout(() => {
                  this.router.navigate(['/app/autorizacion'], { queryParams: { movilidadId: movilidad.id } });
                }, 1000);
              },
              error: () => {
                this.mostrarMensaje('error', 'Error', 'No se pudo actualizar el estado tras fallo de creación de aprobaciones');
              }
            });
          }
        });
      },
      error: (error) => {
        const mensajeError = error.status === 0 ? 'No se pudo conectar con el servidor. Verifica que el servicio esté corriendo.' :
                            (error.status === 401 || error.status === 403) ? 'No tienes permisos para crear autorizaciones. Inicia sesión nuevamente.' :
                            error.error?.message || 'No se pudo crear la solicitud de autorización en la base de datos';
        this.mostrarMensaje('error', 'Error Crítico', mensajeError);
      }
    });
  });
  }

  confirmarAutorizarMovilidad(movilidad?: MovilidadConRelaciones): void {
    const movSel = movilidad || this.movilidadSeleccionada();
    if (!movSel?.id) {
      this.mostrarMensaje('warn', 'Advertencia', 'Debe seleccionar una movilidad primero.');    
      return;
    }

    const accion = movSel.solicitarAutorizacion ? 'cancelar' : 'solicitar';
    const mensaje = `¿Está seguro de ${accion} la autorización para la movilidad "${movSel.nombreMovilidad}"?`;

    // Evitar warning de autofocus: blur del elemento activo y abrir el diálogo en la siguiente macrotarea
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body) {
      try { active.blur(); } catch (e) { /* ignore */ }
    }

    // Deferir la apertura para que el blur se aplique antes de que PrimeNG intente enfocar el botón interno
    setTimeout(() => {
      this.confirmationService.confirm({
        message: mensaje,
        header: 'Confirmar Acción',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.autorizarMovilidad();
        },
        reject: () => {
          // No hacer nada, solo cerrar el diálogo
        }
      });
    }, 0);
  }
  getBotonSeverity(): 'success' | 'danger' {
    const movilidad = this.movilidadSeleccionada();
    return movilidad?.solicitarAutorizacion ? 'danger' : 'success';
  }

  cargarEstudiantesMasivos(file: File | undefined, event?: Event): void {
    if (!file) return;

    if (event?.target) {
      (event.target as HTMLInputElement).value = '';
    }

    this.cargando.set(true);
    this.archivoPlanoService.uploadEstudiantesMasivos(file)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.identificaciones?.length > 0) {
            this.identificacionesExtraidas.set(response.identificaciones);
            this.infoArchivo.set({
              nombre: response.nombreArchivo,
              tamano: response.tamano,
              columnaDetectada: response.columnaDetectada,
              posicionColumna: response.posicionColumna,
              totalRegistros: response.totalRegistros
            });

            this.nombreArchivoValue.set(response.nombreArchivo || '');
            this.tamanoArchivoValue.set(response.tamano?.toString() || '');
            this.columnaDetectadaValue.set(response.columnaDetectada || '');
            this.totalRegistrosValue.set(response.totalRegistros?.toString() || '');
            this.mensajeDuplicadosValue.set('');

            this.buscarIdentificacionesEnEstudiantes();
          }
        },
        error: () => {
          this.mostrarMensaje('error', 'Error', 'No se pudo procesar el archivo');
        }
      });
  }

  buscarIdentificacionesEnEstudiantes(): void {
    const ids = this.identificacionesExtraidas();
    if (!ids.length) return;

    const idsUnicos = Array.from(new Set(ids));
    const duplicados = ids.length - idsUnicos.length;

    if (duplicados > 0) {
      this.mensajeDuplicadosValue.set(`${duplicados} duplicados removidos`);
    }

    this.procesarEstudiantesEnChunks(idsUnicos);
  }

  private procesarEstudiantesEnChunks(idsUnicos: string[]): void {
    const chunks: string[][] = [];
    const estudiantesDesdeCache: EstudianteOracleData[] = [];
    const idsParaBuscar: string[] = [];

    // Verificar caché primero
    for (const id of idsUnicos) {
      const estudianteCacheado = this.obtenerEstudianteDelCache(id);
      if (estudianteCacheado) {
        estudiantesDesdeCache.push(estudianteCacheado);
      } else {
        idsParaBuscar.push(id);
      }
    }

    // Si todos los estudiantes están en caché, usarlos directamente
    if (idsParaBuscar.length === 0) {
      const existentes = new Set(this.estudiantesExistentes().map(e => e.idEstudiante));
      const estudiantesFiltrados = estudiantesDesdeCache.filter(e => !existentes.has(e.idEstudiante));
      this.estudiantesSeleccionados.update(c => [...c, ...estudiantesFiltrados]);
      return;
    }

    // Procesar chunks para estudiantes no cacheados
    for (let i = 0; i < idsParaBuscar.length; i += 200) {
      chunks.push(idsParaBuscar.slice(i, i + 200));
    }

    this.cargando.set(true);
    const existentes = new Set(this.estudiantesExistentes().map(e => e.idEstudiante));
    const acumulador: EstudianteOracleData[] = [];

    from(chunks)
      .pipe(
        mergeMap(chunk => this.api.getByIdEstudiantes(chunk), 4),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (estudiantes) => {
          estudiantes?.forEach(e => {
            if (!existentes.has(e.idEstudiante)) {
              const estudianteData = {
                idEstudiante: e.idEstudiante,
                nombre: e.nombre,
                semestre: e.semestre,
                fechaInicio: e.fechaInicio,
                fechaFin: e.fechaFin,
                uniqueId: `${Date.now()}-${Math.random()}`
              };
              acumulador.push(estudianteData);
              this.agregarEstudianteAlCache(estudianteData);
            }
          });
        },
        complete: () => {
          // Combinar estudiantes del caché y de la API
          const todosLosEstudiantes = [...estudiantesDesdeCache, ...acumulador]
            .filter(e => !existentes.has(e.idEstudiante));
          this.estudiantesSeleccionados.update(c => [...c, ...todosLosEstudiantes]);
          this.cargando.set(false);
        }
      });
  }


  private agregarEstudianteAlCache(estudiante: EstudianteOracleData): void {
    if (this.estudiantesCache.size >= 500) {
      const firstKey = this.estudiantesCache.keys().next().value;
      if (firstKey) {
        this.estudiantesCache.delete(firstKey);
      }
    }
    this.estudiantesCache.set(estudiante.idEstudiante, estudiante);
  }

  private obtenerEstudianteDelCache(idEstudiante: string): EstudianteOracleData | undefined {
    return this.estudiantesCache.get(idEstudiante);
  }

  private limpiarCacheEstudiantes(): void {
    this.estudiantesCache.clear();
  }


  cargarMovilidades(): Promise<void> {
    return new Promise((resolve) => {
      this.movilidadService.getAll().subscribe({
        next: (movilidades: Movilidad[]) => {
          // Establecer lista inicialmente
          this.movilidades.set(movilidades);
     movilidades.forEach((mov) => {
            const candidatos = Array.from(new Set([ (mov as any).movilidadPostulanteId, mov.id ].filter(Boolean)));
            if (candidatos.length === 0) return;

            // Intentar con el id preferido y, si no hay resultado, con el otro
            const intentarCon = (id: string) =>
              this.autorizacionService.getAutorizacionPorMovilidadOrNull(id).pipe(takeUntilDestroyed(this.destroyRef));

            // Primero probar con movilidadPostulanteId (si existe)
            const primerId = candidatos[0];
            intentarCon(primerId).pipe(
              switchMap((aut: Autorizacion | null) => {
                if (aut) return of({ aut, usedId: primerId });
                if (candidatos.length > 1) return intentarCon(candidatos[1]).pipe(map(a => ({ aut: a, usedId: candidatos[1] })));
                return of({ aut: null, usedId: null });
              })
            ).subscribe((result: any) => {
              const res = result as { aut: Autorizacion | null; usedId: string | null } | null;
              const autorizacion = res?.aut ?? null;

              // Forzar que la vista refleje el estado real en BD (pendiente → solicitarAutorizacion = true)
              mov.solicitarAutorizacion = !!(autorizacion && autorizacion.estado === 'pendiente');

              // Si la autorización trae movilidadPostulanteId y la movilidad local no lo tiene, asignarlo
              if (autorizacion?.movilidadPostulanteId && !(mov as any).movilidadPostulanteId) {
                (mov as any).movilidadPostulanteId = autorizacion.movilidadPostulanteId;
              }

              // Actualizar array reactivo para refrescar la UI
              const idx = this.movilidades().findIndex(m => m.id === mov.id);
              if (idx !== -1) {
                const arr = [...this.movilidades()];
                arr[idx] = { ...mov };
                this.movilidades.set(arr);
              }
            });
          });

          resolve();
        },
        error: () => {
          this.movilidades.set([]);
          resolve();
        }
      });
    });
  }

  /** Carga una movilidad específica para edición */
  private cargarMovilidadParaEdicion(movilidadId: string): void {
    this.cargando.set(true);
    
    // Cargar la movilidad específica
    this.movilidadService.getById(movilidadId).subscribe({
      next: (movilidad: Movilidad) => {
        // Seleccionar la movilidad automáticamente
        this.movilidadSeleccionada.set(movilidad);
        
        // Cargar datos de la movilidad en el formulario de edición
        this.cargarMovilidadEnFormulario(movilidad);
        
        // Cargar estudiantes asociados
        if (movilidad.id) {
          this.cargarEstudiantesPorMovilidad(movilidad.id);
        }
        
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.notificationService.showNotification('error', 'No se pudo cargar la movilidad para edición');
      }
    });
  }

  seleccionarMovilidad(event: any): void {
    const movilidadId = event.value;
    if (movilidadId) {
      const movilidad = this.movilidades().find(m => m.id === movilidadId);
      this.movilidadSeleccionada.set(movilidad || null);
      if (movilidad) {
        // Cargar datos de la movilidad en el formulario
        this.cargarMovilidadEnFormulario(movilidad);
        this.cargarEstudiantesPorMovilidad(movilidad.id);
      }
    } else {
      this.movilidadSeleccionada.set(null);
      this.estudiantesExistentes.set([]);
      this.isEditMode.set(false);
      // Limpiar el formulario cuando no hay movilidad seleccionada
      this.formMovilidadBasica.reset();
    }
  }

  private cargarMovilidadPorId(movilidadId: string): void {
    this.movilidadService.getById(movilidadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (movilidad) => {
          if (movilidad) {
            this.movilidadSeleccionada.set(movilidad);
            
            // Cargar datos de la movilidad en el formulario de edición
            this.cargarMovilidadEnFormulario(movilidad);
            
            this.cargarEstudiantesPorMovilidad(movilidad.id);

            // consultar estado y aprobaciones para inicializar botones
            this.cargarEstadoAutorizacion(movilidad.id);
            this.autorizacionService.getAprobacionesPorMovilidad(movilidad.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (aprobaciones: any[]) => {
                const hayAprob = Array.isArray(aprobaciones) && aprobaciones.some(a => a.estado === 'aprobado');
                this.movilidadSeleccionadaTieneAprobaciones.set(hayAprob);
              },
              error: () => {
                this.movilidadSeleccionadaTieneAprobaciones.set(false);
              }
            });
          }
        },
        error: (error) => {
          this.mostrarMensaje('error', 'Error', 'No se pudo cargar la movilidad');
        }
      });
  }

  /** Consulta autoritativa del campo `solicitarAutorizacion` en la tabla `movilidad_estudiante` */
  private cargarEstadoAutorizacion(movilidadId: string): void {
    this.estudianteService.getAutorizacionForMovilidad(movilidadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (valor: boolean) => {
          const mov = this.movilidadSeleccionada();
          if (mov && mov.id === movilidadId) {
            this.movilidadSeleccionada.set({ ...mov, solicitarAutorizacion: valor });
          }

          const lista = this.movilidades();
          const idx = lista.findIndex(m => m.id === movilidadId);
          if (idx !== -1) {
            const copy = lista.slice();
            copy[idx] = { ...copy[idx], solicitarAutorizacion: valor };
            this.movilidades.set(copy);
          }
        },
        error: () => {
          // No sobrescribir estado local si falla la llamada
        }
      });
  }

  private cargarMovilidadEnFormulario(movilidad: any): void {
    // Convertir fechas de string a Date objects si es necesario
    const fechaInicio = movilidad.fechaInicio ? new Date(movilidad.fechaInicio) : null;
    const fechaFin = movilidad.fechaFin ? new Date(movilidad.fechaFin) : null;

    // Cargar los datos de la movilidad en el formulario
    this.formMovilidadBasica.patchValue({
      nombreMovilidad: movilidad.nombreMovilidad || '',
      modalidad: movilidad.modalidad?.id || null,
      tipoActividad: movilidad.tipoActividad || null,
      lugarDestino: movilidad.lugarDestino || '',
      tipoMovilidad: movilidad.tipoMovilidad?.id || null,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin
    });

    // Marcar el formulario como pristine para evitar validaciones innecesarias
    this.formMovilidadBasica.markAsPristine();
    this.checkForChanges();
  }



  private cargarTiposMovilidad(): void {
    this.tipoMovilidadService.getAllActive().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tipos) => this.tiposMovilidadOpciones.set(tipos),
      error: (err) => {
        this.tiposMovilidadOpciones.set([]);
      }
    });
  }

  private setupDiasTotalesCalculation(): void {
    const fechaInicio$ = this.formMovilidadBasica.get('fechaInicio')?.valueChanges.pipe(startWith(this.formMovilidadBasica.get('fechaInicio')?.value)) || of(null);
    const fechaFin$ = this.formMovilidadBasica.get('fechaFin')?.valueChanges.pipe(startWith(this.formMovilidadBasica.get('fechaFin')?.value)) || of(null);

    combineLatest([fechaInicio$, fechaFin$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([fechaInicio, fechaFin]) => {
          if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            if (!isNaN(inicio.getTime()) && !isNaN(fin.getTime()) && fin >= inicio) {
              const diffTime = Math.abs(fin.getTime() - inicio.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día de inicio
              this.diasTotalesMovilidadBasica.set(diffDays);
            } else {
              this.diasTotalesMovilidadBasica.set(null);
            }
          } else {
            this.diasTotalesMovilidadBasica.set(null);
          }
        }
      });

  }

  abrirFormularioMovilidadBasica(): void {
    this.mostrarFormularioMovilidadBasica.set(true);
  }

  ocultarFormularioMovilidadBasica(): void {
    this.mostrarFormularioMovilidadBasica.set(false);
    this.formMovilidadBasica.reset();
  }

  async crearMovilidadBasica(): Promise<Movilidad> {
    return new Promise((resolve, reject) => {
      if (this.formMovilidadBasica.valid) {
        const payload = this.buildPayloadFromFormMovilidadBasica();
        this.movilidadService.create(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (movilidad) => {
            this.movilidadSeleccionada.set(movilidad);
            this.cargarMovilidades();
            resolve(movilidad);
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al crear la movilidad básica'
            });
            reject(err);
          }
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validación',
          detail: 'Por favor complete todos los campos requeridos'
        });
        reject(new Error('Formulario inválido'));
      }
    });
  }

  private buildPayloadFromFormMovilidadBasica(): any {
    const datosFormulario = this.formMovilidadBasica.value as any;

    // Campos básicos de strings simples
    const camposBasicos = [
      'nombreMovilidad', 'lugarDestino', 'tipoActividad'
    ];

    // Campos de relaciones (enviar como objetos con id)
    const camposRelaciones = [
      'tipoMovilidad', 'modalidad'
    ];

    const payload = MovilidadService.buildPayloadFromForm(datosFormulario, camposBasicos, camposRelaciones);

    // Validar y corregir nombreMovilidad si es inválido
    if (!payload.nombreMovilidad || payload.nombreMovilidad.trim().length === 0) {
      // Generar un nombre por defecto basado en tipo de movilidad y fecha
      const tipoMovilidadNombre = datosFormulario.tipoMovilidad?.nombre || 'Movilidad';
      const fechaActual = new Date().toLocaleDateString('es-CO');
      payload.nombreMovilidad = `${tipoMovilidadNombre} - ${fechaActual}`;
    }

    // Calcular totalFinanciacion (0 por defecto)
    payload.totalFinanciacion = 0;

    // Agregar valores por defecto para campos requeridos
    payload.facultad = '';
    payload.programa = '';
    payload.pais = '';
    payload.departamento = '';
    payload.ciudad = '';
    payload.objeto = '';
    payload.entidadNacional = '';
    payload.entidadInternacional = '';
    payload.paisFinanciador = '';
    payload.valorFinanciacionNacional = 0;
    payload.valorFinanciacionInternacional = 0;
    payload.lineaEstrategica = null;
    payload.cobertura = null;
    payload.periodo = null;
    payload.convenio = null;

    return payload;
  }



  toggleDatosMovilidad(): void {
    this.isDatosMovilidadExpanded.set(!this.isDatosMovilidadExpanded());
  }

  toggleEstudiantesNuevos(): void {
    this.isEstudiantesNuevosExpanded.set(!this.isEstudiantesNuevosExpanded());
  }

  private cargarEstudiantesPorMovilidad(movilidadId: string): void {
    this.estudianteService.getByMovilidad(movilidadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estudiantes) => {
          this.estudiantesExistentes.set(estudiantes);
          
          if (this.isEditMode()) {
            this.estudiantesExistentesOriginales = [...estudiantes];
          }
        },
        error: () => {
          this.estudiantesExistentes.set([]);
        }
      });
  }

  eliminarEstudianteExistente(e: Estudiante): void {
    if (!e.id) {
      this.mostrarMensaje('error', 'Error', 'Estudiante sin ID');
      return;
    }

    if (!this.isEditMode()) {
      // Modo creación: eliminar directamente sin confirmación y actualizar UI inmediatamente
      const movilidadId = this.movilidadSeleccionada()?.id;
      if (!movilidadId) return;

      this.estudianteService.deleteFromMovilidad(movilidadId, e.id)
        .subscribe(() => {
          // Remover del array local inmediatamente en lugar de recargar
          this.estudiantesExistentes.update(est => est.filter(estudiante => estudiante.id !== e.id));
          this.mostrarMensaje('success', 'Éxito', 'Estudiante eliminado exitosamente');
        });
    } else {
      // Modo edición: marcar para eliminar y quitar de la vista
      this.cambiosPendientesEstudiantes.update(pending => ({
        ...pending,
        eliminar: [...pending.eliminar, e.id!]
      }));
      this.estudiantesExistentes.set(this.estudiantesExistentes().filter(est => est.id !== e.id));
    }
  }

  toggleSolicitarAutorizacion(estudiante: EstudianteOracleData | Estudiante): void {
    estudiante.solicitarAutorizacion = !estudiante.solicitarAutorizacion;
  }

  autorizarEstudiante(estudiante: EstudianteOracleData | Estudiante): void {
    if (!estudiante.solicitarAutorizacion) {
      this.notificationService.showNotification('warn', 'Debe solicitar autorización primero');
      return;
    }

    const movilidad = this.movilidadSeleccionada();
    if (!movilidad) {
      this.notificationService.showNotification('error', 'No hay movilidad seleccionada');
      return;
    }

    // Navegar al componente de autorización con la movilidad seleccionada
    this.router.navigate(['/app/autorizacion'], {
      queryParams: {
        movilidadId: movilidad.id,
        estudianteId: estudiante.idEstudiante
      }
    });
  }

  async guardarEstudiantes(): Promise<void> {
    try {
      if (this.estudiantesSeleccionados().length === 0) {
        this.estudiantesError.set('Debe agregar al menos un estudiante antes de guardar');
        this.scrollToField('estudiantes-section');
        return;
      } else {
        this.estudiantesError.set('');
      }

      if (this.form.invalid) {
        const control = this.form.get('terminosCondiciones');
        control?.markAsTouched();
        control?.markAsDirty();
        this.scrollToField('terminosCondiciones');
        return;
      }

      // If no mobility is selected, create one from the form
      let movilidad = this.movilidadSeleccionada();
      if (!movilidad) {
        movilidad = await this.crearMovilidadBasica();
      }

      const estudiantesAAgregar = this.isEditMode() ? [] : this.filtrarEstudiantesNuevos();

      if (estudiantesAAgregar.length > 0) {
        this.crearEstudiantesNuevos(estudiantesAAgregar, movilidad);
      } else {
        this.guardarComponentes(movilidad).then(() => {
          this.mostrarMensaje('success', 'Éxito', 'Movilidad guardada correctamente');
          this.sincronizarEstadoOriginal();
        }).catch(error => {
          this.mostrarMensaje('error', 'Error', 'No se pudieron procesar los cambios');
        });
      }
    } catch (error) {
      this.mostrarMensaje('error', 'Error', 'Error al guardar estudiantes');
    }
  }

  actualizarMovilidad(): void {
    this.ejecutarSeguro(() => {
      if (this.isUpdating()) {
        return;
      }

      if (!this.isEditMode()) {
        throw new Error('No se puede actualizar en modo creación');
      }

      if (!this.hasChanges()) {
        this.mostrarMensaje('info', 'Información', 'No hay cambios para guardar');
        return;
      }

      this.isUpdating.set(true);

      if (this.form.invalid) {
        const control = this.form.get('terminosCondiciones');
        control?.markAsTouched();
        control?.markAsDirty();
        this.scrollToField('terminosCondiciones');
        this.isUpdating.set(false);
        return;
      }

      const movilidad = this.movilidadSeleccionada();
      if (!movilidad?.id) {
        this.movilidadError.set('Debe seleccionar una movilidad antes de actualizar');
        this.scrollToField('movilidad-section');
        return;
      } else {
        this.movilidadError.set('');
      }

      const estudiantesActuales = this.estudiantesExistentes().length;
      const estudiantesDespuesDeEliminaciones = estudiantesActuales - this.cambiosPendientesEstudiantes().eliminar.length;
      const estudiantesNuevos = this.estudiantesSeleccionados().length;
      if (estudiantesDespuesDeEliminaciones + estudiantesNuevos < 1) {
        // Mostrar confirmación para limpiar las relaciones de la movilidad
        this.confirmationService.confirm({
          message: 'Al eliminar todos los estudiantes, se limpiarán las relaciones de la movilidad saliente. La movilidad raíz permanecerá intacta. ¿Desea continuar?',
          header: 'Confirmar limpieza de relaciones',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí, limpiar relaciones',
          rejectLabel: 'Cancelar',
          accept: () => {
            // Proceder con la limpieza de relaciones (eliminar estudiantes y todas las demás relaciones)
            this.limpiarTodasLasRelaciones(movilidad).then(() => {
              this.sincronizarEstadoOriginal();
              this.isUpdating.set(false);
            }).catch(error => {
              this.mostrarMensaje('error', 'Error', 'No se pudieron procesar los cambios');
              this.isUpdating.set(false);
            });
          },
          reject: () => {
            // No hacer nada, el usuario canceló
          }
        });
        return;
      }

      const estudiantesNuevosAAgregar = this.filtrarEstudiantesNuevos();

      // Primero procesar eliminaciones pendientes, luego guardar nuevos estudiantes si hay
      this.guardarComponentes(movilidad).then(() => {
        if (estudiantesNuevosAAgregar.length > 0) {
          // Hay nuevos estudiantes que guardar
          const estudiantesValidados = this.validarYLimpiarEstudiantes(estudiantesNuevosAAgregar);
          this.estudianteService.createManyForMovilidad(movilidad.id, estudiantesValidados)
            .subscribe({
              next: () => {
                this.cargarEstudiantesPorMovilidad(movilidad.id);
                this.estudiantesSeleccionados.set([]);
                this.mostrarMensaje('success', 'Éxito', 'Estudiantes guardados correctamente');
                this.sincronizarEstadoOriginal();
                this.isUpdating.set(false);
              },
              error: () => {
                // Intentar uno por uno como fallback
                this.crearEstudiantesIndividualmente(estudiantesNuevosAAgregar, movilidad);
                this.isUpdating.set(false);
              }
            });
        } else {
          this.mostrarMensaje('success', 'Éxito', 'Movilidad actualizada correctamente');
          this.sincronizarEstadoOriginal();
          this.isUpdating.set(false);
        }
      }).catch(error => {
        this.mostrarMensaje('error', 'Error', 'No se pudieron procesar los cambios');
        this.isUpdating.set(false);
      });
    });
  }

  private crearEstudiantesIndividualmente(estudiantes: EstudianteOracleData[], movilidad: Movilidad): void {
    const estudiantesValidados = this.validarYLimpiarEstudiantes(estudiantes);
    const saves = estudiantesValidados.map(e =>
      this.estudianteService.createForMovilidad(movilidad.id, e)
    );

    forkJoin(saves).subscribe({
      next: (resultados) => {
        this.cargarEstudiantesPorMovilidad(movilidad.id);
        this.guardarComponentes(movilidad).then(() => {
          this.mostrarMensaje('success', 'Éxito', 'Movilidad guardada correctamente');
          this.sincronizarEstadoOriginal();
        }).catch(error => {
          this.mostrarMensaje('error', 'Error', 'No se pudieron procesar los cambios');
        });
      },
      error: () => {
        this.notificationService.showNotification('error', 'No se pudieron guardar los estudiantes. Verifica los datos.');
      }
    });
  }

  private validarYLimpiarEstudiantes(estudiantes: EstudianteOracleData[]): Omit<Estudiante, 'id'>[] {
    // First filter valid students
    const validStudents = estudiantes
      .filter(e => {
        const idEstudiante = e.idEstudiante?.trim();
        const nombre = e.nombre?.trim();

        return idEstudiante && idEstudiante.length > 0 && idEstudiante.length <= 20 &&
               nombre && nombre.length > 0 && nombre.length <= 200;
      })
      .map(e => ({
        idEstudiante: e.idEstudiante.trim(),
        nombre: e.nombre.trim(),
        semestre: e.semestre && e.semestre > 0 && e.semestre <= 20 ? Math.floor(e.semestre) : 1,
        fechaInicio: this.parseDate(e.fechaInicio),
        fechaFin: this.parseDate(e.fechaFin)
      }));

    // Remove duplicates by idEstudiante
    const seen = new Set<string>();
    return validStudents.filter(e => {
      if (seen.has(e.idEstudiante)) {
        return false;
      }
      seen.add(e.idEstudiante);
      return true;
    });
  }

  private parseDate(dateStr: string | null): string | null {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Intentar parsear diferentes formatos
    const date = new Date(dateStr.trim());
    if (isNaN(date.getTime())) return null;
    
    // Retornar en formato YYYY-MM-DD
    return date.toISOString().split('T')[0];
  }

  private filtrarEstudiantesNuevos(): EstudianteOracleData[] {
    const existingIds = new Set(this.estudiantesExistentes().map(e => e.idEstudiante));
    return this.estudiantesSeleccionados().filter(e => !existingIds.has(e.idEstudiante));
  }

  private crearEstudiantesNuevos(estudiantes: EstudianteOracleData[], movilidad: Movilidad): void {
    const estudiantesValidados = this.validarYLimpiarEstudiantes(estudiantes);

    this.estudianteService.createManyForMovilidad(movilidad.id, estudiantesValidados)
      .subscribe({
        next: (estudiantesCreados) => {
          this.cargarEstudiantesPorMovilidad(movilidad.id);
          this.guardarComponentes(movilidad).then(() => {
            this.mostrarMensaje('success', 'Éxito', 'Movilidad guardada correctamente');
            this.sincronizarEstadoOriginal();
          }).catch(error => {
            this.mostrarMensaje('error', 'Error', 'No se pudieron procesar los cambios');
          });
        },
        error: () => {
          this.crearEstudiantesIndividualmente(estudiantesValidados, movilidad);
        }
      });
  }

  private limpiarTodasLasRelaciones(movilidad: Movilidad): Promise<void> {
    this.guardandoMasivo.set(true);

    // Procesar eliminación de estudiantes marcados para eliminación
    const promesasEliminacionEstudiantes: Promise<void>[] = [];
    for (const estudianteId of this.cambiosPendientesEstudiantes().eliminar) {
      promesasEliminacionEstudiantes.push(
        this.estudianteService.deleteFromMovilidad(movilidad.id, estudianteId).toPromise()
          .then(() => this.estudianteService.delete(estudianteId).toPromise())
          .then(() => Promise.resolve())
          .catch((error: any) => {
            return Promise.reject(error);
          })
      );
    }

    // Ejecutar eliminación de estudiantes primero
    return Promise.all(promesasEliminacionEstudiantes)
      .then(() => {
        // Limpiar cambios pendientes
        this.cambiosPendientesEstudiantes.set({ eliminar: [] });
        this.mostrarMensaje('success', 'Éxito', 'Todas las relaciones de la movilidad han sido eliminadas');
        this.sincronizarEstadoOriginal();
        this.guardandoMasivo.set(false);
        // Recargar la lista de movilidades
        this.cargarMovilidades();
      })
      .catch((error: any) => {
        this.mostrarMensaje('error', 'Error', 'Hubo un problema al eliminar las relaciones');
        this.guardandoMasivo.set(false);
        throw error;
      });
  }

  private sincronizarEstadoOriginal(): void {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad) return;

    this.movilidadOriginal = { ...movilidad };
    // En modo edición, los estudiantes están en estudiantesExistentes (como card)
    this.estudiantesExistentesOriginales = [...this.estudiantesExistentes()];
    this.cambiosPendientesEstudiantes.set({ eliminar: [] });
    this.hasChanges.set(false);
    // Reset términos y condiciones para requerir aceptación en la próxima actualización
    this.form.get('terminosCondiciones')?.setValue(false);
    // Marcar el formulario de movilidad como pristine
    this.formMovilidadBasica.markAsPristine();
  }

  private checkForChanges(): void {
    const hasFormChanges = this.isEditMode() && this.formMovilidadBasica.dirty;
    const hasNewStudents = this.estudiantesSeleccionados().length > 0;
    const hasDeletions = this.cambiosPendientesEstudiantes().eliminar.length > 0;
    const hasExistingChanges = this.hasExistingStudentsChanged();

    this.hasChanges.set(hasFormChanges || hasNewStudents || hasDeletions || hasExistingChanges);
  }

  private hasExistingStudentsChanged(): boolean {
    const currentEstudiantes = this.estudiantesExistentes();
    const originalEstudiantes = this.estudiantesExistentesOriginales;

    if (currentEstudiantes.length !== originalEstudiantes.length) return true;

    return currentEstudiantes.some((est, i) => est.solicitarAutorizacion !== originalEstudiantes[i]?.solicitarAutorizacion);
  }

  limpiarFormulario(): void {
    this.form.reset();
    this.estudiantesSeleccionados.set([]);
    this.movilidadSeleccionada.set(null);
    this.estudiantesExistentes.set([]);
    this.identificacionesExtraidas.set([]);
    this.infoArchivo.set(null);
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/app/movilidad-saliente-list']);
    }
  }

  volverAlMenu(): void {
    this.router.navigate(['/app/movilidad-estudiantes-list']);
  }

  abrirModalCrearMovilidad(): void {
    this.movilidadSeleccionada.set(null);
    this.mostrarModalMovilidad.set(true);
  }

  abrirModalEditarMovilidad(): void {
    this.isEditMode.set(true);
    this.sincronizarEstadoOriginal();
    this.mostrarModalMovilidad.set(true);
  }

  async cerrarModalMovilidad(movilidadId?: string): Promise<void> {
    this.mostrarModalMovilidad.set(false);
    await this.cargarMovilidades();
    // Si se recibió un ID de movilidad guardada, seleccionarla automáticamente
    if (movilidadId) {
      this.movilidadSeleccionada.set(this.movilidades().find(m => m.id === movilidadId) || null);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? this.formUtilsService.controlHasVisibleErrors(field) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field) return '';

    const error = this.formUtilsService.getFirstError(field);
    if (!error) return '';

    if (fieldName === 'terminosCondiciones') {
      return 'Falta aceptar los términos y condiciones';
    }

    switch (error) {
      case 'required':
        return 'Este campo es obligatorio';
      default:
        return '';
    }
  }

  private cargarModalidades(): void {
    this.tipoMovilidadService.getAllActive().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tiposMovilidad) => {
        // Filtrar solo tipos de movilidad de estudiantes usando el servicio
        const tiposFiltrados = this.modalidadService.filterTiposMovilidadEstudiante(tiposMovilidad);
        this.modalidadOpciones.set(tiposFiltrados);
      },
      error: (err) => {
        this.modalidadOpciones.set([]);
      }
    });
  }

  private cargarTipoActividades(): void {
    this.tipoActividadService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tipos) => {
        const opciones = tipos.map(t => ({ ...t, display: `${t.codigo} - ${t.nombre}` }));
        this.tipoActividadOpciones.set(opciones);
      },
      error: (err) => {
        this.tipoActividadOpciones.set([]);
      }
    });
  }

  private cargarInstituciones(): void {
    this.institucionesService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (instituciones) => {
        this.institucionesCargadas.set(instituciones);
        this.institucionesOpciones.set(instituciones);
      },
      error: (err) => {
        this.institucionesCargadas.set([]);
        this.institucionesOpciones.set([]);
      }
    });
  }

  private cargarFacultades(): void {
    if (this.facultades().length > 0) return;

    this.programaService.getAllFacultades()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        const opciones = data
          .filter(f => !f.nombre?.toLowerCase().includes('todas'))
          .map(f => ({ label: f.nombre, value: f.id }));
        this.facultades.set(this.deduplicarOpcionesPorLabel(opciones));
      });
  }

  private cargarProgramas(): void {
    if (this.programas().length > 0) return;
    
    this.programaService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        const programasFiltrados = data.filter(p => 
          !p.nombre?.toLowerCase().includes('todos')
        );
        this.programas.set(programasFiltrados);
        this.actualizarProgramasFiltrados();
      });
  }

  private filtrarProgramasPorFacultad(facultadId: string): void {
    const programas = this.programas();
    const opciones = facultadId
      ? programas.filter(p => p.idFacultad === facultadId)
      : programas;

    this.programasFiltrados.set([
      { label: 'Todos los programas', value: '' },
      ...this.deduplicarOpcionesPorLabel(opciones.map(p => ({ label: p.nombre, value: p.id })))
    ]);
  }

  private deduplicarOpcionesPorLabel(opciones: {label: string, value: string}[]): {label: string, value: string}[] {
    const visto = new Set<string>();
    return opciones.filter(o => {
      const key = o.label ?? '';
      if (visto.has(key)) return false;
      visto.add(key);
      return true;
    });
  }

  private actualizarProgramasFiltrados(): void {
    this.filtrarProgramasPorFacultad('');
  }

  onFiltroFacultadChange(event: any): void {
    // Cargar datos si no están cargados aún
    if (this.facultades().length === 0) {
      this.cargarFacultades();
    }
    if (this.programas().length === 0) {
      this.cargarProgramas();
    }
    
    const facultadId = event.value || '';
    this.filtroFacultad.set(facultadId);
    this.filtrarProgramasPorFacultad(facultadId);

    // Resetear programa si no pertenece a la facultad seleccionada
    const programaActual = this.filtroPrograma();
    if (programaActual && facultadId) {
      const programa = this.programas().find(p => String(p.id).trim() === programaActual);
      if (programa && String(programa.idFacultad).trim() !== facultadId) {
        this.filtroPrograma.set('');
      }
    }
  }

  onFiltroProgramaChange(event: any): void {
    if (this.programas().length === 0) {
      this.cargarProgramas();
    }
    
    this.filtroPrograma.set(event.value || '');
  }

  private actualizarEstadoLocal(movilidad: Movilidad, solicitarAutorizacion: boolean): void {

    // Actualizar la movilidad seleccionada
    const movilidadActual = this.movilidadSeleccionada();
    if (movilidadActual && movilidadActual.id === movilidad.id) {
      this.movilidadSeleccionada.set({
        ...movilidadActual,
        solicitarAutorizacion: solicitarAutorizacion
      });
    }

    // Actualizar en la lista de movilidades
    const movilidadesActuales = this.movilidades();
    const index = movilidadesActuales.findIndex(m => m.id === movilidad.id);
    if (index !== -1) {
      movilidadesActuales[index] = {
        ...movilidadesActuales[index],
        solicitarAutorizacion: solicitarAutorizacion
      };
      this.movilidades.set([...movilidadesActuales]);
    }
  }
}