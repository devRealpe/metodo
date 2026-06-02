import { Component, OnInit, inject, signal, computed, Output, EventEmitter, OnDestroy, ElementRef, ViewChild, effect, runInInjectionContext, Injector, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, startWith, of, takeUntil, Subject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TipoActividad } from '../../core/models/tipo-actividad.model';
import { TipoActividadService } from '../../core/services/tipo-actividad.service';
import { Cobertura } from '../../core/models/cobertura.model';
import { CoberturaService } from '../../core/services/cobertura.service';
import { Periodo } from '../../core/models/periodo.model';
import { PeriodoService } from '../../core/services/periodo.service';
import { FIELD_LABELS, MOVILIDAD_FORM_FIELDS, MOVILIDAD_DEFAULT_FORM_VALUES, createMovilidadFormGroup } from '../../core/constants/movilidad-constants';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { InputComponent, TextareaComponent, DatepickerComponent, InputNumberComponent} from '@microfrontends/shared-ui';
// direct import to ensure latest metadata (workaround for build cache issues)
import { SelectComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { MovilidadService } from '../../core/services/movilidad.service';
import { Movilidad } from '../../core/models/movilidad.model';
import { Convenio } from '../../core/models/convenio.model';
import { Postulante } from '../../core/models/postulante.model';
import { ConvenioService } from '../../core/services/convenio.service';
import { ProgramaService } from '../../core/services/programas.service';
import { UbicacionesGeograficasService } from '../../core/services/ubicaciones-geograficas.service';
import { InstitucionesService } from '../../core/services/instituciones.service';
import { LineaEstrategicaService } from '../../core/services/linea-estrategica.service';
import { TipoMovilidadService } from '../../core/services/tipo-movilidad.service';
import { ModalidadService } from '../../core/services/modalidad.service';
import { EntidadesNacionalesService } from '../../core/services/entidades-nacionales.service';
import { EntidadesInternacionalesService } from '../../core/services/entidades-internacionales.service';
import { LineaEstrategica } from '../../core/models/linea-estrategica.model';
import { TipoMovilidad } from '../../core/models/tipo-movilidad.model';
import { Modalidad } from '../../core/models/modalidad.model';
import { Opcion } from '../../core/models/opcion.model';

@Component({
  selector: 'app-movilidad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    MessageModule,
    TooltipModule,
    CardModule,
    ProgressBarModule,
    FormsModule,
    CheckboxModule,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    DatepickerComponent,
    InputNumberComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './movilidad.component.html'
})
export class MovilidadComponent implements OnInit, OnDestroy {
  @ViewChild('formContainer', { static: false }) formContainer!: ElementRef;

  private formBuilder = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private movilidadService = inject(MovilidadService);
  private authService = inject(AuthService);
  private injector = inject(Injector);
  private convenioService = inject(ConvenioService);
  private programaService = inject(ProgramaService);
  private ubicacionesService = inject(UbicacionesGeograficasService);
  private institucionesService = inject(InstitucionesService);
  private lineaEstrategicaService = inject(LineaEstrategicaService);
  private entidadesNacionalesService = inject(EntidadesNacionalesService);
  private entidadesInternacionalesService = inject(EntidadesInternacionalesService);
  private tipoMovilidadService = inject(TipoMovilidadService);
  private modalidadService = inject(ModalidadService);
  private tipoActividadService = inject(TipoActividadService);
  private coberturaService = inject(CoberturaService);
  private periodoService = inject(PeriodoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  private readonly formFields: readonly (keyof Omit<Movilidad, 'id' | 'convenio'>)[] = MOVILIDAD_FORM_FIELDS;

  private readonly defaultFormValues = MOVILIDAD_DEFAULT_FORM_VALUES;

  postulantesExistentes: Postulante[] = [];
  contextoCreacion: 'estudiantes' | 'usuarios' | 'general' = 'general';
  @Output() movilidadGuardada = new EventEmitter<string>();
  @Output() movilidadSeleccionadaChange = new EventEmitter<Movilidad>();
  @Output() solicitudSiguiente = new EventEmitter<void>();




  readonly tipoOpciones = signal<Opcion[]>([]);

  readonly tipoActividadOpciones = signal<TipoActividad[]>([]);
  readonly modalidadOpciones = signal<Modalidad[]>([]);

  /** Señales de dirección del tipo de movilidad seleccionado */
  readonly tipoMovilidadSeleccionadoNombre = signal<string>('');
  readonly esEntrante = computed(() => this.tipoMovilidadSeleccionadoNombre().toLowerCase().includes('entrante'));
  readonly esSaliente = computed(() => this.tipoMovilidadSeleccionadoNombre().toLowerCase().includes('saliente'));

  /** Nombre del Evento es requerido para Docente, Administrativo, Investigador */
  readonly nombreEventoRequerido = computed(() => {
    const nombre = this.tipoMovilidadSeleccionadoNombre().toLowerCase();
    return nombre.includes('docente') || nombre.includes('administrativo') || nombre.includes('investigador');
  });

  /** Placeholder dinámico para tipo de actividad */
  readonly tipoActividadPlaceholder = computed(() =>
    this.tipoMovilidadSeleccionadoNombre() ? 'Seleccione tipo de actividad' : 'Primero seleccione el Tipo de Movilidad'
  );

  readonly coberturaOpciones = signal<Cobertura[]>([]);
  readonly periodoOpciones = signal<Periodo[]>([]);
  readonly lineaEstrategicaOpciones = signal<Opcion[]>([]);

  readonly diasTotales = signal<number | null>(null);

  readonly isAdmin = signal(false);

  readonly userRoles = signal<string[]>([]);

  facultades = signal<Opcion[]>([]);
  programas: {id: string, nombre: string, idFacultad: string, codOficial: string | null}[] = [];
  programasFiltrados = signal<Opcion[]>([]);

  movilidades = signal<Movilidad[]>([]);

  // tracker for wizard steps (1: movilidad, 2: postulantes)
  pasoActual = 1;

  filtroFacultad = signal<string>('');
  filtroPrograma = signal<string>('');

  movilidadError = signal<string>('');

  readonly opcionesFacultad = computed<Opcion[]>(() => [
    { label: 'Todas las facultades', value: '' },
    ...this.facultades()
  ]);

  readonly opcionesPrograma = computed<Opcion[]>(() => [
    { label: 'Todos los programas', value: '' },
    ...this.programasFiltrados()
  ]);

  readonly opcionesMovilidad = computed<Opcion[]>(() => {
    const movilidades = this.movilidades().filter((m: Movilidad) => m.estado !== 'INACTIVO' && m.modalidad?.nombre !== 'ESTUDIANTIL');
    const filtroFac = this.filtroFacultad().trim();
    const filtroProg = this.filtroPrograma().trim();
    const filtradas = movilidades.filter(m =>
      (!filtroFac || (m.facultad && String(m.facultad).trim() === filtroFac)) &&
      (!filtroProg || (m.programa && String(m.programa).trim() === filtroProg))
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
  paises: Opcion[] = [];
  paisesData: {id: string, nombre: string, codigoPais?: string | null}[] = [];
  departamentos: Opcion[] = [];
  departamentosData: {id: string, nombre: string, codigoPais?: string | null}[] = [];
  ciudades: Opcion[] = [];
  ciudadesData: {id: string, nombre: string, codigoPais?: string | null}[] = [];

  /** Fecha mínima para datepickers (hoy) */
  readonly hoy = new Date();

  /** Países filtrados según cobertura: Nacional → solo Colombia */
  get paisesFiltrados(): Opcion[] {
    const covId = this.formMovilidad.get('cobertura')?.value;
    const cov = this.coberturaOpciones().find(c => c.id === covId);
    if (cov && cov.nombre?.toLowerCase() === 'nacional') {
      return this.paises.filter(p => p.label?.toLowerCase() === 'colombia');
    }
    return this.paises;
  }
  instituciones = signal<{id: string, nombre: string, codigoPais?: number | null, codigoDepartamento?: number | null, codigoMunicipio?: number | null, codigoInstitucion?: number | null, codigoSnies?: number | null}[]>([]);

  entidadesNacionales: Opcion[] = []; 
  entidadesInternacionales: Opcion[] = []; 

  cargandoTabla = false;
  cargando = false;
  cargandoInstituciones = false;
  cargandoInstitucionesOrigen = false;
  institucionesCargadas = false; 
  isSubmitting = false; 
  private suppressingValueChanges = false;
  modoEdicion = false;
  private paisesLoaded!: Promise<void>;

  convenios = signal<Convenio[]>([]);
  movilidadSeleccionada: Movilidad | null = null;

  private originalFormValue: any = {};

  opcionesConvenio = computed<Opcion[]>(() => {
    const convenios = this.convenios();
    const opciones = convenios.map((c: Convenio) => ({
      label: c.codigo || 'Sin código',
      value: c.id,
      objeto: c.objeto 
    }));
    return [
      { label: 'Seleccionar convenio...', value: '' },
      ...opciones
    ];
  });


  opcionesInstituciones: Opcion[] = [];
  opcionesInstitucionesOrigen: Opcion[] = [];

  departamentosOrigen: Opcion[] = [];
  departamentosDataOrigen: {id: string, nombre: string, codigoPais?: string | null}[] = [];
  ciudadesOrigen: Opcion[] = [];
  ciudadesDataOrigen: {id: string, nombre: string, codigoPais?: string | null}[] = [];

  formMovilidad = createMovilidadFormGroup(this.formBuilder);

  constructor() {
    this.formMovilidad.setValidators(MovilidadService.fechaFinDespuesDeInicio);



    runInInjectionContext(this.injector, () => {
      effect(() => {
        const user = this.authService.getCurrentUser();
        const roles = user ? user.roles : [];
        const hasAdminRole = roles.includes('admin') || roles.includes('ADMIN') || roles.includes('administrator');
        // DIRECTOR_PROGRAMA puede ver otras secciones pero NO la de financiamiento
        
        this.isAdmin.set(hasAdminRole);
        this.userRoles.set(roles);
      });

    });
  }
  habilitarFormularioParaEdicion(): void {
    this.isSubmitting = false;
    this.cargando = false;

    this.formMovilidad.enable({ emitEvent: false });
    this.formMovilidad.get('totalFinanciacion')?.disable({ emitEvent: false });
    this.formMovilidad.get('convenioAsociado')?.enable({ emitEvent: false });
    this.formMovilidad.markAsUntouched();
    this.formMovilidad.markAsPristine();
    this.cdr.detectChanges();
  }

  async ngOnInit() {
    await this.cargarConvenios();
    await this.cargarMovilidades();
    this.cargarPaises();
    this.cargarLineasEstrategicas();
    this.cargarTiposMovilidad();
    this.cargarModalidades();
    this.cargarCoberturas();
    this.cargarPeriodos();

    this.configurarReactividad();
    this.configurarRutas();

    // load programs and faculties for shared helpers
    this.cargarProgramas();
    this.cargarFacultades();

    this.router.events.pipe(
      filter(evt => evt instanceof NavigationEnd)
    ).subscribe(() => {
      this.habilitarFormularioParaEdicion();
    });

    this.cargarEntidadesNacionales();
    this.cargarEntidadesInternacionales();
  }

  private configurarRutas(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['id'];

      this.habilitarFormularioParaEdicion();

      if (id) {
        this.cargarMovilidadPorId(id);
      }

    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

private async cargarConvenioPorId(id: string): Promise<void> {
  try {
    const convenio = await this.convenioService.getById(id).toPromise();
    if (convenio) {
      const currentConvenios = this.convenios();
      if (!currentConvenios.find(c => c.id === id)) {
        this.convenios.set([...currentConvenios, convenio]);
      }
    }
  } catch (error) {
    console.error('Error al cargar convenio por ID:', error);
  }
}

async cargarConvenios(): Promise<void> {
  try {
    const convenios = await this.convenioService.getAll().toPromise() || [];
    this.convenios.set(convenios);
  } catch (error) {
  }
}

  private cargarFacultades(): void {
    if (this.facultades.length > 0) return;
    this.programaService.getAllFacultades()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: {id: string, nombre: string}[]) => {
          this.facultades.set(data.map(f => ({ label: f.nombre, value: f.id })));
        },
        error: () => {}
      });
  }

  private cargarProgramas(): void {
    if (this.programas.length > 0) return;
    this.programaService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: {id: string, nombre: string, idFacultad: string, codOficial: string | null}[]) => {
          this.programas = data.filter(p => !p.nombre?.toLowerCase().includes('todos'));
          this.actualizarProgramasFiltrados();
        },
        error: () => {}
      });
  }

  private cargarPaises(): void {
    this.paisesLoaded = new Promise<void>((resolve) => {
      this.ubicacionesService.obtenerPaises()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: {id: string, nombre: string, codigoPais?: string | null}[]) => {
            this.paisesData = data;
            this.paises = data.map(p => ({ label: p.nombre, value: p.id }));
            this.cdr.detectChanges();
            resolve();
          },
          error: () => {
            resolve();
          }
        });
    });
  }

  private cargarLineasEstrategicas(): void {
    this.lineaEstrategicaService.getAllActive()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: LineaEstrategica[]) => {
          const opciones = data.map(l => ({ label: l.nombre, value: l.id }));
          this.lineaEstrategicaOpciones.set(opciones);
        },
        error: (err) => {
        }
      });
  }

  private cargarModalidades(): void {
    this.modalidadService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Modalidad[]) => {
          this.modalidadOpciones.set(data);
        },
        error: err => console.error('Error al cargar modalidades:', err)
      });
  }

  private cargarTiposMovilidad(): void {
    this.tipoMovilidadService.getAllActive()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any[]) => {
          const opciones = data.map(t => ({ id: t.id, nombre: t.nombre }));
          const tiposMovilidad = this.contextoCreacion === 'usuarios'
            ? opciones.filter(t => !t.nombre?.toLowerCase().includes('estudiante'))
            : opciones;
          this.tipoOpciones.set(tiposMovilidad);
          if (this.contextoCreacion === 'estudiantes') {
            this.preseleccionarTipoMovilidadEstudiante();
          }
        },
        error: (err) => {
        }
      });
  }

  private preseleccionarTipoMovilidadEstudiante(): void {
    const tipos = this.tipoOpciones();
    const tipoEstudiante = tipos.find(t =>
      t.nombre && t.nombre.toLowerCase().includes('estudiante')
    );

    if (tipoEstudiante) {
      this.formMovilidad.get('tipoMovilidad')?.setValue(tipoEstudiante.id);
    }
  }

  private cargarTipoActividades(): void {
    this.tipoActividadService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: TipoActividad[]) => {
          this.tipoActividadOpciones.set(data);
        },
        error: (err) => {
        }
      });
  }

  private cargarCoberturas(): void {
    this.coberturaService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Cobertura[]) => {
          this.coberturaOpciones.set(data);
        },
        error: (err) => {
        }
      });
  }

  private cargarPeriodos(): void {
    this.periodoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Periodo[]) => {
          this.periodoOpciones.set(data);
        },
        error: (err: any) => {
        }
      });
  }

  private cargarEntidadesNacionales(): void {
    this.entidadesNacionalesService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.entidadesNacionales = data.map(e => ({ label: e.codigo ? `${e.codigo} - ${e.nombre}` : e.nombre, value: e.id }));
        },
        error: (err) => {
          this.entidadesNacionales = [];
        }
      });
  }

  private cargarEntidadesInternacionales(): void {
    this.entidadesInternacionalesService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.entidadesInternacionales = data.map(e => ({ label: e.codigo ? `${e.codigo} - ${e.nombre}` : e.nombre, value: e.id }));
        },
        error: (err) => {
          this.entidadesInternacionales = [];
        }
      });
  }

  private prevPais: string | null = null;
  private prevDepartamento: string | null = null;
  private prevPaisOrigen: string | null = null;

  get coberturaEsInternacional(): boolean {
    const covId = this.formMovilidad.get('cobertura')?.value;
    const cov = this.coberturaOpciones().find(c => c.id === covId);
    return cov ? cov.nombre?.toLowerCase().includes('internacional') : false;
  }

  /** Origen muestra dept/ciudad solo cuando el país de origen es Colombia */
  get paisOrigenEsColombia(): boolean {
    const val = this.formMovilidad.get('paisOrigen')?.value as string | null;
    return !!val && val.toLowerCase() === 'colombia';
  }

  private configurarReactividad(): void {
    this.formMovilidad.get('facultad')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(facultadId => {
        // when faculty changes, filter the program options accordingly
        if (facultadId) {
          this.programasFiltrados.set(
            this.transformarAOpciones(
              this.programas.filter(p => p.idFacultad === facultadId)
            )
          );
        } else {
          this.actualizarProgramasFiltrados();
        }
      });

    this.formMovilidad.get('cobertura')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.coberturaEsInternacional) {
          this.formMovilidad.get('departamento')?.setValue('');
          this.formMovilidad.get('ciudad')?.setValue('');
        } else {
          // Nacional: auto-seleccionar Colombia solo si no está ya seleccionada
          const colombia = this.paises.find(p => p.label?.toLowerCase() === 'colombia');
          const currentPais = this.formMovilidad.get('pais')?.value;
          if (colombia && currentPais !== colombia.value) {
            this.formMovilidad.get('pais')?.setValue(colombia.value, { emitEvent: true });
          }
        }
      });

    this.prevPais = (this.formMovilidad.get('pais')?.value as string) || null;
    this.prevDepartamento = (this.formMovilidad.get('departamento')?.value as string) || null;

    this.formMovilidad.get('pais')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(pais => {
        const paisStr = pais as string | null;

        // --- Auto-completar Cobertura según país destino ---
        // emitEvent: false para no disparar cobertura.valueChanges y evitar loop pais <-> cobertura
        if (paisStr) {
          const paisSeleccionado = this.paises.find(p => p.value === paisStr);
          const esColombia = paisSeleccionado?.label?.toLowerCase() === 'colombia';
          const coberturaName = esColombia ? 'nacional' : 'internacional';
          const coberturaMatch = this.coberturaOpciones().find(c => c.nombre?.toLowerCase() === coberturaName);
          if (coberturaMatch) {
            const currentCobertura = this.formMovilidad.get('cobertura')?.value;
            if (currentCobertura !== coberturaMatch.id) {
              this.formMovilidad.get('cobertura')?.setValue(coberturaMatch.id, { emitEvent: false });
            }
          }
        }

        // only react if value truly changed
        if (paisStr && paisStr !== this.prevPais) {
          this.ubicacionesService.obtenerDepartamentosPorPais(pais as string)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (data) => {
                this.departamentosData = data.map(d => ({ id: d.id, nombre: d.nombre, codigoPais: d.codigoPais }));
                this.departamentos = data.map(d => ({ label: d.nombre, value: d.id }));
                this.ciudadesData = [];
                this.ciudades = [];
                this.formMovilidad.get('departamento')?.setValue('', { emitEvent: false });
                this.formMovilidad.get('ciudad')?.setValue('', { emitEvent: false });
                this.cdr.detectChanges();
              },
              error: (err) => {
              }
            });

          // Cargar instituciones filtradas por país
          const paisData = this.paisesData.find(p => p.id === paisStr);
          if (paisData?.codigoPais) {
            this.cargandoInstituciones = true;
            this.institucionesService.getByCodigoPais(paisData.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.instituciones.set(data || []);
                  this.opcionesInstituciones = data.map(inst => ({
                    label: inst.nombre,
                    value: inst.nombre
                  }));
                  this.cargandoInstituciones = false;
                },
                error: () => {
                  this.opcionesInstituciones = [];
                  this.cargandoInstituciones = false;
                }
              });
          } else {
            this.opcionesInstituciones = [];
            this.instituciones.set([]);
          }
        } else if (!pais) {
          this.departamentos = [];
          this.departamentosData = [];
          this.ciudades = [];
          this.ciudadesData = [];
          this.formMovilidad.get('departamento')?.setValue('', { emitEvent: false });
          this.formMovilidad.get('ciudad')?.setValue('', { emitEvent: false });
          this.opcionesInstituciones = [];
          this.instituciones.set([]);
          // Limpiar cobertura cuando no hay país destino seleccionado
          this.formMovilidad.get('cobertura')?.setValue(null, { emitEvent: false });
          this.cdr.detectChanges();
        }
        this.prevPais = paisStr;
      });

    this.formMovilidad.get('departamento')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(departamento => {
        const deptStr = departamento as string | null;
        if (departamento && departamento !== this.prevDepartamento) {
          this.ubicacionesService.obtenerMunicipiosPorDepartamento(departamento as string)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (data) => {
                this.ciudadesData = data.map(c => ({ id: c.id, nombre: c.nombre, codigoPais: c.codigoPais }));
                this.ciudades = data.map(c => ({ label: c.nombre, value: c.id }));
                this.formMovilidad.get('ciudad')?.setValue('', { emitEvent: false });
                this.cdr.detectChanges();
              },
              error: (err) => {
              }
            });

          // Filtrar instituciones por país + departamento
          const paisStr = this.formMovilidad.get('pais')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisStr);
          const deptData = this.departamentosData.find(d => d.id === departamento);
          if (paisData?.codigoPais && deptData?.codigoPais && deptData.codigoPais !== '0') {
            this.cargandoInstituciones = true;
            this.institucionesService.getByCodigoPaisAndDepartamento(paisData.codigoPais, deptData.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.instituciones.set(data || []);
                  this.opcionesInstituciones = data.map(inst => ({
                    label: inst.nombre,
                    value: inst.nombre
                  }));
                  this.cargandoInstituciones = false;
                },
                error: () => {
                  this.opcionesInstituciones = [];
                  this.cargandoInstituciones = false;
                }
              });
          }
        } else if (!departamento) {
          this.ciudades = [];
          this.ciudadesData = [];
          this.formMovilidad.get('ciudad')?.setValue('', { emitEvent: false });
          // Volver a filtrar solo por país
          const paisStr = this.formMovilidad.get('pais')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisStr);
          if (paisData?.codigoPais) {
            this.cargandoInstituciones = true;
            this.institucionesService.getByCodigoPais(paisData.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.instituciones.set(data || []);
                  this.opcionesInstituciones = data.map(inst => ({
                    label: inst.nombre,
                    value: inst.nombre
                  }));
                  this.cargandoInstituciones = false;
                },
                error: () => {
                  this.opcionesInstituciones = [];
                  this.cargandoInstituciones = false;
                }
              });
          }
        }
        this.prevDepartamento = deptStr;
      });

    this.formMovilidad.get('ciudad')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(ciudad => {
        if (ciudad) {
          // Filtrar instituciones por país + departamento + municipio
          const paisStr = this.formMovilidad.get('pais')?.value as string;
          const deptStr = this.formMovilidad.get('departamento')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisStr);
          const deptData = this.departamentosData.find(d => d.id === deptStr);
          const ciudadData = this.ciudadesData.find(c => c.id === ciudad);
          if (paisData?.codigoPais && deptData?.codigoPais && deptData.codigoPais !== '0' && ciudadData?.codigoPais && ciudadData.codigoPais !== '0') {
            this.cargandoInstituciones = true;
            this.institucionesService.getByCodigoPaisAndDepartamentoAndMunicipio(paisData.codigoPais, deptData.codigoPais, ciudadData.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.instituciones.set(data || []);
                  this.opcionesInstituciones = data.map(inst => ({
                    label: inst.nombre,
                    value: inst.nombre
                  }));
                  this.cargandoInstituciones = false;
                },
                error: () => {
                  this.opcionesInstituciones = [];
                  this.cargandoInstituciones = false;
                }
              });
          }
        } else {
          // Volver a filtrar por país + departamento
          const paisStr = this.formMovilidad.get('pais')?.value as string;
          const deptStr = this.formMovilidad.get('departamento')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisStr);
          const deptData = this.departamentosData.find(d => d.id === deptStr);
          if (paisData?.codigoPais && deptData?.codigoPais && deptData.codigoPais !== '0') {
            this.cargandoInstituciones = true;
            this.institucionesService.getByCodigoPaisAndDepartamento(paisData.codigoPais, deptData.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.instituciones.set(data || []);
                  this.opcionesInstituciones = data.map(inst => ({
                    label: inst.nombre,
                    value: inst.nombre
                  }));
                  this.cargandoInstituciones = false;
                },
                error: () => {
                  this.opcionesInstituciones = [];
                  this.cargandoInstituciones = false;
                }
              });
          } else if (paisData?.codigoPais) {
            this.cargandoInstituciones = true;
            this.institucionesService.getByCodigoPais(paisData.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.instituciones.set(data || []);
                  this.opcionesInstituciones = data.map(inst => ({
                    label: inst.nombre,
                    value: inst.nombre
                  }));
                  this.cargandoInstituciones = false;
                },
                error: () => {
                  this.opcionesInstituciones = [];
                  this.cargandoInstituciones = false;
                }
              });
          }
        }
      });

    // ─── Reactivity for ORIGIN (paisOrigen / departamentoOrigen / ciudadOrigen) ───

    this.formMovilidad.get('paisOrigen')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(paisOrigen => {
        const paisOrigenStr = paisOrigen as string | null;

        if (paisOrigenStr && paisOrigenStr !== this.prevPaisOrigen) {
          const isColombia = paisOrigenStr.toLowerCase() === 'colombia';
          const paisDataOrigen = this.paisesData.find(p =>
            p.nombre?.toLowerCase() === paisOrigenStr.toLowerCase()
          );

          // Reset depts/cities for origen when pais changes
          this.departamentosOrigen = [];
          this.departamentosDataOrigen = [];
          this.ciudadesOrigen = [];
          this.ciudadesDataOrigen = [];
          this.formMovilidad.get('departamentoOrigen')?.setValue('', { emitEvent: false });
          this.formMovilidad.get('ciudadOrigen')?.setValue('', { emitEvent: false });

          if (isColombia && paisDataOrigen?.id) {
            // Load departments for Colombia origin
            this.ubicacionesService.obtenerDepartamentosPorPais(paisDataOrigen.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.departamentosDataOrigen = data.map(d => ({ id: d.id, nombre: d.nombre, codigoPais: d.codigoPais }));
                  this.departamentosOrigen = data.map(d => ({ label: d.nombre, value: d.id }));
                  this.cdr.detectChanges();
                },
                error: () => {}
              });
          }

          // Load origin institutions by country
          if (paisDataOrigen?.codigoPais) {
            this.cargandoInstitucionesOrigen = true;
            this.institucionesService.getByCodigoPais(paisDataOrigen.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.opcionesInstitucionesOrigen = data.map(inst => ({ label: inst.nombre, value: inst.nombre }));
                  this.cargandoInstitucionesOrigen = false;
                  this.cdr.detectChanges();
                },
                error: () => {
                  this.opcionesInstitucionesOrigen = [];
                  this.cargandoInstitucionesOrigen = false;
                }
              });
          } else {
            this.opcionesInstitucionesOrigen = [];
          }
        } else if (!paisOrigenStr) {
          this.departamentosOrigen = [];
          this.departamentosDataOrigen = [];
          this.ciudadesOrigen = [];
          this.ciudadesDataOrigen = [];
          this.formMovilidad.get('departamentoOrigen')?.setValue('', { emitEvent: false });
          this.formMovilidad.get('ciudadOrigen')?.setValue('', { emitEvent: false });
          this.opcionesInstitucionesOrigen = [];
          this.cdr.detectChanges();
        }
        this.prevPaisOrigen = paisOrigenStr;
      });

    this.formMovilidad.get('departamentoOrigen')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(deptOrigen => {
        if (deptOrigen) {
          // Load municipios for origen
          this.ubicacionesService.obtenerMunicipiosPorDepartamento(deptOrigen as string)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (data) => {
                this.ciudadesDataOrigen = data.map(c => ({ id: c.id, nombre: c.nombre, codigoPais: c.codigoPais }));
                this.ciudadesOrigen = data.map(c => ({ label: c.nombre, value: c.id }));
                this.formMovilidad.get('ciudadOrigen')?.setValue('', { emitEvent: false });
                this.cdr.detectChanges();
              },
              error: () => {}
            });

          // Filter origen institutions by pais + dept
          const paisOrigenStr = this.formMovilidad.get('paisOrigen')?.value as string;
          const paisDataOrigen = this.paisesData.find(p => p.nombre?.toLowerCase() === paisOrigenStr?.toLowerCase());
          const deptDataOrigen = this.departamentosDataOrigen.find(d => d.id === deptOrigen);
          if (paisDataOrigen?.codigoPais && deptDataOrigen?.codigoPais && deptDataOrigen.codigoPais !== '0') {
            this.cargandoInstitucionesOrigen = true;
            this.institucionesService.getByCodigoPaisAndDepartamento(paisDataOrigen.codigoPais, deptDataOrigen.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.opcionesInstitucionesOrigen = data.map(inst => ({ label: inst.nombre, value: inst.nombre }));
                  this.cargandoInstitucionesOrigen = false;
                  this.cdr.detectChanges();
                },
                error: () => {
                  this.opcionesInstitucionesOrigen = [];
                  this.cargandoInstitucionesOrigen = false;
                }
              });
          }
        } else {
          this.ciudadesOrigen = [];
          this.ciudadesDataOrigen = [];
          this.formMovilidad.get('ciudadOrigen')?.setValue('', { emitEvent: false });
          // Revert to pais-level filter for origen
          const paisOrigenStr = this.formMovilidad.get('paisOrigen')?.value as string;
          const paisDataOrigen = this.paisesData.find(p => p.nombre?.toLowerCase() === paisOrigenStr?.toLowerCase());
          if (paisDataOrigen?.codigoPais) {
            this.cargandoInstitucionesOrigen = true;
            this.institucionesService.getByCodigoPais(paisDataOrigen.codigoPais)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (data) => {
                  this.opcionesInstitucionesOrigen = data.map(inst => ({ label: inst.nombre, value: inst.nombre }));
                  this.cargandoInstitucionesOrigen = false;
                  this.cdr.detectChanges();
                },
                error: () => {
                  this.opcionesInstitucionesOrigen = [];
                  this.cargandoInstitucionesOrigen = false;
                }
              });
          }
        }
      });

    this.formMovilidad.get('ciudadOrigen')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(ciudadOrigen => {
        const paisOrigenStr = this.formMovilidad.get('paisOrigen')?.value as string;
        const deptOrigenId = this.formMovilidad.get('departamentoOrigen')?.value as string;
        const paisDataOrigen = this.paisesData.find(p => p.nombre?.toLowerCase() === paisOrigenStr?.toLowerCase());
        const deptDataOrigen = this.departamentosDataOrigen.find(d => d.id === deptOrigenId);

        if (ciudadOrigen) {
          const ciudadDataOrigen = this.ciudadesDataOrigen.find(c => c.id === ciudadOrigen);
          if (paisDataOrigen?.codigoPais && deptDataOrigen?.codigoPais && deptDataOrigen.codigoPais !== '0'
              && ciudadDataOrigen?.codigoPais && ciudadDataOrigen.codigoPais !== '0') {
            this.cargandoInstitucionesOrigen = true;
            this.institucionesService.getByCodigoPaisAndDepartamentoAndMunicipio(
              paisDataOrigen.codigoPais, deptDataOrigen.codigoPais, ciudadDataOrigen.codigoPais
            ).pipe(takeUntil(this.destroy$)).subscribe({
              next: (data) => {
                this.opcionesInstitucionesOrigen = data.map(inst => ({ label: inst.nombre, value: inst.nombre }));
                this.cargandoInstitucionesOrigen = false;
                this.cdr.detectChanges();
              },
              error: () => {
                this.opcionesInstitucionesOrigen = [];
                this.cargandoInstitucionesOrigen = false;
              }
            });
          }
        } else {
          // Revert to dept level for origen
          if (paisDataOrigen?.codigoPais && deptDataOrigen?.codigoPais && deptDataOrigen.codigoPais !== '0') {
            this.institucionesService.getByCodigoPaisAndDepartamento(paisDataOrigen.codigoPais, deptDataOrigen.codigoPais)
              .pipe(takeUntil(this.destroy$)).subscribe({
                next: (data) => {
                  this.opcionesInstitucionesOrigen = data.map(inst => ({ label: inst.nombre, value: inst.nombre }));
                  this.cdr.detectChanges();
                },
                error: () => { this.opcionesInstitucionesOrigen = []; }
              });
          } else if (paisDataOrigen?.codigoPais) {
            this.institucionesService.getByCodigoPais(paisDataOrigen.codigoPais)
              .pipe(takeUntil(this.destroy$)).subscribe({
                next: (data) => {
                  this.opcionesInstitucionesOrigen = data.map(inst => ({ label: inst.nombre, value: inst.nombre }));
                  this.cdr.detectChanges();
                },
                error: () => { this.opcionesInstitucionesOrigen = []; }
              });
          }
        }
      });

    const fechaInicio$ = this.formMovilidad.get('fechaInicio')?.valueChanges.pipe(startWith(this.formMovilidad.get('fechaInicio')?.value)) || of(null);
    const fechaFin$ = this.formMovilidad.get('fechaFin')?.valueChanges.pipe(startWith(this.formMovilidad.get('fechaFin')?.value)) || of(null);

    combineLatest([fechaInicio$, fechaFin$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([fechaInicio, fechaFin]) => {
          const dias = MovilidadService.calcularDiasTotales(fechaInicio, fechaFin);
          this.diasTotales.set(dias);
        }
      });

    // --- Auto-cálculo Total Financiación ---
    const valNacional$ = this.formMovilidad.get('valorFinanciacionNacional')?.valueChanges.pipe(startWith(this.formMovilidad.get('valorFinanciacionNacional')?.value)) || of(0);
    const valInternacional$ = this.formMovilidad.get('valorFinanciacionInternacional')?.valueChanges.pipe(startWith(this.formMovilidad.get('valorFinanciacionInternacional')?.value)) || of(0);
    combineLatest([valNacional$, valInternacional$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([nacional, internacional]) => {
        const total = (Number(nacional) || 0) + (Number(internacional) || 0);
        this.formMovilidad.get('totalFinanciacion')?.setValue(total, { emitEvent: false });
      });

    this.formMovilidad.get('programa')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(programaId => {
        if (programaId) {
          const programa = this.programas.find(p => p.id === programaId);
          this.formMovilidad.get('codigoSnies')?.setValue(programa?.codOficial ?? null, { emitEvent: false });
        } else {
          this.formMovilidad.get('codigoSnies')?.setValue(null, { emitEvent: false });
        }
      });

    this.formMovilidad.get('tipoMovilidad')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipoMovilidadId => {
        const opc = this.tipoOpciones().find(m => m.id === tipoMovilidadId);
        const nombre = opc?.nombre || '';
        this.tipoMovilidadSeleccionadoNombre.set(nombre);

        const lower = nombre.toLowerCase();
        const isEntrante = lower.includes('entrante');
        const isSaliente = lower.includes('saliente');

        // --- Lógica de Origen (BLOQUE A) --- solo al cambiar manualmente, no al cargar edición
        if (!this.suppressingValueChanges) {
          const controlOrigen = this.formMovilidad.get('institucionOrigen');
          const controlPaisOrigen = this.formMovilidad.get('paisOrigen');
          if (isSaliente) {
            controlOrigen?.setValue('Universidad Mariana', { emitEvent: false });
            controlPaisOrigen?.setValue('Colombia', { emitEvent: false });
            controlOrigen?.clearValidators();
            controlPaisOrigen?.clearValidators();
          } else if (isEntrante) {
            controlOrigen?.setValue('', { emitEvent: false });
            controlPaisOrigen?.setValue('', { emitEvent: false });
            controlOrigen?.setValidators([Validators.required]);
            controlPaisOrigen?.setValidators([Validators.required]);
          } else {
            controlOrigen?.clearValidators();
            controlPaisOrigen?.clearValidators();
            controlOrigen?.setValue('', { emitEvent: false });
            controlPaisOrigen?.setValue('', { emitEvent: false });
          }
          controlOrigen?.updateValueAndValidity();
          controlPaisOrigen?.updateValueAndValidity();
        } else {
          // En modo edición, solo ajustar validadores sin tocar valores
          const controlOrigen = this.formMovilidad.get('institucionOrigen');
          const controlPaisOrigen = this.formMovilidad.get('paisOrigen');
          if (isEntrante) {
            controlOrigen?.setValidators([Validators.required]);
            controlPaisOrigen?.setValidators([Validators.required]);
          } else {
            controlOrigen?.clearValidators();
            controlPaisOrigen?.clearValidators();
          }
          controlOrigen?.updateValueAndValidity({ emitEvent: false });
          controlPaisOrigen?.updateValueAndValidity({ emitEvent: false });
        }

        // --- Lógica Bloque B: Nombre del Evento obligatorio para Docente/Administrativo/Investigador ---
        const controlNombreEvento = this.formMovilidad.get('nombreEvento');
        if (lower.includes('docente') || lower.includes('administrativo') || lower.includes('investigador')) {
          controlNombreEvento?.setValidators([Validators.required]);
        } else {
          controlNombreEvento?.clearValidators();
        }
        controlNombreEvento?.updateValueAndValidity({ emitEvent: false });

        // --- Filtrar tipo_actividad por tipo de movilidad (BLOQUE C) ---
        if (!this.suppressingValueChanges) {
          this.formMovilidad.get('tipoActividad')?.setValue('', { emitEvent: false });
        }
        if (tipoMovilidadId) {
          this.tipoActividadService.getByTipoMovilidad(tipoMovilidadId as string)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (data: TipoActividad[]) => this.tipoActividadOpciones.set(data),
              error: () => this.tipoActividadOpciones.set([])
            });
        } else {
          this.tipoActividadOpciones.set([]);
        }
      });
  }



  private filtrarProgramasPorFacultad(facultad: string | null): void {
    if (facultad) {
      const filtrados = this.programas
        .filter((p: {id: string, nombre: string, idFacultad: string}) => p.idFacultad === facultad)
        .map((p: {id: string, nombre: string, idFacultad: string}) => ({ label: p.nombre, value: p.id }));
      this.programasFiltrados.set(filtrados);
    } else {
      const todas = this.programas.map((p: {id: string, nombre: string, idFacultad: string}) => ({ label: p.nombre, value: p.id }));
      this.programasFiltrados.set(todas);
    }
  }

  onFiltroFacultadChange(value: any): void {
    if (this.facultades().length === 0) {
      this.cargarFacultades();
    }
    if (this.programas.length === 0) {
      this.cargarProgramas();
    }
    const facultadId = value || '';
    this.filtroFacultad.set(facultadId);
    this.filtrarProgramasPorFacultad(facultadId || null);

    const programaActual = this.filtroPrograma();
    if (programaActual && facultadId) {
      const programa = this.programas.find((p: {id: string, nombre: string, idFacultad: string}) => String(p.id).trim() === programaActual);
      if (programa && String(programa.idFacultad).trim() !== facultadId) {
        this.filtroPrograma.set('');
      }
    }
  }

  onFiltroProgramaChange(value: any): void {
    if (this.programas.length === 0) {
      this.cargarProgramas();
    }
    const programaId = value || '';
    this.filtroPrograma.set(programaId);
    if (programaId) {
      this.filtroFacultad.set('');
      this.filtrarProgramasPorFacultad(null);
    }
  }

  private async cargarDepartamentosPorPais(paisId: string): Promise<void> {
    return new Promise((resolve) => {
      this.ubicacionesService.obtenerDepartamentosPorPais(paisId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.departamentosData = data.map(d => ({ id: d.id, nombre: d.nombre, codigoPais: d.codigoPais }));
            this.departamentos = data.map(d => ({ label: d.nombre, value: d.id }));
            this.departamentos = [...this.departamentos]; // Trigger change detection
            resolve();
          },
          error: (err) => {
            resolve(); // Resolver incluso en error para no bloquear
          }
        });
    });
  }

  private async cargarMunicipiosPorDepartamento(departamentoId: string): Promise<void> {
    return new Promise((resolve) => {
      this.ubicacionesService.obtenerMunicipiosPorDepartamento(departamentoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.ciudadesData = data.map(c => ({ id: c.id, nombre: c.nombre, codigoPais: c.codigoPais }));
            this.ciudades = data.map(c => ({ label: c.nombre, value: c.id }));
            this.ciudades = [...this.ciudades]; // Trigger change detection
            resolve();
          },
          error: (err) => {
            resolve(); 
          }
        });
    });
  }

  irALaLista(): void {
    this.router.navigate(['/app/movilidad-list']);
  }


  
  irASiguiente(): void {
    const id = this.movilidadSeleccionada?.id;

    const tipoMovilidadId = this.formMovilidad.get('tipoMovilidad')?.value as string | null;
    const tipoMovilidadObj = tipoMovilidadId
      ? this.tipoOpciones().find(o => o.id === tipoMovilidadId)
      : null;

    // determinamos destino por nombre de tipo de movilidad (insensible a mayúsculas)
    let ruta = '/app/profesores-oracle';
    if (tipoMovilidadObj && tipoMovilidadObj.nombre?.toLowerCase().includes('estudiante')) {
      // ruta configurada en las rutas del workspace
      ruta = '/app/estudiantes-oracle-consulta';
    }

    if (id) {
      this.router.navigate([ruta], { queryParams: { id } });
    } else {
      this.router.navigate([ruta]);
    }
  }

  seleccionarMovilidad(value: any): void {
    const movilidadId = value || '';
    if (!movilidadId) {
      this.movilidadError.set('Debe seleccionar una movilidad');
      return;
    }
    this.movilidadError.set('');
    this.cargarMovilidadPorId(movilidadId);
  }

  goBack(): void {
    this.habilitarFormularioParaEdicion();

    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.irALaLista();
    }
  }

  async cargarMovilidades(): Promise<void> {
    try {
      this.cargandoTabla = true;
      const list = await this.movilidadService.getAll().toPromise() || [];
      this.movilidades.set(list);
    } catch (error) {
    } finally {
      this.cargandoTabla = false;
    }
  }

  async cargarMovilidadPorId(id: string): Promise<void> {
    try {
      const movilidad = await this.movilidadService.getByIdOrNull(id).toPromise();
      if (movilidad) {
        this.editarMovilidad(movilidad);
        this.habilitarFormularioParaEdicion();
        this.movilidadSeleccionadaChange.emit(movilidad);
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar la movilidad'
      });
    }
  }

  private buildPayloadFromForm() {
    const formData = this.formMovilidad.getRawValue() as any;

    // UI-only origin cascade helpers — not persisted in backend
    delete formData.departamentoOrigen;
    delete formData.ciudadOrigen;

    const numericFields = ['valorFinanciacionNacional', 'valorFinanciacionInternacional', 'totalFinanciacion'];
    numericFields.forEach(k => {
      if (formData[k] === '' || formData[k] === undefined) {
        formData[k] = null;
      } else if (formData[k] !== null) {
        formData[k] = Number(formData[k]) || null;
      }
    });
    if (formData.entidadNacional) {
      const opt = this.entidadesNacionales.find(o => o.value === formData.entidadNacional);
      if (opt) {
        formData.entidadNacional = opt.label;
      }
    }

    ['pais', 'departamento', 'ciudad', 'paisFinanciador', 'paisOrigen'].forEach(k => {
      if (formData[k] === '' || formData[k] === undefined) {
        formData[k] = null;
      } else if (formData[k] != null) {
        formData[k] = String(formData[k]);
      }
    });

    return MovilidadService.buildPayloadFromFormData(formData);
  }

  private formatDateForBackend(date: any): string | null {
    const d = date ? new Date(date) : null;
    if (!d || isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
             .toISOString()
             .slice(0, 10);
  }

  
  async registrarMovilidad(avanzar: boolean = false): Promise<boolean> {
    if (this.isSubmitting || this.cargando) return false;

    if (this.formMovilidad.invalid) {
      this.formMovilidad.markAllAsTouched();
      this.scrollToFirstInvalidField();
      return false;
    }

    this.isSubmitting = true;
    this.cargando = true;

    try {
      const payload = this.buildPayloadFromForm();

      const op = this.modoEdicion && this.movilidadSeleccionada
        ? this.movilidadService.update(this.movilidadSeleccionada.id, payload)
        : this.movilidadService.create(payload);

      const result: any = await op.toPromise();
      const id = this.modoEdicion ? this.movilidadSeleccionada?.id : result?.id;
      if (!id) throw new Error('No se pudo obtener el ID de la movilidad creada');

      if (!this.modoEdicion) {
        this.modoEdicion = true;
        this.movilidadSeleccionada = result;
      } else if (result) {
        // update the cached object and refresh form if backend returned it
        this.movilidadSeleccionada = result;
        await this.cargarCascadasParaEdicion(result);
        this.establecerValoresFormulario(result);
      }

      this.messageService.add({
        severity: 'warn',
        detail: this.modoEdicion
          ? 'Movilidad actualizada correctamente'
          : 'Movilidad guardada correctamente'
      });
      this.movilidadGuardada.emit(id);
      if (avanzar) {
        this.solicitudSiguiente.emit();
      }

      this.habilitarFormularioParaEdicion();

      return true;
    } catch (error: any) {
      this.messageService.add({ detail: `Error al guardar la movilidad: ${error.message || 'Error desconocido'}` });
      return false;
    } finally {
      this.isSubmitting = false;
      this.cargando = false;
    }
  }


  async guardarYSiguiente(): Promise<void> {
    if (this.modoEdicion && !this.hasFormChanges) {
      this.solicitudSiguiente.emit();
      return;
    }

    await this.registrarMovilidad(true);
  }

  private scrollToFirstInvalidField(): void {
    if (!this.formContainer) return;

    const firstInvalidControlName = this.getFirstInvalidControlName();
    if (!firstInvalidControlName) return;

    const element = this.getFormControlElement(firstInvalidControlName);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus?.();

    this.messageService.add({
      severity: 'warn',
      summary: 'Campo requerido',
      detail: `El campo ${this.getFieldLabel(firstInvalidControlName)} es obligatorio`
    });
  }

  private getFirstInvalidControlName(): string | null {
    const invalidControls = Object.keys(this.formMovilidad.controls).filter(key => {
      const control = this.formMovilidad.get(key);
      return control && control.invalid && control.touched;
    });

    return invalidControls.length > 0 ? invalidControls[0] : null;
  }

  private getFormControlElement(controlName: string): HTMLElement | null {
    if (!this.formContainer) return null;

    const formElement = this.formContainer.nativeElement;
    return formElement.querySelector(`[formcontrolname="${controlName}"]`) ||
           formElement.querySelector(`[id="${controlName}"]`) ||
           formElement.querySelector(`input[formcontrolname="${controlName}"]`) ||
           formElement.querySelector(`select[formcontrolname="${controlName}"]`) ||
           formElement.querySelector(`textarea[formcontrolname="${controlName}"]`);
  }

  private getFieldLabel(fieldName: string): string {
    return FIELD_LABELS[fieldName as keyof typeof FIELD_LABELS] || fieldName;
  }

  editarMovilidad(movilidad: Movilidad): void {
    this.modoEdicion = true;
    this.movilidadSeleccionada = movilidad;


    this.cargarCascadasParaEdicion(movilidad).then(() => {
      this.establecerValoresFormulario(movilidad);
    });
  }

  private async cargarCascadasParaEdicion(movilidad: Movilidad): Promise<void> {
    // Ensure paises are loaded before resolving codigoPais
    await this.paisesLoaded;
    if (movilidad.pais) {
      await this.cargarDepartamentosPorPais(movilidad.pais);
      if (movilidad.departamento) {
        await this.cargarMunicipiosPorDepartamento(movilidad.departamento);
      }
      // Cargar instituciones con el nivel de filtrado más específico disponible
      const paisData = this.paisesData.find(p => p.id === movilidad.pais);
      if (paisData?.codigoPais) {
        try {
          let data: {id: string, nombre: string, idTipoLv: string}[];
          const deptData = movilidad.departamento ? this.departamentosData.find(d => d.id === movilidad.departamento) : null;
          const ciudadData = movilidad.ciudad ? this.ciudadesData.find(c => c.id === movilidad.ciudad) : null;

          if (deptData?.codigoPais && deptData.codigoPais !== '0' && ciudadData?.codigoPais && ciudadData.codigoPais !== '0') {
            data = await this.institucionesService.getByCodigoPaisAndDepartamentoAndMunicipio(paisData.codigoPais, deptData.codigoPais, ciudadData.codigoPais).toPromise() as any[] || [];
          } else if (deptData?.codigoPais && deptData.codigoPais !== '0') {
            data = await this.institucionesService.getByCodigoPaisAndDepartamento(paisData.codigoPais, deptData.codigoPais).toPromise() as any[] || [];
          } else {
            data = await this.institucionesService.getByCodigoPais(paisData.codigoPais).toPromise() as any[] || [];
          }
          this.instituciones.set(data || []);
          this.opcionesInstituciones = (data || []).map(inst => ({
            label: inst.nombre,
            value: inst.nombre
          }));
        } catch {
          this.opcionesInstituciones = [];
        }
      }
    }
  }

  private establecerValoresFormulario(movilidad: Movilidad): void {
    const formData = this.prepararDatosFormulario(movilidad);

    this.prevPais = formData.pais || null;
    this.prevDepartamento = formData.departamento || null;

    this.aplicarValoresAlFormulario(formData);
  }

  private prepararDatosFormulario(movilidad: Movilidad): any {
    const { id, 
      
      ...formData } = movilidad;
    const modalidadId = formData.modalidad?.id || null;
    const esTipoMovilidadEstudianteEnContextoUsuarios =
      this.contextoCreacion === 'usuarios' &&
      formData.tipoMovilidad?.nombre?.toLowerCase().includes('estudiante');

    // map entidadNacional name to id if possible
    let entidadNacVal: string | null = formData.entidadNacional || null;
    if (entidadNacVal && this.entidadesNacionales.length) {
      const match = this.entidadesNacionales.find(o => o.label === entidadNacVal);
      entidadNacVal = match ? String(match.value) : entidadNacVal;
    }

    const preparedData = {
      ...formData,
      convenioAsociado: formData.convenio?.id || null,
      fechaInicio: formData.fechaInicio ? this.parseDateForDatepicker(formData.fechaInicio) : null,
      fechaFin: formData.fechaFin ? this.parseDateForDatepicker(formData.fechaFin) : null,
      tipoMovilidad: esTipoMovilidadEstudianteEnContextoUsuarios ? null : (formData.tipoMovilidad?.id || null),
      modalidad: modalidadId,
      periodo: formData.periodo?.id || null,
      cobertura: formData.cobertura?.id || null,
      lineaEstrategica: formData.lineaEstrategica?.id || null,
      entidadNacional: entidadNacVal
    };
    
    return preparedData;
  }

  private aplicarValoresAlFormulario(formData: any): void {
    const datosConFechas = {
      ...formData,
      fechaInicio: this.parseDateForDatepicker(formData.fechaInicio),
      fechaFin: this.parseDateForDatepicker(formData.fechaFin),
    };

    this.suppressingValueChanges = true;
    this.formMovilidad.patchValue(datosConFechas, { emitEvent: true });
    this.suppressingValueChanges = false;

    this.cdr.detectChanges();
    this.calcularDiasTotales(formData.fechaInicio, formData.fechaFin);
    this.programarGuardadoSnapshot();
  }

  private calcularDiasTotales(fechaInicio: string | Date | null, fechaFin: string | Date | null): void {
    if (fechaInicio && fechaFin) {
      const inicio = fechaInicio instanceof Date ? fechaInicio : new Date(fechaInicio);
      const fin = fechaFin instanceof Date ? fechaFin : new Date(fechaFin);
      const diferenciaMs = fin.getTime() - inicio.getTime();
      const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
      this.diasTotales.set(dias >= 0 ? dias : null);
    }
  }

  private programarGuardadoSnapshot(): void {
    setTimeout(() => {
      this.saveFormSnapshot();
    }, 200);
  }

  private saveFormSnapshot(): void {
    const currentValues = this.formMovilidad.getRawValue();
    this.originalFormValue = { ...currentValues };
  }

  confirmarEliminar(movilidad: Movilidad): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de que desea eliminar todos los datos asociados a la movilidad "${movilidad.nombreMovilidad}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminarMovilidad(movilidad.id)
    });
  }

  async eliminarMovilidad(id: string): Promise<void> {
    try {
      await this.movilidadService.deleteMovilidadWithRelations(id).toPromise();
      await this.cargarMovilidades();
      this.messageService.add({ detail: 'Movilidad eliminada correctamente' });
    } catch (error) {
      this.messageService.add({ detail: 'Error al eliminar la movilidad' });
    }
  }

  limpiarFormulario(): void {
    this.formMovilidad.reset(this.defaultFormValues);
    this.formMovilidad.get('convenioAsociado')?.setValue('');
    this.formMovilidad.markAsUntouched();
    this.departamentos = [];
    this.departamentosData = [];
    this.ciudades = [];
    this.ciudadesData = [];
    this.opcionesInstituciones = [];
    this.instituciones.set([]);
    // Clear origin cascade helpers
    this.departamentosOrigen = [];
    this.departamentosDataOrigen = [];
    this.ciudadesOrigen = [];
    this.ciudadesDataOrigen = [];
    this.opcionesInstitucionesOrigen = [];
    this.modoEdicion = false;
    this.movilidadSeleccionada = null;
    this.originalFormValue = {};
    this.programasFiltrados.set(this.transformarAOpciones(this.programas));
    this.tipoActividadOpciones.set([]);
    this.tipoMovilidadSeleccionadoNombre.set('');
    this.isSubmitting = false;
  }

  getProgramaNombre(programaId: string): string {
    const programa = this.programas.find((p: {id: string, nombre: string, idFacultad: string}) => p.id === programaId);
    return programa ? programa.nombre : '';
  }

  getFacultadNombre(facultadId: string): string {
    if (!facultadId) return '';
    const facultad = this.facultades().find((f: Opcion) => ((f.value ?? f.id) ?? '').toString() === facultadId.toString());
    if (!facultad) return facultadId;
    return (facultad.label ?? facultad.nombre) ?? facultadId;
  }

  getFacultadFromMovilidad(mov: Movilidad): string {
    if (mov.facultad) {
      return this.getFacultadNombre(mov.facultad);
    }
    if (mov.programa) {
      const programa = this.programas.find((p: {id: string, nombre: string, idFacultad: string}) => p.id.toString() === mov.programa.toString());
      if (programa && programa.idFacultad) {
        return this.getFacultadNombre(programa.idFacultad);
      }
    }
    return '';
  }

  getConvenioCodigo(convenioId: string): string {
    if (!convenioId) return '';
    const convenio = this.convenios().find((c: Convenio) => c.id.toString() === convenioId.toString());
    return convenio ? convenio.codigo : convenioId;
  }

  get progresoFormulario(): number {
    const camposRequeridos = ['nombreMovilidad', 'tipoMovilidad', 'tipoActividad', 'modalidad', 'fechaInicio', 'fechaFin', 'lugarDestino'];
    if (this.nombreEventoRequerido()) {
      camposRequeridos.push('nombreEvento');
    }
    const camposLlenos = camposRequeridos.filter(campo => {
      const valor = this.formMovilidad.get(campo)?.value;
      return valor !== null && valor !== undefined && valor !== '';
    }).length;
    return Math.round((camposLlenos / camposRequeridos.length) * 100);
  }

  get hasFormChanges(): boolean {
    return this._hasFormChangesInternal();
  }

  get sniesPlaceholder(): string {
    const programaId = this.formMovilidad.get('programa')?.value;
    if (!programaId) return 'Se asigna al seleccionar programa';
    const prog = this.programas.find(p => p.id === programaId);
    return prog && !prog.codOficial ? 'Sin código SNIES' : 'Se asigna al seleccionar programa';
  }

  private _hasFormChangesInternal(): boolean {
    if (!this.modoEdicion || !this.movilidadSeleccionada) {
      return false;
    }

    const currentValues = this.formMovilidad.getRawValue();

    // Campos a comparar
    const fieldsToCompare = [
      'nombreMovilidad', 'tipoMovilidad', 'tipoActividad', 'modalidad',
      'fechaInicio', 'fechaFin', 'facultad', 'programa', 'codigoSnies', 'lugarDestino',
      'periodo', 'pais', 'departamento', 'ciudad',
      'valorFinanciacionNacional', 'valorFinanciacionInternacional',
      'objeto', 'lineaEstrategica',
      'entidadNacional', 'entidadInternacional', 'convenioAsociado',
      'solicitarAutorizacion'
    ];

    const normalize = (v: any): string => {
      if (v === null || v === undefined) return '';
      // Extract the id from nested objects that Angular Material / PrimeNG
      if (typeof v === 'object' && 'id' in v) return String((v as any).id);
      return String(v);
    };

    const formatDate = (date: any): string | null => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    for (const field of fieldsToCompare) {
      const currentValue = currentValues[field as string];
      const originalValue = (this.movilidadSeleccionada as any)[field];

      // â”€â”€ Dates: compare as YYYY-MM-DD local strings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (field === 'fechaInicio' || field === 'fechaFin') {
        if (formatDate(currentValue) !== formatDate(originalValue)) {
          return true;
        }

      // â”€â”€ Convenio: compare IDs; backend stores inside a nested object â”€â”€â”€â”€
      } else if (field === 'convenioAsociado') {
        const cur = normalize(currentValue);
        const orig = normalize(this.movilidadSeleccionada!.convenio?.id ?? null);
        if (cur !== orig) {
          return true;
        }

      // â”€â”€ All other fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      } else {
        // normalize handles nested objects (TipoMovilidad, Modalidad, etc.)
        if (normalize(currentValue) !== normalize(originalValue)) {
          return true;
        }
      }
    }

    return false;
  }

  private normalizeToDate(date: any): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;

    if (typeof date === 'string') {
      // Try yyyy-MM-dd format
      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
      }

      // Try dd/mm/yyyy format
      const parts = date.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }

      // Try parsing directly
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    return null;
  }

  private formatDateForInput(date: any): string {
    const normalized = this.normalizeToDate(date);
    if (!normalized) return '';

    const year = normalized.getFullYear();
    const month = String(normalized.getMonth() + 1).padStart(2, '0');
    const day = String(normalized.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateForDatepicker(date: any): Date | null {
    return this.normalizeToDate(date);
  }

  private actualizarProgramasFiltrados(): void {
    // programas is now a plain array, so just pass it directly
    this.programasFiltrados.set(this.transformarAOpciones(this.programas));
  }

  private transformarAOpciones(data: any[]): Opcion[] {
    return data.map(item => ({ label: item.nombre, value: item.id }));
  }
}
