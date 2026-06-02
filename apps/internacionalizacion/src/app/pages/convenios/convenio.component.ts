import { Component, OnInit, inject, OnDestroy, ViewChild, ElementRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { Subject, takeUntil, catchError, of, EMPTY, firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { UbicacionesGeograficasService } from '../../core/services/ubicaciones-geograficas.service';
import { ConvenioService } from '../../core/services/convenio.service';
import { ProgramaService } from '../../core/services/programas.service';
import { InstitucionesService } from '../../core/services/instituciones.service';
import { ArchivoService } from '../../core/services/archivo.service';
import { CoberturaService } from '../../core/services/cobertura.service';
import { SectorService } from '../../core/services/sector.service';
import { FormUtilsService } from '../../core/services/form-utils.service';
import { Convenio, ConvenioFechaProgramada } from '../../core/models/convenio.model';
import { Cobertura } from '../../core/models/cobertura.model';
import { Sector } from '../../core/models/sector.model';
import { TipoConvenio } from '../../core/models/tipo-convenio.model';
import { TipoConvenioIntercambio } from '../../core/models/tipo-convenio-intercambio.model';
import { MovilidadService } from '../../core/services/movilidad.service';
import { TipoConvenioService } from '../../core/services/tipo-convenio.service';
import { TipoConvenioIntercambioService } from '../../core/services/tipo-convenio-intercambio.service';
import { InputComponent, SelectComponent, DatepickerComponent, TextareaComponent, InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { FileAttachmentComponent, FileAttachmentConfig, FileInfoS } from '@microfrontends/shared-ui';
import { FileAttachmentService as SharedFileAttachmentService } from '@microfrontends/shared-services';
import { NotificationService, AuthService } from '@microfrontends/shared-services';
import { NotificationsService } from '@domain/auth';

import { ArchivoSubido } from '../../core/services/archivo.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DropdownItem } from '@microfrontends/shared-models';
import { TIPO_DURACION_ESTRUCTURADA, HISTORIAL_TIPO_OPCIONES, HISTORIAL_ESTADO_OPCIONES, ESTADO_CONVENIO, ORGANO_APROBADOR, AREAS_COOPERACION } from '../../core/constants/convenio-constants';
import { Opcion } from '../../core/models/opcion.model';

// Definir tipos locales

interface InstitucionDto {
  id: string;
  nombre: string;
}

interface CustomErrorMessages {
  required: string;
  email: string;
  invalidPhone: string;
  [key: string]: string;
}





@Component({
  selector: 'app-formulario-convenio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule, ProgressSpinnerModule, ProgressBarModule, ButtonModule, CardModule, SelectModule, TableModule, ConfirmDialogModule, DialogModule, TooltipModule, MessageModule, CheckboxModule, InputComponent, SelectComponent, DatepickerComponent, TextareaComponent, FileAttachmentComponent, InfoTableComponent],
  providers: [ConfirmationService, { provide: SharedFileAttachmentService, useClass: ArchivoService }],
  templateUrl: './convenio.component.html',
})
export class ConvenioComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly convenioService = inject(ConvenioService);
  private readonly programaService = inject(ProgramaService);
  private readonly ubicacionesService = inject(UbicacionesGeograficasService);
  private readonly institucionesService = inject(InstitucionesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly archivoService = inject(ArchivoService);
  private readonly appNotifications = inject(NotificationsService) as NotificationsService;   // servicio de panel de notificaciones (badge)
  private readonly coberturaService = inject(CoberturaService);
  private readonly sectorService = inject(SectorService);
  private readonly tipoConvenioService = inject(TipoConvenioService);
  private readonly tipoConvenioIntercambioService = inject(TipoConvenioIntercambioService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formUtilsService = inject(FormUtilsService);
  readonly sectorOpciones = signal<Sector[]>([]);
  readonly coberturaOpciones = signal<Cobertura[]>([]);

  get coberturaEsInternacional(): boolean {
    const covId = this.formConvenio.get('convenioOpcion')?.value;
    const cov = this.coberturaOpciones().find(c => c.id === covId || c.id === this.extractEntityId(covId));
    return cov ? cov.nombre?.toLowerCase().includes('internacional') : false;
  }
  readonly tipoConvenioOpciones = computed(() =>
    this.tipoConvenioService.tipoConvenioOpciones().map(tipo => ({
      id: tipo.id,
      nombre: tipo.titulo
    }))
  );
  readonly tipoConvenioIntercambioOpciones = computed(() =>
    this.tipoConvenioIntercambioService.tipoConvenioIntercambioOpciones().map(tipo => ({
      id: tipo.id,
      nombre: tipo.titulo
    }))
  );

  // opciones filtradas en función de tipoConvenio seleccionado
  readonly tipoConvenioIntercambioFiltradas = signal<DropdownItem[]>([]);

  readonly uiTexts = {
    PROGRESS: 'Progreso',
    MESSAGES: {
      FECHA_FIN_INVALID: 'La fecha de fin debe ser posterior a la fecha de inicio.',
      MOSTRANDO: 'Mostrando {first} - {last} de {totalRecords}',
      NO_HAY_EVENTOS: 'No hay eventos registrados',
      CANCELAR: 'Cancelar',
      GUARDAR: 'Guardar',
      GUARDANDO: 'Guardando...',
      ACTUALIZAR_CONVENIO: 'Actualizar Convenio',
      REGISTRAR_CONVENIO: 'Registrar Convenio',
      NO_CAMBIOS: 'No hay cambios para guardar'
    },
    TABLE_HEADERS: {
      TIPO: 'Tipo',
      FECHA_PROGRAMADA: 'Fecha Programada',
      FECHA_FIN_PRORROGA: 'Fecha Fin de Prórroga',
      ESTADO: 'Estado'
    }
  };

  // Custom error messages for reusable components
  readonly customErrorMessages: CustomErrorMessages = {
    required: 'Este campo es requerido',
    email: 'Ingrese un email válido',
    invalidPhone: 'Número de teléfono inválido',
  };

  // Field labels for form validation
  readonly fieldLabels: { [key: string]: string } = {
    'codigo': 'Código de convenio',
    'objeto': 'Objeto del convenio',
    'convenioOpcion': 'Cobertura de Convenio',
    'institucionDestino': 'Institución de Convenio', 
    'fechaInicio': 'Fecha de Inicio',
    'fechaFin': 'Fecha de Fin',
    'responsable': 'Responsable'
  };

  private notifyError(detail: string): void {
    this.notificationService.showNotification('error', detail);
  }
  private notifyErrorSummary(detail: string): void {
    this.notificationService.showNotification('error', { summary: 'Error', detail });
  }


  get fieldsToCompare(): string[] {
    return Object.keys(this.formConvenio.controls);
  }

  // Options
  readonly tipoDuracionEstructuradaOptions = TIPO_DURACION_ESTRUCTURADA;
  readonly historialTipoOptions = HISTORIAL_TIPO_OPCIONES;
  readonly historialEstadoOptions = HISTORIAL_ESTADO_OPCIONES;
  readonly estadoConvenioOptions = ESTADO_CONVENIO;
  readonly organoAprobadorOptions = ORGANO_APROBADOR;
  readonly areasCooperacionOptions = AREAS_COOPERACION;
  
  convenios: Convenio[] = [];
  private notificadoVencimiento = new Set<string>();
  programas: {id: string, nombre: string, idFacultad: string}[] = [];
  programasFiltrados: DropdownItem[] = [];
  facultades: DropdownItem[] = [];

  // Programas solicitantes del convenio
  programasSolicitantes: { programaId: string, esLider: boolean, nombre?: string, facultadNombre?: string }[] = [];

  // Áreas de cooperación seleccionadas
  areasCooperacionSeleccionadas: Set<string> = new Set();
  paises: DropdownItem[] = [];
  paisesData: {id: string, nombre: string, codigoPais?: string | null}[] = [];
  departamentos: DropdownItem[] = [];
  departamentosData: {id: string, nombre: string, codigoPais?: string | null}[] = [];
  ciudades: DropdownItem[] = [];
  ciudadesData: {id: string, nombre: string, codigoPais?: string | null}[] = [];
  opcionesInstituciones: InstitucionDto[] = [];
  private todasLasInstituciones: InstitucionDto[] = [];
  cargandoTabla = false;
  cargando = false;
  cargandoInstituciones = false;
  institucionesCargadas = false; 
  isSubmitting = false; 
  modoEdicion = false;
  private paisesLoaded!: Promise<void>;
  readonly = false;
  convenioSeleccionado: Convenio | null = null;
  historial: ConvenioFechaProgramada[] = []; // Historial de renovaciones/revisiones

  // Configuración de la tabla de historial
  columnsHistorial: TableColumn[] = [
    { field: 'tipo', header: this.uiTexts.TABLE_HEADERS.TIPO, sortable: true },
    { field: 'fechaProgramada', header: this.uiTexts.TABLE_HEADERS.FECHA_PROGRAMADA, sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' },
    { field: 'fechaFinVigencia', header: this.uiTexts.TABLE_HEADERS.FECHA_FIN_PRORROGA, sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' },
    { field: 'estado', header: this.uiTexts.TABLE_HEADERS.ESTADO, sortable: true, type: 'badge', badgeConfig: {
      getSeverity: (value: string) => {
        switch (value) {
          case 'EJECUTADO': return 'success';
          case 'PENDIENTE': return 'warn';
          case 'CANCELADO': return 'danger';
          default: return 'info';
        }
      },
      getLabel: (value: string) => value
    } }
  ];

  actionsHistorial: TableAction[] = [
    { icon: 'pi pi-pencil', tooltip: 'Editar', severity: 'info', onClick: (row: ConvenioFechaProgramada) => this.editarHistorialItem(row) },
    { icon: 'pi pi-trash', tooltip: 'Eliminar', severity: 'danger', onClick: (row: ConvenioFechaProgramada) => this.eliminarHistorialItem(row) }
  ];

  @ViewChild('formContainer', { static: false }) formContainer!: ElementRef;
  private originalFormValue: any = {};

  fileAttachmentConfig: FileAttachmentConfig = ArchivoService.DEFAULT_FILE_ATTACHMENT_CONFIG;
  existingFiles: FileInfoS[] = [];
  @ViewChild('fileAttachment') fileAttachment!: FileAttachmentComponent;

  // Variables para soft-delete de archivos
  archivoOriginalId: string | null = null;
  archivoPendienteEliminacion: boolean = false;

  // Variables para edición del historial
  historialDialogVisible = false;
  historialItemEditando: ConvenioFechaProgramada | null = null;

  formConvenio: FormGroup = this.crearFormularioConvenio();

  historialForm = this.fb.group({
    tipo: ['', Validators.required],
    fechaProgramada: [null as Date | null, Validators.required],
    fechaFinVigencia: [null as Date | null],
    estado: [''] // Agregar campo estado para poder corregir PRORROGA
  });

  get progresoFormulario(): number {
    // compute using every control except revisionAnios and programas
    const allFields = Object.keys(this.formConvenio.controls)
      .filter(f => f !== 'revisionAnios' && f !== 'programas');
    if (allFields.length === 0) return 0;
    const validCount = allFields.filter(f => {
      const ctrl = this.formConvenio.get(f);
      if (!ctrl) return false;
      if (!ctrl.valid) return false;
      const val = ctrl.value;
      return val !== null && val !== undefined && val !== '';
    }).length;
    return Math.round(validCount / allFields.length * 100);
  }


  async ngOnInit(): Promise<void> {
    this.inicializarFormulario();
    await this.cargarDatosIniciales();
    this.configurarReactividad();
    this.configurarRutas();
    // Cargar nombre del usuario al final para evitar que se sobrescriba
    setTimeout(() => this.cargarNombreUsuarioAutenticado(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private inicializarFormulario(): void {
    this.formConvenio.get('prorroga')?.setValue(false);
  }

  private cargarNombreUsuarioAutenticado(): void {
    try {
      const tokenInfo = this.authService.getUserInfo();
      if (tokenInfo) {
        // Intentar obtener el nombre de diferentes campos posibles
        const nombreUsuario = tokenInfo.name || tokenInfo.given_name || tokenInfo.preferred_username || tokenInfo.email;
        if (nombreUsuario) {
          this.formConvenio.patchValue({ responsable: nombreUsuario }, { emitEvent: false });
        }
      }
    } catch (error) {
      console.warn('No se pudo cargar el nombre del usuario autenticado', error);
    }
  }

  private configurarRutas(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.cargarConvenioPorId(id);
      }
      this.readonly = params['readonly'] === 'true';
      if (this.readonly) {
        this.formConvenio.disable({ emitEvent: false });
      } else {
        this.formConvenio.enable({ emitEvent: false });
      }
    });
  }

  private crearFormularioConvenio(): FormGroup {
    return this.fb.group({
      codigo: ['', Validators.required],
      estado: ['activo'],
      objeto: ['', Validators.required],
      sector: [null],
      tipoConvenio: [''],
      tipoConvenioIntercambio: [''],
      institucionDestino: [''],
      pais: [''],
      departamento: [''],
      ciudad: [''],
      fechaInicio: [null as Date | null, Validators.required],
      fechaFin: [null as Date | null],
      prorroga: [false],
      prorrogaDescripcion: [''],
      contactoNombre: [''],
      contactoCargo: [''],
      contactoConvenio: ['', Validators.email],
      telefono: ['', Validators.pattern(/^[0-9]+$/)],
      convenioOpcion: ['', Validators.required],
      responsable: ['', Validators.required],
      facultad: [''],
      programa: [''],
      programas: [[]],
      observaciones: [''],
      numeroActaAprobacion: [''],
      fechaActaAprobacion: [null as Date | null],
      organoAprobador: ['Consejo Directivo'],
      firmanteUmariana: [''],
      cargoFirmanteUmariana: [''],
      tiempoAnios: [null as number | null],
      tipoDuracionEstructurada: [''],
      revisionAnios: [null as number | null]
    }, { validators: MovilidadService.fechaFinDespuesDeInicio });
  }

  private crearFormularioHistorial(): FormGroup {
    return this.fb.group({
      tipo: ['', Validators.required],
      fechaProgramada: [null as Date | null, Validators.required],
      fechaFinVigencia: [null as Date | null],
      estado: ['']
    });
  }

  private async cargarDatosIniciales(): Promise<void> {
    this.cargarConvenios();
    this.cargarProgramas();
    this.cargarFacultades();
    this.cargarPaises();
    this.cargarCoberturas();
    this.cargarSectorOpciones();
    this.cargarTodasLasInstituciones();
    this.tipoConvenioService.loadTipoConvenioOpciones().subscribe();
    this.tipoConvenioIntercambioService.loadTipoConvenioIntercambioOpciones().subscribe();
  }

  private cargarTodasLasInstituciones(): void {
    this.cargandoInstituciones = true;
    this.institucionesService.getAll()
      .pipe(takeUntil(this.destroy$), catchError(() => of([])))
      .subscribe(data => {
        this.todasLasInstituciones = (data || []).map(i => ({ id: i.id, nombre: i.nombre }));
        // Si todavía no hay un país seleccionado, mostrar todas
        if (!this.formConvenio.get('pais')?.value) {
          this.opcionesInstituciones = this.todasLasInstituciones;
        }
        this.cargandoInstituciones = false;
        this.institucionesCargadas = true;
      });
  }

  private cargarConvenios(): void {
    this.cargandoTabla = true;
    this.convenioService.getAll().pipe(takeUntil(this.destroy$), catchError(error => {
      return of([]);
    })).subscribe(data => {
      this.convenios = data || [];
      this.cargandoTabla = false;
    });
  }

  private cargarProgramas(): void {
    this.cargarDatos<{id: string, nombre: string, idFacultad: string}>(
      () => this.programaService.getAll(),
      data => {
        this.programas = data;
        this.actualizarProgramasFiltrados();
      },
      'programas'
    );
  }

  private cargarFacultades(): void {
    this.cargarDatos<{id: string, nombre: string}>(
      () => this.programaService.getAllFacultades(),
      data => this.facultades = this.transformarAOpciones(data),
      'facultades'
    );
  }

  private cargarPaises(): void {
    this.paisesLoaded = new Promise<void>((resolve) => {
      this.ubicacionesService.obtenerPaises()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: {id: string, nombre: string, codigoPais?: string | null}[]) => {
            this.paisesData = data;
            this.paises = this.transformarAOpciones(data);
            resolve();
          },
          error: () => {
            resolve();
          }
        });
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

  private cargarSectorOpciones(): void {
    this.sectorService.getAllActive()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Sector[]) => {
          this.sectorOpciones.set(data);
        },
        error: (err) => {
        }
      });
  }

  private cargarDepartamentos(paisId: string): void {
    this.ubicacionesService.obtenerDepartamentosPorPais(paisId).subscribe({
      next: (data) => {
        this.departamentosData = data.map(d => ({ id: d.id, nombre: d.nombre, codigoPais: d.codigoPais }));
        this.departamentos = this.transformarAOpciones(data);
        this.ciudadesData = [];
        this.ciudades = [];
      },
      error: (err) => {
      }
    });
  }

  private cargarMunicipios(departamentoId: string): void {
    this.ubicacionesService.obtenerMunicipiosPorDepartamento(departamentoId).subscribe({
      next: (data) => {
        this.ciudadesData = data.map(c => ({ id: c.id, nombre: c.nombre, codigoPais: c.codigoPais }));
        this.ciudades = this.transformarAOpciones(data);
      },
      error: (err) => {
      }
    });
  }

  private configurarReactividad(): void {
    this.configurarReactividadUbicaciones();
    this.configurarReactividadFacultades();
    this.configurarReactividadFechas();
    this.configurarReactividadTipoConvenio();
  }

  private configurarReactividadUbicaciones(): void {
    this.formConvenio.get('pais')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (id) {
          // Cargar departamentos preservando codigoPais
          this.ubicacionesService.obtenerDepartamentosPorPais(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(data => {
              this.departamentosData = data.map(d => ({ id: d.id, nombre: d.nombre, codigoPais: d.codigoPais }));
              this.departamentos = this.transformarAOpciones(data);
              this.ciudadesData = [];
              this.ciudades = [];
              this.formConvenio.get('departamento')?.setValue('', { emitEvent: false });
              this.formConvenio.get('ciudad')?.setValue('', { emitEvent: false });
            });

          // Filtrar instituciones por código de país (client-side desde lista completa)
          const paisData = this.paisesData.find(p => p.id === id);
          if (paisData?.codigoPais && this.todasLasInstituciones.length > 0) {
            this.opcionesInstituciones = this.todasLasInstituciones;
            // intentar refinar con API; si falla, la lista completa sigue disponible
            this.institucionesService.getByCodigoPais(paisData.codigoPais)
              .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
              .subscribe(data => {
                if (data && data.length > 0) {
                  this.opcionesInstituciones = data.map(i => ({ id: i.id, nombre: i.nombre }));
                }
              });
          } else if (this.todasLasInstituciones.length > 0) {
            this.opcionesInstituciones = this.todasLasInstituciones;
          }
        } else {
          this.departamentos = [];
          this.departamentosData = [];
          this.ciudades = [];
          this.ciudadesData = [];
          this.opcionesInstituciones = this.todasLasInstituciones;
        }
      });

    this.formConvenio.get('departamento')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (id) {
          // Cargar ciudades preservando codigoPais
          this.ubicacionesService.obtenerMunicipiosPorDepartamento(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(data => {
              this.ciudadesData = data.map(c => ({ id: c.id, nombre: c.nombre, codigoPais: c.codigoPais }));
              this.ciudades = this.transformarAOpciones(data);
              this.formConvenio.get('ciudad')?.setValue('', { emitEvent: false });
            });

          // Filtrar instituciones por país + departamento
          const paisId = this.formConvenio.get('pais')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisId);
          const deptData = this.departamentosData.find(d => d.id === id);
          if (paisData?.codigoPais && deptData?.codigoPais && deptData.codigoPais !== '0') {
            this.institucionesService.getByCodigoPaisAndDepartamento(paisData.codigoPais, deptData.codigoPais)
              .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
              .subscribe(data => {
                if (data && data.length > 0) {
                  this.opcionesInstituciones = data.map(i => ({ id: i.id, nombre: i.nombre }));
                }
              });
          }
        } else {
          this.ciudades = [];
          this.ciudadesData = [];
          this.formConvenio.get('ciudad')?.setValue('', { emitEvent: false });
          // Volver al filtro por país
          const paisId = this.formConvenio.get('pais')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisId);
          if (paisData?.codigoPais) {
            this.institucionesService.getByCodigoPais(paisData.codigoPais)
              .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
              .subscribe(data => {
                this.opcionesInstituciones = (data && data.length > 0)
                  ? data.map(i => ({ id: i.id, nombre: i.nombre }))
                  : this.todasLasInstituciones;
              });
          } else {
            this.opcionesInstituciones = this.todasLasInstituciones;
          }
        }
      });

    this.formConvenio.get('ciudad')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        if (id) {
          // Filtrar instituciones por país + departamento + municipio
          const paisId = this.formConvenio.get('pais')?.value as string;
          const deptId = this.formConvenio.get('departamento')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisId);
          const deptData = this.departamentosData.find(d => d.id === deptId);
          const ciudadData = this.ciudadesData.find(c => c.id === id);
          if (paisData?.codigoPais && deptData?.codigoPais && deptData.codigoPais !== '0' && ciudadData?.codigoPais && ciudadData.codigoPais !== '0') {
            this.institucionesService.getByCodigoPaisAndDepartamentoAndMunicipio(paisData.codigoPais, deptData.codigoPais, ciudadData.codigoPais)
              .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
              .subscribe(data => {
                if (data && data.length > 0) {
                  this.opcionesInstituciones = data.map(i => ({ id: i.id, nombre: i.nombre }));
                }
              });
          }
        } else {
          // Volver a filtrar por país + departamento
          const paisId = this.formConvenio.get('pais')?.value as string;
          const deptId = this.formConvenio.get('departamento')?.value as string;
          const paisData = this.paisesData.find(p => p.id === paisId);
          const deptData = this.departamentosData.find(d => d.id === deptId);
          if (paisData?.codigoPais && deptData?.codigoPais && deptData.codigoPais !== '0') {
            this.institucionesService.getByCodigoPaisAndDepartamento(paisData.codigoPais, deptData.codigoPais)
              .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
              .subscribe(data => {
                if (data && data.length > 0) {
                  this.opcionesInstituciones = data.map(i => ({ id: i.id, nombre: i.nombre }));
                }
              });
          } else if (paisData?.codigoPais) {
            this.institucionesService.getByCodigoPais(paisData.codigoPais)
              .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
              .subscribe(data => {
                this.opcionesInstituciones = (data && data.length > 0)
                  ? data.map(i => ({ id: i.id, nombre: i.nombre }))
                  : this.todasLasInstituciones;
              });
          }
        }
      });

    // hide department/city when coverage is international
    this.formConvenio.get('convenioOpcion')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.coberturaEsInternacional) {
          this.formConvenio.get('departamento')?.setValue('', { emitEvent: false });
          this.formConvenio.get('ciudad')?.setValue('', { emitEvent: false });
        }
      });

  }

  private configurarReactividadFacultades(): void {
    this.formConvenio.get('facultad')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(facultad => this.filtrarProgramasPorFacultad(facultad));
  }

  private configurarReactividadFechas(): void {
    this.formConvenio.get('fechaInicio')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalcularTiempoAnios());
  }

  private configurarReactividadTipoConvenio(): void {
    this.formConvenio.get('tipoConvenio')?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(async val => {
        const id = this.extractEntityId(val);
        if (id) {
          await this.loadTiposIntercambioForTipo(id);
          const current = this.formConvenio.get('tipoConvenioIntercambio')?.value;
          const lista = this.tipoConvenioIntercambioFiltradas();
          if (current && !lista.some((o: DropdownItem) => o.id === current)) {
            this.formConvenio.get('tipoConvenioIntercambio')?.setValue(null);
          }
        } else {
          this.tipoConvenioIntercambioFiltradas.set([]);
          this.formConvenio.get('tipoConvenioIntercambio')?.setValue(null);
        }
      });
  }

  private extractEntityId(v: any): string | null {
    if (!v && v !== 0) return null;
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    return v?.id ?? v?.value ?? null;
  }

  private toDateStr(d: Date | null | undefined): string | null {
    return d ? this.formatAsDateString(d) : null;
  }

  private resolveEntityObject(
    value: any,
    options: { id: string; nombre: string }[]
  ): { id: string; name: string } | null {
    const id = this.extractEntityId(value);
    if (!id) return null;
    const name = (typeof value === 'object' && value?.nombre)
      ? value.nombre
      : options.find(o => o.id === id)?.nombre ?? '';
    return { id, name };
  }

  private recalcularTiempoAnios(): void {
    const fechaInicio = this.formConvenio.get('fechaInicio')?.value;
    const fechaFin = this.formConvenio.get('fechaFin')?.value;
    if (fechaInicio && fechaFin) {
      const anios = fechaFin.getFullYear() - fechaInicio.getFullYear();
      this.formConvenio.get('tiempoAnios')?.setValue(anios > 0 ? anios : null);
    }
  }

  private cargarDatos<T>(
    servicio: () => Observable<T[]>,
    procesar: (data: T[]) => void,
    recurso: string
  ): void {
    servicio().pipe(takeUntil(this.destroy$), catchError(error => {
      this.notificationService.showNotification('error', `Error cargando ${recurso}`);
      return of([]);
    })).subscribe((data: T[]) => procesar(data));
  }

  private filtrarProgramasPorFacultad(facultad: Opcion | null | string): void {
    const facultadId = typeof facultad === 'string' ? facultad : (facultad?.id || null);
    let filtrados = facultadId ? this.programas.filter(p => p.idFacultad == facultadId) : this.programas;

    const selected: string[] = this.formConvenio.get('programas')?.value || [];
    if (selected && selected.length) {
      const missing = this.programas.filter(p => selected.includes(p.id) && !filtrados.some(f => f.id === p.id));
      if (missing.length) {
        filtrados = filtrados.concat(missing);
      }
    }

    this.programasFiltrados = this.transformarAOpciones(filtrados);
  }

  private actualizarProgramasFiltrados(): void {
    let list = this.programas;
    const selected: string[] = this.formConvenio.get('programas')?.value || [];
    if (selected && selected.length) {
      const missing = this.programas.filter(p => selected.includes(p.id) && !list.some(l => l.id === p.id));
      if (missing.length) {
        list = list.concat(missing);
      }
    }
    this.programasFiltrados = this.transformarAOpciones(list);

    if (selected && selected.length) {
      this.formConvenio.get('programas')?.setValue(selected, { emitEvent: false });
    }
  }

  // --- Programas Solicitantes ---
  agregarProgramaSolicitante(): void {
    const programaId = this.formConvenio.get('programa')?.value;
    if (!programaId) return;
    if (this.programasSolicitantes.some(ps => ps.programaId === programaId)) return;

    const prog = this.programas.find(p => p.id === programaId);
    const fac = this.facultades.find(f => f.id === prog?.idFacultad);
    const esLider = this.programasSolicitantes.length === 0; // el primero es líder por defecto

    this.programasSolicitantes = [
      ...this.programasSolicitantes,
      { programaId, esLider, nombre: prog?.nombre, facultadNombre: fac?.nombre }
    ];
  }

  eliminarProgramaSolicitante(programaId: string): void {
    const wasLider = this.programasSolicitantes.find(ps => ps.programaId === programaId)?.esLider;
    this.programasSolicitantes = this.programasSolicitantes.filter(ps => ps.programaId !== programaId);
    // Si se elimina el líder y quedan programas, asignar el primero como líder
    if (wasLider && this.programasSolicitantes.length > 0) {
      this.programasSolicitantes = this.programasSolicitantes.map((ps, i) =>
        i === 0 ? { ...ps, esLider: true } : ps
      );
    }
  }

  cambiarLiderSolicitante(programaId: string): void {
    this.programasSolicitantes = this.programasSolicitantes.map(ps => ({
      ...ps,
      esLider: ps.programaId === programaId
    }));
  }

  toggleAreaCooperacion(areaId: string): void {
    if (this.areasCooperacionSeleccionadas.has(areaId)) {
      this.areasCooperacionSeleccionadas.delete(areaId);
    } else {
      this.areasCooperacionSeleccionadas.add(areaId);
    }
    this.areasCooperacionSeleccionadas = new Set(this.areasCooperacionSeleccionadas);
  }

  private transformarAOpciones(data: any[]): DropdownItem[] {
    const items = (data || []).map((item: any) => ({
      id: (item.id ?? item.value ?? item.codigo ?? String(item)),
      nombre: (item.nombre ?? item.label ?? item.titulo ?? String(item)),
      ...(item.abreviatura ? { abreviatura: item.abreviatura } : {})
    }));
    const visto = new Set<string>();
    return items.filter(item => {
      if (visto.has(item.id)) return false;
      visto.add(item.id);
      return true;
    });
  }

  private convertUbicacionesToDropdownItem(ubicaciones: any[] = []): DropdownItem[] {
    return (ubicaciones || []).map(ubicacion => ({
      id: ubicacion.id,
      nombre: ubicacion.nombre
    }));
  }

  private getMunicipiosAsDropdown(departamentoId: string): Observable<DropdownItem[]> {
    return this.ubicacionesService.obtenerMunicipiosPorDepartamento(departamentoId).pipe(
      map((municipios: any[]) => this.convertUbicacionesToDropdownItem(municipios || [])),
      catchError(err => {
        return of([]);
      })
    );
  }



  async registrarConvenio(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    this.setBusy(true);
    const payload = this.prepararPayload();

    try {
      const call$ = this.modoEdicion && this.convenioSeleccionado
        ? this.convenioService.update(this.convenioSeleccionado.id, payload)
        : this.convenioService.create(payload);

      const convenioId = await call$.toPromise();
      if (!convenioId) {
        throw new Error('No se pudo guardar');
      }
      await this.onSaveSuccess(convenioId);
    } catch (err: any) {
      this.onSaveError(err);
    } finally {
      this.setBusy(false);
    }
  }

  private formatAsDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private canSubmit(): boolean {
    if (this.isSubmitting || this.cargando) return false;

    const invalid = this.formConvenio.invalid;
    const fechaInv = !!this.formConvenio.errors?.['fechaFinInvalida'];

    invalid && (this.formConvenio.markAllAsTouched(), this.scrollToFirstInvalidField());

    return !(invalid || fechaInv);
  }


  private setBusy(flag: boolean): void {
    this.isSubmitting = flag;
    this.cargando = flag;
  }

  private async onSaveSuccess(convenioId: any): Promise<void> {
    this.notificationService.showNotification('warn', {
      summary: this.modoEdicion ? 'Convenio Actualizado' : 'Convenio Guardado',
      detail: this.modoEdicion ? 'El convenio ha sido actualizado exitosamente.' : 'El convenio ha sido guardado exitosamente.'
    }, 4000);

    await this.manejarArchivos(convenioId.id);

    if (!this.modoEdicion) {
      this.modoEdicion = true;
      this.convenioSeleccionado = convenioId;
    }
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
    this.cargarConvenios();
  }

  private onSaveError(err: any): void {
    const detail = err?.error?.message || err?.message || JSON.stringify(err?.error || err);
    this.notifyErrorSummary(detail);
  }

  private prepararPayload(): any {
    const form = this.formConvenio.value as any;

    const convenioOpcionId = this.extractEntityId(form.convenioOpcion);
    const coberturaSeleccionada = this.coberturaOpciones().find(c => c.id === convenioOpcionId || c.id === form.convenioOpcion);

    const payload = {
      ...form,
      convenioOpcion:          coberturaSeleccionada?.codigo || convenioOpcionId || form.convenioOpcion,
      institucionDestino:      typeof form.institucionDestino === 'object' ? form.institucionDestino?.nombre || '' : (form.institucionDestino || ''),
      facultad:                this.extractEntityId(form.facultad),
      programa:                this.extractEntityId(form.programa),
      pais:                    this.extractEntityId(form.pais),
      departamento:            this.extractEntityId(form.departamento),
      ciudad:                  this.extractEntityId(form.ciudad),
      fechaInicio:             this.toDateStr(form.fechaInicio), // daylight-safe
      fechaFin:                this.toDateStr(form.fechaFin),
      fechaActaAprobacion:     this.toDateStr(form.fechaActaAprobacion),
      prorrogaDescripcion:     form.prorroga ? form.prorrogaDescripcion : null,
      tiempoAnios:             form.tiempoAnios  ? Number(form.tiempoAnios)  : null,
      revisionAnios:           form.revisionAnios ? Number(form.revisionAnios) : null,
      name:                    form.objeto || '',
      sector:                  this.resolveEntityObject(form.sector,               this.sectorOpciones()),
      tipoConvenio:            this.resolveEntityObject(form.tipoConvenio,         this.tipoConvenioOpciones()),
      tipoConvenioIntercambio: this.resolveEntityObject(form.tipoConvenioIntercambio, this.tipoConvenioIntercambioOpciones()),
      programas:               [form.programas ?? []].flat()
                                 .map(v => this.extractEntityId(v))
                                 .filter((v): v is string => v != null),
      programasSolicitantes:   this.programasSolicitantes.map(ps => ({
                                 programaId: ps.programaId,
                                 esLider: ps.esLider
                               })),
      areasCooperacion:        Array.from(this.areasCooperacionSeleccionadas).map(area => ({ area }))
    };

    const stringFields = ['name','codigo','objeto','modalidad','clasificacion','facultad','programa','convenioOpcion','institucionDestino','pais','departamento','ciudad','contactoConvenio','telefono','fechaFin','prorrogaDescripcion','responsable','alcance','observaciones','tipoDuracionEstructurada','contactoNombre','contactoCargo','numeroActaAprobacion','organoAprobador','firmanteUmariana','cargoFirmanteUmariana'];
    for (const f of stringFields) {
      if ((payload as any)[f] == null) (payload as any)[f] = '';
    }

    [payload.sector, payload.tipoConvenio, payload.tipoConvenioIntercambio]
      .forEach(obj => { if (obj && obj.name == null) obj.name = ''; });

    return payload;
  }

  private async manejarArchivos(convenioId: string): Promise<boolean> {
    if (!this.fileAttachment) return true;
    this.fileAttachment.config = { ...this.fileAttachment.config, recordId: convenioId };

    const eliminacionOk = await this.eliminarArchivosPendientes();
    const subidaOk = await this.subirArchivos();
    const asociacionOk = await this.asociarArchivos(convenioId);
    return eliminacionOk && subidaOk && asociacionOk;
  }

  private async eliminarArchivosPendientes(): Promise<boolean> {
    if (!this.archivoPendienteEliminacion || this.fileAttachment?.attachedFiles?.length) {
      try {
        await this.archivoService.deleteUploadedFile(this.archivoOriginalId!).toPromise();
        this.archivoPendienteEliminacion = false;
        this.archivoOriginalId = null;
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  private async subirArchivos(): Promise<boolean> {
    if (!this.fileAttachment?.selectedFiles?.length) return true;
    const resultado = await new Promise<{success: boolean}>((resolve) => {
      const sub = this.fileAttachment.operationComplete.pipe(takeUntil(this.destroy$)).subscribe(resolve);
      this.fileAttachment.uploadFiles();
    });
    return resultado.success;
  }

  private async asociarArchivos(convenioId: string): Promise<boolean> {
    if (!this.fileAttachment?.attachedFiles?.length) return true;
    try {
      await Promise.all(this.fileAttachment.attachedFiles.map(file =>
        this.archivoService.associateFileWithRecord(file.id, convenioId, 'documento_soporte').toPromise()));
      return true;
    } catch {
      return false;
    }
  }

  private mostrarMensaje(severity: string, detail: string): void {
    this.notificationService.showNotification(severity as any, detail);
  }

  editarConvenio(convenio: Convenio): void {
    this.modoEdicion = true;
    this.convenioSeleccionado = convenio;
    this.fileAttachmentConfig = { ...ArchivoService.DEFAULT_FILE_ATTACHMENT_CONFIG, recordId: convenio.id, showDelete: true };

    this.establecerValoresFormulario(convenio);
    this.chequearVencimientos([convenio]);
    this.loadExistingFiles(convenio.id).then(() => {
    });
    this.cargarCascadasParaEdicion(convenio).then(() => {
      this.establecerValoresFormulario(convenio);
    });
  }

  private async cargarCascadasParaEdicion(convenio: Convenio): Promise<void> {
    // Ensure paises are loaded before resolving codigoPais
    await this.paisesLoaded;
    if (convenio.pais) {
      await this.cargarDepartamentosPorPais(convenio.pais);
      if (convenio.departamento) {
        await this.cargarMunicipiosPorDepartamento(convenio.departamento);
      }
      // Cargar instituciones con el nivel de filtrado más específico disponible
      const paisData = this.paisesData.find(p => p.id === convenio.pais);
      if (paisData?.codigoPais) {
        try {
          let data: {id: string, nombre: string}[];
          const deptData = convenio.departamento ? this.departamentosData.find(d => d.id === convenio.departamento) : null;
          const ciudadData = convenio.ciudad ? this.ciudadesData.find(c => c.id === convenio.ciudad) : null;

          if (deptData?.codigoPais && deptData.codigoPais !== '0' && ciudadData?.codigoPais && ciudadData.codigoPais !== '0') {
            data = await firstValueFrom(this.institucionesService.getByCodigoPaisAndDepartamentoAndMunicipio(paisData.codigoPais, deptData.codigoPais, ciudadData.codigoPais));
          } else if (deptData?.codigoPais && deptData.codigoPais !== '0') {
            data = await firstValueFrom(this.institucionesService.getByCodigoPaisAndDepartamento(paisData.codigoPais, deptData.codigoPais));
          } else {
            data = await firstValueFrom(this.institucionesService.getByCodigoPais(paisData.codigoPais));
          }
          this.opcionesInstituciones = (data || []).map(i => ({ id: i.id, nombre: i.nombre }));
          this.institucionesCargadas = true;
        } catch {
          this.opcionesInstituciones = this.todasLasInstituciones;
        }
      }
    }
  }

  private async cargarDepartamentosPorPais(paisId: string): Promise<void> {
    return new Promise((resolve) => {
      this.ubicacionesService.obtenerDepartamentosPorPais(paisId).subscribe({
        next: (data) => {
          this.departamentosData = data.map(d => ({ id: d.id, nombre: d.nombre, codigoPais: d.codigoPais }));
          this.departamentos = this.transformarAOpciones(data);
          resolve();
        },
        error: (err) => {
          resolve();
        }
      });
    });
  }

  private async cargarMunicipiosPorDepartamento(departamentoId: string): Promise<void> {
    return new Promise((resolve) => {
      this.ubicacionesService.obtenerMunicipiosPorDepartamento(departamentoId).subscribe({
        next: (data) => {
          this.ciudadesData = data.map(c => ({ id: c.id, nombre: c.nombre, codigoPais: c.codigoPais }));
          this.ciudades = this.transformarAOpciones(data || []);
          resolve();
        },
        error: (err) => {
          resolve();
        }
      });
    });
  }

  private async loadTiposIntercambioForTipo(tipoConvenioId: string): Promise<void> {
    let hijos: TipoConvenioIntercambio[] = [];
    try {
      hijos = await firstValueFrom(this.tipoConvenioIntercambioService.getByTipoConvenio(tipoConvenioId));
    } catch (err) {
    }
    if ((!hijos || hijos.length === 0) &&
        this.tipoConvenioIntercambioService.tipoConvenioIntercambioOpciones().length > 0) {
      hijos = this.tipoConvenioIntercambioService.tipoConvenioIntercambioOpciones()
        .filter(t => t.tipoConvenioId === tipoConvenioId || t.idPadre === tipoConvenioId);
    }

    const lista = (hijos || []).map((t: TipoConvenioIntercambio) => ({ id: t.id, nombre: t.titulo }));
    this.tipoConvenioIntercambioFiltradas.set(lista);
  }

  private establecerValoresFormulario(convenio: Convenio): void {
    const formDataPreparado = this.prepararDatosFormulario(convenio);
    this.aplicarValoresAlFormulario(formDataPreparado);
    this.configurarRelacionesCascada(convenio);
    this.programarEstablecimientoPrograma(convenio.programa);
    // Cargar programas solicitantes
    this.programasSolicitantes = (convenio.programasSolicitantes || []).map(ps => {
      const prog = this.programas.find(p => p.id === ps.programaId);
      const fac = this.facultades.find(f => f.id === prog?.idFacultad);
      return { programaId: ps.programaId, esLider: ps.esLider, nombre: prog?.nombre, facultadNombre: fac?.nombre };
    });
    // Cargar áreas de cooperación
    this.areasCooperacionSeleccionadas = new Set(
      (convenio.areasCooperacion || []).map(ac => ac.area)
    );
    this.programarGuardadoSnapshot();
  }

  private parseDateString(value: string): Date {
    const parts = value.split('-').map(p => Number(p));
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  private prepararDatosFormulario(convenio: Convenio): any {
    const coberturaPorCodigo = this.coberturaOpciones().find(c => c.codigo === convenio.convenioOpcion);
    
    const { id, facultad, programa, programas, ...formData } = convenio;
    return {
      ...formData,
      convenioOpcion: coberturaPorCodigo?.id || convenio.convenioOpcion, // Convertir código a ID para el formulario
      sector: formData.sector?.id || null, // Extraer solo el ID del sector
      tipoConvenio: formData.tipoConvenio?.id || null,
      tipoConvenioIntercambio: formData.tipoConvenioIntercambio?.id || null,
      fechaInicio: formData.fechaInicio ? this.parseDateString(formData.fechaInicio) : null,
      fechaFin: formData.fechaFin ? this.parseDateString(formData.fechaFin) : null,
      fechaActaAprobacion: formData.fechaActaAprobacion ? this.parseDateString(formData.fechaActaAprobacion) : null,
      prorroga: formData.prorroga ?? false,
      programas: (programas || []).filter((p:any) => p != null)
    };
  }

  private aplicarValoresAlFormulario(formData: any): void {
    this.formConvenio.patchValue(formData, { emitEvent: false });
    this.recalcularTiempoAnios();

    if (formData.tipoConvenio) {
      const tipoId = typeof formData.tipoConvenio === 'object' ? formData.tipoConvenio.id : formData.tipoConvenio;
      this.loadTiposIntercambioForTipo(tipoId);
    }
  }

  private configurarRelacionesCascada(convenio: Convenio): void {
    if (convenio.facultad) {
      this.formConvenio.get('facultad')?.setValue(convenio.facultad);
      this.filtrarProgramasPorFacultad(convenio.facultad);
    }
  }

  private programarEstablecimientoPrograma(programa: string | undefined): void {
    if (programa) {
      setTimeout(() => {
        this.formConvenio.get('programa')?.setValue(programa);
      }, 50);
    }
  }

  private programarGuardadoSnapshot(): void {
    setTimeout(() => {
      this.saveFormSnapshot();
    }, 200);
  }

  private saveFormSnapshot(): void {
    this.originalFormValue = this.formUtilsService.createFormSnapshot(this.formConvenio);
  }

  limpiarFormulario(): void {
    this.formConvenio.reset({
      prorroga: false,
      programas: []
    });

    this.formConvenio.markAsUntouched();
    this.departamentos = [];
    this.departamentosData = [];
    this.ciudades = [];
    this.ciudadesData = [];
    this.opcionesInstituciones = this.todasLasInstituciones;
    this.institucionesCargadas = false;
    this.modoEdicion = false;
    this.convenioSeleccionado = null;
    this.originalFormValue = {};
    this.programasFiltrados = this.transformarAOpciones(this.programas);
    this.programasSolicitantes = [];
    this.areasCooperacionSeleccionadas = new Set();
    this.existingFiles = [];
    this.fileAttachmentConfig = { ...ArchivoService.DEFAULT_FILE_ATTACHMENT_CONFIG, recordId: undefined };
    this.archivoOriginalId = null;
    this.archivoPendienteEliminacion = false;
    this.isSubmitting = false;
  }

  get hasFormChanges(): boolean {
    return this.formUtilsService.hasFormChanges(this.formConvenio, this.originalFormValue, this.fieldsToCompare);
  }

  onProrrogaChange(event: Event): void {
    if (this.readonly) return;
    this.formConvenio.get('prorroga')?.setValue((event.target as HTMLInputElement).checked);
  }

  confirmarEliminar(convenio: Convenio): void {
    this.eliminarConvenio(convenio.id)
      .then(() => {
        this.notificationService.showNotification('warn', {
          summary: 'Convenio eliminado',
          detail: `"${convenio.codigo}" ha sido removido`
        });
      })
      .catch(() => this.notificationService.showNotification('error', 'No se pudo eliminar el convenio'));
  }

  async eliminarConvenio(id: string): Promise<void> {
    await this.archivoService.deleteFileAssociationsByRecord(id, 'documento_soporte').toPromise();
    await this.convenioService.delete(id).toPromise();
    this.cargarConvenios();
  }

  onFilesUploaded(files: FileInfoS[]): void {
  }

  onUploadError(error: string): void {
    if (error.includes('Error eliminando archivo')) {
      return;
    }
  }

  onFileDeleted(fileId: string): void {
    if (this.archivoOriginalId === fileId) {
      this.archivoPendienteEliminacion = true;
      this.archivoOriginalId = null;
    }
        this.existingFiles = this.existingFiles.filter(f => f.id !== fileId);
  }

  onFilePreview(file: FileInfoS): void {
    if (!file.url) {
      this.notificationService.showNotification('warn', {
        summary: 'Atención',
        detail: 'No se puede previsualizar el archivo'
      });
      return;
    }
    this.http.get(file.url, { responseType: 'blob' }).pipe(takeUntil(this.destroy$), catchError(error => {
      this.notificationService.showNotification('error', 'Error al descargar archivo');
      return EMPTY;
    })).subscribe(blob => window.open(URL.createObjectURL(blob), '_blank'));
  }

  private loadExistingFiles(recordId: string): Promise<void> {
    return new Promise((resolve) => {
      this.archivoService.getFilesByRecord(recordId, 'documento_soporte').pipe(
        takeUntil(this.destroy$), 
        catchError(error => {
          return of([]);
        })
      ).subscribe((files: ArchivoSubido[]) => {
        this.existingFiles = this.archivoService.convertToFileInfoList(files);
        if (files.length > 0) {
          // Guardar ID del archivo original para soft-delete
          this.archivoOriginalId = files[0].id;
          this.archivoPendienteEliminacion = false;
        } else {
          this.archivoOriginalId = null;
          this.archivoPendienteEliminacion = false;
        }
        resolve();
      });
    });
  }

  getProgramaNombre(programaId: string): string {
    return programaId ? this.programas.find(p => p.id === programaId)?.nombre || '' : '';
  }

 
  getPaisNombre(paisId: string): string {
    if (!paisId) return '';
    const found = this.paises.find(p => ((p.id ?? (p as any).value) ?? '').toString() === paisId.toString());
    return found ? ((found.nombre ?? (found as any).label) ?? '') : '';
  }

  private cargarHistorial(id: string): void {
    this.convenioService.getHistorial(id).pipe(takeUntil(this.destroy$), catchError(error => {
      return of([]);
    })).subscribe(historial => {
      // mostrar "Inicio" en lugar de "CONFIGURACION" para mayor claridad
      this.historial = historial.map(h => {
        if (h.tipo === 'CONFIGURACION') {
          return { ...h, tipo: 'Inicio' };
        }
        return h;
      });
    });
  }

  private readonly shownWarnings = new Set<string>();

  private chequearVencimientos(conveniosToCheck?: Convenio[]): void {
    const lista = conveniosToCheck || this.convenios;
    const hoy = new Date();
    const limite = new Date(hoy);
    limite.setMonth(limite.getMonth() + 3);
    lista.forEach(c => {
      if (c.fechaFin && !this.notificadoVencimiento.has(c.id)) {
        const fin = this.parseDateString(c.fechaFin);
        console.debug('checking convenio', c.codigo, 'fechaFin', fin, 'limite', limite);
        if (fin > hoy && fin <= limite) {
          console.debug('triggering warning for', c.codigo);
          const detailMsg = `El convenio ${c.codigo} vence el ${fin.toLocaleDateString()}`;
          if (!this.shownWarnings.has(detailMsg)) {
            this.notificationService.showNotification('warn', {
              summary: 'Convenio próximo a vencer',
              detail: detailMsg
            });
            // also add to persistent badge list
            this.appNotifications.addNotification({
              title: 'Convenio próximo a vencer',
              message: detailMsg,
              type: 'warning',
              icon: 'pi pi-exclamation-triangle'
            });
            this.shownWarnings.add(detailMsg);
          }
          this.notificadoVencimiento.add(c.id);
        }
      }
    });
  }

  private cargarConvenioPorId(id: string): void {
    this.convenioService.getById(id).pipe(takeUntil(this.destroy$), catchError(error => {
      this.notificationService.showNotification('error', 'No se pudo cargar el convenio');
      return EMPTY;
    })).subscribe(convenio => {
      if (convenio) {
        this.editarConvenio(convenio);
        this.cargarHistorial(id);
      }
    });
  }

  irALaLista(): void {
    this.router.navigate(['/app/convenios-list']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.irALaLista();
    }
  }


  async downloadPdf(): Promise<void> {
    if (!this.convenioSeleccionado?.id) return;
    const payload = await this.buildPdfPayload();
    await this.requestPdf(payload).catch(() =>
      this.notificationService.showNotification('error', 'No se pudo generar el PDF')
    );
  }


  private async buildPdfPayload(): Promise<any> {
    await this.ensureCatalogs();
    this.historial = await firstValueFrom(
      this.convenioService.getHistorial(this.convenioSeleccionado!.id).pipe(catchError(() => of([])))
    );
    const payload = this.prepareConvenioForPdf(this.convenioSeleccionado!);
    if (this.historial.length) {
      (payload as any).fechasProgramadas = this.historial.map(h => ({ ...h }));
    }
    return payload;
  }


  private async requestPdf(payload: any): Promise<void> {
    const blob = await lastValueFrom(
      this.convenioService.downloadPdfWithData(payload).pipe(
        catchError(err => {
          const detail = typeof err?.error === 'string' ? err.error : JSON.stringify(err?.error ?? '');
          this.notificationService.showNotification('warn', 'Error generando PDF con datos', detail);
          return this.convenioService.downloadPdf(this.convenioSeleccionado!.id);
        })
      )
    );
    this.savePdfBlob(blob);
  }

  private savePdfBlob(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nombre = this.convenioSeleccionado?.codigo ?
      `convenio-${this.convenioSeleccionado.codigo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf` :
      'convenio.pdf';
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
  }

 
  private async ensureCatalogs(): Promise<void> {
    const loadIfEmpty = <T>(list: T[], fetch$: Observable<T[]>, set: (d: T[]) => void): Promise<void> =>
      list.length ? Promise.resolve() : firstValueFrom(fetch$).then(set).catch(() => {});

    await Promise.all([
      loadIfEmpty(this.facultades, this.programaService.getAllFacultades(), d => { this.facultades = this.transformarAOpciones(d); }),
      loadIfEmpty(this.programas, this.programaService.getAll(), d => { this.programas = d; this.actualizarProgramasFiltrados(); }),
      loadIfEmpty(this.paises, this.ubicacionesService.obtenerPaises(), d => { this.paisesData = d; this.paises = this.transformarAOpciones(d); }),
      ...(this.convenioSeleccionado?.pais && !this.departamentos?.length
        ? [this.cargarDepartamentosPorPais(this.convenioSeleccionado.pais)]
        : [])
    ]);
  }

  private scrollToFirstInvalidField(): void {
    this.formUtilsService.scrollToFirstInvalidField(this.formConvenio, this.formContainer, this.fieldLabels);
  }

  editarHistorialItem(item: ConvenioFechaProgramada): void {
    this.historialItemEditando = item;
    this.historialForm.patchValue({
      tipo: item.tipo,
      fechaProgramada: item.fechaProgramada ? new Date(item.fechaProgramada) : null,
      fechaFinVigencia: item.fechaFinVigencia ? new Date(item.fechaFinVigencia) : null,
      estado: item.estado
    });
    this.historialDialogVisible = true;
  }

  guardarHistorialItem(): void {
    if (this.historialForm.valid && this.historialItemEditando) {
      const formValue = this.historialForm.value;
      
      const updatedItem = {
        ...this.historialItemEditando,
        tipo: formValue.tipo,
        fechaProgramada: formValue.fechaProgramada,
        fechaFinVigencia: formValue.fechaFinVigencia,
        estado: formValue.estado
      };

      this.convenioService.updateFechaProgramada(this.historialItemEditando.id, updatedItem).subscribe({
        next: () => {
          this.notificationService.showNotification('success', 'Evento actualizado correctamente');
          this.historialDialogVisible = false;
          this.historialItemEditando = null;
          if (this.convenioSeleccionado) {
            this.cargarHistorial(this.convenioSeleccionado.id);
          }
        },
        error: () => {
        }
      });
    }
  }

  async eliminarHistorialItem(item: ConvenioFechaProgramada): Promise<void> {
    try {
      await this.convenioService.deleteFechaProgramada(item.id).toPromise();
      this.notificationService.showNotification('success', `Evento ${item.tipo} eliminado correctamente`);
      if (this.convenioSeleccionado) this.cargarHistorial(this.convenioSeleccionado.id);
    } catch (err) {
    }
  }

  cancelarEdicionHistorial(): void {
    this.historialDialogVisible = false;
    this.historialItemEditando = null;
    this.historialForm.reset();
  }

  private getFieldLabel(fieldName: string): string {
    return this.fieldLabels[fieldName] || fieldName;
  }


  private prepareConvenioForPdf(orig: Convenio): Convenio {
    const copy: Convenio = { ...orig };
    copy.facultad = this.facultades.find(f => f.id === orig.facultad)?.nombre || orig.facultad;
    copy.programa = this.programas.find(p => p.id === orig.programa)?.nombre || orig.programa;
    copy.pais = this.paises.find(p => p.id === orig.pais)?.nombre || orig.pais;
    copy.departamento = this.departamentos.find(d => d.id === orig.departamento)?.nombre || orig.departamento;
    copy.ciudad = this.ciudades.find(c => c.id === orig.ciudad)?.nombre || orig.ciudad;
    copy.cobertura = this.coberturaOpciones().find(c => c.id === orig.convenioOpcion)?.nombre || orig.convenioOpcion;
    const cov = this.coberturaOpciones().find(c => c.id === orig.convenioOpcion);
    copy.convenioOpcion = cov ? cov.nombre : orig.convenioOpcion;
    if (copy.programas && Array.isArray(copy.programas)) {
      copy.programas = copy.programas.map(id => {
        const p = this.programas.find(x => x.id === id);
        return p ? p.nombre : id;
      });
    }
    return copy;
  }
}
