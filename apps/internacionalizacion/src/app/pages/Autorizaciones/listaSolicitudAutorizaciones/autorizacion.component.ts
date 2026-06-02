import { Component, OnInit, OnDestroy, inject, signal, NgZone, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { AprobacionNivel, EstadoAprobacion, AprobadorDTO, Autorizacion } from '../../../core/models/autorizacion.model';
import { MovilidadService } from '../../../core/services/movilidad.service';
import { AutorizacionService } from '../../../core/services/autorizacion.service';
import { MovilidadPostulanteService } from '../../../core/services/movilidad-postulante.service';
import { EstudianteService } from '../../../core/services/estudiante.service';
import { PostulanteService } from '../../../core/services/postulante.service';
import { ApoyoEconomicoService } from '../../../core/services/apoyo-economico.service';
import { RubroPresupuestalService } from '../../../core/services/rubro-presupuestal.service';
import { ActividadesAsignadasService } from '../../../core/services/actividades-asignadas.service';
import { ProductosCompromisosService } from '../../../core/services/productos-compromisos.service';
import { Movilidad } from '../../../core/models/movilidad.model';
import { ApoyoEconomico } from '../../../core/models/apoyo-economico.model';
import { Postulante } from '../../../core/models/postulante.model';
import { InfoTableComponent, TableColumn, TableAction, SelectComponent, TextareaComponent } from '@microfrontends/shared-ui';
import { RubroPresupuestal } from '../../../core/models/rubros-presupuestales.model';
import { AuthService } from '@microfrontends/shared-services';
import { UsuariosOracleService } from '../../../core/services/usuarios-oracle.service';
import { MovilidadEstadoService, MovilidadAgrupada } from '../../../core/services/movilidad-estado.service';
import { MovilidadProcesoService } from '../../../core/services/movilidad-proceso.service';
import { UbicacionesGeograficasService } from '../../../core/services/ubicaciones-geograficas.service';
import { ProgramaService } from '../../../core/services/programas.service';
import { EntidadesInternacionalesService } from '../../../core/services/entidades-internacionales.service';
import { forkJoin, lastValueFrom, Subscription } from 'rxjs';
import { InternacionalizacionRealtimeService } from '../../../core/services/internacionalizacion-realtime.service';

interface UserInfo {
  id: string;
  email: string;
  username: string;
  identificacion: string;
  roles: string[];
}

interface ApoyoEconomicoSeleccionable extends ApoyoEconomico {
  selected?: boolean;
  aprobadoPorNivel6?: boolean;
  aprobadoPorNivel7?: boolean;
}

@Component({
  selector: 'app-autorizacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    SelectButtonModule,
    TagModule,
    ToastModule,
    DialogModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    ProgressBarModule,
    CheckboxModule,
    TabsModule,
    InfoTableComponent,
    SelectComponent,
    TextareaComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './autorizacion.component.html',
})
export class AutorizacionComponent implements OnInit, OnDestroy {
  private readonly movilidadService = inject(MovilidadService);
  private readonly autorizacionService = inject(AutorizacionService);
  private readonly movilidadPostulanteService = inject(MovilidadPostulanteService);

  // Guardamos las movilidades que se han eliminado en esta sesión para evitar recrear el "stub"
  // cuando recargamos la lista. Sin esto, después de borrar una autorización la misma
  // movilidad vuelve a aparecer (porque el backend sigue considerándola como
  // "requiere autorización") y el usuario puede volver a pulsar el botón de borrar.
  private movilidadesEliminadas = new Set<string>();
  private readonly estudianteService = inject(EstudianteService);
  private readonly postulanteService = inject(PostulanteService);
  private readonly apoyoEconomicoService = inject(ApoyoEconomicoService);
  private readonly rubroPresupuestalService = inject(RubroPresupuestalService);
  private readonly actividadesService = inject(ActividadesAsignadasService);
  private readonly productosService = inject(ProductosCompromisosService);
  private readonly movilidadEstadoService = inject(MovilidadEstadoService);
  private readonly authService = inject(AuthService);
  private readonly usuariosOracle = inject(UsuariosOracleService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly ngZone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movilidadProcesoService = inject(MovilidadProcesoService);
  private readonly realtimeService = inject(InternacionalizacionRealtimeService);
  private readonly ubicacionesService = inject(UbicacionesGeograficasService);
  private readonly programaService = inject(ProgramaService);
  private readonly entidadesInternacionalesService = inject(EntidadesInternacionalesService);

  tipoAutorizacion: 'estudiante' | 'profesor' = 'profesor';
  movilidadIdFiltro: string | null = null;
  movilidadesAgrupadas = signal<MovilidadAgrupada[]>([]);
  movilidadesFiltradas = signal<MovilidadAgrupada[]>([]);
  movilidadSeleccionada = signal<MovilidadAgrupada | null>(null);
  cargando = signal(false);
  activeTab = signal('0');
  iniciandoProceso = signal<Set<string>>(new Set());
  todasLasAutorizaciones = signal<Autorizacion[]>([]);
  filtroForm: FormGroup;
  expandedRows: { [key: string]: boolean } = {};
  opcionesMovilidades: any[] = [];
  paises: {id: string, nombre: string}[] = [];
  ubicaciones: {id: string, nombre: string}[] = [];
  programas: {id: string, nombre: string, idFacultad: string}[] = [];
  facultades: {id: string, nombre: string}[] = [];
  snies: {id: string, codigo: string}[] = [];
  entidadesInternacionales: {id: string, nombre: string, codigo?: string}[] = [];

  private aprobadores: AprobadorDTO[] = [];
  opcionesNivel: any[] = [];

  opcionesEstado = [
    { label: 'Aprobado', value: 'aprobado' },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Rechazado', value: 'rechazado' },
    { label: 'Parcial', value: 'parcial' },
  ];

  aprobacionSeleccionada: AprobacionNivel | null = null;
  accionDialog: 'aprobar' | 'rechazar' = 'aprobar';
  observaciones = '';
  mostrarDialogoAprobarRechazar = false;
  usuarioActual: UserInfo | null = null;
  private userSubscription!: Subscription;
  private movilidadActualizadaSubscription?: Subscription;
  // Cuando true, inhibimos las notificaciones salientes a MovilidadEstadoService para evitar re‑loops
  private suppressMovilidadNotifications = false;
  // Cuando true, hay un p-confirmDialog abierto: bloqueamos cargarAprobaciones para que no lo destruya
  private pendingConfirmation = false;

  private obtenerPayloadAprobadorLocal(): { nombre: string; identificacion: string; roles: string[]; email: string } {
    const user = this.usuarioActual as any || {};
    const token = this.authService.getUserInfo() || {} as any;
    const nombre = token?.name || user?.username || user?.email || '';
    const identificacion = user?.identificacion || token?.preferred_username || user?.username || '';
    const roles = user?.roles || token?.realm_access?.roles || [];
    const email = user?.email || token?.email || '';
    return { nombre, identificacion, roles, email };
  }

  private obtenerRolAprobadorLocalDisplay(nivel?: number): string | undefined {
    const approver = this.obtenerPayloadAprobadorLocal();
    const roles = approver.roles || [];

    if (roles.includes('ADMIN')) return 'ADMIN';
    if (nivel) {
      const rolKeycloakNivel = this.aprobadores.find(a => a.orden === nivel)?.rolKeycloak;
      if (rolKeycloakNivel && roles.includes(rolKeycloakNivel)) return rolKeycloakNivel;
    }
    return roles.length > 0 ? roles[0] : undefined;
  }

  getRolMostrado(aprobacion: AprobacionNivel): string | undefined {
    try {
      const payload = this.obtenerPayloadAprobadorLocal();
      const localIdent = (payload.identificacion || '').toString();
      const localEmail = (payload.email || '').toString().toLowerCase();
      const aprobadorIdent = (aprobacion.aprobadorIdentificacion || '').toString();
      const aprobadorEmail = (aprobacion.aprobadorEmail || '').toString().toLowerCase();
      const esUsuarioActual = (localIdent && aprobadorIdent && localIdent === aprobadorIdent) ||
                             (localEmail && aprobadorEmail && localEmail === aprobadorEmail);
      if (esUsuarioActual) {
        return this.obtenerRolAprobadorLocalDisplay(aprobacion.nivel) || aprobacion.aprobadorCargo || (aprobacion as any).rolKeycloak || aprobacion.rolRequerido;
      }
      return aprobacion.aprobadorCargo || (aprobacion as any).rolKeycloak || aprobacion.rolRequerido || undefined;
    } catch {
      return aprobacion.aprobadorCargo || (aprobacion as any).rolKeycloak || aprobacion.rolRequerido || undefined;
    }
  }

  isConfiguracionError(aprobacion?: AprobacionNivel): boolean {
    if (!this.aprobadores || this.aprobadores.length === 0) return true;
    if (!aprobacion) return false;
    const marker = 'CONFIG_ERROR';
    return aprobacion.rolRequerido === marker || aprobacion.rolKeycloak === marker || aprobacion.aprobadorCargo === marker;
  }

  private ultimoMensaje: { summary: string; detail: string; timestamp: number } | null = null;

  apoyosEconomicos = signal<ApoyoEconomicoSeleccionable[]>([]);
  apoyosSeleccionados = signal<string[]>([]);
  tieneApoyos = signal<boolean>(false);
  /** DevuelveListado legible de postulantes de la movilidad completa */
  getPostulantesString(): string {
    const m = this.movilidadCompleta();
    if (!m?.postulantes?.length) {
      return 'N/A';
    }
    return m.postulantes.map((p: Postulante) => `${p.nombres} ${p.apellidos}`).join(', ');
  }

  /** DevuelveListado legible de estudiantes de la movilidad completa */
  getEstudiantesString(): string {
    const m = this.movilidadCompleta();
    if (!m?.estudiantes?.length) {
      return 'N/A';
    }
    return m.estudiantes.map((e: any) => e.nombre).join(', ');
  }
  mostrarDialogoApoyos = false;
  selectAll = true;
  nivelDialogoApoyos = 6; 

  private mostrarMensajeUnico(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string, life?: number): void {
    const ahora = Date.now();
    if (this.ultimoMensaje && this.ultimoMensaje.summary === summary && this.ultimoMensaje.detail === detail && (ahora - this.ultimoMensaje.timestamp) < 2000) return;
    this.ultimoMensaje = { summary, detail, timestamp: ahora };
    this.messageService.add({ severity, summary, detail, life });
  }

  estadisticas = {
    total: 0,
    aprobadas: 0,
    parciales: 0,
    pendientes: 0,
    rechazadas: 0,
    porcentajeAprobadas: 0,
    porcentajeParciales: 0,
    porcentajePendientes: 0,
    porcentajeRechazadas: 0
  };

  columns: TableColumn[] = [
    { field: 'nombreMovilidad', header: 'Nombre Movilidad', sortable: true },
    { field: 'progreso', header: 'Progreso de Aprobaciones', sortable: false, type: 'custom' },
    { field: 'estadoGeneral', header: 'Estado', sortable: true, type: 'badge', badgeConfig: {
      getSeverity: (value: any) => this.obtenerSeveridadEstado(value),
      getLabel: (value: any) => this.obtenerTextoEstado(value)
    }},
    { field: 'fechaUltimaAccion', header: 'Última Acción', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' }
  ];

  actions: TableAction[] = [
    { icon: 'pi pi-play', tooltip: 'Iniciar autorizaciones', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => { this.verDetalleMovilidadAgrupada(row.movilidadId); this.activeTab.set('1'); } },
    { icon: 'pi pi-file-pdf', tooltip: 'Generar PDF', severity: 'info', styleClass: 'text-blue-500', onClick: async (row: any) => await this.generarPDF(row) },
    { icon: 'pi pi-play-circle', tooltip: 'Iniciar proceso de seguimiento', severity: 'success', styleClass: 'text-green-600',
      disabled: (row: any) => this.estadoEfectivo(row) !== 'aprobado',
      onClick: async (row: any) => {
       
        const primeraAprobacion = row.aprobaciones?.[0];
        const movilidadId: string =
          row.movilidadId ||
          primeraAprobacion?.movilidadPostulanteId ||
          primeraAprobacion?.movilidadEstudianteId;

        if (this.iniciandoProceso().has(movilidadId)) return;
        this.iniciandoProceso.update(set => new Set([...set, movilidadId]));

        try {
          const mov = await lastValueFrom(this.movilidadService.getByIdOrNull(movilidadId));
          if (!mov) {
            this.messageService.add({ severity: 'warn', summary: 'Movilidad no encontrada', detail: 'No se pudo iniciar proceso porque la movilidad no existe' });
            return;
          }

          const existentes = await lastValueFrom(
            this.movilidadProcesoService.getByMovilidadId(movilidadId)
          );
          if (existentes.length === 0) {
            await lastValueFrom(this.movilidadProcesoService.create({
              id: '',
              movilidad: { id: movilidadId } as any,
              proceso: 'INICIO',
              estadoAprobacion: 'PENDIENTE',
              fechaProceso: null as any
            }));
          }
          // abrir directamente el formulario de seguimiento para esta movilidad
          this.router.navigate(['/app/movilidad-proceso', movilidadId, 'editar']);
        } catch (e: any) {
          const mensajes: Record<number, any> = {
            400: { severity: 'error', summary: 'Error', detail: 'Movilidad inválida, no se puede crear proceso' },
            409: { severity: 'info', summary: 'Duplicado', detail: 'El proceso ya existe' },
          };
          this.messageService.add(mensajes[e?.status] ?? { severity: 'error', summary: 'Error', detail: 'No se pudo iniciar el proceso de seguimiento' });
          if (e?.status === 409) this.router.navigate(['/app/movilidad-proceso', movilidadId, 'editar']);
        } finally {
          this.iniciandoProceso.update(s => { const n = new Set(s); n.delete(movilidadId); return n; });
        }
      }
    },
    { icon: 'pi pi-ban', tooltip: 'Cancelar solicitud', severity: 'warn', styleClass: 'text-yellow-600',
      visible: (row: any) => (row?.aprobaciones || []).some((a: any) => !!a.autorizacionId) && !row.autorizacionCancelada && !((row?.aprobaciones || []).some((a: any) => a.estado === 'aprobado')),
      onClick: (row: any) => this.confirmarCancelarAutorizacionDesdeAdmin(row.movilidadId)
    },
    { icon: 'pi pi-trash', tooltip: (row: any) => ((row?.aprobaciones || []).some((a: any) => !!a.autorizacionId) ? 'Eliminar autorización' : 'Cancelar solicitud de autorización'),
      severity: 'danger', styleClass: 'text-red-500',
      visible: (row: any) => !!(row?.movilidadId || row?.movilidad?.id || row?.movilidad?.movilidadId || row?.movilidad?.movilidad?.id),
      onClick: (row: any) => {
        const aprobacionConAutId = (row?.aprobaciones || []).find((a: any) => !!a.autorizacionId);
        const autorizacionId = aprobacionConAutId?.autorizacionId;
        const movilidadNombreFromRow = row?.movilidad?.nombreMovilidad || row?.movilidadId || row?.movilidad?.id || '';

        // determine mobility id from whatever field exists (same logic used elsewhere)
        const movId: string = row.movilidadId || row.movilidad?.id || row.movilidad?.movilidadId || row.movilidad?.movilidad?.id || '';
        if (!movId) {
          this.mostrarMensajeUnico('error', 'Error', 'ID de movilidad inválido');
          return;
        }

        if (!autorizacionId) {
          // pending row without actual autorizacion
          const autorizacionVirtual = { id: '', movilidadPostulanteId: movId, estado: 'pendiente' } as Autorizacion;
          this.eliminarAutorizacion(autorizacionVirtual, movilidadNombreFromRow);
          return;
        }

        const autorizacion = this.todasLasAutorizaciones().find(a => a.id === autorizacionId) || { id: autorizacionId, estado: 'pendiente' } as Autorizacion;
        this.eliminarAutorizacion(autorizacion, movilidadNombreFromRow);
      } }
  ];

  get columnasActuales(): TableColumn[] {
    return this.columns;
  }

  get accionesActuales(): TableAction[] {
    return this.actions;
  }

  get datosActuales(): any[] {
    return this.movilidadesFiltradas();
  }

  postulantes = signal<Postulante[]>([]);
  cargandoPostulantes = signal(false);

  movilidadCompleta = signal<any>(null);

  constructor() {
    this.filtroForm = this.fb.group({
      texto: [''],
      estado: [''],
      nivel: ['']
    });

    this.filtroForm.valueChanges.subscribe(() => this.aplicarFiltros());

    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          const autorizacion = this.realtimeService.autorizacionActualizada();
          if (autorizacion) {
            this.messageService.add({
              severity: 'info',
              summary: 'Autorización actualizada',
              detail: autorizacion.message || 'Se ha detectado un cambio en autorizaciones',
              life: 4000
            });
            this.realtimeService.resetSignal('autorizacion');
          }
          this.cargarAprobaciones();
        });
      }
    });
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.usuarioActual = user;
    });

    this.movilidadActualizadaSubscription = this.movilidadEstadoService.movilidadActualizada$.subscribe(movilidadId => {
      if (!movilidadId) return;
      if (this.suppressMovilidadNotifications) return;

      this.suppressMovilidadNotifications = true;
      this.cargarAprobaciones()
        .catch(() => {})
        .finally(() => { this.suppressMovilidadNotifications = false; });
    });
  
    this.route.queryParams.subscribe(params => {
      // if navigation came with a mobility ID, store it so filters can be applied
      if (params['movilidadId']) {
        this.movilidadIdFiltro = params['movilidadId'];
      } else {
        this.movilidadIdFiltro = null;
      }

      if (params['tipo']) {
        this.tipoAutorizacion = params['tipo'] === 'estudiante' ? 'estudiante' : 'profesor';
      }
      this.cargarAprobaciones(); // cargar también aplicará filtros más tarde
      this.cargarAprobadores().catch(() => {
      });
      this.cargarDatosReferencia();
    });
  }

  private cargarAprobadores(): Promise<void> {
    return new Promise((resolve) => {
      this.autorizacionService.getAprobadores('MOVILIDAD', this.tipoAutorizacion).subscribe({
        next: (aprobadores: AprobadorDTO[]) => {
          // Usar el orden que manda el backend directamente, limitado a 7 niveles
          let aprobadoresReordenados = [...aprobadores]
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            .slice(0, 7);
          
          aprobadoresReordenados = aprobadoresReordenados.map((aprobador, index) => ({
            ...aprobador,
            orden: index + 1
          }));
          
          this.aprobadores = aprobadoresReordenados;
          this.opcionesNivel = aprobadoresReordenados.map(aprobador => ({
            label: `Nivel ${aprobador.orden} - ${aprobador.nombreCargo}`,
            value: aprobador.orden
          }));
          resolve();
        },
        error: (error) => {
          this.mostrarMensajeUnico('error', 'Error de configuración', 'No se pudo cargar la configuración de aprobadores. Contacte al administrador del sistema.', 10000);
          this.aprobadores = [];
          this.opcionesNivel = [];
          resolve();
        }
      });
    });
  }

  async cargarAprobaciones(): Promise<void> {
    if (this.pendingConfirmation) return;
    this.cargando.set(true);

    const existingAuths = await lastValueFrom(this.autorizacionService.getAutorizaciones());
    const fichasSolicitantes: Movilidad[] = await lastValueFrom(
      this.movilidadPostulanteService.getMovilidadesRequiriendoAutorizacion()
    ).catch(() => []) as Movilidad[];

    const stubAuths: Autorizacion[] = fichasSolicitantes
      .filter((m: Movilidad) => !existingAuths.some(a => a.movilidadPostulanteId === m.id || a.movilidadEstudianteId === m.id)
                                    // no volver a generar el stub si el usuario ya eliminó la movilidad
                                    && !this.movilidadesEliminadas.has(m.id))
      .map((m: Movilidad) => ({
        id: `pending-${m.id}`,
        estado: 'pendiente',
        movilidadPostulanteId: m.id,
        movilidadEstudianteId: undefined,
        fechaCreacion: undefined,
        fechaActualizacion: undefined
      } as Autorizacion));

    const todasLasAutorizaciones = [...existingAuths, ...stubAuths];
    this.todasLasAutorizaciones.set(todasLasAutorizaciones);

    const movilidadesAgrupadas = await Promise.all(
      todasLasAutorizaciones.map(autorizacion => this.procesarAutorizacion(autorizacion))
    );

    const movilidadesValidas = movilidadesAgrupadas.filter(m => m !== null) as MovilidadAgrupada[];

    this.finalizarCarga(movilidadesValidas);
  }

  private async procesarAutorizacion(autorizacion: Autorizacion): Promise<MovilidadAgrupada | null> {
    try {
      const movilidadId = autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId;
      if (!movilidadId) return null;

      const movilidad = await lastValueFrom(this.movilidadService.getByIdOrNull(movilidadId));
      if (!movilidad) return null;

      const servicio = movilidad.modalidad?.nombre === 'ESTUDIANTIL' ? this.estudianteService : this.postulanteService;
      try { await lastValueFrom(servicio.getByMovilidad(movilidad.id)); } catch { }

      let aprobaciones = await lastValueFrom(
        this.autorizacionService.getAprobacionesPorMovilidad(movilidad.id)
      ).catch(() => []);

      if ((!aprobaciones || aprobaciones.length === 0) && autorizacion.id?.startsWith('pending-')) {
        aprobaciones = this.generarNivelesFijos(movilidad.id);
      }
      if (!aprobaciones?.length) return null;

      const movAgr = await this.crearMovilidadAgrupada(movilidad, aprobaciones);
      if (autorizacion.estado === 'cancelado') {
        movAgr.estadoGeneral = 'cancelado';
        movAgr.autorizacionCancelada = true;
      }
      return movAgr;
    } catch {
      return null;
    }
  }

  private generarNivelesFijos(movilidadId: string): AprobacionNivel[] {
    if (this.aprobadores.length === 0) {
      return [];
    }

    return this.aprobadores.map(aprobador => ({
      id: `fixed-${movilidadId}-${aprobador.orden}`,
      movilidadPostulanteId: undefined,
      movilidadEstudianteId: undefined,
      nivel: aprobador.orden,
      rolRequerido: aprobador.rolKeycloak,
      rolKeycloak: aprobador.rolKeycloak,
      estado: 'pendiente' as EstadoAprobacion,
      aprobadorNombre: undefined,
      aprobadorIdentificacion: undefined,
      aprobadorEmail: undefined,
      comentario: undefined,
      fechaAsignacion: undefined,
      fechaAprobacion: undefined,
      fechaCreacion: undefined,
      fechaActualizacion: undefined
    }));
  }

  private finalizarCarga(movilidadesAgrupadasList: MovilidadAgrupada[]): void {
    const autorizaciones = this.todasLasAutorizaciones() || [];
    const esCancelada = (id: string) => autorizaciones.some(a =>
      (a.movilidadPostulanteId === id || a.movilidadEstudianteId === id) && a.estado === 'cancelado'
    );

    const listaConCancelados = movilidadesAgrupadasList.map(m => {
      const cancelada = esCancelada(m.movilidadId);
      return { ...m, autorizacionCancelada: cancelada, estadoGeneral: cancelada ? 'cancelado' : m.estadoGeneral };
    });

    this.movilidadesAgrupadas.set(listaConCancelados);
    this.movilidadEstadoService.actualizarMovilidadesAprobadas(listaConCancelados.filter(m => m.estadoGeneral === 'aprobado'));

    if (!this.suppressMovilidadNotifications) {
      const ids = new Set(autorizaciones.map(a => a.movilidadPostulanteId || a.movilidadEstudianteId).filter(Boolean));
      ids.forEach(id => this.movilidadEstadoService.notificarMovilidadActualizada(id!));
    }

    this.opcionesMovilidades = listaConCancelados.map(m => ({
      label: m.nombreMovilidad || `Movilidad ${m.movilidadId}`,
      value: m.nombreMovilidad || m.movilidadId
    }));
    this.movilidadesFiltradas.set(movilidadesAgrupadasList.map(m => ({ ...m, nombreMovilidad: m.movilidad.nombreMovilidad })));
    this.aplicarFiltros();
    this.calcularEstadisticas();
    this.scrollToMovilidad();
    this.cargando.set(false);
    this.resolverNombresAprobadoresEnAprobaciones().catch(() => {});
  }

  private async crearMovilidadAgrupada(movilidad: Movilidad, aprobaciones: AprobacionNivel[]): Promise<MovilidadAgrupada> {
    const estadoGlobal = await lastValueFrom(
      this.autorizacionService.obtenerEstadoGlobalMovilidad(movilidad.id)
    ).catch(() => 'pendiente' as 'aprobado' | 'rechazado' | 'pendiente' | 'parcial');

    const movAgr = this.movilidadEstadoService.crearMovilidadAgrupada(movilidad, aprobaciones, estadoGlobal);

    const autorizacion = await lastValueFrom(
      this.autorizacionService.getAutorizacionesPorMovilidad(movilidad.id)
    ).catch(() => null);

    if (autorizacion?.estado === 'cancelado') {
      movAgr.estadoGeneral = 'cancelado';
      movAgr.autorizacionCancelada = true;
    }

    return movAgr;
  }

  /** Obtiene el nombre del nivel */
  obtenerNombreNivel(nivel: number): string {
    const aprobador = this.aprobadores.find(a => a.orden === nivel);
    return aprobador?.nombreCargo || `Nivel ${nivel}`;
  }

  /** Devuelve la cadena que se mostrará como "Aprobado por" en la tarjeta (simplificado) */
  getAprobadorDisplay(aprobacion: AprobacionNivel): string {
    const nombre = String(aprobacion.aprobadorNombre || '').trim();
    const email = String(aprobacion.aprobadorEmail || '').trim();
    const identificacion = String(aprobacion.aprobadorIdentificacion || '').trim();
    if (nombre && /[A-Za-zÀ-ÖØ-öø-ÿÑñ]/.test(nombre)) return nombre + (identificacion ? ` (${identificacion})` : '');
    if (email) return email + (identificacion ? ` (${identificacion})` : '');
    return identificacion || 'Usuario desconocido';
  }

  private async resolverNombresAprobadoresEnAprobaciones(): Promise<void> {
    const actualizado = await lastValueFrom(this.usuariosOracle.populateAprobadorNamesForMovilidades(this.movilidadesAgrupadas())).catch(() => null);
    if (!actualizado) return;
    this.movilidadesAgrupadas.set(actualizado);
    const sel = this.movilidadSeleccionada();
    if (sel) this.movilidadSeleccionada.set(actualizado.find(x => x.movilidadId === sel.movilidadId) ?? sel);
  }

  obtenerTextoEstado(estado: string): string {
    return this.movilidadEstadoService.obtenerTextoEstado(estado);
  }

  obtenerSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return this.movilidadEstadoService.obtenerSeveridadEstado(estado);
  }

  /** Ver detalle de movilidad */
  verDetalleMovilidadAgrupada(movilidadId: string): void {
    const movilidad = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidadId);
    if (movilidad) {
      this.movilidadSeleccionada.set(movilidad);
      this.resolverNombresAprobadoresEnAprobaciones().catch(() => {});
      this.cargarPostulantesMovilidad(movilidadId);
      this.cargarMovilidadCompleta(movilidadId);

      setTimeout(() => {
        const elemento = document.getElementById('panel-autorizacion');
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  cerrarDetalle(): void {
    this.movilidadSeleccionada.set(null);
  }

  puedeAprobarNivel(nivel: number): boolean;
  puedeAprobarNivel(aprobacion: AprobacionNivel): boolean;
  puedeAprobarNivel(nivelOrAprobacion: number | AprobacionNivel): boolean {
    const user = this.usuarioActual;
    if (!user) {
      return true;
    }

    if (!this.aprobadores || this.aprobadores.length === 0) return false;

    if (typeof nivelOrAprobacion !== 'number' && this.isConfiguracionError(nivelOrAprobacion)) {
      return false;
    }

    return this.usuarioTieneRolParaNivel(user, nivelOrAprobacion);
  }

  private usuarioTieneRolParaNivel(user: UserInfo, nivelOrAprobacion: number | AprobacionNivel): boolean {
    const userRoles = user.roles;

    // Los administradores pueden aprobar cualquier nivel
    if (userRoles.includes('ADMIN')) return true;

    const nivel = typeof nivelOrAprobacion === 'number' ? nivelOrAprobacion : nivelOrAprobacion.nivel;
    const aprobador = this.aprobadores.find(a => a.orden === nivel);
    if (!aprobador) return false;

    return userRoles.includes(aprobador.rolKeycloak);
  }

  private movilidadTieneAutorizacionCancelada(movilidadId: string): boolean {
    return this.todasLasAutorizaciones().some(a =>
      (a.movilidadPostulanteId === movilidadId || a.movilidadEstudianteId === movilidadId) && a.estado === 'cancelado'
    );
  }

  /** Verifica si una movilidad está cancelada (por estado, flag o autorización persistida) */
  private esMovilidadCancelada(movilidadId: string): boolean {
    const mov = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidadId);
    return !!mov && (mov.estadoGeneral === 'cancelado' || mov.autorizacionCancelada || this.movilidadTieneAutorizacionCancelada(mov.movilidadId));
  }

  /** Verifica si una aprobación es fija (no creada en BD aún) */
  private esAprobacionFija(aprobacion: AprobacionNivel): boolean {
    return aprobacion.id?.startsWith('fixed-') ?? false;
  }

  /** Valida si una aprobación puede ser procesada */
  private esAprobacionValida(aprobacion: AprobacionNivel): boolean {
    const error: { severity: 'error' | 'warn'; summary: string; detail: string } | null =
      !aprobacion?.id ? { severity: 'error', summary: 'Error', detail: 'Aprobación inválida' } :
      aprobacion.estado === 'aprobado' ? { severity: 'warn', summary: 'Advertencia', detail: 'Este nivel ya está aprobado' } :
      this.isConfiguracionError(aprobacion) ? { severity: 'warn', summary: 'Configuración faltante', detail: 'No se puede procesar esta aprobación porque falta la configuración de aprobadores. Contacte al administrador.' } :
      null;

    if (error) { this.mostrarMensajeUnico(error.severity, error.summary, error.detail); return false; }
    return true;
  }

  obtenerMensajeValidacionNivel(aprobacion: AprobacionNivel): string {
    if (!this.usuarioActual) return 'Usuario no autenticado';
    const aprobador = this.aprobadores.find(a => a.orden === aprobacion.nivel);
    if (!aprobador) return 'Nivel de aprobación no encontrado';
    if (!this.usuarioTieneRolParaNivel(this.usuarioActual, aprobacion.nivel))
      return `No tienes el rol requerido (${aprobador.nombreCargo}) para aprobar este nivel. Tu rol actual no está autorizado para esta acción.`;
    return 'No tienes permisos para realizar esta acción';
  }

  aprobarNivel(movilidadId: string, nivel: number): void {
    const guard = !this.puedeAprobarNivel(nivel) ? ['error', 'Error', 'No tienes permisos para aprobar este nivel'] as const
      : this.esMovilidadCancelada(movilidadId) ? ['warn', 'Cancelado', 'No se puede aprobar: la autorización está cancelada'] as const : null;
    if (guard) { this.mostrarMensajeUnico(guard[0], guard[1], guard[2]); return; }

    if (nivel === 6 || nivel === 7) {
      this.movilidadSeleccionada() && (nivel === 6 ? this.cargarApoyosEconomicosParaAprobacion : this.cargarApoyosAprobadosNivel6).call(this, movilidadId);
      return;
    }
    this.confirmationService.confirm({
      key: 'autorizacion-confirm',
      message: `¿Desea aprobar el nivel ${nivel}?`, header: 'Confirmar Aprobación',
      icon: 'pi pi-check-circle', acceptLabel: 'Aprobar', rejectLabel: 'Cancelar',
      accept: () => this.procesarAprobacionConfirmada(movilidadId, nivel)
    });
  }

  private procesarAprobacionConfirmada(movilidadId: string, nivel: number): void {
    this.cargando.set(true);
    const movActual = this.movilidadSeleccionada();
    if (!movActual || this.esMovilidadCancelada(movActual.movilidadId)) {
      if (movActual) this.mostrarMensajeUnico('warn', 'Cancelado', 'No se puede aprobar: la autorización está cancelada');
      this.cargando.set(false); return;
    }

    const aprobacion = movActual.aprobaciones.find(a => a.nivel === nivel);
    if (!aprobacion?.id || !this.esAprobacionValida(aprobacion)) { this.cargando.set(false); return; }

    if (this.esAprobacionFija(aprobacion) && nivel !== 7) {
      this.crearAutorizacionCompletaYaprobarNivel(movilidadId, nivel); this.cargando.set(false); return;
    }

    this.autorizacionService.aprobarNivelValidado(aprobacion.autorizacionId || aprobacion.id, nivel, '').subscribe({
      next: () => {
        const movId = aprobacion.movilidadPostulanteId || aprobacion.movilidadEstudianteId || '';
        this.actualizarEstadoAprobacionLocal(movId, nivel, 'aprobado' as EstadoAprobacion);
        this.mostrarMensajeUnico('success', 'Aprobado', `Nivel ${nivel} aprobado correctamente`);
        this.actualizarEstadoMovilidadLocal(movId);
        this.cargarAprobaciones();
        this.cargando.set(false);
      },
      error: (error: any) => {
        this.mostrarMensajeUnico('error', 'Error al aprobar', `Error al aprobar el nivel: ${error?.error?.message || 'Error desconocido'}`);
        this.cargando.set(false);
      }
    });
  }

  /** Rechaza un nivel específico */
  rechazarNivel(movilidadId: string, nivel: number): void {
    if (!this.puedeAprobarNivel(nivel)) { this.mostrarMensajeUnico('error', 'Error', 'No tienes permisos para rechazar este nivel'); return; }

    this.confirmationService.confirm({
      key: 'autorizacion-confirm',
      message: `¿Está seguro de rechazar el nivel ${nivel} (${this.obtenerNombreNivel(nivel)}) para esta movilidad?`,
      header: 'Confirmar Rechazo', icon: 'pi pi-times-circle', acceptLabel: 'Rechazar', rejectLabel: 'Cancelar',
      accept: () => {
        const aprobacion = this.movilidadSeleccionada()?.aprobaciones.find(a => a.nivel === nivel);
        if (!aprobacion?.id || !this.esAprobacionValida(aprobacion)) return;

        this.autorizacionService.rechazarNivelValidado(aprobacion.autorizacionId!, aprobacion.nivel).subscribe({
          next: () => {
            this.actualizarEstadoAprobacionLocal(movilidadId, nivel, 'rechazado' as EstadoAprobacion);
            this.mostrarMensajeUnico('warn', 'Rechazado', `Nivel ${nivel} rechazado correctamente`);
            this.actualizarEstadoMovilidadLocal(movilidadId);
          },
          error: (error: any) => this.mostrarMensajeUnico('error', 'Error al rechazar', `Error al rechazar el nivel: ${error?.error?.message || 'Error desconocido'}`)
        });
      }
    });
  }

  /** Aplica filtros a las movilidades */
  aplicarFiltros(): void {
    const formValue = this.filtroForm.value;
    const { texto, estado, nivel } = formValue;

    // Normalize filter inputs for more tolerant matching
    const estadoNorm = estado ? String(estado).toLowerCase() : '';
    const nivelNorm = nivel != null && nivel !== '' ? Number(nivel) : null;

    const movilidades = this.movilidadesAgrupadas();

    this.movilidadesFiltradas.set(
      movilidades.filter(movilidad => {
        const cumpleTexto = this.cumpleFiltroTexto(movilidad, texto);
        const cumpleEstado = this.cumpleFiltroEstado(movilidad, estadoNorm);
        const cumpleNivel = this.cumpleFiltroNivel(movilidad, nivelNorm as any);
        const cumpleMovilidadId = this.cumpleFiltroMovilidadId(movilidad);

        return cumpleTexto && cumpleEstado && cumpleNivel && cumpleMovilidadId;
      }).map(m => ({
        ...m,
        nombreMovilidad: m.movilidad.nombreMovilidad
      }))
    );

    this.calcularEstadisticas();
  }

  onDropdownShow(): void {
    if (!this.filtroForm.value.texto || this.filtroForm.value.texto === '') {
      this.movilidadesFiltradas.set([...this.movilidadesAgrupadas()]);
      this.calcularEstadisticas();
    }
  }

  filtrosAbiertos = false;

  /** Alterna el filtro de estado desde los cards (click) */
  toggleEstadoFilter(estado: 'aprobado' | 'parcial' | 'pendiente'): void {
    const current = this.filtroForm.get('estado')?.value;
    const nuevo = current === estado ? '' : estado;
    this.filtroForm.patchValue({ estado: nuevo });
    this.aplicarFiltros();
    this.filtrosAbiertos = true;
  }

  clearFilters(): void {
    this.filtroForm.patchValue({ texto: '', estado: '', nivel: '' });
    this.movilidadIdFiltro = null;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.aplicarFiltros();
    this.filtrosAbiertos = true;
  }

  onFiltersToggle(event: Event): void {
    const target = event.target as HTMLDetailsElement;
    this.filtrosAbiertos = !!target?.open;
  }

  private cumpleFiltroTexto(movilidad: MovilidadAgrupada, texto: string): boolean {
    if (!texto) return true;
    const textoLower = texto.toLowerCase();
    const nombreMovilidad = movilidad.nombreMovilidad?.toLowerCase() || '';
    const movilidadId = movilidad.movilidadId.toLowerCase();

    if (nombreMovilidad === textoLower) return true;
    return nombreMovilidad.includes(textoLower) || movilidadId.includes(textoLower);
  }

  private cumpleFiltroEstado(movilidad: MovilidadAgrupada, estado: string): boolean {
    if (!estado) return true;
    const estadoMovilidad = (movilidad.estadoGeneral || '').toString().toLowerCase();
    return estadoMovilidad === estado.toString().toLowerCase();
  }

  private cumpleFiltroNivel(movilidad: MovilidadAgrupada, nivel: number | null): boolean {
    if (nivel == null || Number.isNaN(Number(nivel))) return true;
    const nivelNum = Number(nivel);
    // Filtrar movilidades donde el nivel indicado está pendiente de aprobación
    const aprobacionNivel = movilidad.aprobaciones.find(a => a.nivel === nivelNum);
    return !!aprobacionNivel && aprobacionNivel.estado === 'pendiente';
  }

  private cumpleFiltroMovilidadId(movilidad: MovilidadAgrupada): boolean {
    if (!this.movilidadIdFiltro) return true;
    return movilidad.movilidadId === this.movilidadIdFiltro;
  }

  /** Scrolls the table so that the filtered mobility is visible */
  private scrollToMovilidad(): void {
    if (!this.movilidadIdFiltro) return;
    // delay to make sure table rows are in DOM
    setTimeout(() => {
      const el = document.getElementById(this.movilidadIdFiltro!);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  calcularEstadisticas(): void {
    // Mostrar estadísticas basadas en TODO el conjunto de movilidades (no solo las filtradas)
    const todas = this.movilidadesAgrupadas();
    const totalTodas = todas.length;

    const aprobadasCount = todas.filter(m => this.estadoEfectivo(m) === 'aprobado').length;
    const parcialesCount = todas.filter(m => this.estadoEfectivo(m) === 'parcial').length;
    const pendientesCount = todas.filter(m => this.estadoEfectivo(m) === 'pendiente').length;
    const rechazadasCount = todas.filter(m => this.estadoEfectivo(m) === 'rechazado').length;

    this.estadisticas = {
      total: totalTodas,
      aprobadas: aprobadasCount,
      parciales: parcialesCount,
      pendientes: pendientesCount,
      rechazadas: rechazadasCount,
      porcentajeAprobadas: totalTodas > 0 ? (aprobadasCount / totalTodas) * 100 : 0,
      porcentajeParciales: totalTodas > 0 ? (parcialesCount / totalTodas) * 100 : 0,
      porcentajePendientes: totalTodas > 0 ? (pendientesCount / totalTodas) * 100 : 0,
      porcentajeRechazadas: totalTodas > 0 ? (rechazadasCount / totalTodas) * 100 : 0
    };
  }

  private estadoEfectivo(m: MovilidadAgrupada): string {
    const eg = (m.estadoGeneral || '').toString().toLowerCase().trim();
    if (eg) return eg;

    const aprobaciones = m.aprobaciones || [];
    const totalNiv = aprobaciones.length;
    if (totalNiv === 0) return 'pendiente';
    const aprobadas = aprobaciones.filter(a => (a.estado || '').toString().toLowerCase() === 'aprobado').length;
    const rechazadas = aprobaciones.filter(a => (a.estado || '').toString().toLowerCase() === 'rechazado').length;
    if (aprobadas === totalNiv) return 'aprobado';
    if (rechazadas > 0) return 'rechazado';
    if (aprobadas > 0) return 'parcial';
    return 'pendiente';
  }

  getFilteredCountByState(state: 'aprobado' | 'parcial' | 'pendiente' | 'rechazado'): number {
    return this.movilidadesFiltradas().filter(m => this.estadoEfectivo(m) === state).length;
  }

  getFilteredPercentageByState(state: 'aprobado' | 'parcial' | 'pendiente' | 'rechazado'): number {
    const total = this.movilidadesFiltradas().length;
    if (total === 0) return 0;
    return (this.getFilteredCountByState(state) / total) * 100;
  }

  getFilteredTotal(): number {
    return this.movilidadesFiltradas().length;
  }

  obtenerSiguienteNivelParaAprobar(movilidad: MovilidadAgrupada): number | null {
    const pendiente = movilidad.aprobaciones.find(a => !this.isConfiguracionError(a) && a.estado === 'pendiente' && this.puedeAprobarNivel(a.nivel));
    return pendiente?.nivel ?? (movilidad.aprobaciones.length === 0 && this.puedeAprobarNivel(1) ? 1 : null);
  }

  /** Verifica si el usuario puede aprobar al menos un nivel pendiente en la movilidad */
  puedeAprobarMovilidad(movilidad: MovilidadAgrupada): boolean {
    return this.obtenerSiguienteNivelParaAprobar(movilidad) !== null;
  }

  /** Muestra alerta de inicio de aprobaciones desde la tabla */
  aprobarDesdeTabla(movilidad: MovilidadAgrupada): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Inicio de Aprobaciones',
      detail: `Se va a iniciar el proceso de aprobaciones para la movilidad "${movilidad.nombreMovilidad}". El proceso comenzará con el primer nivel de aprobación.`,
      life: 6000
    });
  }

  /** Procesa la aprobación desde la tabla */
  private procesarAprobacionDesdeTabla(movilidad: MovilidadAgrupada, aprobacion: AprobacionNivel | null, apoyosSeleccionados?: string[], nivelIniciacion?: number): void {
    if (this.esMovilidadCancelada(movilidad.movilidadId)) { this.mostrarMensajeUnico('warn', 'Cancelado', 'La autorización está cancelada. No se puede procesar aprobaciones.'); return; }

    const crearYProcesar = (niv: number) => this.crearAutorizacionAutomatica(movilidad.movilidadId, () => {
      this.cargarAprobaciones().then(() => {
        const mov = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidad.movilidadId);
        const apr = mov?.aprobaciones.find(a => a.nivel === niv);
        mov && apr?.autorizacionId ? this.procesarAprobacionReal(mov, apr, apoyosSeleccionados)
          : this.mostrarMensajeUnico('error', 'Error', 'No se pudo crear la autorización automática');
      });
    });

    if (!aprobacion && nivelIniciacion === 1) { crearYProcesar(1); return; }
    if (!aprobacion?.id) { this.mostrarMensajeUnico('error', 'Error', 'No se encontró la aprobación para este nivel'); return; }
    if (!this.esAprobacionValida(aprobacion)) return;
    !aprobacion.autorizacionId ? crearYProcesar(aprobacion.nivel) : this.procesarAprobacionReal(movilidad, aprobacion, apoyosSeleccionados);
  }

  /** Procesa la aprobación con un ID de autorización real */
  private procesarAprobacionReal(movilidad: MovilidadAgrupada, aprobacion: AprobacionNivel, apoyosSeleccionados?: string[]): void {
    const idAprobacion = aprobacion.autorizacionId || aprobacion.id;
    if (!idAprobacion) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo procesar la aprobación - ID no válido'
      });
      return;
    }

    this.autorizacionService.aprobarNivelValidado(
      idAprobacion,
      aprobacion.nivel,
      this.observaciones,
      apoyosSeleccionados
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Nivel ${aprobacion.nivel} aprobado correctamente`
        });

        // Actualizar el estado local inmediatamente para una respuesta más rápida
        this.actualizarEstadoAprobacionLocal(movilidad.movilidadId, aprobacion.nivel, 'aprobado' as EstadoAprobacion);

        // Recargar aprobaciones en segundo plano para asegurar consistencia
        this.cargarAprobaciones();
      },
      error: (error: any) => {
        const errorMessage = error?.error?.message || 'Error desconocido';
        this.messageService.add({
          severity: 'error',
          summary: 'Error al aprobar',
          detail: `Error al aprobar el nivel: ${errorMessage}`
        });
      }
    });
  }

  private parsearJsonSeguro(json: string | undefined | null): string[] {
    try { return json ? JSON.parse(json) : []; } catch { return []; }
  }

  private cargarApoyosEconomicosParaAprobacion(movilidadId: string): void {
    this.nivelDialogoApoyos = 6;
    this.apoyoEconomicoService.getByMovilidadId(movilidadId).subscribe({
      next: (apoyos) => {
        const hayApoyos = apoyos?.length > 0;
        this.tieneApoyos.set(hayApoyos);
        this.selectAll = hayApoyos;

        if (hayApoyos) {
          const m = this.movilidadCompleta();
          const aprobados6 = this.parsearJsonSeguro(m?.apoyosEconomicosAprobadosNivel6);
          const aprobados7 = this.parsearJsonSeguro(m?.apoyosEconomicos);

          this.apoyosEconomicos.set(apoyos.map(a => ({ ...a, selected: true, aprobadoPorNivel6: aprobados6.includes(a.id!), aprobadoPorNivel7: aprobados7.includes(a.id!) })));
          this.apoyosSeleccionados.set(apoyos.map(a => a.id!));
        } else {
          this.apoyosEconomicos.set([]);
          this.apoyosSeleccionados.set([]);
        }

        this.observaciones = '';
        this.mostrarDialogoApoyos = true;
      },
      error: () => this.mostrarMensajeUnico('error', 'Error', 'No se pudieron cargar los apoyos económicos')
    });
  }

  /** Configura el estado del diálogo de apoyos (común a ambas ramas) */
  private abrirDialogoApoyos(apoyos: ApoyoEconomicoSeleccionable[], seleccionados: string[], hayApoyos: boolean, allSelected: boolean): void {
    this.tieneApoyos.set(hayApoyos);
    this.apoyosEconomicos.set(apoyos);
    this.apoyosSeleccionados.set(seleccionados);
    this.selectAll = allSelected;
    this.observaciones = '';
    this.mostrarDialogoApoyos = true;
  }

  private parsearCampoApoyos(campo: string): string[] {
    try { return JSON.parse(campo); } catch {
      return typeof campo === 'string' && !campo.startsWith('[') ? campo.split(',').map(s => s.trim()).filter(Boolean) : [];
    }
  }

  private cargarApoyosAprobadosNivel6(movilidadId: string): void {
    this.nivelDialogoApoyos = 7;
    this.apoyoEconomicoService.getByMovilidadId(movilidadId).subscribe({
      next: (todosApoyos) => {
        if (!todosApoyos?.length) { this.abrirDialogoApoyos([], [], false, false); return; }

        this.autorizacionService.getAutorizacionesPorMovilidad(movilidadId).subscribe({
          next: (autorizacion) => {
            if (!autorizacion) { this.abrirDialogoApoyos([], [], false, false); return; }

            const campoNivel6 = (autorizacion as any)?.apoyosEconomicosAprobadosNivel6 || autorizacion.apoyosEconomicos;
            const idsAprobados = campoNivel6 ? this.parsearCampoApoyos(campoNivel6) : [];
            const aprobados = todosApoyos.filter(a => idsAprobados.includes(a.id!));

            if (!aprobados.length) { this.abrirDialogoApoyos([], [], false, false); return; }

            this.abrirDialogoApoyos(
              aprobados.map(a => ({ ...a, selected: true, aprobadoPorNivel6: true })),
              aprobados.map(a => a.id!), true, true
            );
          },
          error: () => this.abrirDialogoApoyos(
            todosApoyos.map(a => ({ ...a, selected: false, aprobadoPorNivel6: false })),
            [], true, false
          )
        });
      },
      error: () => this.mostrarMensajeUnico('error', 'Error', 'No se pudieron cargar los apoyos económicos')
    });
  }

  /** Confirma aprobación con apoyos económicos seleccionados */
  confirmarAprobacionConApoyos(movilidad: MovilidadAgrupada, aprobacion: AprobacionNivel): void {
    if ((this.nivelDialogoApoyos === 6 || this.nivelDialogoApoyos === 7) && this.apoyosEconomicos().length > 0 && this.apoyosSeleccionados().length === 0) {
      this.mostrarMensajeUnico('warn', 'Advertencia', 'Debe seleccionar al menos un apoyo económico para aprobar'); return;
    }

    this.procesarAprobacionDesdeTabla(movilidad, aprobacion, this.apoyosSeleccionados());
    this.observaciones = '';
    this.mostrarDialogoApoyos = false;
    if (this.nivelDialogoApoyos !== 6 && this.nivelDialogoApoyos !== 7) this.movilidadSeleccionada.set(null);
  }

  cancelarDialogoApoyos(): void {
    this.mostrarDialogoApoyos = false;
    this.apoyosEconomicos.set([]);
    this.apoyosSeleccionados.set([]);
    this.tieneApoyos.set(false);
    this.selectAll = true;
    this.nivelDialogoApoyos = 6; 
    this.movilidadSeleccionada.set(null); // Limpiar la movilidad seleccionada
    this.observaciones = '';
  }

  /** Getter para obtener la movilidad actual y su aprobación */
  get movilidadYAprobacionActual(): { movilidad: MovilidadAgrupada; aprobacion: AprobacionNivel } | null {
    const movilidad = this.movilidadSeleccionada();
    if (!movilidad) return null;

    // Buscar la aprobación del nivel actual (6 o 7)
    const aprobacion = movilidad.aprobaciones.find(a => a.nivel === this.nivelDialogoApoyos);
    if (!aprobacion) return null;

    return { movilidad, aprobacion };
  }

  /** Selecciona/deselecciona todos los apoyos */
  toggleSelectAll(): void {
    const apoyos = this.apoyosEconomicos();
    if (this.selectAll) {
      apoyos.forEach(apoyo => apoyo.selected = true);
      this.apoyosSeleccionados.set(apoyos.map(a => a.id!));
    } else {
      apoyos.forEach(apoyo => apoyo.selected = false);
      this.apoyosSeleccionados.set([]);
    }
  }

  /** Actualiza la lista de seleccionados cuando cambia un checkbox individual */
  updateSeleccionados(apoyo: ApoyoEconomicoSeleccionable): void {
    const seleccionados = this.apoyosSeleccionados();
    if (apoyo.selected) {
      if (!seleccionados.includes(apoyo.id!)) {
        this.apoyosSeleccionados.set([...seleccionados, apoyo.id!]);
      }
    } else {
      this.apoyosSeleccionados.set(seleccionados.filter(id => id !== apoyo.id));
    }

    // Actualizar selectAll basado en si todos están seleccionados
    const apoyos = this.apoyosEconomicos();
    this.selectAll = apoyos.every(a => a.selected);
  }

  /** Rechaza el siguiente nivel disponible desde la tabla */
  rechazarDesdeTabla(movilidad: MovilidadAgrupada): void {
    const nivel = this.obtenerSiguienteNivelParaAprobar(movilidad);
    if (!nivel) { this.mostrarMensajeUnico('error', 'Error', 'No hay niveles pendientes que puedas rechazar'); return; }

    const aprobacion = movilidad.aprobaciones.find(a => a.nivel === nivel);
    if (!aprobacion) { this.mostrarMensajeUnico('error', 'Error', 'No se encontró la aprobación para este nivel'); return; }
    if (!this.puedeAprobarNivel(aprobacion)) { this.mostrarMensajeUnico('warn', 'No autorizado', this.obtenerMensajeValidacionNivel(aprobacion), 5000); return; }

    this.aprobacionSeleccionada = aprobacion;
    this.accionDialog = 'rechazar';
    this.observaciones = '';
    this.mostrarDialogoAprobarRechazar = true;
  }
  confirmarAccion(): void {
    
    if (!this.aprobacionSeleccionada?.id) {
      return;
    }

    const esValida = this.esAprobacionValida(this.aprobacionSeleccionada);
    if (!esValida) {
      return;
    }

    // Si la movilidad seleccionada está cancelada, bloquear la acción
    const movSel = this.movilidadSeleccionada();
    if (movSel && (movSel.estadoGeneral === 'cancelado' || movSel.autorizacionCancelada || this.movilidadTieneAutorizacionCancelada(movSel.movilidadId))) {
      this.messageService.add({ severity: 'warn', summary: 'Cancelado', detail: 'No se puede procesar: la autorización está cancelada' });
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);

    // Si la aprobación es fija (no existe en BD), crear autorización completa y luego aprobar
    if (this.accionDialog === 'aprobar' && this.esAprobacionFija(this.aprobacionSeleccionada)) {
      const movilidadId = this.movilidadSeleccionada()?.movilidadId;
      if (movilidadId) {
        this.crearAutorizacionCompletaYaprobarNivel(movilidadId, this.aprobacionSeleccionada.nivel);
        return;
      }
    }

    const observable = this.accionDialog === 'aprobar'
      ? this.autorizacionService.aprobarNivelValidado(this.aprobacionSeleccionada.autorizacionId || this.aprobacionSeleccionada.id, this.aprobacionSeleccionada.nivel, this.observaciones)
      : this.autorizacionService.rechazarNivelValidado(this.aprobacionSeleccionada.autorizacionId || this.aprobacionSeleccionada.id, this.aprobacionSeleccionada.nivel, this.observaciones);

    observable.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Nivel ${this.accionDialog === 'aprobar' ? 'aprobado' : 'rechazado'} correctamente`
        });
        this.mostrarDialogoAprobarRechazar = false;
        this.cargando.set(false);
        this.cargarAprobaciones();
        // Recargar detalles de la movilidad para reflejar inmediatamente los estados de aprobación
        const movilidadActiva = this.movilidadSeleccionada();
        if (movilidadActiva?.movilidadId && this.movilidadCompleta()) {
          this.cargarMovilidadCompleta(movilidadActiva.movilidadId);
        }
      },
      error: (error: any) => {
        const errorMessage = error?.error?.message || 'Error desconocido';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo ${this.accionDialog === 'aprobar' ? 'aprobar' : 'rechazar'} la solicitud: ${errorMessage}`
        });
        this.cargando.set(false);
      }
    });
  }

  /** Actualiza el estado de una movilidad específica sin recargar toda la lista */
  private actualizarEstadoMovilidadLocal(movilidadId: string): void {
    this.ngZone.run(() => {
      const movilidadIndex = this.movilidadesAgrupadas().findIndex(m => m.movilidadId === movilidadId);
      
      if (movilidadIndex >= 0) {
        const movilidad = this.movilidadesAgrupadas()[movilidadIndex];
        const aprobaciones = movilidad.aprobaciones;
        const totalNiveles = aprobaciones.length;
        const aprobadas = aprobaciones.filter(a => a.estado === 'aprobado').length;
        const rechazadas = aprobaciones.filter(a => a.estado === 'rechazado').length;
        
        let nuevoEstado: 'aprobado' | 'rechazado' | 'pendiente' | 'parcial' = 'pendiente';
        if (aprobadas === totalNiveles) nuevoEstado = 'aprobado';
        else if (rechazadas > 0) nuevoEstado = 'rechazado';
        else if (aprobadas > 0) nuevoEstado = 'parcial';
        
        if (nuevoEstado === 'aprobado') {
          this.actualizarEstadoMovilidadEnBackend(movilidadId, false); // solicitarAutorizacion = false
        }
        
        // Actualizar el estado de la movilidad
        const movilidadesActuales = [...this.movilidadesAgrupadas()];
        movilidadesActuales[movilidadIndex] = {
          ...movilidad,
          estadoGeneral: nuevoEstado,
          totalNiveles: totalNiveles,
          nivelesAprobados: aprobadas,
          nivelesRechazados: rechazadas,
          nivelesPendientes: totalNiveles - aprobadas - rechazadas,
          // Crear nuevas referencias para las aprobaciones
          aprobaciones: movilidad.aprobaciones.map(a => ({ ...a }))
        };
        
        this.movilidadesAgrupadas.set(movilidadesActuales);
        
        if (this.movilidadSeleccionada() && this.movilidadSeleccionada()!.movilidadId === movilidadId) {
          this.movilidadSeleccionada.set(movilidadesActuales[movilidadIndex]);
        }
        
        this.movilidadEstadoService.notificarMovilidadActualizada(movilidadId);
      }
    });
  }

  /** Actualiza el estado de la movilidad en el backend cuando se completa la autorización */
  private actualizarEstadoMovilidadEnBackend(movilidadId: string, solicitarAutorizacion: boolean): void {
    // Cuando se completa la autorización, actualizar el campo aprobado de la movilidad
    // Prefer PATCH for just updating approval status to avoid partial object PUT issues
    this.movilidadService.updateAprobacion(movilidadId, 'aprobado').subscribe({
      next: () => {
        // Notificar que la movilidad ha sido actualizada
        this.movilidadEstadoService.notificarMovilidadActualizada(movilidadId);

        this.ngZone.run(() => {
          this.movilidadesAgrupadas.set(
            this.movilidadesAgrupadas().filter(m => m.movilidadId !== movilidadId)
          );
          this.movilidadesFiltradas.set(
            this.movilidadesFiltradas().filter(m => m.movilidadId !== movilidadId)
          );
          this.calcularEstadisticas();
        });

      },
      error: (error) => {
      }
    });
  }

  /** Desactiva solicitarAutorizacion en local y backend para una movilidad */
  private sincronizarAutorizacionLocal(movilidadId: string, esEstudiantil: boolean): void {
    const servicio$ = esEstudiantil
      ? this.estudianteService.updateAutorizacionForMovilidad(movilidadId, false)
      : this.postulanteService.updateAutorizacionForMovilidad(movilidadId, false);

    servicio$.subscribe({
      next: () => {
        this.postulantes.set((this.postulantes() || []).map((p: any) => ({ ...p, solicitarAutorizacion: false })));
        const mc = this.movilidadCompleta();
        if (mc && (mc.id === movilidadId || mc.movilidadId === movilidadId)) this.movilidadCompleta.set({ ...mc, solicitarAutorizacion: false });
        const patch = (m: any) => m.movilidadId === movilidadId ? { ...m, solicitarAutorizacion: false } : m;
        this.movilidadesAgrupadas.set(this.movilidadesAgrupadas().map(patch));
        this.movilidadesFiltradas.set(this.movilidadesFiltradas().map(patch));
        this.movilidadEstadoService.notificarMovilidadActualizada(movilidadId);
      },
      error: () => {}
    });
  }

  /** Cargar postulantes de una movilidad */
  private cargarPostulantesMovilidad(movilidadId: string): void {
    this.cargandoPostulantes.set(true);
    this.postulantes.set([]);

    const mov = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidadId);
    if (!mov) { this.cargandoPostulantes.set(false); return; }

    const esEstudiantil = mov.movilidad.modalidad?.nombre === 'ESTUDIANTIL';
    (esEstudiantil ? this.estudianteService : this.postulanteService).getByMovilidad(movilidadId).subscribe({
      next: (participantes: any[]) => {
        const adaptados = esEstudiantil
          ? participantes.map(e => ({
              id: e.id, numIdentificacion: e.idEstudiante, nombres: e.nombre.split(' ')[0] || '',
              apellidos: e.nombre.split(' ').slice(1).join(' ') || '', programa: e.semestre?.toString() || '',
              vinculacion: 'ESTUDIANTE', solicitarAutorizacion: e.solicitarAutorizacion
            }))
          : participantes;

        this.postulantes.set(adaptados || []);
        this.cargandoPostulantes.set(false);

        const tieneSolicitar = (adaptados || []).some((p: any) => p.solicitarAutorizacion === true);
        if ((mov.movilidad?.solicitarAutorizacion ?? false) && !tieneSolicitar) this.sincronizarAutorizacionLocal(movilidadId, esEstudiantil);
      },
      error: () => {
        this.postulantes.set([]);
        this.cargandoPostulantes.set(false);
        this.mostrarMensajeUnico('error', 'Error', 'No se pudieron cargar los participantes de la movilidad');
      }
    });
  }

  /** Cargar movilidad completa con todas sus relaciones */
  private cargarMovilidadCompleta(movilidadId: string): void {
    // Obtener la movilidad para determinar el tipo
    const movilidadAgrupada = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidadId);
    if (!movilidadAgrupada) return;

    const esEstudiantil = movilidadAgrupada.movilidad.modalidad?.nombre === 'ESTUDIANTIL';
    const servicioParticipantes = esEstudiantil ? this.estudianteService : this.postulanteService;
    const keyParticipantes = esEstudiantil ? 'estudiantes' : 'postulantes';

    const forkJoinData: any = {
      [keyParticipantes]: servicioParticipantes.getByMovilidad(movilidadId),
      apoyosEconomicos: this.apoyoEconomicoService.getByMovilidadId(movilidadId),
      rubrosPresupuestales: this.rubroPresupuestalService.getByMovilidadId(movilidadId),
      actividadesAsignadas: this.actividadesService.getActividadesByMovilidad(movilidadId),
      productosCompromisos: this.productosService.getProductosByMovilidad(movilidadId),
      autorizacion: this.autorizacionService.getAutorizacionesPorMovilidad(movilidadId)
    };

    forkJoin(forkJoinData).subscribe({
      next: (resultados: any) => {
        // Parsear los apoyos aprobados por nivel 6 y nivel 7
        const aut = resultados.autorizacion;
        let nivel6Aprobados: string[] = [];
        let nivel7Aprobados: string[] = [];
        const nivel6Actuo = (aut as any)?.nivel6?.estado === 'aprobado';
        const nivel7Actuo = (aut as any)?.nivel7?.estado === 'aprobado';
        try { nivel6Aprobados = aut?.apoyosEconomicosAprobadosNivel6 ? JSON.parse(aut.apoyosEconomicosAprobadosNivel6) : []; } catch { nivel6Aprobados = []; }
        try { nivel7Aprobados = aut?.apoyosEconomicos ? JSON.parse(aut.apoyosEconomicos) : []; } catch { nivel7Aprobados = []; }

        // Marcar cada apoyo con el resultado de cada nivel
        const apoyosMarcados = (resultados.apoyosEconomicos || []).map((ap: any) => ({
          ...ap,
          aprobadoNivel6: nivel6Actuo ? nivel6Aprobados.includes(ap.id) : null,
          aprobadoNivel7: nivel7Actuo ? nivel7Aprobados.includes(ap.id) : null
        }));

        // Crear objeto completo con todas las relaciones
        const movilidadCompleta = {
          ...movilidadAgrupada.movilidad,
          [keyParticipantes]: resultados[keyParticipantes] || [],
          apoyosEconomicos: apoyosMarcados,
          rubrosPresupuestales: resultados.rubrosPresupuestales || [],
          actividadesAsignadas: resultados.actividadesAsignadas || [],
          productosCompromisos: resultados.productosCompromisos || [],
          solicitarAutorizacion: (resultados[keyParticipantes] || []).some((p: any) => p.solicitarAutorizacion === true)
        };

        this.movilidadCompleta.set(movilidadCompleta);

        if (movilidadAgrupada.movilidad?.solicitarAutorizacion && !movilidadCompleta.solicitarAutorizacion) {
          this.sincronizarAutorizacionLocal(movilidadId, esEstudiantil);
        }
      },
      error: () => this.mostrarMensajeUnico('error', 'Error', 'No se pudo cargar la información completa de la movilidad')
    });
  }

  /** Generar PDF con información completa de la movilidad */
  async generarPDF(movilidad?: any): Promise<void> {
    const mov = movilidad || this.movilidadCompleta();
    if (!mov) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay información completa de la movilidad para generar el PDF'
      });
      return;
    }

    // Si es MovilidadAgrupada, obtener el ID de la movilidad anidada
    const movilidadId = mov.movilidadId || mov.id || (mov.movilidad && mov.movilidad.id);
    if (!movilidadId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede generar PDF: movilidad sin ID'
      });
      return;
    }

    try {
      // Llamar al backend para generar el PDF
      this.movilidadService.generatePdf(movilidadId).subscribe({
        next: (pdfBlob: Blob) => {
          // Crear URL temporal para el blob
          const url = window.URL.createObjectURL(pdfBlob);

          // Crear enlace temporal para descargar
          const link = document.createElement('a');
          link.href = url;
          const nombreMovilidad = mov.nombreMovilidad || (mov.movilidad && mov.movilidad.nombreMovilidad) || 'sin-nombre';
          link.download = `movilidad-saliente-${nombreMovilidad.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

          // Trigger download
          document.body.appendChild(link);
          link.click();

          // Limpiar
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al generar el PDF. Intente nuevamente.'
          });
        }
      });

    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el PDF. Intente nuevamente.'
      });
    }
  }



  /** Calcular días de movilidad */
  private calcularDiasMovilidad(fechaInicio: string | Date | null, fechaFin: string | Date | null): string {
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

  /** Método público para calcular días de movilidad (para usar en template) */
  calcularDiasMovilidadPublico(fechaInicio: string | Date | null, fechaFin: string | Date | null): string {
    return this.calcularDiasMovilidad(fechaInicio, fechaFin);
  }


  goBack(): void {
    window.history.back();
  }

  onMouseOver(event: any, color: string): void {
    event.target.style.backgroundColor = color;
  }

  onMouseOut(event: any): void {
    event.target.style.backgroundColor = 'transparent';
  }

  get apoyosAprobadosNivel6Count(): number {
    return this.apoyosEconomicos().filter((a: ApoyoEconomicoSeleccionable) => !!a.aprobadoPorNivel6).length;
  }

  private async crearAutorizacionCompletaYaprobarNivel(movilidadId: string, nivel: number): Promise<void> {
    const tipo = this.tipoAutorizacion === 'estudiante' ? 'ESTUDIANTE' : 'POSTULANTE';
    try {
      const creadas: AprobacionNivel[] = await lastValueFrom(
        this.autorizacionService.crearAprobacionesAutomaticas(movilidadId, this.aprobadores.length, 'DEFAULT', tipo)
      );
      this.actualizarAprobacionesMovilidadLocal(movilidadId, creadas || []);
      const especifica = (creadas || []).find(a => a.nivel === nivel);
      especifica ? this.procesarAprobacionNivel(movilidadId, nivel, especifica)
        : (this.mostrarMensajeUnico('error', 'Error', `No se encontró la aprobación para nivel ${nivel} en las aprobaciones creadas`), this.cargando.set(false));
    } catch (e: any) {
      this.mostrarMensajeUnico(e?.status === 400 ? 'warn' : 'error',
        e?.status === 400 ? 'No se puede crear autorización' : 'Error',
        e?.status === 400 ? 'Antes de solicitar autorización debe existir al menos un postulante o estudiante para la movilidad.' : 'No se pudo crear la autorización. Intente nuevamente.');
      this.cargando.set(false);
    }
  }

  private actualizarAprobacionesMovilidadLocal(movilidadId: string, nuevasAprobaciones: AprobacionNivel[]): void {
    this.ngZone.run(() => {
      const movilidades = this.movilidadesAgrupadas();
      const index = movilidades.findIndex(m => m.movilidadId === movilidadId);
      if (index !== -1) {
        const movilidadActualizada = { ...movilidades[index], aprobaciones: nuevasAprobaciones };
        movilidades[index] = movilidadActualizada;
        this.movilidadesAgrupadas.set([...movilidades]);
                if (this.movilidadSeleccionada() && this.movilidadSeleccionada()!.movilidadId === movilidadId) {
          this.movilidadSeleccionada.set(movilidadActualizada);
        }
        
        this.aplicarFiltros();
      }
    });
    
  }

  private actualizarEstadoAprobacionLocal(movilidadId: string, nivel: number, nuevoEstado: EstadoAprobacion): void {
    this.ngZone.run(() => {
      const movilidades = this.movilidadesAgrupadas();
      const index = movilidades.findIndex(m => m.movilidadId === movilidadId);
      if (index !== -1) {
        const movilidad = movilidades[index];
        const aprobacionesActualizadas = movilidad.aprobaciones.map(aprobacion => {
          if (aprobacion.nivel === nivel) {
            const actualizado: AprobacionNivel = { ...aprobacion, estado: nuevoEstado };
            if (nuevoEstado === 'aprobado' || nuevoEstado === 'rechazado') {
              const approver = this.obtenerPayloadAprobadorLocal();
              actualizado.aprobadorNombre = approver.nombre;
              actualizado.aprobadorIdentificacion = approver.identificacion;
              actualizado.aprobadorEmail = approver.email;
              const rolLocal = this.obtenerRolAprobadorLocalDisplay(nivel);
              const rolKeycloakNivel = this.aprobadores.find(a => a.orden === nivel)?.rolKeycloak;
              actualizado.aprobadorCargo = aprobacion.aprobadorCargo || rolLocal || rolKeycloakNivel || this.obtenerNombreNivel(nivel) || aprobacion.rolRequerido;
            }
            return actualizado;
          }
          return aprobacion;
        });

        const movilidadActualizada = { ...movilidad, aprobaciones: aprobacionesActualizadas };
        movilidades[index] = movilidadActualizada;
        this.movilidadesAgrupadas.set([...movilidades]);
        if (this.movilidadSeleccionada() && this.movilidadSeleccionada()!.movilidadId === movilidadId) {
          this.movilidadSeleccionada.set(movilidadActualizada);
        }

        this.aplicarFiltros();
      }
    });
  }

  private procesarAprobacionNivel(movilidadId: string, nivel: number, aprobacion: AprobacionNivel): void {
    if (aprobacion.autorizacionId) { this.ejecutarAprobacionNivel(movilidadId, nivel, aprobacion, aprobacion.autorizacionId); return; }

    const reintento = () => this.crearAutorizacionAutomatica(movilidadId, () => this.procesarAprobacionNivel(movilidadId, nivel, aprobacion));
    this.autorizacionService.getAutorizacionesPorMovilidad(movilidadId).subscribe({
      next: (aut: any) => aut?.id ? this.ejecutarAprobacionNivel(movilidadId, nivel, aprobacion, aut.id) : reintento(),
      error: (e: any) => e.status === 404 ? reintento() : (this.mostrarMensajeUnico('error', 'Error', 'Error al verificar la autorización'), this.cargando.set(false))
    });
  }

  private crearAutorizacionAutomatica(movilidadId: string, callback?: () => void): void {
    const movilidad = this.movilidadesAgrupadas().find((m: MovilidadAgrupada) => m.movilidadId === movilidadId);
    if (!movilidad) {
      this.cargando.set(false); // Ocultar barra de progreso si no se encuentra la movilidad
      return;
    }
    if (movilidad.autorizacionCancelada || movilidad.estadoGeneral === 'cancelado' || this.movilidadTieneAutorizacionCancelada(movilidadId)) {
      this.messageService.add({ severity: 'warn', summary: 'Cancelado', detail: 'No se puede crear la autorización porque la movilidad está cancelada' });
      this.cargando.set(false);
      return;
    }

    const tipoPostulante = 'POSTULANTE'; 
    const tipoMovilidad = 'POSTULANTE'; 
    const totalNiveles = 7; 

    this.autorizacionService.crearAprobacionesAutomaticas(movilidadId, totalNiveles, tipoPostulante, tipoMovilidad).subscribe({
      next: (aprobaciones: any) => {
        if (callback) {
          callback();
        }
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al crear la autorización automática'
        });
        this.cargando.set(false); 
      }
    });
  }

  private ejecutarAprobacionNivel(movilidadId: string, nivel: number, aprobacion: AprobacionNivel, autorizacionId: string): void {
    this.autorizacionService.aprobarNivelValidado(autorizacionId, aprobacion.nivel, this.observaciones).subscribe({
      next: (resultado: any) => {
        this.ngZone.run(() => {
          const movilidadIndex = this.movilidadesAgrupadas().findIndex(m => m.movilidadId === movilidadId);
          if (movilidadIndex >= 0) {
            const movilidad = this.movilidadesAgrupadas()[movilidadIndex];
            const aprobacionIndex = movilidad.aprobaciones.findIndex(a => a.nivel === aprobacion.nivel);
            if (aprobacionIndex >= 0) {
              const nuevasAprobaciones = [...movilidad.aprobaciones];
              const nuevaAprob = { ...nuevasAprobaciones[aprobacionIndex] } as AprobacionNivel;
              nuevaAprob.estado = 'aprobado';
              nuevaAprob.fechaAprobacion = new Date().toISOString();
              const approver = this.obtenerPayloadAprobadorLocal();
              nuevaAprob.aprobadorNombre = approver.nombre;
              nuevaAprob.aprobadorIdentificacion = approver.identificacion;
              nuevaAprob.aprobadorEmail = approver.email;
                    const rolLocal = this.obtenerRolAprobadorLocalDisplay(nuevaAprob.nivel);
                    const rolKeycloakNivel = this.aprobadores.find(a => a.orden === nuevaAprob.nivel)?.rolKeycloak;
                    nuevaAprob.aprobadorCargo = rolLocal || nuevaAprob.aprobadorCargo || rolKeycloakNivel || this.obtenerNombreNivel(nuevaAprob.nivel) || nuevaAprob.rolRequerido;
              const movilidadActualizada = { ...movilidad, aprobaciones: nuevasAprobaciones };
              const movilidadesActuales = [...this.movilidadesAgrupadas()];
              movilidadesActuales[movilidadIndex] = movilidadActualizada;
              this.movilidadesAgrupadas.set(movilidadesActuales);

              if (this.movilidadSeleccionada() && this.movilidadSeleccionada()!.movilidadId === movilidadId) {
                this.movilidadSeleccionada.set(movilidadActualizada);
              }
            }
          }

          this.actualizarEstadoMovilidadLocal(movilidadId);
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Aprobado',
          detail: `Nivel ${nivel} aprobado correctamente`
        });
        this.cargarAprobaciones();
        // Recargar detalles para reflejar inmediatamente el estado de aprobación en la tabla de apoyos
        if (this.movilidadCompleta()) {
          this.cargarMovilidadCompleta(movilidadId);
        }
        this.cargando.set(false); // Ocultar barra de progreso
      },
      error: (error: any) => {
        const status = error?.status;
        const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
        this.messageService.add({
          severity: 'error',
          summary: `Error al aprobar (${status})`,
          detail: `Error al aprobar el nivel: ${errorMessage}`
        });
        this.cargando.set(false); 
      }
    });
  }

  refrescarLista(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Actualizando',
      detail: 'Recargando lista de movilidades...'
    });
    this.cargarAprobaciones();
  }

  // ==MÉTODOS PARA OPERAR CON AUTORIZACIONES ==========

  verDetalleAutorizacion(autorizacion: Autorizacion): void {
    if (autorizacion.movilidadPostulanteId) {
      this.filtrarMovilidadesPorAutorizacion(autorizacion.movilidadPostulanteId);
    } else if (autorizacion.movilidadEstudianteId) {
      this.filtrarMovilidadesPorAutorizacion(autorizacion.movilidadEstudianteId);
    } else {
      this.mostrarMensajeUnico('warn', 'Advertencia', 'La autorización no tiene una movilidad asociada');
    }
  }

  private filtrarMovilidadesPorAutorizacion(movilidadId: string): void {
    this.movilidadesFiltradas.set([...this.movilidadesAgrupadas()]);

    const mov = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidadId);
    if (mov) {
      this.verDetalleMovilidadAgrupada(movilidadId);
    } else {
      this.mostrarMensajeUnico('warn', 'No encontrada', 'No se encontró la movilidad solicitada en la lista');
    }
  }

  aprobarAutorizacion(autorizacion: Autorizacion): void {
    const movilidadNombre = this.movilidadesAgrupadas().find(m => m.movilidadId === (autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId))?.movilidad?.nombreMovilidad
      || autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId || autorizacion.id || 'Autorización';

    this.confirmationService.confirm({
      key: 'autorizacion-confirm',
      message: `¿Está seguro de aprobar la autorización para "${movilidadNombre}"?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-check',
      accept: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Autorización Aprobada',
          detail: `La autorización para "${movilidadNombre}" ha sido aprobada`
        });
        this.cargarAprobaciones();
      }
    });
  }

  rechazarAutorizacion(autorizacion: Autorizacion): void {
    const movilidadNombre = this.movilidadesAgrupadas().find(m => m.movilidadId === (autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId))?.movilidad?.nombreMovilidad
      || autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId || autorizacion.id || 'Autorización';

    this.confirmationService.confirm({
      key: 'autorizacion-confirm',
      message: `¿Está seguro de rechazar la autorización para "${movilidadNombre}"?`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-times',
      accept: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Autorización Rechazada',
          detail: `La autorización para "${movilidadNombre}" ha sido rechazada`
        });
        this.cargarAprobaciones();
      }
    });
  }

  eliminarAutorizacion(autorizacion: Autorizacion, movilidadNombreParam?: string): void {
    const movId = autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId;
    const nombre = movilidadNombreParam || this.movilidadesAgrupadas().find(m => m.movilidadId === movId)?.movilidad?.nombreMovilidad || movId || autorizacion.id || 'Autorización';
    const id = autorizacion.id || '';

    this.pendingConfirmation = true;
    this.confirmationService.confirm({
      key: 'autorizacion-confirm',
      message: `¿Está seguro de eliminar la autorización de la movilidad "${nombre}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar Eliminación', icon: 'pi pi-trash',
      reject: () => { this.pendingConfirmation = false; },
      accept: () => {
        this.pendingConfirmation = false;
        if (!movId) { this.mostrarMensajeUnico('error', 'Error', 'ID de movilidad inválido'); return; }

        // antes de eliminar también reseleccionamos el flag en el backend
        const servicioFlag = autorizacion.movilidadEstudianteId ? this.estudianteService : this.postulanteService;
        servicioFlag.updateAutorizacionForMovilidad(movId, false).subscribe({ error: () => {} });

        // Elimina la autorización Y resetea solicitarAutorizacion=false (reset de niveles incluido)
        this.autorizacionService.eliminarAutorizacionesPorMovilidad(movId).subscribe({
          next: () => {
            this.mostrarMensajeUnico('success', 'Autorización eliminada', `La autorización para "${nombre}" ha sido eliminada correctamente`);
            this.limpiarMovilidadEliminada(autorizacion, movId).then(() => {
              this.cargarAprobaciones();
            });
          },
          error: (e: any) => this.mostrarMensajeUnico('error', 'Error', `Error al eliminar la autorización: ${e?.error?.message || 'No se pudo eliminar la autorización'}`)
        });
      }
    });
  }

  /** Limpia estado local tras eliminar una autorización
   *  Devuelve una promesa que se resuelve cuando el flag en la tabla
   *  participantes ha sido actualizado en el backend.
   */
  private async limpiarMovilidadEliminada(autorizacion: Autorizacion, movilidadId?: string): Promise<void> {
    if (!movilidadId) return;
    // registramos la eliminación para evitar que el stub vuelva a aparecer
    this.movilidadesEliminadas.add(movilidadId);

    const movAgr = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidadId);
    const realId = movAgr?.movilidad?.id || movilidadId;
    const esEst = !!autorizacion.movilidadEstudianteId || movAgr?.movilidad?.modalidad?.nombre === 'ESTUDIANTIL';
    const servicio = esEst ? this.estudianteService : this.postulanteService;

    // Eliminar de listas locales
    const filtrar = (lista: MovilidadAgrupada[]) => lista.filter(m => m.movilidadId !== movilidadId);
    this.movilidadesAgrupadas.set(filtrar(this.movilidadesAgrupadas()));
    this.movilidadesFiltradas.set(filtrar(this.movilidadesFiltradas()));

    // Desactivar autorización en backend y esperar a que termine
    try {
      if (realId) {
        await lastValueFrom(servicio.updateAutorizacionForMovilidad(realId, false));
      } else {
        const m = await lastValueFrom(this.movilidadService.getByIdOrNull(movilidadId));
        if (m?.id) {
          await lastValueFrom(servicio.updateAutorizacionForMovilidad(m.id, false));
        }
      }
    } catch {
      // ignorar errores; no crítico
    }

    // Limpiar detalle activo
    const activa = this.movilidadSeleccionada();
    if (activa?.movilidadId === movilidadId) {
      this.movilidadCompleta.set(null);
      if (!esEst) this.postulantes.set(this.postulantes().map((p: Postulante) => ({ ...p, solicitarAutorizacion: false })));
    }

    this.movilidadEstadoService.notificarMovilidadActualizada(movilidadId);
  }

  /** Cancela (admin) la autorización de una movilidad — persiste estado: 'cancelado' */
  confirmarCancelarAutorizacionDesdeAdmin(movilidadId: string): void {
    const mov = this.movilidadesAgrupadas().find(m => m.movilidadId === movilidadId);
    if (!mov) {
      this.mostrarMensajeUnico('warn', 'No encontrado', 'No se pudo localizar la movilidad');
      return;
    }
    if ((mov.aprobaciones || []).some(a => a.estado === 'aprobado')) {
      this.mostrarMensajeUnico('warn', 'Acción no permitida', 'No se puede cancelar: existen niveles aprobados');
      return;
    }

    this.pendingConfirmation = true;
    this.confirmationService.confirm({
      key: 'autorizacion-confirm',
      message: `¿Desea cancelar la solicitud para "${mov.nombreMovilidad}"?`,
      header: 'Confirmar Cancelación',
      icon: 'pi pi-ban',
      acceptLabel: 'Sí, cancelar',
      rejectLabel: 'No',
      reject: () => { this.pendingConfirmation = false; },
      accept: () => {
        this.pendingConfirmation = false;
        const tipo = mov.movilidad?.modalidad?.nombre === 'ESTUDIANTIL' ? 'ESTUDIANTE' : 'POSTULANTE';

        this.autorizacionService.cancelOrCreateForMovilidad(movilidadId, tipo).subscribe({
          next: () => {
            // no queremos que el mismo registro vuelva a volverse a "stubear" a continuación
            this.movilidadesEliminadas.add(movilidadId);

            this.movilidadesAgrupadas.set(this.movilidadesAgrupadas().map(mv => mv.movilidadId === movilidadId ? { ...mv, estadoGeneral: 'cancelado', autorizacionCancelada: true } : mv));

            const update$ = tipo === 'ESTUDIANTE'
              ? this.estudianteService.updateAutorizacionForMovilidad(movilidadId, false)
              : this.postulanteService.updateAutorizacionForMovilidad(movilidadId, false);

            update$.subscribe({
              next: () => this.movilidadEstadoService.notificarMovilidadActualizada(movilidadId),
              error: () => this.movilidadEstadoService.notificarMovilidadActualizada(movilidadId)
            });

            this.mostrarMensajeUnico('info', 'Solicitud Cancelada', 'La autorización fue marcada como cancelada');
            this.cargarAprobaciones();
          },
          error: (err) => {
            this.mostrarMensajeUnico('error', 'Error', 'No se pudo cancelar la autorización');
          }
        });
      }
    });
  }

  confirmarInicioAutorizacion(autorizacion: Autorizacion): void {
    const movId = autorizacion.movilidadPostulanteId || autorizacion.movilidadEstudianteId;
    const nombre = this.movilidadesAgrupadas().find(m => m.movilidadId === movId)?.movilidad?.nombreMovilidad || movId || autorizacion.id || 'Autorización';

    this.confirmationService.confirm({
      key: 'autorizacion-confirm',
      message: `¿Está seguro de que quiere empezar el proceso de autorizaciones para "${nombre}"?`,
      header: 'Confirmar Inicio de Autorización', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, empezar proceso', rejectLabel: 'Cancelar',
      accept: () => {
        if (!movId) { this.mostrarMensajeUnico('error', 'Error', 'No se pudo determinar la movilidad asociada'); return; }
        const tipo = autorizacion.movilidadEstudianteId ? 'ESTUDIANTE' : 'POSTULANTE';

        this.autorizacionService.crearAprobacionesAutomaticas(movId, 7, tipo, tipo).subscribe({
          next: async () => {
            const aprobaciones = await lastValueFrom(this.autorizacionService.getAprobacionesPorMovilidad(movId)).catch(() => []);
            if (aprobaciones?.length) {
              try {
                const mov = await lastValueFrom(this.movilidadService.getById(movId));
                const nueva = await this.crearMovilidadAgrupada(mov, aprobaciones as AprobacionNivel[]);
                this.ngZone.run(() => {
                  this.movilidadesAgrupadas.set([nueva, ...this.movilidadesAgrupadas()]);
                  this.movilidadesFiltradas.set([nueva, ...this.movilidadesFiltradas()]);
                  this.aplicarFiltros();
                  this.calcularEstadisticas();
                });
                this.mostrarMensajeUnico('success', 'Proceso iniciado', 'Los niveles fueron creados y la movilidad aparece en Movilidades');
              } catch { }
            }
            this.cargarAprobaciones();
          },
          error: () => this.mostrarMensajeUnico('error', 'Error', 'No se pudo iniciar el proceso de autorización')
        });
      }
    });
  }

  private cargarDatosReferencia(): void {
    this.ubicacionesService.obtenerPaises().subscribe({
      next: data => { this.paises = data.map(p => ({ id: p.id, nombre: p.nombre })); },
      error: () => {}
    });
    this.ubicacionesService.obtenerTodas().subscribe({
      next: data => { this.ubicaciones = data.map(u => ({ id: u.id, nombre: u.nombre })); },
      error: () => {}
    });
    this.programaService.getAll().subscribe({
      next: data => { this.programas = data; },
      error: () => {}
    });
    this.programaService.getAllFacultades().subscribe({
      next: data => { this.facultades = data; },
      error: () => {}
    });
    this.programaService.getAllSnies().subscribe({
      next: data => { this.snies = data; },
      error: () => {}
    });
    this.entidadesInternacionalesService.getAll().subscribe({
      next: data => { this.entidadesInternacionales = data; },
      error: () => {}
    });
  }

  getPaisNombre(id: string | undefined): string {
    return id ? (this.paises.find(p => p.id === id)?.nombre || id) : '';
  }

  getUbicacionNombre(id: string | undefined): string {
    return id ? (this.ubicaciones.find(u => u.id === id)?.nombre || id) : '';
  }

  getProgramaNombre(id: string | undefined): string {
    return id ? (this.programas.find(p => p.id === id)?.nombre || id) : '';
  }

  getFacultadNombre(id: string | undefined): string {
    return id ? (this.facultades.find(f => f.id === id)?.nombre || id) : '';
  }

  getSniesNombre(id: string | undefined): string {
    if (!id) return '';
    const s = this.snies.find(s => s.id === id);
    return s ? s.codigo : id;
  }

  getEntidadInternacionalNombre(id: string | undefined): string {
    if (!id) return '';
    const e = this.entidadesInternacionales.find(e => e.id === id);
    if (!e) return id;
    return e.codigo ? `${e.codigo} - ${e.nombre}` : e.nombre;
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}