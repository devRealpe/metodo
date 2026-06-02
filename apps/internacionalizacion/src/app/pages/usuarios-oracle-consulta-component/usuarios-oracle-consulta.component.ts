import { Component, signal, inject, OnInit, computed, DestroyRef, ViewChild, runInInjectionContext, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, switchMap, catchError, of, debounceTime, distinctUntilChanged, map, Observable, combineLatest, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';
import { UsuarioOracle } from '../../core/models/usuarios-oracle.model';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { MovilidadService } from '../../core/services/movilidad.service';
import { Movilidad } from '../../core/models/movilidad.model';
import { Opcion } from '../../core/models/opcion.model';
import { DialogModule } from 'primeng/dialog';
import { ProgramaService } from '../../core/services/programas.service';
import { Postulante } from '../../core/models/postulante.model';
import { PostulanteService } from '../../core/services/postulante.service';
import { CheckboxModule } from 'primeng/checkbox';
import { NotificationService } from '@microfrontends/shared-services';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

import { ApoyoEconomicoComponent } from '../ApoyoEconomico/apoyo-economico.component';
import { RubrosPresupuestalesComponent } from '../RubrosPresupuestales/rubros-presupuestales.component';
import { RubroPresupuestal } from '../../core/models/rubros-presupuestales.model';
import { ApoyoEconomico } from '../../core/models/apoyo-economico.model';
import { ApoyoEconomicoService } from '../../core/services/apoyo-economico.service';
import { RubroPresupuestalService } from '../../core/services/rubro-presupuestal.service';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormUtilsService } from '../../core/services/form-utils.service';
import { ActividadesAsignadasComponent } from '../ActividadesAsignadas/actividadesAsignadas.component';
import { ProductosCompromisosComponent } from '../ProductosCompromisos/productos-compromisos.component';
import { ProductosCompromisos } from '../../core/models/productos-compromisos.model';
import { ActividadAsignada } from '../../core/models/actividades-asignadas.model';
import { ActividadesAsignadasService } from '../../core/services/actividades-asignadas.service';
import { ProductosCompromisosService } from '../../core/services/productos-compromisos.service';
import { ActivatedRoute, Router } from '@angular/router';
import { InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { ArchivoPlanoService } from '../../core/services/archivo-plano.service';
import { MovilidadPostulanteService } from '../../core/services/movilidad-postulante.service';
import { AutorizacionService } from '../../core/services/autorizacion.service';

import { Autorizacion, AprobacionNivel } from '../../core/models/autorizacion.model';
import { MovilidadEstadoService, MovilidadAgrupada } from '../../core/services/movilidad-estado.service';

type MovilidadConPostulante = Movilidad & { movilidadPostulanteId?: string };

@Component({
  selector: 'app-usuarios-oracle-consulta',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    CardModule,
    DialogModule,
    CheckboxModule,
    ToastModule,
    ApoyoEconomicoComponent,
    RubrosPresupuestalesComponent,
    SelectModule,
    DatePickerModule,
    AutoCompleteModule,
    ActividadesAsignadasComponent,
    ProductosCompromisosComponent,
    ProgressBarModule,
    InfoTableComponent,
    MessageModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './usuarios-oracle-consulta.component.html',
})
export class UsuariosOracleConsultaComponent implements OnInit {
  private readonly api = inject(UsuariosOracleService);
  private readonly movilidadService = inject(MovilidadService);
  private readonly postulanteService = inject(PostulanteService);
  private readonly programaService = inject(ProgramaService);
  private readonly apoyoEconomicoService = inject(ApoyoEconomicoService);
  private readonly movilidadPostulanteService = inject(MovilidadPostulanteService);
  private readonly rubroPresupuestalService = inject(RubroPresupuestalService);
  private readonly actividadesService = inject(ActividadesAsignadasService);
  private readonly productosService = inject(ProductosCompromisosService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formUtilsService = inject(FormUtilsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly archivoPlanoService = inject(ArchivoPlanoService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly injector = inject(Injector);
  private readonly autorizacionService = inject(AutorizacionService);
  private readonly movilidadEstadoService = inject(MovilidadEstadoService);

  
  private movilidadesAprobadasIds: Set<string> = new Set();
  
  private movilidadesConAprobacionesIds: Set<string> = new Set();
  
  private aprobacionesCheckRequested: Set<string> = new Set();

  
  movilidadSeleccionadaTieneAprobaciones = signal<boolean>(false);
  
  movilidadSeleccionadaTieneAutorizacion = signal<boolean>(false);

  pasoActual = 2;

  usuariosSeleccionados = signal<UsuarioOracle[]>([]);
  busquedanumIdentificacion = signal<string>('');
  identificacionTemporal: string = '';
  identificacionesExtraidas = signal<string[]>([]);
  infoArchivo = signal<any>(null);
  usuarioPrevisualizacion = signal<UsuarioOracle | null>(null);
  cargando = signal(false);
  data = signal<UsuarioOracle[]>([]);
  
  private readonly MAX_CACHE_SIZE = 500;
  usuariosCache = new Map<string, UsuarioOracle>();

  private agregarUsuarioAlCache(id: string, usuario: UsuarioOracle): void {
    if (this.usuariosCache.size >= this.MAX_CACHE_SIZE) {
      const primeraClave = this.usuariosCache.keys().next().value;
      if (primeraClave) {
        this.usuariosCache.delete(primeraClave);
      }
    }
    this.usuariosCache.set(id, usuario);
  }

  /** Genera un PDF de la movilidad actualmente seleccionada */
  async generarPDF(): Promise<void> {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad || !movilidad.id) {
      this.mostrarMensaje('warn', 'Advertencia', 'Debe seleccionar una movilidad para generar el PDF');
      return;
    }

    this.movilidadService.generatePdf(movilidad.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nombre = movilidad.nombreMovilidad || 'sin-nombre';
        a.download = `movilidad-${nombre.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error generando PDF:', err);
        this.mostrarMensaje('error', 'Error', 'No se pudo generar el PDF del servidor');
      }
    });
  }

  
  

  
  progresoBusquedaMasiva = signal(0);
  totalBusquedaMasiva = signal(0);
  
  nombreArchivoValue = signal<string>('');
  tamanoArchivoValue = signal<string>('');
  columnaDetectadaValue = signal<string>('');
  totalRegistrosValue = signal<string>('');
  
  movilidades = signal<MovilidadConPostulante[]>([]);
  
  allMovilidades = signal<MovilidadConPostulante[]>([]);
  movilidadSeleccionada = signal<MovilidadConPostulante | null>(null);
  postulantesExistentes = signal<Postulante[]>([]);
  apoyosEconomicosExistentes = signal<ApoyoEconomico[]>([]);
  rubrosExistentes = signal<RubroPresupuestal[]>([]);
  actividadesExistentes = signal<ActividadAsignada[]>([]);
  productosExistentes = signal<ProductosCompromisos[]>([]);
  mostrarModalIdentificaciones = signal(false);
  readonly = signal(false);
  isEditMode = signal(false);
  isPostulantesExistentesExpanded = signal(false);
  isDatosMovilidadExpanded = signal(false);
  isApoyoEconomicoExpanded = signal(false);
  isRubrosExpanded = signal(false);
  isActividadesExpanded = signal(false);
  isProductosExpanded = signal(false);
  guardandoMasivo = signal(false);
  isPostulantesNuevosExpanded = signal(false); 
  institucionesCargadas = signal(false);
  validationErrors = signal<{[key: string]: string}>({});
  postulantesError = signal<string>('');
  movilidadError = signal<string>('');
  
  
  private movilidadOriginal: Movilidad | null = null;
  private postulantesOriginales: Postulante[] = [];
  private apoyosEconomicosOriginales: ApoyoEconomico[] = [];
  private rubrosOriginales: RubroPresupuestal[] = [];
  private usuariosSeleccionadosOriginales: UsuarioOracle[] = [];
  private actividadesOriginales: ActividadAsignada[] = [];
  private productosOriginales: ProductosCompromisos[] = [];

  private cambiosPendientesPostulantes: {
    eliminar: string[]
  } = { eliminar: [] };

  hasChanges = signal(false);

  columnsNuevos: TableColumn[] = [
    { field: 'tipoIdentificacion', header: 'Tipo Identificación', sortable: true },
    { field: 'numIdentificacion', header: 'Identificación', sortable: true },
    { field: 'nombres', header: 'Nombres', sortable: true },
    { field: 'apellidos', header: 'Apellidos', sortable: true },
    { field: 'programa', header: 'Programa', sortable: true },
    { field: 'vinculacion', header: 'Vinculación', sortable: true }
  ];

  actionsNuevos: TableAction[] = [
    { icon: 'pi pi-trash', tooltip: 'Eliminar', severity: 'danger', onClick: (row: any) => this.eliminarUsuario(row) }
  ];

  columnsExistentes: TableColumn[] = [
    { field: 'tipoDocumento', header: 'Tipo Identificación', sortable: true },
    { field: 'numIdentificacion', header: 'Identificación', sortable: true },
    { field: 'nombres', header: 'Nombres', sortable: true },
    { field: 'apellidos', header: 'Apellidos', sortable: true },
    { field: 'programa', header: 'Programa', sortable: true },
    { field: 'vinculacion', header: 'Vinculación', sortable: true }
  ];

  actionsExistentes: TableAction[] = [
    { icon: 'pi pi-trash', tooltip: 'Marcar para eliminar (se eliminará al presionar Actualizar)', severity: 'danger', onClick: (row: any) => this.eliminarPostulanteExistente(row) }
  ];

  @ViewChild(ApoyoEconomicoComponent) apoyoEconomicoComponent!: ApoyoEconomicoComponent;
  @ViewChild(ActividadesAsignadasComponent) actividadesAsignadasComponent!: ActividadesAsignadasComponent;
  @ViewChild(ProductosCompromisosComponent) productosCompromisosComponent!: ProductosCompromisosComponent;
  @ViewChild(RubrosPresupuestalesComponent) rubrosPresupuestalesComponent!: RubrosPresupuestalesComponent;


  form!: FormGroup;

  constructor() {
    // No se activa la búsqueda reactiva al escribir; la búsqueda se realizará
    // explícitamente cuando el usuario pulse el botón "Validar".
  }


  get progresoFormulario(): number {
    const secciones = [
      () => this.movilidadSeleccionada() !== null,
      () => this.usuariosSeleccionados().length > 0
    ];
    return Math.round(secciones.filter(seccion => seccion()).length / secciones.length * 100);
  }
  ngOnInit(): void {
    this.initForm();
    this.cargarMovilidades();
    
    this.cargarTodasLasMovilidades();
       
    this.movilidadEstadoService.movilidadesAprobadas$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((movs: MovilidadAgrupada[]) => {
        this.movilidadesAprobadasIds = new Set(movs.map(m => m.movilidadId));
      });

    
    this.movilidadEstadoService.movilidadActualizada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((movilidadId) => {
        if (!movilidadId) return;
        this.movilidadesConAprobacionesIds.delete(movilidadId);
        this.aprobacionesCheckRequested.delete(movilidadId);
        const sel = this.movilidadSeleccionada();
        if (sel && (sel.id === movilidadId || (sel as any).movilidadPostulanteId === movilidadId)) {
          
          this.comprobarAprobacionesBackendParaMovilidad(sel);
        }
      });

    this.route.queryParams.subscribe(params => {
      const movilidadId = params['id'];
      const readonlyParam = params['readonly'];
      
      const isReadonly = readonlyParam === 'true';
      const isEdit = !!movilidadId && !isReadonly;
      
      this.readonly.set(isReadonly);
      this.isEditMode.set(isEdit);
      
      if (movilidadId) {
        this.cargarMovilidadPorId(movilidadId);
      }
    });
  }


  tieneAutorizacionesAprobadas(movilidad?: Movilidad | null): boolean {
    
    if (!movilidad) return false;

    const mpId = (movilidad as any).movilidadPostulanteId || movilidad.id;

    
    if (this.movilidadesConAprobacionesIds.has(mpId) || this.movilidadesConAprobacionesIds.has(movilidad.id)) {
      return true;
    }
 
    if (!this.aprobacionesCheckRequested.has(mpId)) {
      this.aprobacionesCheckRequested.add(mpId);
      this.autorizacionService.getAprobacionesPorMovilidad(mpId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (aprobaciones) => {
          const tiene = Array.isArray(aprobaciones) && aprobaciones.length > 0;
          if (tiene) this.movilidadesConAprobacionesIds.add(mpId);
          const sel = this.movilidadSeleccionada();
          if (sel && (sel.id === movilidad.id || (sel as any).movilidadPostulanteId === mpId)) {
            this.movilidadSeleccionadaTieneAprobaciones.set(tiene);
          }
        },
        error: () => {
          const sel = this.movilidadSeleccionada();
          if (sel && sel.id === movilidad.id) this.movilidadSeleccionadaTieneAprobaciones.set(false);
        }
      });
    }

    return false; 
  }

  private updateChangesState(): void {
    if (!this.isEditMode()) return;

    const hasChanges = this.detectarCambiosEnDatos();
    this.hasChanges.set(hasChanges);
  }

  private comprobarAprobacionesBackendParaMovilidad(movilidad: Movilidad | MovilidadConPostulante | null): void {
    if (!movilidad || !movilidad.id) {
      this.movilidadSeleccionadaTieneAutorizacion.set(false);
      this.movilidadSeleccionadaTieneAprobaciones.set(false);
      return;
    }

    const buscarId = (movilidad as any).movilidadPostulanteId || movilidad.id;

    
    if (this.aprobacionesCheckRequested.has(buscarId)) {
      return;
    }
    this.aprobacionesCheckRequested.add(buscarId);

    
    this.movilidadSeleccionadaTieneAutorizacion.set(false);
    this.movilidadSeleccionadaTieneAprobaciones.set(false);

    
    this.autorizacionService.getAprobacionesPorMovilidad(buscarId)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (aprobaciones: AprobacionNivel[]) => {
          this.aprobacionesCheckRequested.delete(buscarId);
          const hayNivelesAprobados = Array.isArray(aprobaciones) && aprobaciones.some(a => a.estado === 'aprobado');
          this.movilidadSeleccionadaTieneAutorizacion.set(hayNivelesAprobados);
          this.movilidadSeleccionadaTieneAprobaciones.set(hayNivelesAprobados);
          if (hayNivelesAprobados) {
            this.movilidadesConAprobacionesIds.add(buscarId);
          } else {
            this.movilidadesConAprobacionesIds.delete(buscarId);
          }
        },
        error: () => {
          this.aprobacionesCheckRequested.delete(buscarId);
          this.movilidadSeleccionadaTieneAutorizacion.set(false);
          this.movilidadSeleccionadaTieneAprobaciones.set(false);
        }
      });
  }

  private ejecutarSeguro(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      this.notificationService.showNotification('error', (error as Error).message);
    }
  }

  private scrollToField(fieldName: string): void {
    const element = document.getElementById(fieldName);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private mostrarMensaje(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.notificationService.showNotification(severity, { summary, detail });
  }

  private initForm(): void {
    this.form = this.fb.group({
      terminosCondiciones: [false, Validators.requiredTrue],
      identificacionTemporal: ['']
    });
  }

  private setupReactiveSearch(): void {
    toObservable(this.busquedanumIdentificacion).pipe(
      debounceTime(150), 
      distinctUntilChanged(),
      switchMap(term => {
        const trimmedTerm = term.trim();
        if (!trimmedTerm) {
          return of(null);
        }
        
        if (this.usuariosCache.has(trimmedTerm)) {
          return of(this.usuariosCache.get(trimmedTerm)!);
        }
        
        this.cargando.set(true);
        return this.api.getById(trimmedTerm).pipe(
          map(user => {
            const usuario = user as UsuarioOracle;
            if (usuario) {
              this.agregarUsuarioAlCache(trimmedTerm, usuario);
            }
            return usuario;
          }),
          catchError(() => of(null)),
          finalize(() => this.cargando.set(false))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      this.usuarioPrevisualizacion.set(result);
      if (!result && this.busquedanumIdentificacion().trim()) {
        this.mostrarMensaje('error', 'Usuario no encontrado', 'No se encontró el usuario con ese identificador');
      }
    });
  }

  private async cargarMovilidades(): Promise<void> {
    return new Promise((resolve) => {
      
      this.movilidadPostulanteService.getMovilidadesFromPostulantes()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((movilidades: any[]) => {
          const enriquecidas = movilidades as MovilidadConPostulante[];
          this.movilidades.set(this.preserveSelectedOverrideInList(enriquecidas));
          resolve();
        }, (err) => {
          
          this.movilidadService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(all => {
            
            const enriquecidas = (all || []).map(m => ({ ...m } as MovilidadConPostulante));
            this.movilidades.set(this.preserveSelectedOverrideInList(enriquecidas));
            resolve();
          }, () => {
            
            resolve();
          });
        });
    });
  }
  
  private cargarTodasLasMovilidades(): void {
    this.movilidadService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (movilidades) => this.allMovilidades.set(this.preserveSelectedOverrideInList(movilidades)),
      error: (err) => {
        this.allMovilidades.set([]);
      }
    });
  }

  






  
  
  private preserveSelectedOverrideInList(list: Movilidad[]): Movilidad[] {
    if (!Array.isArray(list) || list.length === 0) return list;
    const current = this.movilidades();
    return list.map(m => {
      const local = current.find(c => c.id === m.id);
      // Solo conservar el movilidadPostulanteId local si viene válido y distinto del id de la movilidad
      const localMpId = local ? (local as any).movilidadPostulanteId : undefined;
      const validMpId = localMpId && localMpId !== m.id ? localMpId : (m as any).movilidadPostulanteId;
      return { ...m, movilidadPostulanteId: validMpId };
    });
  }




  private cargarMovilidadPorId(movilidadId: string): void {
    this.movilidadService.getByIdOrNull(movilidadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (movilidad) => {
          if (movilidad) {
            
            this.setMovilidadSeleccionadaPreservandoOverride(movilidad);           
            this.comprobarAprobacionesBackendParaMovilidad(movilidad);
            this.cargarEstadoAutorizacion(movilidad.id);                                 
            this.cargarDatosRelacionados(movilidad.id);            
            if (this.isEditMode()) {
              this.guardarEstadoOriginal(movilidad);
            }
          }
        },
        error: (error) => {
          this.mostrarMensaje('error', 'Error', 'No se pudo cargar la movilidad');
        }
      });
  }

  private cargarDatosRelacionados(movilidadId: string): void {
    this.cargarPostulantesPorMovilidad(movilidadId, this.isEditMode());
    this.cargarRubrosPresupuestales(movilidadId, this.isEditMode());
    this.cargarApoyoEconomico(movilidadId, this.isEditMode());
    this.cargarActividades(movilidadId, this.isEditMode());
    this.cargarProductos(movilidadId, this.isEditMode());
  }

  private guardarEstadoOriginal(movilidad: any): void {
    this.movilidadOriginal = { ...movilidad };
    
  }

  seleccionarMovilidad(event: any): void {
    this.ejecutarSeguro(() => {
      const movilidadId = event.value;
      if (!movilidadId) {
        
        if (this.isEditMode() && this.hasChanges()) {
          this.confirmationService.confirm({
            message: 'Tiene cambios sin guardar en la movilidad actual. ¿Desea descartar los cambios?',
            header: 'Cambios sin guardar',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Descartar cambios',
            rejectLabel: 'Cancelar',
            accept: () => {
              this.resetMovilidad();
            },
            reject: () => {
              const movilidadActual = this.movilidadSeleccionada();
              if (movilidadActual?.id) {
                
                
                return;
              }
            }
          });
        } else {
          this.resetMovilidad();
        }
        return;
      }

      
      if (this.isEditMode() && this.hasChanges()) {
        this.confirmationService.confirm({
          message: 'Tiene cambios sin guardar. ¿Desea descartar los cambios y seleccionar otra movilidad?',
          header: 'Cambios sin guardar',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Descartar y cambiar',
          rejectLabel: 'Cancelar',
          accept: () => {
            this.cambiarAMovilidad(movilidadId);
          },
          reject: () => {
          }
        });
      } else {
        this.cambiarAMovilidad(movilidadId);
      }
    });
  }

  private cambiarAMovilidad(movilidadId: string): void {
    
    let movilidad = this.movilidades().find(m => m.id === movilidadId);

    
    if (!movilidad) {
      movilidad = this.allMovilidades().find(m => m.id === movilidadId) as Movilidad | undefined;
    }

    if (!movilidad || !movilidad.id) {
      
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Movilidad inválida seleccionada' });
      return;
    }

    
    this.guardarEstadoOriginal(movilidad);  
    this.setMovilidadSeleccionadaPreservandoOverride(movilidad as any);   
    this.cargarEstadoAutorizacion(movilidad.id);   
    this.cargarDatosRelacionadosOptimizados(movilidad.id);
  }

  private cargarEstadoAutorizacion(movilidadId: string): void {
    this.movilidadPostulanteService.getByMovilidadId(movilidadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (relaciones) => {
          if (!relaciones || relaciones.length === 0) {  
            return;
          }
          this.postulanteService.getAutorizacionForMovilidad(movilidadId)
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
              }
            });
        },
        error: () => {
          
        }
      });
  }


  private cargarDatosRelacionadosOptimizados(movilidadId: string): void {
    this.cargarPostulantesPorMovilidad(movilidadId);
    
    setTimeout(() => {
      this.cargarRubrosPresupuestales(movilidadId);
      this.cargarApoyoEconomico(movilidadId);
      this.cargarActividades(movilidadId);
      this.cargarProductos(movilidadId);
    }, 100);
  }


  private resetMovilidad(): void {
    this.movilidadSeleccionada.set(null);
    this.postulantesExistentes.set([]);
    this.apoyosEconomicosExistentes.set([]);
    this.rubrosExistentes.set([]);
    this.actividadesExistentes.set([]);
    this.productosExistentes.set([]);
    this.limpiarEstadoOriginal();
      }

  private limpiarEstadoOriginal(): void {
    this.movilidadOriginal = null;
    this.postulantesOriginales = [];
    this.apoyosEconomicosOriginales = [];
    this.rubrosOriginales = [];
    this.actividadesOriginales = [];
    this.productosOriginales = [];
    this.usuariosSeleccionadosOriginales = [];
    this.hasChanges.set(false);
  }

  private cargarPostulantesPorMovilidad(movilidadId: string, guardarOriginal = false): void {
    this.postulanteService.getByMovilidad(movilidadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (postulantes: Postulante[]) => {
          
          const vistos = new Set<string>();
          const unicos: Postulante[] = [];
          for (const p of postulantes || []) {
            const clave = p.numIdentificacion || p.id?.toString();
            if (clave && !vistos.has(clave)) {
              vistos.add(clave);
              unicos.push(p);
            }
          }
          this.postulantesExistentes.set(unicos);

          try {
            this.actualizarFormularioSolicitarAutorizacion(unicos);
          } catch (err) {
            }

          if (guardarOriginal) {
            this.postulantesOriginales = JSON.parse(JSON.stringify(unicos));
          }
        },

        error: () => {
          this.postulantesExistentes.set([]);

          this.actualizarFormularioSolicitarAutorizacion([]);
        }
      });
  }

  private procesarPostulantes(postulantes: Postulante[], guardarOriginal: boolean): Observable<UsuarioOracle[]> {
    if (!Array.isArray(postulantes)) {
      return of([]);
    }

    
    const vistos = new Set<string>();
    const unicos: Postulante[] = [];
    for (const p of postulantes || []) {
      const clave = p.numIdentificacion || p.id?.toString();
      if (clave && !vistos.has(clave)) {
        vistos.add(clave);
        unicos.push(p);
      }
    }
    this.postulantesExistentes.set(unicos);

    this.actualizarFormularioSolicitarAutorizacion(unicos);

    if (guardarOriginal) {
      this.postulantesOriginales = JSON.parse(JSON.stringify(postulantes));
    }

    if (postulantes.length === 0) {
      return of([]);
    }

    return this.obtenerUsuariosParaPostulantes(postulantes);
  }

  private actualizarFormularioSolicitarAutorizacion(postulantes: Postulante[]): void {
    const mov = this.movilidadSeleccionada();    
    let tieneSolicitarAutorizacion = postulantes.some((p: Postulante) => p.solicitarAutorizacion === true);

    if (mov && typeof mov.solicitarAutorizacion !== 'undefined') {
      tieneSolicitarAutorizacion = mov.solicitarAutorizacion as boolean;
    }

    if (this.form) {
      
      this.form.patchValue({ solicitarAutorizacion: tieneSolicitarAutorizacion }, { emitEvent: false });
    }

    
    if (mov) {
      this.actualizarEstadoLocal(mov, tieneSolicitarAutorizacion);
    }
  }

  private obtenerUsuariosParaPostulantes(postulantes: Postulante[]): Observable<UsuarioOracle[]> {
    const { idsEnCache, idsNoCacheados } = this.separarIdsCacheados(postulantes);

    const usuariosCache: UsuarioOracle[] = [];
    for (const id of idsEnCache) {
      const usuario = this.usuariosCache.get(id);
      if (usuario) {
        usuariosCache.push(usuario);
      }
    }

    if (idsNoCacheados.length === 0) {
      return of(usuariosCache);
    }

    return this.buscarUsuariosFaltantes(idsNoCacheados).pipe(
      map(nuevosUsuarios => [...usuariosCache, ...nuevosUsuarios])
    );
  }

  private separarIdsCacheados(postulantes: Postulante[]): { idsEnCache: string[], idsNoCacheados: string[] } {
    const idsEnCache: string[] = [];
    const idsNoCacheados: string[] = [];

    if (!Array.isArray(postulantes)) {
      return { idsEnCache, idsNoCacheados };
    }

    postulantes.forEach(p => {
      
      if (!p?.numIdentificacion?.trim()) {
        return; 
      }

      const id = p.numIdentificacion.trim();
      if (this.usuariosCache.has(id)) {
        idsEnCache.push(id);
      } else {
        idsNoCacheados.push(id);
      }
    });

    return { idsEnCache, idsNoCacheados };
  }

  private buscarUsuariosFaltantes(idsNoCacheados: string[]): Observable<UsuarioOracle[]> {
    return this.api.getByIdentificaciones(idsNoCacheados).pipe(
      map((nuevosUsuarios: UsuarioOracle[]) => {
        
        nuevosUsuarios.forEach(u => this.agregarUsuarioAlCache(u.numIdentificacion, u));
        return nuevosUsuarios;
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }

  private actualizarPostulantesConUsuarios(usuarios: UsuarioOracle[]): void {
    
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return;
    }

    const postulantesActuales = this.postulantesExistentes();
    if (!Array.isArray(postulantesActuales) || postulantesActuales.length === 0) {
      return;
    }

    const postulantesActualizados = postulantesActuales.map(postulante => {
      if (!postulante?.numIdentificacion) {
        return postulante; 
      }

      const usuarioOracle = usuarios.find((u: UsuarioOracle) =>
        u?.numIdentificacion === postulante.numIdentificacion
      );

      return usuarioOracle ? { ...postulante, usuarioOracle } : postulante;
    });

    this.postulantesExistentes.set(postulantesActualizados);
  }

  private cargarRubrosPresupuestales(movilidadId: string, guardarOriginal = false): void {
    this.rubroPresupuestalService.getByMovilidadId(movilidadId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      )
      .subscribe(rubros => {
        this.rubrosExistentes.set(rubros);
        if (guardarOriginal) {
          this.rubrosOriginales = JSON.parse(JSON.stringify(rubros));
        }
      });
  }

  private cargarApoyoEconomico(movilidadId: string, guardarOriginal = false): void {
    this.apoyoEconomicoService.getByMovilidadId(movilidadId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      )
      .subscribe(apoyosEconomicos => {
        this.apoyosEconomicosExistentes.set(apoyosEconomicos);
        if (guardarOriginal) {
          this.apoyosEconomicosOriginales = JSON.parse(JSON.stringify(apoyosEconomicos));
        }
      });
  }

  private cargarActividades(movilidadId: string, guardarOriginal = false): void {
    this.actividadesService.getActividadesByMovilidad(movilidadId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      )
      .subscribe(actividades => {
        this.actividadesExistentes.set(actividades);
        if (guardarOriginal) {
          this.actividadesOriginales = JSON.parse(JSON.stringify(actividades));
        }
      });
  }

  private cargarProductos(movilidadId: string, guardarOriginal = false): void {
    this.productosService.getProductosByMovilidad(movilidadId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      )
      .subscribe(productos => {
        this.productosExistentes.set(productos);
        if (guardarOriginal) {
          this.productosOriginales = JSON.parse(JSON.stringify(productos));
        }
      });
  }

  onMovilidadGuardada(movilidadId: any): void {
    const id = movilidadId as string;
    this.cargarMovilidades().then(() => {
      if (id) {
        const movilidades = this.movilidades();
        const movilidadSeleccionada = movilidades.find(m => m.id === id);
        if (movilidadSeleccionada) {
          this.setMovilidadSeleccionadaPreservandoOverride(movilidadSeleccionada);
          this.form.patchValue({ movilidad: movilidadSeleccionada });
        }
      }
    });
  }

  onChildSiguiente(): void {
  }

  async siguientePaso1(): Promise<void> {
  }

  onMovilidadSeleccionada(movilidad: any): void {
    const mov = movilidad as Movilidad;
    this.setMovilidadSeleccionadaPreservandoOverride(mov);
  }

  avanzarPaso(): void {
  }

  retrocederPaso(): void {
  }

  abrirModalIdentificaciones(): void {
    this.mostrarModalIdentificaciones.set(true);
  }

  cerrarModalIdentificaciones(): void {
    this.mostrarModalIdentificaciones.set(false);
  }

  togglePostulantesExistentes(): void {
    this.isPostulantesExistentesExpanded.set(!this.isPostulantesExistentesExpanded());
  }

  toggleDatosMovilidad(): void {
    this.isDatosMovilidadExpanded.set(!this.isDatosMovilidadExpanded());
  }

  toggleApoyoEconomico(): void {
    this.isApoyoEconomicoExpanded.set(!this.isApoyoEconomicoExpanded());
  }

  toggleRubros(): void {
    this.isRubrosExpanded.set(!this.isRubrosExpanded());
  }

  toggleActividades(): void {
    this.isActividadesExpanded.set(!this.isActividadesExpanded());
  }

  toggleProductos(): void {
    this.isProductosExpanded.set(!this.isProductosExpanded());
  }

  togglePostulantesNuevos(): void {
    this.isPostulantesNuevosExpanded.set(!this.isPostulantesNuevosExpanded());
  }

  handleProductosError(error: string): void {
    this.mostrarMensaje('error', 'Error', error);
  }

  handleActividadesError(error: string): void {
    this.notificationService.showNotification('error', { summary: 'Error', detail: error });
  }

  cargar(): void {
    this.cargando.set(true);
    this.api.getAll()
      .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.data.set(Array.isArray(res) ? res : (res ? [res] : [])),
        error: () => this.data.set([]),
      });
  }

  confirmarAgregarUsuario(): void {
    this.ejecutarSeguro(() => {
      const usuario = this.usuarioPrevisualizacion();
      if (!usuario) throw new Error('No hay usuario seleccionado');

      
      if (this.usuariosSeleccionados().some(u => u.numIdentificacion === usuario.numIdentificacion)) {
        throw new Error('Ese usuario ya fue agregado a la lista de nuevos postulantes');
      }

      
      if (this.cambiosPendientesPostulantes.eliminar.length > 0) {
        
        const idMap = new Map<string,string>();
        for (const p of this.postulantesOriginales) {
          if (p.id) idMap.set(p.numIdentificacion, p.id.toString());
        }
        const eliminadoIndex = this.cambiosPendientesPostulantes.eliminar.findIndex(pid => {
          const ident = idMap.get(usuario.numIdentificacion);
          return ident === pid;
        });
        if (eliminadoIndex >= 0) {
          
          const pid = this.cambiosPendientesPostulantes.eliminar.splice(eliminadoIndex, 1)[0];
          const recuperado = this.postulantesOriginales.find(p => p.id && p.id.toString() === pid);
          if (recuperado) {
            this.postulantesExistentes.update(arr => [...arr, recuperado]);
          }
          this.hasChanges.set(this.detectarCambiosEnDatos());
          this.mostrarMensaje('info', 'Recuperado', 'Se ha restaurado el postulante eliminado previamente');
          return; 
        }
      }

      
      if (this.postulantesExistentes().some(p => p.numIdentificacion === usuario.numIdentificacion)) {
        throw new Error('Ese usuario ya está registrado como postulante existente en esta movilidad');
      }

      this.usuariosSeleccionados.update(users => [...users, usuario]);
      this.limpiarBusqueda();
    });
  }

  cancelarAgregarUsuario(): void {
    this.limpiarBusqueda();
  }

  eliminarUsuario(u: UsuarioOracle): void {
    
    this.usuariosSeleccionados.update(users =>
      users.filter(user => user.numIdentificacion !== u.numIdentificacion)
    );

    
    const postulanteAEliminar = this.postulantesExistentes().find(p => p.numIdentificacion === u.numIdentificacion);
    if (postulanteAEliminar) {
      this.eliminarPostulanteExistente(postulanteAEliminar);
    }
  }

  private limpiarBusqueda(): void {
    this.usuarioPrevisualizacion.set(null);
    this.busquedanumIdentificacion.set('');
    if (this.form && this.form.get('identificacionTemporal')) {
      this.form.get('identificacionTemporal')!.setValue('');
    } else {
      this.identificacionTemporal = '';
    }
  }

  validarIdentificacion(): void {
    const formVal = this.form?.get('identificacionTemporal')?.value;
    console.log('[UsuariosOracle] validarIdentificacion CLICKED, identificacionTemporal(form) =', formVal, '  (prop) =', this.identificacionTemporal);
    const id = ((formVal && String(formVal)) || this.identificacionTemporal || '').trim();
    if (!id) {
      this.mostrarMensaje('warn', 'Advertencia', 'Ingrese una identificación para validar');
      return;
    }

    // Guardar valor de búsqueda actual
    this.busquedanumIdentificacion.set(id);
    console.log('[UsuariosOracle] validarIdentificacion id=', id);
    try {
      console.log('[UsuariosOracle] expected URL =', `${location.origin}/api/oracle/profesores-oracle/${encodeURIComponent(id)}`);
    } catch (e) {
      console.log('[UsuariosOracle] could not compute expected URL');
    }

    // First check cache
    if (this.usuariosCache.has(id)) {
      const cached = this.usuariosCache.get(id)!;
      this.usuarioPrevisualizacion.set(cached);
      return;
    }

    this.cargando.set(true);
    this.api.getById(id).subscribe({
      next: (user: UsuarioOracle | null) => {
        console.log('[UsuariosOracle] respuesta getById', user);
        if (user) {
          this.agregarUsuarioAlCache(id, user);
          this.usuarioPrevisualizacion.set(user);
        } else {
          this.usuarioPrevisualizacion.set(null);
          this.mostrarMensaje('error', 'Usuario no encontrado', 'No se encontró el usuario con ese identificador');
        }
      },
      error: (err: any) => {
        this.usuarioPrevisualizacion.set(null);
        if (err && err.status === 404) {
          this.mostrarMensaje('error', 'Usuario no encontrado', 'No se encontró el usuario con ese identificador');
        } else {
          const code = err?.status ? ` (${err.status})` : '';
          const msg = err?.message ? `: ${err.message}` : '';
          this.mostrarMensaje('error', 'Error al consultar servicio' + code, 'Detalle' + msg);
        }
      },
      complete: () => {
        this.cargando.set(false);
      }
    });
  }

  limpiarFormulario(): void {
    this.form.reset();
    this.usuariosSeleccionados.set([]);
    this.usuarioPrevisualizacion.set(null);
    this.movilidadSeleccionada.set(null);
    this.apoyosEconomicosExistentes.set([]);
    this.rubrosExistentes.set([]);
    this.actividadesExistentes.set([]);
    this.productosExistentes.set([]);
    this.identificacionesExtraidas.set([]);
    this.infoArchivo.set(null);
    this.nombreArchivoValue.set('');
    this.tamanoArchivoValue.set('');
    this.columnaDetectadaValue.set('');
    this.totalRegistrosValue.set('');
    this.isEditMode.set(false);
    this.limpiarEstadoOriginal();
  }

  private detectarCambiosEnDatos(): boolean {
    
    if (!this.isEditMode() || !this.movilidadOriginal) {
      return false;
    }

    
    const hayCambiosEnArrays = this.detectarCambiosEnPostulantes() ||
                               this.detectarCambiosEnApoyos() ||
                               this.detectarCambiosEnRubros() ||
                               this.detectarCambiosEnActividades() ||
                               this.detectarCambiosEnProductos() ||
                               this.detectarCambiosEnUsuarios();

    return hayCambiosEnArrays || this.detectarCambiosEnFormulario();
  }

  private detectarCambiosEnFormulario(): boolean {
    if (!this.movilidadOriginal) return false;

    if (!this.form.dirty && !this.form.touched) return false;
    
    const currentFormValue = this.form.getRawValue();
    const originalFormValue = {
      nombreMovilidad: this.movilidadOriginal.nombreMovilidad,
      programa: this.movilidadOriginal.programa,
      tipoMovilidad: this.movilidadOriginal.tipoMovilidad,
      modalidad: this.movilidadOriginal.modalidad,
      objeto: this.movilidadOriginal.objeto
    };

    const changed = JSON.stringify(currentFormValue) !== JSON.stringify(originalFormValue);
    return changed;
  }

  private detectarCambiosEnPostulantes(): boolean {
    return this.detectarCambiosEnArray(this.postulantesExistentes(), this.postulantesOriginales) ||
           this.cambiosPendientesPostulantes.eliminar.length > 0;
  }

  private detectarCambiosEnApoyos(): boolean {
    return this.detectarCambiosEnArray(this.apoyosEconomicosExistentes(), this.apoyosEconomicosOriginales);
  }

  private detectarCambiosEnRubros(): boolean {
    return this.detectarCambiosEnArray(this.rubrosExistentes(), this.rubrosOriginales);
  }

  private detectarCambiosEnActividades(): boolean {
    return this.detectarCambiosEnArray(this.actividadesExistentes(), this.actividadesOriginales);
  }

  private detectarCambiosEnProductos(): boolean {
    return this.detectarCambiosEnArray(this.productosExistentes(), this.productosOriginales);
  }

  private detectarCambiosEnUsuarios(): boolean {
    return this.usuariosSeleccionados().length > 0 || 
           this.usuariosSeleccionados().length !== this.usuariosSeleccionadosOriginales.length;
  }

  private detectarCambiosEnArray(currentArray: any[], originalArray: any[]): boolean {
    if (!originalArray || !Array.isArray(currentArray)) return false;

    return currentArray.length !== originalArray.length;
  }

  actualizarMovilidad(): void {
    this.ejecutarSeguro(() => {
      if (!this.isEditMode()) {
        throw new Error('No se puede actualizar en modo creación');
      }

      if (!this.hasChanges()) {
        this.mostrarMensaje('info', 'Información', 'No hay cambios para guardar');
        return;
      }

      if (this.form.invalid) {
        const control = this.form.get('terminosCondiciones');
        control?.markAsTouched();
        control?.markAsDirty();
        this.scrollToField('terminosCondiciones');
        return;
      }

      this.mostrarMensaje('success', 'Éxito', 'Movilidad actualizada correctamente');

      this.sincronizarEstadoOriginal();
    });
  }

  private sincronizarEstadoOriginal(): void {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad) return;
    
    this.movilidadOriginal = { ...movilidad };
    this.postulantesOriginales = [...this.postulantesExistentes()];
    this.apoyosEconomicosOriginales = [...this.apoyosEconomicosExistentes()];
    this.rubrosOriginales = [...this.rubrosExistentes()];
    this.actividadesOriginales = [...this.actividadesExistentes()];
    this.productosOriginales = [...this.productosExistentes()];
    this.usuariosSeleccionadosOriginales = [...this.usuariosSeleccionados()];
    this.hasChanges.set(false);
  }

  private revertirCambios(): void {
    if (!this.movilidadOriginal) return;

    
    this.movilidadSeleccionada.set({ ...this.movilidadOriginal });

    
    this.postulantesExistentes.set([...this.postulantesOriginales]);
    this.apoyosEconomicosExistentes.set([...this.apoyosEconomicosOriginales]);
    this.rubrosExistentes.set([...this.rubrosOriginales]);
    this.actividadesExistentes.set([...this.actividadesOriginales]);
    this.productosExistentes.set([...this.productosOriginales]);
    this.usuariosSeleccionados.set([...this.usuariosSeleccionadosOriginales]);

    
    if (this.form && this.movilidadOriginal) {
      this.form.patchValue({
        nombreMovilidad: this.movilidadOriginal.nombreMovilidad,
        programa: this.movilidadOriginal.programa,
        tipoMovilidad: this.movilidadOriginal.tipoMovilidad,
        modalidad: this.movilidadOriginal.modalidad,
        objeto: this.movilidadOriginal.objeto
      });
    }

    
    this.cambiosPendientesPostulantes = { eliminar: [] };
    this.hasChanges.set(false);
  }

  
  notificarCambioEnPostulantes(): void {
    this.updateChangesState();
  }

  notificarCambioEnApoyos(): void {
    this.updateChangesState();
  }

  notificarCambioEnRubros(): void {
    this.updateChangesState();
  }

  notificarCambioEnActividades(): void {
    this.updateChangesState();
  }

  notificarCambioEnProductos(): void {
    this.updateChangesState();
  }

  async guardarPostulantes(): Promise<void> {
    try {

      if (!this.isEditMode() && this.usuariosSeleccionados().length === 0) {
        this.postulantesError.set('Debe agregar al menos un postulante antes de guardar');
        this.scrollToField('postulantes-section');
        return;
      } else {
        this.postulantesError.set('');
      }

      if (this.form.invalid) {
        const control = this.form.get('terminosCondiciones');
        control?.markAsTouched();
        control?.markAsDirty();
        this.scrollToField('terminosCondiciones');
        return;
      }

      const postulantesAAgregar = this.filtrarPostulantesNuevos();
      let movilidad = this.movilidadSeleccionada();

      
      if (!movilidad) {
        this.mostrarMensaje('error', 'Error', 'Debe crear o seleccionar una movilidad antes de guardar postulantes');
        return;
      }

      if (postulantesAAgregar.length > 0) {
        this.crearPostulantesNuevos(postulantesAAgregar, movilidad!);
      } else {
        
        const postulantesDespuesDeEliminaciones = this.postulantesExistentes().length - this.cambiosPendientesPostulantes.eliminar.length;
        if (postulantesDespuesDeEliminaciones < 1) {
          
          if (this.isEditMode()) {
            
            this.confirmationService.confirm({
              message: 'Al eliminar todos los postulantes, se limpiarán las relaciones de la movilidad saliente. La movilidad raíz permanecerá intacta. ¿Desea continuar?',
              header: 'Confirmar limpieza de relaciones',
              icon: 'pi pi-exclamation-triangle',
              acceptLabel: 'Sí, limpiar relaciones',
              rejectLabel: 'Cancelar',
              accept: () => {
                
                this.limpiarTodasLasRelaciones(movilidad!);
              },
              reject: () => {
                
              }
            });
            return;
          } else {
            
            this.mostrarMensaje('error', 'Error de validación', 'Debe haber al menos un postulante registrado en la movilidad');
            this.scrollToField('postulantes-section');
            return;
          }
        }

        this.guardarComponentes(movilidad!);
      }
    } catch (error) {
      this.mostrarMensaje('error', 'Error', 'Ocurrió un error durante el guardado');
    }
  }


  private filtrarPostulantesNuevos(): UsuarioOracle[] {
    const existingIds = new Set(this.postulantesExistentes().map(p => p.numIdentificacion));
    return this.usuariosSeleccionados().filter(u => !existingIds.has(u.numIdentificacion));
  }

  private crearPostulantesNuevos(postulantesAAgregar: UsuarioOracle[], movilidad: Movilidad): void {
    const solicitarAutorizacion = movilidad.solicitarAutorizacion ?? false;
    const nuevosPostulantes = this.mapearAPostulantes(postulantesAAgregar, solicitarAutorizacion);
    this.validarPostulantesCompletos(nuevosPostulantes);

    this.postulanteService.createManyForMovilidad(movilidad.id, nuevosPostulantes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (creados: Postulante[]) => this.manejarPostulantesCreados(creados, movilidad),
        error: (error) => this.manejarErrorPostulantes(error, nuevosPostulantes, movilidad)
      });
  }

  private mapearAPostulantes(usuarios: UsuarioOracle[], solicitarAutorizacion = false): Omit<Postulante, 'id'>[] {
    return usuarios.map(usuario => ({
      numIdentificacion: usuario.numIdentificacion,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      programa: usuario.programa,
      vinculacion: usuario.vinculacion,
      fechaPostulacion: new Date().toISOString(),
      estado: 'ACTIVO',
      solicitarAutorizacion: solicitarAutorizacion
    }));
  }

  private validarPostulantesCompletos(postulantes: Omit<Postulante, 'id'>[]): void {
    if (postulantes.some(p => !p.numIdentificacion || !p.nombres || !p.apellidos)) {
      throw new Error('Algunos postulantes tienen datos incompletos');
    }
  }

  private manejarErrorPostulantes(error: any, postulantes: Omit<Postulante, 'id'>[], movilidad: Movilidad): void {
    if (error.status === 409 || error.status === 400 || error.error?.tipo === 'DUPLICADO' || error.error?.message?.includes('duplicado') || error.error?.message?.includes('ya existe') || error.error?.message?.includes('ya se encuentra')) {
      this.mostrarMensaje('warn', 'Usuario ya registrado', 'El usuario ya se encuentra en la base de datos para esta movilidad');
      this.cargarPostulantesPorMovilidad(movilidad.id);
      this.usuariosSeleccionados.set([]);
      return;
    }

    this.mostrarMensaje('error', 'Error', 'Error al guardar los nuevos postulantes');
    this.cargarPostulantesPorMovilidad(movilidad.id);
  }

  private manejarPostulantesCreados(creados: Postulante[], movilidad: Movilidad): void {
    this.cargarPostulantesPorMovilidad(movilidad.id);
    this.usuariosSeleccionados.set([]);

    
    
    
    setTimeout(async () => {
      await this.guardarComponentes(movilidad);
    }, 1000);
  }

  async guardarCambios(): Promise<void> {
    try {
      if (!this.hasChanges()) {
        throw new Error('No hay cambios pendientes para guardar');
      }
      const movilidad = this.movilidadSeleccionada();
      if (!movilidad?.id) throw new Error('Selecciona una movilidad válida');

      if (this.form.invalid) {
        this.form.get('terminosCondiciones')?.markAsTouched();
        this.scrollToField('terminosCondiciones');
        return;
      }

      await this.guardarComponentes(movilidad);
      this.mostrarMensaje('success', 'Éxito', 'Cambios guardados correctamente');
    } catch (error: any) {
      this.mostrarMensaje('error', 'Error', error.message || 'Error al guardar cambios');
    }
  }

  private async guardarComponentes(movilidad: Movilidad): Promise<void> {
    this.guardandoMasivo.set(true);
    try {  
      if (this.cambiosPendientesPostulantes.eliminar.length > 0) {
        for (const postulanteId of this.cambiosPendientesPostulantes.eliminar) {
          await this.postulanteService.deleteFromMovilidad(movilidad.id, postulanteId).toPromise();
          await this.postulanteService.delete(postulanteId).toPromise();
        }
      }

      

      
      if (this.actividadesAsignadasComponent) {
        try {      
          const relaciones = await this.movilidadPostulanteService.getByMovilidadId(movilidad.id).toPromise();
          if (relaciones && relaciones.length > 0) {
            
            const relacionMasReciente = relaciones.reduce((prev, current) => {
              const prevDate = new Date(prev.fechaCreacion || prev.fechaPostulacion || 0);
              const currentDate = new Date(current.fechaCreacion || current.fechaPostulacion || 0);
              return currentDate > prevDate ? current : prev;
            });
            
            
            const relationshipId = relacionMasReciente.id;
            
            if (relationshipId) {
              this.actividadesAsignadasComponent.relationshipId = relationshipId;
              this.actividadesAsignadasComponent.relationshipType = 'postulante';
            } else {
            }
          } else {
          }
        } catch (error) {
        }
      }

      const promesasComponentes: Promise<void>[] = [];

      if (this.apoyoEconomicoComponent) {
        this.apoyoEconomicoComponent.movilidadId = movilidad.id;
        // ensure presupuestoDisponible is treated like any other field
        // even if the child no registró un cambio explícito
        this.apoyoEconomicoComponent.ensureBudgetInPending();
        promesasComponentes.push(this.apoyoEconomicoComponent.actualizar(false));
      }

      if (this.rubrosPresupuestalesComponent) {
        this.rubrosPresupuestalesComponent.movilidadId = movilidad.id;
        promesasComponentes.push(this.rubrosPresupuestalesComponent.actualizar(false));
      }

      if (this.actividadesAsignadasComponent && this.actividadesAsignadasComponent.relationshipId) {
        promesasComponentes.push(this.actividadesAsignadasComponent.actualizar(false));
      }

      if (this.productosCompromisosComponent) {
        this.productosCompromisosComponent.movilidadId = movilidad.id;
        promesasComponentes.push(this.productosCompromisosComponent.actualizar(false));
      }

      
      await Promise.all(promesasComponentes);

      
      this.cambiosPendientesPostulantes = { eliminar: [] };
      this.mostrarMensaje('success', 'Éxito', 'Todos los cambios se guardaron correctamente');
      this.sincronizarEstadoOriginal();

    } catch (error: any) {
      
      const errorMessage = error?.message || 'Hubo un problema al guardar algunos cambios';
      this.mostrarMensaje('error', 'Error', errorMessage);
      throw error;
    } finally {
      this.guardandoMasivo.set(false);
    }
  }

  private limpiarTodasLasRelaciones(movilidad: Movilidad): void {
    this.guardandoMasivo.set(true);
    
    
    const promesasEliminacionPostulantes: Promise<void>[] = [];
    for (const postulanteId of this.cambiosPendientesPostulantes.eliminar) {
      promesasEliminacionPostulantes.push(
        this.postulanteService.deleteFromMovilidad(movilidad.id, postulanteId).toPromise()
          .then(() => this.postulanteService.delete(postulanteId).toPromise())
          .then(() => Promise.resolve())
          .catch(error => {
            return Promise.reject(error);
          })
      );
    }

    
    Promise.all(promesasEliminacionPostulantes)
      .then(() => {
        
        const promesasEliminacionRelaciones: Promise<void>[] = [
          this.apoyoEconomicoService.deleteByMovilidadId(movilidad.id).toPromise(),
          this.rubroPresupuestalService.deleteByMovilidadId(movilidad.id).toPromise(),
          this.actividadesService.deleteByMovilidadId(movilidad.id).toPromise(),
          this.productosService.deleteByMovilidadId(movilidad.id).toPromise()
        ];

        return Promise.all(promesasEliminacionRelaciones);
      })
      .then(() => {
        
        this.cambiosPendientesPostulantes = { eliminar: [] };
        this.mostrarMensaje('success', 'Éxito', 'Todas las relaciones de la movilidad han sido eliminadas');
        this.sincronizarEstadoOriginal();
        this.guardandoMasivo.set(false);
        
        this.cargarMovilidades();
      })
      .catch(error => {
        this.mostrarMensaje('error', 'Error', 'Hubo un problema al eliminar las relaciones');
        this.guardandoMasivo.set(false);
      });
  }

  private eliminarMovilidadCompleta(movilidad: Movilidad): void {
    this.movilidadService.deleteMovilidadWithRelations(movilidad.id)
      .toPromise()
      .then(() => {
        this.mostrarMensaje('success', 'Éxito', 'La movilidad ha sido eliminada completamente');
        
        this.movilidadSeleccionada.set(null);
        this.postulantesExistentes.set([]);
        this.apoyosEconomicosExistentes.set([]);
        this.rubrosExistentes.set([]);
        this.actividadesExistentes.set([]);
        this.productosExistentes.set([]);
        this.cambiosPendientesPostulantes = { eliminar: [] };
        this.sincronizarEstadoOriginal();
        this.guardandoMasivo.set(false);
        this.cargarMovilidades();
      })
      .catch(error => {
        this.mostrarMensaje('error', 'Error', 'Hubo un problema al eliminar la movilidad');
        this.guardandoMasivo.set(false);
      });
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

  handleRubrosSaved(rubros: RubroPresupuestal[]): void {
    this.rubrosExistentes.set(rubros);
    if (!this.guardandoMasivo()) {
      this.mostrarMensaje('success', 'Éxito', `Rubros guardados (${rubros.length})`);
    }
  }

  handleRubrosChanged(rubros: RubroPresupuestal[]): void {
    this.rubrosExistentes.set(rubros);
    this.updateChangesState();
  }

  handleApoyoEconomicoSaved(apoyosEconomicos: ApoyoEconomico[]): void {
    this.apoyosEconomicosExistentes.set(apoyosEconomicos);
  }

  handleApoyoEconomicoChanged(apoyos: ApoyoEconomico[]): void {
    this.apoyosEconomicosExistentes.set(apoyos);
    this.updateChangesState();
  }

  handleActividadesChanged(actividades: ActividadAsignada[]): void {
    this.actividadesExistentes.set(actividades);
    this.updateChangesState();
  }

  handleProductosChanged(productos: ProductosCompromisos[]): void {
    this.productosExistentes.set(productos);
    this.updateChangesState();
  }

  volverAlMenu(): void {
    this.router.navigate(['/app/movilidad-saliente-list']);
  }


  irAMovilidad(): void {
    const movilidad = this.movilidadSeleccionada();
    if (movilidad?.id) {
      this.router.navigate(['/app/movilidad'], { queryParams: { id: movilidad.id } });
    } else {
      this.router.navigate(['/app/movilidad']);
    }
  }

  goBack(): void {
    if (this.isEditMode() && this.hasChanges()) {
      this.confirmationService.confirm({
        message: 'Tiene cambios sin guardar. ¿Desea descartar los cambios y salir?',
        header: 'Cambios sin guardar',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Descartar y salir',
        rejectLabel: 'Cancelar',
        accept: () => {
          this.revertirCambios();
          this.navegarAtras();
        },
        reject: () => {
        }
      });
    } else {
      this.navegarAtras();
    }
  }

  private navegarAtras(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.volverAlMenu();
    }
  }

  eliminarPostulanteExistente(p: Postulante): void {
    if (!p.id) {
      this.mostrarMensaje('error', 'Error', 'Postulante sin ID');
      return;
    }

    
    this.cambiosPendientesPostulantes.eliminar.push(p.id);

    
    const postulantesActuales = this.postulantesExistentes();
    this.postulantesExistentes.set(postulantesActuales.filter(post => post.id !== p.id));

    this.hasChanges.set(this.detectarCambiosEnDatos());
  }

  cargarUsuariosMasivos(file: File | undefined, input?: HTMLInputElement): void {
    if (!file) {
      this.mostrarMensaje('warn', 'Advertencia', 'Selecciona un archivo válido');
      if (input) {
        input.value = '';
      }
      return;
    }

    const initialInfo = {
      nombre: file.name,
      tamano: file.size,
      columnaDetectada: 'Procesando...',
      posicionColumna: null,
      totalRegistros: 'Procesando...'
    };

    
    this.infoArchivo.set(initialInfo);
    this.updateFileFields(initialInfo);

    this.cargando.set(true);
    this.archivoPlanoService.uploadUsuariosMasivos(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: resp => this.handleUploadResponse(resp, file, initialInfo, input) });
  }

  private updateFileFields(info: any): void {
    this.nombreArchivoValue.set(info.nombre);
    this.tamanoArchivoValue.set(String(info.tamano));
    this.columnaDetectadaValue.set(String(info.columnaDetectada));
    this.totalRegistrosValue.set(String(info.totalRegistros));
  }

  private handleUploadResponse(response: any, file: File, fallback: any, input?: HTMLInputElement): void {
    if (input) {
      input.value = '';
    }

    if (!response.success) {
      this.cargando.set(false);
      return;
    }

    const ids = response.identificaciones || [];
    this.identificacionesExtraidas.set(ids);

    const finalInfo = {
      nombre: response.nombreArchivo || fallback.nombre,
      tamano: response.tamano || fallback.tamano,
      columnaDetectada: response.columnaDetectada || 'No detectada',
      posicionColumna: response.posicionColumna,
      totalRegistros: response.totalRegistros || 0
    };

    this.infoArchivo.set(finalInfo);
    this.updateFileFields(finalInfo);

    
    if (!ids || ids.length === 0) {
      this.mostrarMensaje('warn', 'Advertencia', 'El archivo no contiene identificaciones válidas para buscar');
      return;
    }

    this.buscarIdentificacionesEnOracle();
  }

  buscarIdentificacionesEnOracle(): void {
    const ids = this.identificacionesExtraidas();
    if (ids.length === 0) {
      this.mostrarMensaje('warn', 'Advertencia', 'No hay identificaciones para buscar');
      return;
    }

    
    const existentesIds = new Set(this.postulantesExistentes().map(p => p.numIdentificacion));
    const seleccionadosIds = new Set(this.usuariosSeleccionados().map(u => u.numIdentificacion));
    
    const idsPorBuscar = ids.filter(id => 
      !existentesIds.has(id) && !seleccionadosIds.has(id) && !this.usuariosCache.has(id)
    );

    
    const usuariosDesdeCache = ids
      .filter(id => this.usuariosCache.has(id))
      .map(id => this.usuariosCache.get(id)!)
      .filter(u => !existentesIds.has(u.numIdentificacion) && !seleccionadosIds.has(u.numIdentificacion));
    
    if (usuariosDesdeCache.length > 0) {
      this.usuariosSeleccionados.update(current => [...current, ...usuariosDesdeCache]);
    }

    if (idsPorBuscar.length === 0) {
      return;
    }

    const CHUNK_SIZE = 25;
    const MAX_CONCURRENT_REQUESTS = 6;
    
    const chunks: string[][] = [];
    for (let i = 0; i < idsPorBuscar.length; i += CHUNK_SIZE) {
      chunks.push(idsPorBuscar.slice(i, i + CHUNK_SIZE));
    }

    this.cargando.set(true);
    this.progresoBusquedaMasiva.set(0);
    this.totalBusquedaMasiva.set(chunks.length);
    
    const processChunks = async (chunks: string[][]): Promise<UsuarioOracle[]> => {
      const results: UsuarioOracle[] = [];
      
      for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_REQUESTS) {
        const batch = chunks.slice(i, i + MAX_CONCURRENT_REQUESTS);
        const batchRequests = batch.map(chunk => 
          this.api.getByIdentificaciones(chunk).pipe(
            map(usuarios => (usuarios || []).map(u => {
              this.usuariosCache.set(u.numIdentificacion, u);
              return u;
            })),
            catchError(() => of([]))
          )
        );
        
        const batchResults = await forkJoin(batchRequests).toPromise();
        results.push(...batchResults!.flat());
        
        this.progresoBusquedaMasiva.set(Math.min(i + MAX_CONCURRENT_REQUESTS, chunks.length));
      }
      
      return results;
    };

    processChunks(chunks).then(todosLosUsuarios => {
      const nuevosUsuarios = todosLosUsuarios.filter(u => 
        !seleccionadosIds.has(u.numIdentificacion) && !existentesIds.has(u.numIdentificacion)
      );
      
      this.usuariosSeleccionados.update(current => [...current, ...nuevosUsuarios]);
      this.progresoBusquedaMasiva.set(0);
      this.totalBusquedaMasiva.set(0);
    }).catch(() => {
      this.mostrarMensaje('error', 'Error', 'Error al buscar usuarios');
      this.progresoBusquedaMasiva.set(0);
      this.totalBusquedaMasiva.set(0);
    }).finally(() => {
      this.cargando.set(false);
    });
  }

  async autorizarMovilidad(): Promise<void> {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad?.id) {
      this.mostrarMensaje('warn', 'Advertencia', 'Debe seleccionar una movilidad primero.');
      return;
    }

    const nuevoValor = !movilidad.solicitarAutorizacion;

    
    if (!nuevoValor) {
      this.movilidadPostulanteService.getByMovilidadId(movilidad.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (relaciones) => {
            const relacionId = relaciones && relaciones.length > 0 ? relaciones[0].id : undefined;
            const buscarId = (movilidad as any)?.movilidadPostulanteId ?? relacionId ?? movilidad.id;

            this.autorizacionService.getAprobacionesPorMovilidad(buscarId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (aprobaciones) => {
                  const hayNivelesAprobados = Array.isArray(aprobaciones) && aprobaciones.some(a => a.estado === 'aprobado');
                  if (hayNivelesAprobados) {
                    this.movilidadesConAprobacionesIds.add(buscarId);
                    this.movilidadSeleccionadaTieneAprobaciones.set(true);
                    this.movilidadSeleccionadaTieneAutorizacion.set(true);
                    this.mostrarMensaje('warn', 'Acción no permitida', 'No se puede cancelar la solicitud porque ya existen niveles aprobados');
                    return;
                  }

                  // Actualizar UI inmediatamente antes de la llamada al backend
                  this.actualizarEstadoLocal(movilidad, false);
                  this.postulantesExistentes.set(this.postulantesExistentes().map(p => ({ ...p, solicitarAutorizacion: false })));

                  // Intentar cancelar/eliminar la autorización existente; si no existía, ignorar el error
                  this.autorizacionService.cancelOrCreateForMovilidad(buscarId)
                    .pipe(
                      catchError(() => of(null)),
                      takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe({
                      next: () => {
                        // Siempre actualizar el flag en DB, independientemente del resultado anterior
                        this.postulanteService.updateAutorizacionForMovilidad(movilidad.id, false)
                          .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                            next: () => {
                              this.actualizarEstadoLocal(movilidad, false);
                              this.mostrarMensaje('success', 'Solicitud cancelada', `La solicitud de "${movilidad.nombreMovilidad}" fue cancelada correctamente`);
                            },
                            error: () => {
                              // Aun si el PUT falla, mantener la UI en false (ya actualizamos localmente)
                              this.actualizarEstadoLocal(movilidad, false);
                            }
                          });
                      }
                    });
                },
                error: (err) => {
                  this.mostrarMensaje('error', 'Error', 'No se pudo verificar las aprobaciones. Operación cancelada. Intenta nuevamente más tarde.');
                }
              });
          },
          error: (err) => {
            this.postulanteService.updateAutorizacionForMovilidad(movilidad.id, false)
              .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: () => {},
                error: () => {}
              });
          }
        });

      return;
    }

    
    const tipoMovilidad = 'POSTULANTE';

    
    
    let mpId: string | undefined = (movilidad as any).movilidadPostulanteId;
    if (!mpId) {
      try {
        const relaciones: any[] = (await this.movilidadPostulanteService.getByMovilidadId(movilidad.id).toPromise()) || [];
        if (relaciones.length > 0) {
          mpId = relaciones[0].id;
        }
      } catch (e) {
        console.error('[autorizarMovilidad] Error al consultar relaciones movilidad-postulante:', e);
        this.mostrarMensaje('error', 'Error', 'No se pudo verificar los postulantes de la movilidad. Intente nuevamente.');
        return;
      }
    }
    if (!mpId) {
      if (this.usuariosSeleccionados().length > 0) {
        this.mostrarMensaje('warn', 'Advertencia', 'Hay postulantes sin guardar. Primero haz clic en "Actualizar" para guardar los cambios antes de solicitar autorización.');
      } else {
        this.mostrarMensaje('error', 'Error', 'No existen postulantes vinculados a la movilidad; primero registra al menos uno antes de solicitar autorización.');
      }
      return;
    }
    if (mpId === movilidad.id) {
      
      this.mostrarMensaje('error', 'Error', 'El identificador de relación devuelto es inválido. Se recargará la lista de movilidades.');
      this.cargarMovilidades();
      return;
    }

    
    try {
      await this.movilidadPostulanteService.getById(mpId).toPromise();
    } catch (err: any) {
      
      const msg = err && (err.status || err.message || '').toString();
      const isNotFound = msg.includes('404') || msg.toLowerCase().includes('recurso no encontrado');
      if (isNotFound) {
        this.mostrarMensaje('error', 'Error', 'La relación movilidad-postulante ya no existe en el servidor. Se recargará la lista de movilidades.');
        
        this.cargarMovilidades();
      } else {
        this.mostrarMensaje('error', 'Error', 'No se pudo verificar la relación. Intenta nuevamente');
      }
      return;
    }

    const mov = movilidad as MovilidadConPostulante;
    mov.movilidadPostulanteId = mpId;
    this.setMovilidadSeleccionadaPreservandoOverride(mov);

    const autorizacion: Partial<Autorizacion> = {
      estado: 'pendiente',
      movilidadPostulanteId: mpId,
      movilidadEstudianteId: undefined
    };

    

    this.autorizacionService.createOrUpdate(autorizacion as Autorizacion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (autorizacionCreada) => {
          this.mostrarMensaje('success', 'Autorización Creada', `La autorización para "${movilidad.nombreMovilidad}" se guardó correctamente en la base de datos`);

        const crearAprobaciones$ = (movilidad as any).movilidadPostulanteId
          ? this.autorizacionService.crearAprobacionesAutomaticas((movilidad as any).movilidadPostulanteId, 7, tipoMovilidad, tipoMovilidad)
          : of([]);

        crearAprobaciones$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            
            this.postulanteService.updateAutorizacionForMovilidad(movilidad.id, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: () => {
                const postulantesActualizados = this.postulantesExistentes().map(p => ({ ...p, solicitarAutorizacion: true }));
                this.postulantesExistentes.set(postulantesActualizados);
                this.actualizarEstadoLocal(movilidad, true);
                if (this.form) this.form.patchValue({ solicitarAutorizacion: true }, { emitEvent: false });
                this.cargarEstadoAutorizacion(movilidad.id);

                setTimeout(() => {
                  this.router.navigate(['/app/autorizacion'], { queryParams: { movilidadId: movilidad.id } });
                }, 1000);
              },
              error: (error: any) => {
                this.mostrarMensaje('warn', 'Advertencia', 'La autorización se creó pero no se pudo actualizar el estado. Recarga la página.');
              }
            });
          },
          error: (err) => {
            
            this.postulanteService.updateAutorizacionForMovilidad(movilidad.id, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: () => {
                const postulantesActualizados = this.postulantesExistentes().map(p => ({ ...p, solicitarAutorizacion: true }));
                this.postulantesExistentes.set(postulantesActualizados);
                this.actualizarEstadoLocal(movilidad, true);
                if (this.form) this.form.patchValue({ solicitarAutorizacion: true }, { emitEvent: false });
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
        let mensajeError = 'No se pudo crear la autorización';
        if (error.status === 0) mensajeError = 'No se pudo conectar con el servidor';
        else if (error.status === 401 || error.status === 403) mensajeError = 'No tienes permisos. Inicia sesión nuevamente';
        else if (error.error?.message) mensajeError = error.error.message + (mpId ? ` (movilidadPostulanteId=${mpId})` : '');
        this.mostrarMensaje('error', 'Error al Crear Autorización', mensajeError);
      }
    });
  }

    

  confirmarAutorizarMovilidad(): void {


    const movilidad = this.movilidadSeleccionada();
    if (!movilidad?.id) {
      this.mostrarMensaje('warn', 'Advertencia', 'Debe seleccionar una movilidad primero.');
      return;
    }

    const accion = movilidad.solicitarAutorizacion ? 'cancelar' : 'solicitar';
    const mensaje = `¿Está seguro de ${accion} la autorización para la movilidad "${movilidad.nombreMovilidad}"?`;

    
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body) {
      try { active.blur(); } catch (e) {  }
    }

    
    setTimeout(() => {
      this.confirmationService.confirm({
        message: mensaje,
        header: 'Confirmar Acción',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.autorizarMovilidad();
        },
        reject: () => {
          
        }
      });
    }, 0);
  }

  getBotonSeverity(): 'success' | 'danger' {
    const movilidad = this.movilidadSeleccionada();
    return movilidad?.solicitarAutorizacion ? 'danger' : 'success';
  }

  getBotonLabel(): string {
    const mov = this.movilidadSeleccionada();
    const label = mov?.solicitarAutorizacion ? 'Cancelar Solicitud' : 'Solicitar Autorización';

    return label;
  }

  private actualizarEstadoLocal(movilidad: Movilidad, solicitarAutorizacion: boolean): void {
    const movilidadesActuales = this.movilidades();

    const movilidadActual = this.movilidadSeleccionada();
    if (movilidadActual && movilidadActual.id === movilidad.id) {
      this.movilidadSeleccionada.set({ ...movilidadActual, solicitarAutorizacion });
    }

    const index = movilidadesActuales.findIndex(m => m.id === movilidad.id);
    if (index !== -1) {
      const copy = movilidadesActuales.slice();
      copy[index] = { ...copy[index], solicitarAutorizacion };
      this.movilidades.set(copy);
    }
  }

  private setMovilidadSeleccionadaPreservandoOverride(movilidad: Movilidad): void {
    const toSet = { ...(movilidad as any) } as Movilidad & { movilidadPostulanteId?: string };

    // Conservar el movilidadPostulanteId local si el nuevo objeto no lo trae
    const current = this.movilidadSeleccionada();
    if (current && !(toSet as any).movilidadPostulanteId && (current as any).movilidadPostulanteId) {
      (toSet as any).movilidadPostulanteId = (current as any).movilidadPostulanteId;
    }

    // Siempre usar el valor que viene del servidor/flujo de actualización
    this.movilidadSeleccionada.set(toSet);

    this.comprobarAprobacionesBackendParaMovilidad(toSet as MovilidadConPostulante);

    // Sincronizar el mismo valor en la lista
    const movilidadesActuales = this.movilidades();
    const index = movilidadesActuales.findIndex(m => m.id === toSet.id);
    if (index !== -1) {
      const copy = movilidadesActuales.slice();
      copy[index] = { ...copy[index], solicitarAutorizacion: toSet.solicitarAutorizacion, movilidadPostulanteId: (toSet as any).movilidadPostulanteId };
      this.movilidades.set(copy);
    }
  }

    
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  public calcularDiasMovilidad(fechaInicio: string | Date | null, fechaFin: string | Date | null): string {
    if (!fechaInicio || !fechaFin) {
      return '';
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return '';
    }

    const diffTime = Math.abs(fin.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays.toString();
  }
}