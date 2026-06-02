import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OfertaLaboral, TituloCatalogoOption, CategoriaFormacion } from '../../core/models/oferta-laboral.model';
import { Observable, of, timer } from 'rxjs';
import { map, catchError, switchMap, first } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { InputComponent } from '@microfrontends/shared-ui';
import { SelectComponent } from '@microfrontends/shared-ui';
import { DatepickerComponent } from '@microfrontends/shared-ui';
import { TextareaComponent } from '@microfrontends/shared-ui';
import { ConfirmationDialogService } from '@microfrontends/shared-ui';
import { TituloSelectComponent } from '@microfrontends/shared-ui';
import { TituloAcademicoCatalogoService } from '../../core/services/titulo-academico-catalogo.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import { OfertaLaboralService } from '../../core/services/ofertas-laborales.service';
import { ListasValoresService, EmailNotificationService, NotificationManagementService, AuthService } from '@microfrontends/shared-services';
import { ListasValoresDto } from '@microfrontends/shared-models';
import { HttpClient } from '@angular/common/http';
import { PersonasService } from '../../core/services/personas.service';
import { HojaVidaNotificacionesService } from '../../core/services/hoja-vida-notificaciones.service';
import { CentrosCostoOracleService, CentroCostoOracle } from '../../core/services/centros-costo-oracle.service';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  Header,
  VerticalAlignTable,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-ofertas-laborales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    InputComponent,
    SelectComponent,
    DatepickerComponent,
    TextareaComponent,
    TituloSelectComponent,
    DialogModule,
    ButtonModule,
    MessageModule,
    ToggleSwitchModule,
    CardModule,
    ConfirmDialogModule,
    ToastModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    ProgressBarModule,
    TagModule,
    DividerModule,
  ],
  templateUrl: './oferta-laboral-component.html',
  styleUrls: ['./oferta-laboral-component.scss'],
  providers: [ConfirmationService, MessageService, ConfirmationDialogService],
})
export class OfertasLaboralesComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  convocatorias: OfertaLaboral[] = [];
  convocatoriasFiltradas: OfertaLaboral[] = [];

  Math = Math;

  visible: boolean = false;
  activo: boolean = true;
  loading: boolean = false;

  filtroTexto: string = '';
  filtroEstado: string = 'todas';

  opcionesEstado = [
    { label: 'Todas las ofertas', value: 'todas' },
    { label: 'Solo activas', value: 'activas' },
    { label: 'Solo inactivas', value: 'inactivas' }
  ];

  tiposConvocatoria: ListasValoresDto[] = [];
  departamentos: ListasValoresDto[] = [];
  centrosCosto: CentroCostoOracle[] = []; 
  tiposContrato: any[] = [];
  dedicaciones: any[] = [];
  periodos: any[] = [];
  anios: any[] = [];
  titulosAcademicos: any[] = [];
  titulosAcademicosParaMostrar: any[] = [];

  requisitosBase = [
    'Formación técnica o tecnológica:',
    'Formación pregrado:',
    'Formación posgrado:',
    'Experiencia laboral:',
    'Manejo segundo idioma:',
    'Cualificación:',
    'Manejo de TICS:',
    'Competencias:'
  ];

  requisitosConTitulo = [
    'Formación técnica o tecnológica:',
    'Formación pregrado:',
    'Formación posgrado:'
  ];

  readonly NIVELES_FORMACION = [
    { label: 'Técnico', value: 'Técnico' },
    { label: 'Tecnólogo', value: 'Tecnólogo' },
    { label: 'Pregrado', value: 'Pregrado' },
    { label: 'Especialización', value: 'Especialización' },
    { label: 'Maestría', value: 'Maestría' },
    { label: 'Doctorado', value: 'Doctorado' },
    { label: 'Otro', value: 'Otro' }
  ];

  readonly OPERADORES_LOGICOS = [
    { label: 'O (cualquiera de los títulos del grupo)', value: 'OR' },
    { label: 'Y (todos los títulos del grupo)', value: 'AND' }
  ];

  // ─── Catálogo de títulos: mapeos por categoría ─────────────────────────────

  readonly CATEGORIA_POR_NOMBRE: Record<string, CategoriaFormacion> = {
    'Formación técnica o tecnológica:': 'TECNICA_TECNOLOGICA',
    'Formación pregrado:': 'PREGRADO',
    'Formación posgrado:': 'POSGRADO',
  };

  readonly LABEL_CATEGORIA: Record<CategoriaFormacion, string> = {
    TECNICA_TECNOLOGICA: 'técnicos o tecnológicos (Técnico, Tecnólogo)',
    PREGRADO: 'de pregrado (Pregrado, Profesional, Universitario)',
    POSGRADO: 'de posgrado (Especialización, Maestría, Doctorado)',
  };

  readonly PLACEHOLDER_BUSQUEDA: Record<CategoriaFormacion, string> = {
    TECNICA_TECNOLOGICA: 'Buscar títulos técnicos o tecnológicos...',
    PREGRADO: 'Buscar títulos de pregrado...',
    POSGRADO: 'Buscar títulos de posgrado...',
  };

  // Estado del buscador de catálogo por índice de requisito
  catalogoQuery: Record<number, string> = {};
  catalogoSugerencias: Record<number, TituloCatalogoOption[]> = {};
  catalogoLoading: Record<number, boolean> = {};
  catalogoMostrarDropdown: Record<number, boolean> = {};
  private searchTimers: Record<number, ReturnType<typeof setTimeout>> = {};

  havePermission = false;
  private esEmpleado = false;
  hoy: Date = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  constructor(
    private fb: FormBuilder,
    private ofertaService: OfertaLaboralService,
    private listasValoresService: ListasValoresService,
    private centrosCostoService: CentrosCostoOracleService,
    private http: HttpClient,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private confirmationDialogService: ConfirmationDialogService,
    private emailService: EmailNotificationService,
    private notificationService: NotificationManagementService,
    private personasService: PersonasService,
    private authService: AuthService,
    private hojaVidaNotificacionesService: HojaVidaNotificacionesService,
    private catalogoService: TituloAcademicoCatalogoService
  ) {}

  totalOfertas = 0;
  activas = 0;
  inactivas = 0;

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  paginatedOfertas: OfertaLaboral[] = [];
  
  ngOnInit(): void {
    this.convocatorias = [];
    this.totalOfertas = 0;
    this.havePermission = this.authService.hasRole('ADMIN') || this.authService.hasRole('GESTION_HUMANA');
    this.activas = 0;
    this.inactivas = 0;
    
    this.inicializarFormulario();
    this.cargarDatosListas();
    this.cargarEstadisticas();

    // Verificar si el usuario es empleado de la universidad via oracle-service
    if (!this.havePermission) {
      this.personasService.esEmpleadoUniversidad().subscribe({
        next: (result) => {
          this.esEmpleado = result.esEmpleado;
          this.cargarOfertas();
        },
        error: () => {
          this.esEmpleado = false;
          this.cargarOfertas();
        }
      });
    } else {
      this.cargarOfertas();
    }
  }

  cargarDatosListas(): void {
    this.listasValoresService.getTiposConvocatoria().subscribe({
      next: (data) => {
        this.tiposConvocatoria = data;
      },
      error: (err) => {
        this.tiposConvocatoria = [];
      }
    });

    this.listasValoresService.getDepartamentos().subscribe({
      next: (data) => {
        this.departamentos = data;
      },
      error: (err) => {
        this.departamentos = [];
      }
    });

    this.centrosCostoService.getCentrosCostoActivos().subscribe({
      next: (data) => {
        this.centrosCosto = data.sort((a, b) => 
          a.nombreCentroCosto.localeCompare(b.nombreCentroCosto)
        );
      },
      error: (err) => {
        this.centrosCosto = [];
      }
    });

    this.listasValoresService.getTiposContrato().subscribe({
      next: (data) => {
        this.tiposContrato = data;
      },
      error: (err) => {
        this.tiposContrato = [];
      }
    });

    this.listasValoresService.getDedicaciones().subscribe({
      next: (data) => {
        this.dedicaciones = data;
      },
      error: (err) => {
        this.dedicaciones = [];
      }
    });

    this.cargarTitulosAcademicos();

    this.periodos = [
      { label: 'I', value: 'I' },
      { label: 'II', value: 'II' }
    ];

    const currentYear = new Date().getFullYear();
    this.anios = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear + i;
      this.anios.push({ label: year.toString(), value: year });
    }
  }

  inicializarFormulario(): void {
    this.form = this.fb.group(
      {
        id: [''],
        numeroConvocatoria: ['', 
          [
            Validators.required, 
            Validators.maxLength(20),
            OfertasLaboralesComponent.numeroConvocatoriaValidator
          ],
          [this.numeroConvocatoriaAsyncValidator.bind(this)]
        ],
        tipoConvocatoria: ['', [Validators.required]],
        departamentoSolicitante: ['', [Validators.required]],
        periodoParte: [undefined, [Validators.required]],
        periodoAnio: [undefined, [Validators.required]],
        fechaCierre: [null, [Validators.required, OfertasLaboralesComponent.fechaNoAnteriorHoyValidator]],
        fechaPublicacion: [null, [Validators.required, OfertasLaboralesComponent.fechaNoAnteriorHoyValidator]],
        cargoRequerido: ['', [Validators.required, Validators.maxLength(50)]],
        funciones: ['', [Validators.required, Validators.maxLength(1500)]],
        experiencia: ['', [Validators.required, Validators.maxLength(255)]],
        cargosDisponibles: ['', [
          Validators.required, 
          Validators.maxLength(255),
          Validators.min(1),
          OfertasLaboralesComponent.cargosDisponiblesValidator
        ]],
        dedicacion: ['', [Validators.required]],
        tipoContrato: ['', [Validators.required]],
        activo: [true, Validators.required],
        permitirAreasAfines: [false],
        requisitos: this.fb.array([]),
      }
    );
    this.resetRequisitosFormArray();
  }
  
  get requisitosFormArray(): FormArray {
    return this.form.get('requisitos') as FormArray;
  }

  getTituloRequisito(index: number): string {
    const control = this.requisitosFormArray.at(index);
    return control?.get('nombre')?.value || `Requisito ${index + 1}`;
  }

  requisitoNecesitaTitulo(index: number): boolean {
    const control = this.requisitosFormArray.at(index);
    const nombre = control?.get('nombre')?.value;
    return this.requisitosConTitulo.includes(nombre);
  }

  requisitoEsExperiencia(index: number): boolean {
    const control = this.requisitosFormArray.at(index);
    return control?.get('nombre')?.value === 'Experiencia laboral:';
  }

  requisitoUsaEstructuraAcademica(index: number): boolean {
    return !!this.requisitosFormArray.at(index)?.get('usaEstructuraAcademica')?.value;
  }

  getGruposAcademicosArray(requisitoIndex: number): FormArray {
    return this.requisitosFormArray.at(requisitoIndex).get('gruposAcademicos') as FormArray;
  }

  getTitulosArray(requisitoIndex: number, grupoIndex: number): FormArray {
    return this.getGruposAcademicosArray(requisitoIndex).at(grupoIndex).get('titulos') as FormArray;
  }

  crearTituloFormGroup(titulo?: any): FormGroup {
    return this.fb.group({
      id: [titulo?.id || null],
      // Campos del catálogo externo (snapshot)
      idTituloCatalogoExterno: [titulo?.idTituloCatalogoExterno || null],
      codigoTituloExterno: [titulo?.codigoTituloExterno || null],
      fuenteCatalogo: [titulo?.fuenteCatalogo || null],
      metadataCatalogo: [titulo?.metadataCatalogo || null],
      // Campos del título
      nivelFormacion: [titulo?.nivelFormacion || ''],
      tituloAcademico: [titulo?.tituloAcademico || '', Validators.required],
      areaConocimiento: [titulo?.areaConocimiento || ''],
      nucleoBasicoConocimiento: [titulo?.nucleoBasicoConocimiento || ''],
      campoAmplio: [titulo?.campoAmplio || ''],
      campoEspecifico: [titulo?.campoEspecifico || ''],
      campoDetallado: [titulo?.campoDetallado || ''],
      permiteAreasAfines: [titulo?.permiteAreasAfines ?? false],
      obligatorio: [titulo?.obligatorio ?? false],
      puntajeBase: [titulo?.puntajeBase ?? null],
      orden: [titulo?.orden ?? 1],
      activo: [titulo?.activo ?? true]
    });
  }

  crearGrupoAcademicoFormGroup(grupo?: any): FormGroup {
    const titulos = (grupo?.titulos || []).map((t: any) => this.crearTituloFormGroup(t));
    const titulosArray = this.fb.array(titulos.length > 0 ? titulos : [this.crearTituloFormGroup()]);
    return this.fb.group({
      id: [grupo?.id || null],
      nombre: [grupo?.nombre || '', Validators.required],
      descripcion: [grupo?.descripcion || ''],
      operadorLogico: [grupo?.operadorLogico || 'OR'],
      obligatorio: [grupo?.obligatorio ?? true],
      orden: [grupo?.orden ?? 1],
      activo: [grupo?.activo ?? true],
      titulos: titulosArray
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CATÁLOGO DE TÍTULOS – modo multi-selección simplificado
  // ────────────────────────────────────────────────────────────────────────────

  /** Resuelve la categoría de formación a partir del nombre del requisito. */
  getCategoriaByRequisitoIndex(requisitoIndex: number): CategoriaFormacion | null {
    const nombre = this.requisitosFormArray.at(requisitoIndex)?.get('nombre')?.value as string;
    return this.CATEGORIA_POR_NOMBRE[nombre] ?? null;
  }

  /** Etiqueta descriptiva para mostrar en la UI (ej: "técnicos o tecnológicos"). */
  getLabelCategoria(requisitoIndex: number): string {
    const cat = this.getCategoriaByRequisitoIndex(requisitoIndex);
    return cat ? this.LABEL_CATEGORIA[cat] : '';
  }

  /** Placeholder del input de búsqueda según la categoría. */
  getPlaceholderBusqueda(requisitoIndex: number): string {
    const cat = this.getCategoriaByRequisitoIndex(requisitoIndex);
    return cat ? this.PLACEHOLDER_BUSQUEDA[cat] : 'Buscar título académico...';
  }

  /**
   * Busca títulos en el catálogo externo con debounce de 300 ms.
   * Guarda los resultados en {@code catalogoSugerencias[requisitoIndex]}.
   */
  buscarEnCatalogo(requisitoIndex: number): void {
    clearTimeout(this.searchTimers[requisitoIndex]);
    const query = this.catalogoQuery[requisitoIndex] ?? '';

    if (query.length < 2) {
      this.catalogoSugerencias[requisitoIndex] = [];
      this.catalogoMostrarDropdown[requisitoIndex] = false;
      return;
    }

    this.searchTimers[requisitoIndex] = setTimeout(() => {
      const categoria = this.getCategoriaByRequisitoIndex(requisitoIndex);
      this.catalogoLoading[requisitoIndex] = true;
      this.catalogoMostrarDropdown[requisitoIndex] = true;

      this.catalogoService.buscarTitulos(categoria, query, 0, 30).subscribe({
        next: (resp) => {
          this.catalogoSugerencias[requisitoIndex] = resp.content ?? [];
          this.catalogoLoading[requisitoIndex] = false;
          this.catalogoMostrarDropdown[requisitoIndex] = true;
        },
        error: () => {
          this.catalogoSugerencias[requisitoIndex] = [];
          this.catalogoLoading[requisitoIndex] = false;
        },
      });
    }, 300);
  }

  /** Oculta el dropdown con un pequeño retraso para que mousedown se ejecute antes. */
  ocultarDropdownConDelay(requisitoIndex: number): void {
    setTimeout(() => {
      this.catalogoMostrarDropdown[requisitoIndex] = false;
    }, 200);
  }

  /**
   * Agrega un título del catálogo a la sección académica (gruposAcademicos[0].titulos).
   * Rechaza duplicados. Si aún no hay ningún grupo, crea el grupo simplificado por defecto.
   */
  agregarTituloSeleccionado(requisitoIndex: number, tituloCatalogo: TituloCatalogoOption): void {
    const gruposArray = this.getGruposAcademicosArray(requisitoIndex);

    // Inicializar el grupo si no existe
    if (gruposArray.length === 0) {
      gruposArray.push(this.crearGrupoSimplificado(requisitoIndex));
    }

    const titulosArray = this.getTitulosArray(requisitoIndex, 0);

    // Eliminar el título vacío por defecto que se agrega al crear el grupo
    if (titulosArray.length === 1) {
      const primero = titulosArray.at(0);
      const esVacio = !primero.get('idTituloCatalogoExterno')?.value &&
                      !primero.get('tituloAcademico')?.value;
      if (esVacio) {
        titulosArray.removeAt(0);
      }
    }

    // Verificar duplicado por idTituloCatalogoExterno
    const yaDuplicado = titulosArray.controls.some(
      c => c.get('idTituloCatalogoExterno')?.value === tituloCatalogo.id
    );
    if (yaDuplicado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Ya seleccionado',
        detail: `"${tituloCatalogo.nombre}" ya fue agregado a esta sección.`,
        life: 3000,
      });
      this.limpiarBusqueda(requisitoIndex);
      return;
    }

    const nuevoTitulo = this.crearTituloFormGroupDesdeCatalogo(
      tituloCatalogo,
      titulosArray.length + 1
    );
    titulosArray.push(nuevoTitulo);
    this.limpiarBusqueda(requisitoIndex);
  }

  /** Quita un título de la lista de seleccionados. */
  quitarTituloSeleccionado(requisitoIndex: number, tituloIndex: number): void {
    const titulosArray = this.getTitulosArray(requisitoIndex, 0);
    titulosArray.removeAt(tituloIndex);
  }

  /**
   * Nivel de formación por defecto según la categoría del requisito.
   * Se usa cuando el usuario escribe un título manualmente (no del catálogo).
   */
  private nivelFormacionPorCategoria(requisitoIndex: number): string {
    const cat = this.getCategoriaByRequisitoIndex(requisitoIndex);
    switch (cat) {
      case 'TECNICA_TECNOLOGICA': return 'Técnico / Tecnólogo';
      case 'PREGRADO':            return 'Pregrado / Universitario';
      case 'POSGRADO':            return 'Posgrado';
      default:                    return 'Pregrado / Universitario';
    }
  }

  /**
   * Agrega el texto escrito en el buscador directamente como título manual
   * cuando no se encontraron resultados en el catálogo.
   */
  agregarTituloManual(requisitoIndex: number): void {
    const query = (this.catalogoQuery[requisitoIndex] ?? '').trim();
    if (!query) return;

    const gruposArray = this.getGruposAcademicosArray(requisitoIndex);
    if (gruposArray.length === 0) {
      gruposArray.push(this.crearGrupoSimplificado(requisitoIndex));
    }

    const titulosArray = this.getTitulosArray(requisitoIndex, 0);

    // Eliminar el título vacío por defecto si existe
    if (titulosArray.length === 1) {
      const primero = titulosArray.at(0);
      const esVacio = !primero.get('idTituloCatalogoExterno')?.value &&
                      !primero.get('tituloAcademico')?.value;
      if (esVacio) titulosArray.removeAt(0);
    }

    // Verificar duplicado por nombre
    const yaDuplicado = titulosArray.controls.some(
      c => (c.get('tituloAcademico')?.value ?? '').toLowerCase() === query.toLowerCase()
    );
    if (yaDuplicado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Ya existe',
        detail: `"${query}" ya fue agregado a esta sección.`,
        life: 3000,
      });
      this.limpiarBusqueda(requisitoIndex);
      return;
    }

    const tituloManual: TituloCatalogoOption = {
      id: '',
      nombre: query,
      nivelFormacion: this.nivelFormacionPorCategoria(requisitoIndex),
      fuenteCatalogo: 'MANUAL',
    };

    const nuevoTitulo = this.crearTituloFormGroupDesdeCatalogo(tituloManual, titulosArray.length + 1);
    // Clear the catalog id for manual entries
    nuevoTitulo.get('idTituloCatalogoExterno')?.setValue(null);
    nuevoTitulo.get('fuenteCatalogo')?.setValue('MANUAL');
    titulosArray.push(nuevoTitulo);
    this.limpiarBusqueda(requisitoIndex);

    this.messageService.add({
      severity: 'success',
      summary: 'Título agregado',
      detail: `"${query}" se agregó manualmente.`,
      life: 2500,
    });
  }

  /**
   * Devuelve solo los títulos activos del primer grupo para mostrar en la UI.
   * Filtra activo !== false para respetar soft-delete en edición.
   */
  getTitulosActivos(requisitoIndex: number): { control: AbstractControl; index: number }[] {
    const gruposArray = this.getGruposAcademicosArray(requisitoIndex);
    if (gruposArray.length === 0) return [];
    const titulosArray = this.getTitulosArray(requisitoIndex, 0);
    return titulosArray.controls
      .map((c, i) => ({ control: c, index: i }))
      .filter(item => item.control.get('activo')?.value !== false);
  }

  /** Indica si el requisito debe validarse (switch encendido y sin títulos). */
  debeValidarTitulos(requisitoIndex: number): boolean {
    return !!this.requisitosFormArray.at(requisitoIndex)?.get('usaEstructuraAcademica')?.value;
  }

  /**
   * Se llama al encender el toggle "Permitir varios títulos".
   * Crea un grupo simplificado por defecto si no hay ninguno.
   */
  onToggleEstructura(requisitoIndex: number, activo: boolean): void {
    if (!activo) return;
    const gruposArray = this.getGruposAcademicosArray(requisitoIndex);
    if (gruposArray.length === 0) {
      gruposArray.push(this.crearGrupoSimplificado(requisitoIndex));
    }
  }

  /** Crea el FormGroup del grupo interno simplificado (un solo grupo OR obligatorio). */
  private crearGrupoSimplificado(requisitoIndex: number): FormGroup {
    const nombre = this.requisitosFormArray.at(requisitoIndex)?.get('nombre')?.value ?? '';
    const descripciones: Record<string, string> = {
      'Formación técnica o tecnológica:': 'Títulos técnicos o tecnológicos aceptados',
      'Formación pregrado:': 'Títulos de pregrado aceptados',
      'Formación posgrado:': 'Títulos de posgrado aceptados',
    };
    const nombreGrupo = descripciones[nombre] ?? 'Títulos aceptados';
    return this.fb.group({
      id: [null],
      nombre: [nombreGrupo],
      descripcion: ['El aspirante cumple si tiene cualquiera de los títulos seleccionados.'],
      operadorLogico: ['OR'],
      obligatorio: [true],
      orden: [1],
      activo: [true],
      titulos: this.fb.array([]),
    });
  }

  /** Crea un FormGroup de título a partir de una opción del catálogo externo. */
  private crearTituloFormGroupDesdeCatalogo(
    titulo: TituloCatalogoOption,
    orden: number
  ): FormGroup {
    return this.fb.group({
      id: [null],
      idTituloCatalogoExterno: [titulo.id],
      codigoTituloExterno: [titulo.codigo ?? null],
      fuenteCatalogo: [titulo.fuenteCatalogo ?? 'CATALOGO_TITULOS'],
      metadataCatalogo: [titulo.metadata ?? null],
      nivelFormacion: [titulo.nivelFormacion],
      tituloAcademico: [titulo.nombre, Validators.required],
      areaConocimiento: [titulo.areaConocimiento ?? null],
      nucleoBasicoConocimiento: [titulo.nucleoBasicoConocimiento ?? null],
      campoAmplio: [titulo.campoAmplio ?? null],
      campoEspecifico: [titulo.campoEspecifico ?? null],
      campoDetallado: [null],
      permiteAreasAfines: [false],
      obligatorio: [false],
      puntajeBase: [null],
      orden: [orden],
      activo: [true],
    });
  }

  private limpiarBusqueda(requisitoIndex: number): void {
    this.catalogoQuery[requisitoIndex] = '';
    this.catalogoSugerencias[requisitoIndex] = [];
    this.catalogoMostrarDropdown[requisitoIndex] = false;
  }

  agregarGrupoAcademico(requisitoIndex: number): void {
    const gruposArray = this.getGruposAcademicosArray(requisitoIndex);
    const nuevoGrupo = this.crearGrupoAcademicoFormGroup();
    nuevoGrupo.get('orden')?.setValue(gruposArray.length + 1);
    gruposArray.push(nuevoGrupo);
  }

  eliminarGrupoAcademico(requisitoIndex: number, grupoIndex: number): void {
    const gruposArray = this.getGruposAcademicosArray(requisitoIndex);
    if (gruposArray.length > 1) {
      gruposArray.removeAt(grupoIndex);
    }
  }

  agregarTitulo(requisitoIndex: number, grupoIndex: number): void {
    const titulosArray = this.getTitulosArray(requisitoIndex, grupoIndex);
    const nuevoTitulo = this.crearTituloFormGroup();
    nuevoTitulo.get('orden')?.setValue(titulosArray.length + 1);
    titulosArray.push(nuevoTitulo);
  }

  eliminarTitulo(requisitoIndex: number, grupoIndex: number, tituloIndex: number): void {
    const titulosArray = this.getTitulosArray(requisitoIndex, grupoIndex);
    if (titulosArray.length > 1) {
      titulosArray.removeAt(tituloIndex);
    }
  }

  cargarTitulosAcademicos(): void {
    const url = `${environment.generalApi}/titulos/simple`;
    
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.titulosAcademicos = [
          { titulo: 'N/A', id: 'n-a', campoAmplio: '', campoEspecifico: '' },
          ...data
        ];
        
        this.titulosAcademicosParaMostrar = this.titulosAcademicos.slice(0, 11);
      },
      error: (err) => {
        this.titulosAcademicos = [
          { titulo: 'N/A', id: 'n-a', campoAmplio: '', campoEspecifico: '' }
        ];
        this.titulosAcademicosParaMostrar = [...this.titulosAcademicos];
        
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar todos los títulos académicos. Solo estará disponible la opción N/A.',
          life: 5000
        });
      }
    });
  }

  getTitulosParaMostrar(index: number): any[] {
    return this.titulosAcademicos;
  }

  cargarOfertas(): void {
    this.ofertaService.getAll().subscribe({
      next: (data: OfertaLaboral[]) => {
        this.convocatorias = data
          .filter(oferta => !oferta.eliminado) 
          .sort((a, b) => {
            const fechaA = new Date(a.fechaPublicacion).getTime();
            const fechaB = new Date(b.fechaPublicacion).getTime();
            return fechaB - fechaA; 
          });
        this.aplicarFiltros();
        this.actualizarPaginacion();
      },
      error: (err: any) => {
        this.convocatorias = [];
        this.convocatoriasFiltradas = [];
        this.paginatedOfertas = [];
      },
    });
  }

  showDialog() {
    this.limpiarFormularioCompleto();
    this.visible = true;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control?.invalid) {
        
      }
    });
    
    const requisitosArray = this.requisitosFormArray;
    
    requisitosArray.controls.forEach((grupo, index) => {
      if (grupo.invalid) {
        
        if (grupo instanceof FormGroup) {
          Object.keys(grupo.controls).forEach(fieldName => {
            const field = grupo.get(fieldName);
            if (field?.invalid) {
              
            }
          });
        }
      }
    });
    
    if (this.form.pending) {
      this.messageService.add({
        severity: 'info',
        summary: 'Validando',
        detail: 'Espere mientras se validan los datos...',
        life: 2000
      });
      return;
    }
    
    if (this.form.invalid) {
      this.scrollToFirstError();
      
      this.messageService.add({
        severity: 'error',
        summary: 'Formulario incompleto',
        detail: 'Por favor complete todos los campos requeridos.',
        life: 4000
      });
      
      return;
    }

    const periodoAnio = this.form.get('periodoAnio')?.value;
    const periodoParte = this.form.get('periodoParte')?.value;
    
    if (!periodoAnio || !periodoParte) {
      this.form.get('periodoAnio')?.markAsTouched();
      this.form.get('periodoParte')?.markAsTouched();
      this.scrollToFirstError();
      
      this.messageService.add({
        severity: 'error',
        summary: 'Campos requeridos',
        detail: 'Debe seleccionar tanto el año como el período.',
        life: 5000
      });
      
      return;
    }

    const formData = this.form.getRawValue();

    const ajustarFecha = (fecha: Date | null): Date | null => {
      if (!fecha) return null;
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0);
    };

    const periodo = `${formData.periodoParte} - ${formData.periodoAnio}`;
    const requisitos = (formData.requisitos || []).map((req: any) => {
      const categoriaFormacion: CategoriaFormacion | undefined =
        this.CATEGORIA_POR_NOMBRE[req.nombre];

      const base: any = {
        id: req.id,
        nombre: req.nombre,
        valor: req.valor,
        descripcion: req.titulo || req.descripcion || '',
        activo: req.activo,
        evaluarExperiencia: req.evaluarExperiencia || false,
        anosExperienciaMinimos: req.anosExperienciaMinimos || null,
        tipoRequisito: req.tipoRequisito || 'GENERAL',
        usaEstructuraAcademica: req.usaEstructuraAcademica || false,
        ...(categoriaFormacion ? { categoriaFormacion } : {}),
      };
      if (req.usaEstructuraAcademica && req.gruposAcademicos?.length > 0) {
        base.gruposAcademicos = req.gruposAcademicos;
      }
      return base;
    });

    const payload = {
      ...formData,
      periodo,
      fechaPublicacion: ajustarFecha(formData.fechaPublicacion),
      fechaCierre: ajustarFecha(formData.fechaCierre),
      requisitos
    };

  if (payload.id) {
      this.ofertaService.update(payload).subscribe({
        next: (resp: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Oferta laboral actualizada correctamente',
            life: 3000
          });
          this.cargarOfertas();
          this.cargarEstadisticas();
          
          this.limpiarFormularioCompleto();
          this.visible = false;
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al actualizar la oferta laboral',
            life: 5000
          });
        },
      });
  } else {
      this.ofertaService.create(payload).subscribe({
        next: (resp: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Oferta laboral creada correctamente',
            life: 3000
          });
          this.cargarOfertas();
          this.cargarEstadisticas();
          
          this.enviarNotificacionNuevaOferta(resp);
          
          this.limpiarFormularioCompleto();
          this.visible = false;
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al crear la oferta laboral',
            life: 5000
          });
        },
      });
    }
  }

  onCancel(): void {
    this.form.reset();
    this.form.patchValue({
      activo: true,
      permitirAreasAfines: false,
      periodoParte: undefined,
      periodoAnio: undefined,
      fechaCierre: null,
      fechaPublicacion: null
    });
    
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control) {
        control.setErrors(null);
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
    
    this.resetRequisitosFormArray();
    this.visible = false;
  }

  onDialogHide(): void {
    this.form.reset();
    this.form.patchValue({
      activo: true,
      permitirAreasAfines: false,
      periodoParte: undefined,
      periodoAnio: undefined,
      fechaCierre: null,
      fechaPublicacion: null
    });
    
    this.form.markAsUntouched();
    this.form.markAsPristine();
    
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control) {
        control.setErrors(null);
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
    
    this.resetRequisitosFormArray();
  }

  private resetRequisitosFormArray(initialRequisitos?: any[]): void {
    const requisitosArray = this.requisitosFormArray;
    requisitosArray.clear();

    const requisitosParaProcesar = initialRequisitos && initialRequisitos.length > 0 
      ? initialRequisitos.map(req => ({
          id: req.id || null,
          nombre: req.nombre || '',
          valor: Number(req.valor) || 0,
          descripcion: req.descripcion || '',
          evaluarExperiencia: req.evaluarExperiencia || false,
          anosExperienciaMinimos: req.anosExperienciaMinimos || null,
          tipoRequisito: req.tipoRequisito || 'GENERAL',
          usaEstructuraAcademica: req.usaEstructuraAcademica || false,
          gruposAcademicos: req.gruposAcademicos || []
        }))
      : this.requisitosBase.map(nombre => ({
          id: null,
          nombre,
          valor: 0,
          descripcion: '',
          evaluarExperiencia: nombre === 'Experiencia laboral:',
          anosExperienciaMinimos: null,
          tipoRequisito: this.requisitosConTitulo.includes(nombre) ? 'ACADEMICO' : (nombre === 'Experiencia laboral:' ? 'EXPERIENCIA' : 'GENERAL'),
          usaEstructuraAcademica: false,
          gruposAcademicos: []
        }));

    requisitosParaProcesar.forEach((req) => {
      const necesitaTitulo = this.requisitosConTitulo.includes(req.nombre);
      const esExperiencia = req.nombre === 'Experiencia laboral:';
      
      const formGroup = this.fb.group({
        id: [req.id],
        nombre: [req.nombre, Validators.required],
        valor: [req.valor, [Validators.required, Validators.min(0), Validators.max(10), OfertasLaboralesComponent.valorNumericoValidator]],
        evaluarExperiencia: [req.evaluarExperiencia ?? esExperiencia],
        anosExperienciaMinimos: [
          req.anosExperienciaMinimos || null,
          esExperiencia ? [Validators.min(0), Validators.max(50)] : []
        ],
        tipoRequisito: [req.tipoRequisito || (necesitaTitulo ? 'ACADEMICO' : esExperiencia ? 'EXPERIENCIA' : 'GENERAL')],
        usaEstructuraAcademica: [req.usaEstructuraAcademica || false],
        gruposAcademicos: this.fb.array(
          (req.gruposAcademicos || []).map((g: any) => this.crearGrupoAcademicoFormGroup(g))
        ),
        ...(necesitaTitulo 
          ? {
              titulo: [req.descripcion, []],
              descripcion: ['', [Validators.maxLength(2000)]]
            }
          : {
              descripcion: [req.descripcion, esExperiencia ? [Validators.maxLength(2000)] : [Validators.required, Validators.maxLength(2000)]],
              titulo: ['']
            }
        )
      });
      
      requisitosArray.push(formGroup);
    });
  }

  getAllOfertas(): void {
    this.ofertaService.getAll().subscribe({
      next: (ofertas: OfertaLaboral[]) => {
        this.convocatorias = ofertas.filter(oferta => !oferta.eliminado);
        this.aplicarFiltros();
      },
      error: (err: any) => {
      },
    });
  }

  aplicarFiltros(): void {
    let ofertasFiltradas = [...this.convocatorias];

    // Filtrar convocatorias internas para usuarios que no son empleados de la universidad
    if (!this.havePermission && !this.esEmpleado) {
      ofertasFiltradas = ofertasFiltradas.filter(oferta =>
        !oferta.tipoConvocatoria?.toLowerCase().includes('interna')
      );
    }

    if (this.filtroTexto.trim()) {
      const texto = this.filtroTexto.toLowerCase().trim();
      ofertasFiltradas = ofertasFiltradas.filter(oferta =>
        oferta.cargoRequerido?.toLowerCase().includes(texto) ||
        oferta.departamentoSolicitante?.toLowerCase().includes(texto) ||
        oferta.numeroConvocatoria?.toLowerCase().includes(texto) ||
        oferta.tipoConvocatoria?.toLowerCase().includes(texto) ||
        oferta.funciones?.toLowerCase().includes(texto)
      );
    }

    if (this.filtroEstado !== 'todas') {
      if (this.filtroEstado === 'activas') {
        // Una oferta es "activa" si activo=true Y su fecha de cierre no ha pasado completamente.
        // La fecha de cierre es inclusiva: todo el día del cierre se considera vigente.
        ofertasFiltradas = ofertasFiltradas.filter(oferta =>
          oferta.activo && !this.isVencidaPorFecha(oferta.fechaCierre)
        );
      } else {
        // Una oferta es "inactiva" si activo=false O su fecha de cierre ya pasó
        ofertasFiltradas = ofertasFiltradas.filter(oferta =>
          !oferta.activo || this.isVencidaPorFecha(oferta.fechaCierre)
        );
      }
    }

    this.convocatoriasFiltradas = ofertasFiltradas;
    this.currentPage = 1; 
    this.actualizarPaginacion();
  }

  onFiltroTextoChange(): void {
    this.aplicarFiltros();
  }

  onFiltroEstadoChange(): void {
    this.aplicarFiltros();
  }
  
  onEdit(oferta: OfertaLaboral): void {
    this.limpiarFormularioCompleto();

    this.resetRequisitosFormArray(oferta.requisitos || []);

    const [periodoParte = '', periodoAnio = null] = oferta.periodo?.split(' - ') || [];

    const parseFechaLocal = (fechaStr: string | null): Date | null => {
      if (!fechaStr) return null;
      const d = new Date(fechaStr);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
    };

    this.form.patchValue({
      ...oferta,
      periodoParte,
      periodoAnio: periodoAnio ? parseInt(periodoAnio) : null,
      fechaCierre: parseFechaLocal(oferta.fechaCierre as any),
      fechaPublicacion: parseFechaLocal(oferta.fechaPublicacion as any)
    });

    this.visible = true;
  }

  private limpiarFormularioCompleto(): void {
    this.form.reset();
    this.form.patchValue({
      activo: true,
      permitirAreasAfines: false,
      periodoParte: undefined,
      periodoAnio: undefined,
      fechaCierre: null,
      fechaPublicacion: null,
      numeroConvocatoria: '',
      tipoConvocatoria: '',
      departamentoSolicitante: '',
      cargoRequerido: '',
      funciones: '',
      experiencia: '',
      cargosDisponibles: '',
      dedicacion: '',
      tipoContrato: ''
    });
    
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control) {
        control.setErrors(null);
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
    
    this.resetRequisitosFormArray();
  }

  // Funcion para descargar la plantilla de la convocatoria
  onDownloadTemplate(oferta: OfertaLaboral): void {
    if (!oferta) {
      return;
    }
    this.generarWordOferta(oferta);
  }

  private async generarWordOferta(oferta: OfertaLaboral): Promise<void> {
    const FONT = 'Arial';
    const SIZE_NORMAL = 18;   // 9pt
    const SIZE_SMALL  = 16;   // 8pt
    const SIZE_TITLE  = 20;   // 10pt
    const COLOR_BLUE  = '1F3864';
    const COLOR_BLACK = '000000';
    const BORDER_STD  = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
    const NO_BORDER   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' };

    // Carga del logo (resuelve la URL relativa al baseHref para funcionar en dev y prod)
    let logoBuffer: ArrayBuffer | null = null;
    try {
      const logoUrl = new URL('assets/images/Escudo_Unimar.png', document.baseURI).href;
      logoBuffer = await this.http
        .get(logoUrl, { responseType: 'arraybuffer' })
        .toPromise() ?? null;
    } catch { /* continúa sin logo */ }

    // Helpers
    const cell = (
      children: Paragraph[],
      opts: {
        columnSpan?: number;
        rowSpan?: number;
        shade?: string;
        bold?: boolean;
        vertAlign?: string;
        width?: number;
      } = {}
    ): TableCell =>
      new TableCell({
        children,
        columnSpan: opts.columnSpan,
        rowSpan:    opts.rowSpan,
        verticalAlign: (opts.vertAlign ?? VerticalAlignTable.CENTER) as any,
        width: opts.width != null
          ? { size: opts.width, type: WidthType.PERCENTAGE }
          : undefined,
        shading: opts.shade
          ? { type: ShadingType.SOLID, fill: opts.shade, color: opts.shade }
          : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        borders: {
          top:    BORDER_STD,
          bottom: BORDER_STD,
          left:   BORDER_STD,
          right:  BORDER_STD,
        },
      });

    const par = (
      runs: TextRun[],
      align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
      spacing?: { before?: number; after?: number }
    ): Paragraph =>
      new Paragraph({ children: runs, alignment: align, spacing });

    const run = (
      text: string,
      opts: { bold?: boolean; size?: number; color?: string; underline?: boolean } = {}
    ): TextRun =>
      new TextRun({
        text,
        bold:      opts.bold  ?? false,
        size:      opts.size  ?? SIZE_NORMAL,
        font:      FONT,
        color:     opts.color ?? COLOR_BLACK,
        underline: opts.underline ? {} : undefined,
      });

    const normalizeDateForTemplate = (d: string | Date | null | undefined): Date | null => {
      if (!d) return null;
      // If it's already a Date object, keep its local date part
      if (d instanceof Date) {
        const date = d;
        if (isNaN(date.getTime())) return null;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      }

      // If it's a string (likely ISO with Z), parse and use UTC components
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return null;
      return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0);
    };

    const fmtShort = (d: string | Date | null | undefined): string => {
      const nd = normalizeDateForTemplate(d);
      return nd ? nd.toLocaleDateString('es-CO') : '';
    };

    const fmtLong = (d: string | Date | null | undefined): string => {
      const nd = normalizeDateForTemplate(d);
      return nd ? nd.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    };

    // ─── TABLA DE ENCABEZADO ──────────────────────────────────────────────────
    const logoCell = logoBuffer
      ? cell([
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: { width: 180, height: 90 },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ], { rowSpan: 4, vertAlign: VerticalAlignTable.CENTER, width: 30 })
      : cell([par([run('', { size: SIZE_SMALL })])], { rowSpan: 4, width: 30 });

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          logoCell,
          cell([par([run('UNIVERSIDAD MARIANA', { bold: true, size: SIZE_TITLE })])], { columnSpan: 2, width: 70 }),
        ]}),
        new TableRow({ children: [
          cell([par([run('FORMATO', { bold: true, size: SIZE_SMALL })])], { width: 43 }),
          cell([par([run('Código: UMGHF03', { size: SIZE_SMALL })])], { width: 27 }),
        ]}),
        new TableRow({ children: [
          cell([par([run('OFERTA LABORAL', { bold: true, size: SIZE_SMALL })])], { width: 43 }),
          cell([par([run('Versión: 001', { size: SIZE_SMALL })])], { width: 27 }),
        ]}),
        new TableRow({ children: [
          cell([par([run('GESTIÓN DEL TALENTO HUMANO', { bold: true, size: SIZE_SMALL })])], { width: 43 }),
          cell([par([run(`Vigente a partir de: ${oferta.fechaPublicacion ? fmtShort(oferta.fechaPublicacion) : fmtShort(new Date())}`, { size: SIZE_SMALL })])], { width: 27 }),
        ]}),
      ],
      borders: {
        top:             BORDER_STD,
        bottom:          BORDER_STD,
        left:            BORDER_STD,
        right:           BORDER_STD,
        insideHorizontal: BORDER_STD,
        insideVertical:  BORDER_STD,
      },
    });

    // ─── TIPO CONVOCATORIA ────────────────────────────────────────────────────
    const esExterna = (oferta.tipoConvocatoria ?? '').toLowerCase().includes('externa');
    const esInterna = !esExterna;

    const tipoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          cell([par([run(`N° ${oferta.numeroConvocatoria}`, { bold: true, size: SIZE_NORMAL })])], { width: 40 }),
          cell([par([
            run('INTERNA  ', { bold: true, size: SIZE_NORMAL }),
            run(esInterna ? 'X' : '  ', { bold: true, size: SIZE_NORMAL }),
          ], AlignmentType.CENTER)], { width: 30 }),
          cell([par([
            run('EXTERNA  ', { bold: true, size: SIZE_NORMAL }),
            run(esExterna ? 'X' : '  ', { bold: true, size: SIZE_NORMAL }),
          ], AlignmentType.CENTER)], { width: 30 }),
        ]}),
      ],
      borders: {
        top:             BORDER_STD,
        bottom:          BORDER_STD,
        left:            BORDER_STD,
        right:           BORDER_STD,
        insideHorizontal: BORDER_STD,
        insideVertical:  BORDER_STD,
      },
    });

    // ─── FORMACIÓN ACADÉMICA (de requisitos) ──────────────────────────────────
    const requisitos = oferta.requisitos ?? [];
    const formacionNombres = [
      'Formación técnica o tecnológica:',
      'Formación pregrado:',
      'Formación posgrado:',
      'Manejo segundo idioma:',
      'Cualificación:',
      'Manejo de TICS:',
      'Competencias:',
    ];

    const formacionParrafos: Paragraph[] = [];
    formacionNombres.forEach(nombre => {
      const req = requisitos.find(r => r.nombre === nombre);
      if (req?.descripcion) {
        const descripcion = req.descripcion as string;
        const lines = descripcion
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);

        if (lines.length <= 1) {
          formacionParrafos.push(par([
            run(`${nombre} `, { bold: true, size: SIZE_SMALL }),
            run(descripcion, { size: SIZE_SMALL }),
          ]));
        } else {
          // Label on its own line, then each item as a separate paragraph
          formacionParrafos.push(par([
            run(`${nombre}`, { bold: true, size: SIZE_SMALL }),
          ]));
          lines.forEach(line => {
            formacionParrafos.push(par([
              run(line, { size: SIZE_SMALL }),
            ]));
          });
        }
      }
    });

    // ─── TABLA PRINCIPAL DE REQUISITOS ───────────────────────────────────────
    const mainTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Cabecera
        new TableRow({ children: [
          cell([par([run('Cargo\nrequerido', { bold: true, size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 15 }),
          cell([par([run('Funciones Claves\ndel Cargo', { bold: true, size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 22 }),
          cell([
            par([run('Formación Académica', { bold: true, size: SIZE_SMALL })], AlignmentType.CENTER),
            par([run('Títulos obtenidos en el exterior deben estar convalidados por el MEN',
               { size: SIZE_SMALL - 2 })], AlignmentType.CENTER),
          ], { width: 38 }),
          cell([par([run('Experiencia', { bold: true, size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 25 }),
        ]}),
        // Contenido
        new TableRow({ children: [
          cell([par([run(oferta.cargoRequerido || '', { size: SIZE_SMALL })])], { width: 15, vertAlign: VerticalAlignTable.TOP }),
          cell([par([run(oferta.funciones || '', { size: SIZE_SMALL })])], { width: 22, vertAlign: VerticalAlignTable.TOP }),
          cell(formacionParrafos.length > 0 ? formacionParrafos :
               [par([run('', { size: SIZE_SMALL })])], { width: 38, vertAlign: VerticalAlignTable.TOP }),
          cell([par([run(oferta.experiencia || '', { size: SIZE_SMALL })])], { width: 25, vertAlign: VerticalAlignTable.TOP }),
        ]}),
      ],
      borders: {
        top:             BORDER_STD,
        bottom:          BORDER_STD,
        left:            BORDER_STD,
        right:           BORDER_STD,
        insideHorizontal: BORDER_STD,
        insideVertical:  BORDER_STD,
      },
    });

    // ─── TABLA INFERIOR (cargos / contrato / duración) ───────────────────────
    const bottomTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          cell([par([run('No. de cargos a vincular', { bold: true, size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 33 }),
          cell([par([run('Tipo de contrato', { bold: true, size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 34 }),
          cell([par([run('Duración', { bold: true, size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 33 }),
        ]}),
        new TableRow({ children: [
          cell([par([run(oferta.cargosDisponibles?.toString() || '1', { size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 33 }),
          cell([par([run(oferta.tipoContrato || '', { size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 34 }),
          cell([par([run(oferta.dedicacion || '', { size: SIZE_SMALL })], AlignmentType.CENTER)], { width: 33 }),
        ]}),
      ],
      borders: {
        top:             BORDER_STD,
        bottom:          BORDER_STD,
        left:            BORDER_STD,
        right:           BORDER_STD,
        insideHorizontal: BORDER_STD,
        insideVertical:  BORDER_STD,
      },
    });

    // ─── FECHAS (formatos locales disponibles arriba) ──────────────────────────

    // ─── DOCUMENTO ───────────────────────────────────────────────────────────
    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        headers: {
          default: new Header({ children: [
            headerTable,
            // Espacio extra bajo el header para separar visualmente del cuerpo
            par([run('', { size: SIZE_SMALL })], AlignmentType.LEFT, { before: 0, after: 240 }),
          ] }),
        },
        children: [
          // Tipo convocatoria
          tipoTable,
          // Programa
          par([run(oferta.departamentoSolicitante || '', { bold: true, size: SIZE_TITLE })],
              AlignmentType.CENTER, { before: 180, after: 60 }),
          // Periodo
          par([run(`PERIODO: ${oferta.periodo || ''}`, { bold: true, size: SIZE_TITLE })],
              AlignmentType.CENTER, { before: 60, after: 120 }),
          // Título sección
          par([run('Información para selección y vinculación', { bold: true, size: SIZE_NORMAL })],
              AlignmentType.CENTER, { before: 60, after: 120 }),
          // Tabla principal
          mainTable,
          // Tabla inferior
          bottomTable,

          // ─── AVISO INFORMATIVO ────────────────────────────────────────────
          par([
            run('Por favor, lea detenidamente la siguiente información:', { bold: true, size: SIZE_SMALL, color: 'C0392B' }),
          ], AlignmentType.CENTER, { before: 240 }),

          par([
            run('Las personas interesadas en postularse a la convocatoria deberán ingresar su hoja de vida en el siguiente enlace: ', { size: SIZE_SMALL }),
            run('https://apps.umariana.edu.co/hojas_de_vida/', { size: SIZE_SMALL, underline: true }),
            run(' Este enlace estará habilitado desde el ', { size: SIZE_SMALL }),
            run(fmtLong(oferta.fechaPublicacion), { bold: true, size: SIZE_SMALL }),
            run(' hasta el ', { size: SIZE_SMALL }),
            run(fmtLong(oferta.fechaCierre), { bold: true, size: SIZE_SMALL }),
            run(', fechas en las cuales podrá postular su hoja de vida.', { size: SIZE_SMALL }),
          ], AlignmentType.JUSTIFIED, { before: 100 }),

          par([
            run('La Universidad Mariana se comunicará con los/las candidatos/as a través del correo electrónico proporcionado en su hoja de vida. ', { size: SIZE_SMALL }),
            run('Es fundamental que verifique regularmente su bandeja de entrada y la carpeta de spam,', { bold: true, size: SIZE_SMALL }),
            run(' y que siga las instrucciones enviadas. La Universidad no se responsabiliza por los resultados de aquellas personas que omitan esta orientación o no se presenten al proceso de selección.', { size: SIZE_SMALL }),
          ], AlignmentType.JUSTIFIED, { before: 80 }),

          par([
            run('Si ya tiene creada una cuenta, ingrese los datos solicitados. Si olvidó su usuario o contraseña, puede comunicarse al PBX: (602) 7244460, Ext. 135 para restablecimiento de usuario de acceso.', { size: SIZE_SMALL }),
          ], AlignmentType.JUSTIFIED, { before: 80 }),

          par([
            run('Si tiene alguna duda respecto a la postulación de su hoja de vida y es la primera vez que accede a la plataforma de la Universidad Mariana para tal fin, por favor comuníquese al PBX: (602) 7244460, Ext. 267 para verificar su correcta postulación.', { size: SIZE_SMALL }),
          ], AlignmentType.JUSTIFIED, { before: 80 }),

          par([
            run('La Universidad Mariana ', { size: SIZE_SMALL }),
            run('no tiene la obligación de contratar ni de publicar resultados,', { bold: true, size: SIZE_SMALL }),
            run(' teniendo en cuenta que el objetivo de la presente invitación es la recepción de hojas de vida para una posible contratación.', { size: SIZE_SMALL }),
          ], AlignmentType.JUSTIFIED, { before: 80 }),
        ],
      }],
    });

    try {
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Oferta_Laboral_${oferta.numeroConvocatoria}.docx`);
    } catch (err) {
      console.error('[onDownloadTemplate] Error al generar Word:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error al generar',
        detail: 'No se pudo generar el documento Word. Intente nuevamente.',
        life: 5000,
      });
    }
  }

  onDelete(oferta: OfertaLaboral): void {
    if (!oferta.id) {
      return;
    }

    this.ofertaService.verificarPostulaciones(oferta.id).subscribe({
      next: (resultado) => {
        if (resultado.tienePostulaciones) {
          this.showCustomDeleteDialog(oferta, resultado.cantidadPostulaciones, 'postulaciones');
        } else {
          this.showCustomDeleteDialog(oferta);
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error de verificación',
          detail: 'No fue posible verificar si la oferta tiene postulaciones. Intente nuevamente más tarde o revise los logs del servidor.',
          life: 7000
        });
      }
    });
  }

  private showCustomDeleteDialog(oferta: OfertaLaboral, associatedCount: number = 0, associatedType: string = ''): void {
    this.deleteItemToDelete = oferta;
    this.deleteItemType = 'la oferta laboral';
    this.deleteItemName = oferta.cargoRequerido;
    this.deleteAssociatedCount = associatedCount;
    this.deleteAssociatedType = associatedType;
    this.deleteCountdown = 30;
    this.deleteCountdownActive = true;
    this.showDeleteDialog = true;

    this.startDeleteCountdown();
  }

  private startDeleteCountdown(): void {
    this.deleteCountdownInterval = setInterval(() => {
      this.deleteCountdown--;
      if (this.deleteCountdown <= 0) {
        this.stopDeleteCountdown();
        this.deleteCountdownActive = false;
      }
    }, 1000);
  }

  private stopDeleteCountdown(): void {
    if (this.deleteCountdownInterval) {
      clearInterval(this.deleteCountdownInterval);
      this.deleteCountdownInterval = null;
    }
  }

  onCancelDelete(): void {
    this.stopDeleteCountdown();
    this.showDeleteDialog = false;
    this.deleteItemToDelete = null;
    this.deleteCountdown = 30;
    this.deleteCountdownActive = false;
  }

  onConfirmDelete(): void {
    if (!this.deleteItemToDelete) return;

    this.stopDeleteCountdown();
    this.showDeleteDialog = false;

    if (this.deleteAssociatedCount > 0) {
      this.softDeleteOferta(this.deleteItemToDelete);
    } else {
      this.eliminarOferta(this.deleteItemToDelete);
    }

    this.deleteItemToDelete = null;
  }

  private eliminarOferta(oferta: OfertaLaboral): void {
    this.ofertaService.delete(oferta.id!).subscribe({
      next: () => {
        this.convocatorias = this.convocatorias.filter((c) => c.id !== oferta.id);
        this.convocatoriasFiltradas = this.convocatoriasFiltradas.filter((c) => c.id !== oferta.id);

        this.cargarEstadisticas();
        this.aplicarFiltros();

        if (this.detalleVisible && this.ofertaSeleccionada?.id === oferta.id) {
          this.detalleVisible = false;
          this.ofertaSeleccionada = null;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'La oferta laboral se eliminó correctamente.',
          life: 3000
        });
      },
      error: (err: any) => {
        const serverMessage = err?.error?.message || err?.message || `Código ${err?.status} ${err?.statusText}`;
        this.messageService.add({
          severity: 'error',
          summary: 'Error al eliminar',
          detail: serverMessage,
          life: 8000
        });
      },
    });
  }

  private softDeleteOferta(oferta: OfertaLaboral): void {
    this.ofertaService.softDelete(oferta.id!).subscribe({
      next: () => {
        this.convocatorias = this.convocatorias.filter((c) => c.id !== oferta.id);
        this.convocatoriasFiltradas = this.convocatoriasFiltradas.filter((c) => c.id !== oferta.id);

        this.cargarEstadisticas();
        this.aplicarFiltros();

        if (this.detalleVisible && this.ofertaSeleccionada?.id === oferta.id) {
          this.detalleVisible = false;
          this.ofertaSeleccionada = null;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Soft-Delete Realizado',
          detail: 'La oferta laboral ha sido marcada como eliminada. Puede ser restaurada desde la sección de convocatorias eliminadas.',
          life: 5000
        });
      },
      error: (err: any) => {
        const serverMessage = err?.error?.message || err?.message || `Código ${err?.status} ${err?.statusText}`;
        this.messageService.add({
          severity: 'error',
          summary: 'Error en soft-delete',
          detail: serverMessage,
          life: 8000
        });
      },
    });
  }

 

  //Función para cambiar el estado activo/inactivo de una oferta laboral
  cambiarEstado(oferta: any) {
    const nuevoEstado = oferta.activo;
    oferta.activo = nuevoEstado;

    this.ofertaService.cambiarEstado(oferta.id, nuevoEstado).subscribe({
      next: (res: { activo: any; }) => {
        oferta.activo = res.activo;
        this.cargarEstadisticas();
        this.cargarOfertas(); 
        this.aplicarFiltros();
      },
      error: (err: any) => {
        oferta.activo = !nuevoEstado;
        this.aplicarFiltros();
      },
    });
  }

  cargarEstadisticas(): void {
    this.ofertaService.getAll().subscribe({
      next: (data: OfertaLaboral[]) => {
        const ofertasNoEliminadas = data.filter(oferta => !oferta.eliminado);
        this.totalOfertas = ofertasNoEliminadas.length;
      },
      error: (err: any) => {},
    });

    this.ofertaService.getActivas().subscribe({
      next: (data: OfertaLaboral[]) => {
        const ofertasNoEliminadas = data.filter(oferta => !oferta.eliminado);
        this.activas = ofertasNoEliminadas.length;
      },
      error: (err: any) => {},
    });

    this.ofertaService.getInactivas().subscribe({
      next: (data: OfertaLaboral[]) => {
        const ofertasNoEliminadas = data.filter(oferta => !oferta.eliminado);
        this.inactivas = ofertasNoEliminadas.length;
      },
      error: (err: any) => {},
    });
  }

  detalleVisible: boolean = false;
  ofertaSeleccionada!: OfertaLaboral | null;

  showDeleteDialog: boolean = false;
  deleteItemType: string = '';
  deleteItemName: string = '';
  deleteAssociatedCount: number = 0;
  deleteAssociatedType: string = '';
  deleteCountdown: number = 30;
  deleteCountdownActive: boolean = false;
  deleteItemToDelete: OfertaLaboral | null = null;
  private deleteCountdownInterval: any;

  verDetalles(oferta: OfertaLaboral): void {
    this.ofertaSeleccionada = oferta;
    this.detalleVisible = true;
  }

  static fechaNoAnteriorHoyValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const fecha = value instanceof Date ? value : new Date(value);
    if (isNaN(fecha.getTime())) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // Normalizar usando componentes UTC para evitar desfases con strings ISO "Z".
    // El día de cierre es inclusivo: una fecha igual a hoy se considera válida.
    const fechaNorm = new Date(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
    if (fechaNorm < hoy) {
      return { 'fechaPasada': true };
    }
    return null;
  }

  static numeroConvocatoriaValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const hasNumber = /\d/.test(value);
    if (!hasNumber) {
      return { 'formatoInvalido': 'Debe contener al menos un número' };
    }
    
    return null;
  }

  static cargosDisponiblesValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      return { 'soloNumeros': 'Solo se permiten números' };
    }
    
    return null;
  }

  static valorNumericoValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return { 'soloNumeros': 'Solo se permiten números' };
    }
    
    if (numValue !== Math.floor(numValue)) {
      return { 'soloEnteros': 'Solo se permiten números enteros' };
    }
    
    if (numValue < 0 || numValue > 10) {
      return { 'rangoInvalido': 'El valor debe estar entre 0 y 10' };
    }
    
    return null;
  }

  numeroConvocatoriaAsyncValidator: AsyncValidatorFn = (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || control.value.trim() === '') {
      return of(null);
    }
    
    const numeroConvocatoria = control.value.trim();
    const idActual = this.form?.get('id')?.value;
    
    return timer(500).pipe(
      switchMap(() => this.ofertaService.verificarNumeroConvocatoria(numeroConvocatoria, idActual)),
      map(response => {
        if (response.existe) {
          return { 'numeroConvocatoriaDuplicado': 'Este número de convocatoria ya existe' };
        }
        return null;
      }),
      catchError(() => of(null)),
      first()
    );
  }

  onPdfFileSelected(file: File) {
  }

  irAPostulacion(oferta: OfertaLaboral): void {
    if (!oferta.activo) {
      alert('Esta convocatoria no está activa para postulaciones');
      return;
    }
    
    this.detalleVisible = false;
    
    this.router.navigate(['/app/postulacion', oferta.id]);
  }

  truncarTexto(texto: string, limite: number = 150): string {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite).trim() + '...';
  }

  /**
   * Retorna true si la fecha de cierre ya pasó completamente (superó la medianoche del día de cierre).
   * Si fechaCierre = hoy, retorna false — la oferta sigue vigente durante todo el día.
   * Usa componentes UTC para evitar desfases con cadenas ISO con zona "Z".
   */
  isVencidaPorFecha(fechaCierre: string | Date | null | undefined): boolean {
    if (!fechaCierre) return false;
    const parsed = new Date(fechaCierre as string);
    if (isNaN(parsed.getTime())) return false;
    const finDelDiaDeCierre = new Date(
      parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999
    );
    return finDelDiaDeCierre < new Date();
  }

  irAVistaUsuarios(): void {
    this.router.navigate(['/app/ofertas-laborales']);
  }

  irARankingOfertas(): void {
    this.router.navigate(['/app/ranking-ofertas']);
  }

  irASeleccionadosFase2(): void {
    this.router.navigate(['/app/seleccionados-fase2-general']);
  }

  irAConvocatoriasCerradas(): void {
    this.router.navigate(['/app/gestion-convocatorias-cerradas']);
  }

  irARankingPostulaciones(oferta: OfertaLaboral): void {
    this.router.navigate(['/app/ranking-postulaciones', oferta.id], {
      state: { oferta }
    });
  }

  esRequisitoConTitulo(nombreRequisito: string): boolean {
    return this.requisitosConTitulo.includes(nombreRequisito);
  }

  private enviarNotificacionNuevaOferta(oferta: OfertaLaboral): void {
    const fechaCierre = oferta.fechaCierre 
      ? new Date(oferta.fechaCierre)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 

    const esConvocatoriaInterna = oferta.tipoConvocatoria?.toLowerCase().includes('interna') || false;

    // Paso 1: Obtener todas las personas registradas en hojas_de_vida con notificaciones activadas
    this.personasService.obtenerPersonas().subscribe({
      next: (personas) => {
        const personasConNotificaciones = personas.filter(p => p.notificacionesConvocatoriasEmail === true);

        if (esConvocatoriaInterna) {
          // INTERNAS: Cruzar con oracle para verificar que sean empleados
          this.http.get<any[]>(`${environment.apiOracle}/usuarios/sin-estudiantes`).subscribe({
            next: (empleados) => {
              // Crear set de identificaciones de empleados oracle
              const identificacionesEmpleados = new Set(
                empleados.map((e: any) => e.identificacion?.toString()).filter(Boolean)
              );

              // Filtrar: personas de hojas_de_vida que son empleados oracle y tienen notificaciones activas
              const personasEmpleadas = personasConNotificaciones.filter(p =>
                p.identificacion && identificacionesEmpleados.has(p.identificacion.toString())
              );

              // Notificaciones MongoDB: usar correo personal de hojas_de_vida
              const emailsNotificacion = personasEmpleadas
                .map(p => p.correo)
                .filter((email): email is string => !!email && email.trim() !== '')
                .filter((email, index, self) => self.indexOf(email) === index);

              let enviadas = 0;
              for (const email of emailsNotificacion) {
                this.hojaVidaNotificacionesService.notificarNuevaConvocatoria(
                  oferta.id || '',
                  oferta.numeroConvocatoria,
                  oferta.cargoRequerido,
                  fechaCierre,
                  email
                ).subscribe({
                  next: () => { enviadas++; },
                  error: () => {}
                });
              }

              this.messageService.add({
                severity: 'success',
                summary: 'Notificación Enviada',
                detail: `Notificación enviada a ${emailsNotificacion.length} empleados registrados`,
                life: 3000
              });

              // Emails SMTP: enviar al correoInstitucional registrado en hojas_de_vida
              const emailsSmtp = personasEmpleadas
                .map(p => p.correoInstitucional)
                .filter((email): email is string => !!email && email.trim() !== '' && email.includes('@'))
                .filter((email, index, self) => self.indexOf(email) === index);

              this.enviarEmailsADestinatarios(emailsSmtp, oferta);
            },
            error: () => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'No se pudo verificar empleados en oracle para las notificaciones',
                life: 4000
              });
            }
          });
        } else {
          // EXTERNAS o AMBAS: Enviar a todos los usuarios de hojas_de_vida con notificaciones activas

          // Notificaciones MongoDB: usar correo personal de hojas_de_vida
          const emailsNotificacion = personasConNotificaciones
            .map(p => p.correo)
            .filter((email): email is string => !!email && email.trim() !== '')
            .filter((email, index, self) => self.indexOf(email) === index);

          for (const email of emailsNotificacion) {
            this.hojaVidaNotificacionesService.notificarNuevaConvocatoria(
              oferta.id || '',
              oferta.numeroConvocatoria,
              oferta.cargoRequerido,
              fechaCierre,
              email
            ).subscribe({
              next: () => {},
              error: () => {}
            });
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Notificación Enviada',
            detail: `Notificación enviada a ${emailsNotificacion.length} usuarios registrados`,
            life: 3000
          });

          // Emails SMTP: enviar al correo personal de hojas_de_vida
          const emailsSmtp = personasConNotificaciones
            .map(p => p.correo)
            .filter((email): email is string => !!email && email.trim() !== '')
            .filter((email, index, self) => self.indexOf(email) === index);

          this.enviarEmailsADestinatarios(emailsSmtp, oferta);
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la lista de usuarios para las notificaciones',
          life: 4000
        });
      }
    });
  }

  private enviarEmailsADestinatarios(emails: string[], oferta: OfertaLaboral): void {
    if (emails.length === 0) {
      return;
    }

    const fechaCierre = oferta.fechaCierre 
      ? new Date(oferta.fechaCierre).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'No especificada';

    let exitosos = 0;
    let fallidos = 0;
    const totalEmails = emails.length;

    emails.forEach((email, index) => {
      setTimeout(() => {
        this.emailService.notificarNuevaOferta(
          email,
          oferta.cargoRequerido,
          oferta.numeroConvocatoria,
          fechaCierre,
          oferta.departamentoSolicitante || 'No especificado'
        ).subscribe({
          next: () => {
            exitosos++;
            if (exitosos + fallidos === totalEmails) {
              this.mostrarResultadoNotificaciones(exitosos, fallidos, totalEmails);
            }
          },
          error: () => {
            fallidos++;
            if (exitosos + fallidos === totalEmails) {
              this.mostrarResultadoNotificaciones(exitosos, fallidos, totalEmails);
            }
          }
        });
      }, index * 200);
    });
  }

  private mostrarResultadoNotificaciones(exitosos: number, fallidos: number, total: number): void {
    if (fallidos === 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Notificaciones enviadas',
        detail: `Se enviaron ${exitosos} notificaciones por correo exitosamente`,
        life: 5000
      });
    } else if (exitosos > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Notificaciones parciales',
        detail: `Se enviaron ${exitosos} de ${total} notificaciones. ${fallidos} fallaron.`,
        life: 5000
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error en notificaciones',
        detail: `No se pudo enviar ninguna notificación por correo`,
        life: 5000
      });
    }
  }

  private actualizarPaginacion(): void {
    const totalItems = this.convocatoriasFiltradas.length;
    this.totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;

    this.paginatedOfertas = this.convocatoriasFiltradas.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.actualizarPaginacion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(maxButtons: number = 5): number[] {
    const pages: number[] = [];
    let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  setItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.currentPage = 1;
    this.actualizarPaginacion();
  }

  formatearTipoConvocatoria(tipo: string): string {
    if (!tipo) return '';
    return tipo.toLowerCase() === 'ambas' ? 'Interna/Externa' : tipo;
  }

  ngOnDestroy(): void {
    this.stopDeleteCountdown();
    Object.values(this.searchTimers).forEach(t => clearTimeout(t));
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const errorElement = document.querySelector(
        '.ng-invalid.ng-touched input, .ng-invalid.ng-touched select, .ng-invalid.ng-touched textarea, .ng-invalid.ng-touched p-select, .ng-invalid.ng-touched p-datepicker'
      ) as HTMLElement;
      
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => errorElement.focus(), 500);
      }
    }, 100);
  }
}