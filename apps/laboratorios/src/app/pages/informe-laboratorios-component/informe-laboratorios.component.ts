import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError, switchMap, map } from 'rxjs/operators';
import { PanelModule } from 'primeng/panel';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';

import { UsosLaboratorioService, RegistroUsoDTO } from '../../core/services/usos-laboratorio.service';
import { UsosLaboratorioQueryService, InformeResumenResponse } from '../../core/services/usos-laboratorio-query.service';
import { LbCoordinadorService } from '../../core/services/lb-coordinador.service';
import { LbCoordinador } from '../../core/models/lb-coordinador.model';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';

type RegistroUsoView = RegistroUsoDTO & { laboratorioNombre?: string; nombre?: string };
type Opt = { label: string; value: string };

export type TipoReporte = 'detalle' | 'horas-por-motivo' | 'horas-por-facultad' | 'horas-por-tipo-practica';

export interface ResumenRow {
  [key: string]: string | number;
  _key: string;
  count: number;
  totalHoras: number;
  promedioHoras: number;
}

type ColKey =
  | 'identificacion' | 'nombre'
  | 'fechaUso' | 'horaInicio' | 'horaFin' | 'laboratorioNombre'
  | 'rol' | 'genero' | 'programa' | 'facultad' | 'semestre'
  | 'motivo' | 'observaciones';

interface ColDef {
  key: ColKey;
  label: string;
  visible: boolean;
  width?: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-informe-laboratorios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PanelModule,
    TableModule,
    TagModule,
    MessageModule,
    ButtonModule,
    DialogModule,
    DatePickerModule,
    ToastModule,
    CheckboxModule,
    InputComponent,
    SelectComponent,
    CardModule,
    ProgressSpinnerModule
  ],
  providers: [DatePipe, MessageService],
  templateUrl: './informe-laboratorios.component.html',
  styleUrls: ['./informe-laboratorios.component.scss']
})
export class InformeLaboratoriosComponent implements OnInit, OnDestroy {
  private usosSrv = inject(UsosLaboratorioService);
  private querySrv = inject(UsosLaboratorioQueryService);
  private aulasSrv = inject(LbLaboratoriosAulasService);
  private oracleSrv = inject(UsuariosOracleService);
  private externosSrv = inject(UsuariosExternosService);
  private datePipe = inject(DatePipe);
  private toast = inject(MessageService);
  private authService = inject(AuthService);
  private coordinadorSvc = inject(LbCoordinadorService);
  private destroy$ = new Subject<void>();

  esAdmin = false;
  esCoordinador = false;
  misAulasCodigos: string[] = [];

  @ViewChild('dt') dt?: Table;

  cargando = false;
  errorCarga = '';

  usos: RegistroUsoView[] = [];
  usosFiltrados: RegistroUsoView[] = [];

  private labNombreById = new Map<string, string>();
  private columnasVisiblesPorDefecto = new Set<ColKey>();
  tiposReporteOpt: Opt[] = [
    { label: 'Detalle de registros',                    value: 'detalle' },
    { label: 'Horas de uso por motivo',                 value: 'horas-por-motivo' },
    { label: 'Horas de uso por facultad / programa',    value: 'horas-por-facultad' },
    { label: 'Horas de uso por tipo de práctica',       value: 'horas-por-tipo-practica' }
  ];
  reportMode: TipoReporte = 'detalle';

  readonly groupByOpciones: Record<TipoReporte, Opt[]> = {
    'detalle': [],
    'horas-por-motivo': [
      { label: 'Laboratorio', value: 'laboratorio' },
      { label: 'Programa',    value: 'programa' },
      { label: 'Facultad',    value: 'facultad' },
      { label: 'Rol / Cargo', value: 'rol' },
      { label: 'Semestre',    value: 'semestre' },
      { label: 'Fecha uso',   value: 'fechaUso' }
    ],
    'horas-por-facultad': [
      { label: 'Laboratorio', value: 'laboratorio' },
      { label: 'Programa',    value: 'programa' },
      { label: 'Fecha (Mes)', value: 'fechaMes' }
    ],
    'horas-por-tipo-practica': [
      { label: 'Práctica Estructurada / No Estructurada', value: 'tipoPractica' },
      { label: 'Programa',    value: 'programa' },
      { label: 'Facultad',    value: 'facultad' },
      { label: 'Laboratorio', value: 'laboratorio' }
    ]
  };

  get groupByDisponibles(): Opt[] { return this.groupByOpciones[this.reportMode] ?? []; }

  selectedGroupByKeys: string[] = [];

  resumenRows: ResumenRow[] = [];

  resumenColumnas: string[] = [];

  resumenDetalle: Record<
    string,
    Array<{ subLabel: string; count: number; totalHoras: number; promedioHoras: number }> | undefined
  > = {};

  resumenSubLabel = 'Motivo';

  expandedResumenRows: Record<string, boolean> = {};

  get selectedGroupByLabels(): string {
    return this.selectedGroupByKeys.map(k => this.labelDeKey(k)).join(' › ');
  }

  selectedGroupBy = '';

  generosOpt: Opt[] = [
    { label: 'Todos', value: '' },
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
    { label: 'Otro', value: 'O' }
  ];
  laboratoriosOpt: Opt[] = [{ label: 'Todos', value: '' }];
  facultadesOpt: Opt[] = [{ label: 'Todas', value: '' }];
  cargosOpt: Opt[] = [{ label: 'Todos', value: '' }];    
  programasOpt: Opt[] = [{ label: 'Todos', value: '' }];
  semestresOpt: Opt[] = [{ label: 'Todos', value: '' }];

  filtros = {
    rango: null as Date[] | null,
    genero: '',
    laboratorioId: '',
    facultad: '',
    cargo: '',
    programa: '',
    semestre: ''
  };

  filter: boolean = true;

  columnas: ColDef[] = [
    { key: 'identificacion',    label: 'Identificación', visible: true,  width: '140px', sortable: true },
    { key: 'nombre',            label: 'Nombre',         visible: true,  sortable: true },
    { key: 'fechaUso',           label: 'Fecha',        visible: true,  width: '120px', sortable: true },
    { key: 'horaInicio',         label: 'Hora inicio',  visible: true,  width: '110px', sortable: true },
    { key: 'horaFin',            label: 'Hora fin',     visible: true,  width: '110px', sortable: true },
    { key: 'laboratorioNombre',  label: 'Laboratorio',  visible: true,  sortable: true },
    { key: 'rol',                label: 'Cargo',        visible: true,  width: '140px', sortable: true },
    { key: 'genero',             label: 'Género',       visible: true,  width: '140px', sortable: true },
    { key: 'programa',           label: 'Programa',     visible: true,  sortable: true },
    { key: 'facultad',           label: 'Facultad',     visible: true,  sortable: true },
    { key: 'semestre',           label: 'Semestre',     visible: true,  width: '110px', sortable: true },
    { key: 'motivo',             label: 'Motivo',       visible: true,  sortable: true },
    { key: 'observaciones',      label: 'Observaciones',visible: true, sortable: false }
  ];

  showDialog = false;

  readonly globalFilterFields: string[] = [
    'identificacion', 'nombre',
    'laboratorioNombre','genero','rol','programa','facultad','semestre','motivo',
    'observaciones','fechaUso','horaInicio','horaFin'
  ];

  ngOnInit(): void {
    this.columnasVisiblesPorDefecto = new Set(
      this.columnas.filter(c => c.visible).map(c => c.key)
    );

    const user = this.authService.getCurrentUser();
    const roles = this.authService.getUserRoles();
    this.esAdmin = roles.includes('ADMIN');

    if (user && !this.esAdmin) {
      this.coordinadorSvc.getByKeycloakUserId(user.id).pipe(
        takeUntil(this.destroy$),
        catchError(() => of([] as LbCoordinador[]))
      ).subscribe(asignaciones => {
        this.misAulasCodigos = asignaciones.map(a => a.codAula);
        this.esCoordinador = this.misAulasCodigos.length > 0;
        this.cargarDatos();
      });
    } else {
      this.cargarDatos();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get visibleColumns(): ColDef[] { return this.columnas.filter(c => c.visible); }
  
  get visibleColumnsCount(): number { return this.visibleColumns.length; }

  get resumenTotalRegistros(): number {
    return this.resumenRows.reduce((acc, r) => acc + (r['count'] as number), 0);
  }

  get resumenTotalHoras(): number {
    return Math.round(this.resumenRows.reduce((acc, r) => acc + (r['totalHoras'] as number), 0) * 100) / 100;
  }
  
  isVisible(k: ColKey): boolean { return this.columnas.find(c => c.key === k)?.visible ?? false; }

  private cargarDatos(): void {
    this.cargando = true;
    this.errorCarga = '';

    // Cargar desde gestión de aulas (tiene id MongoDB, codAula Oracle y nomAula)
    this.aulasSrv.getAll().subscribe({
      next: (aulas: LbLaboratoriosAulas[]) => {
        let lista = (aulas ?? []).filter(a => {
          const esLab = a.tipoAula?.toLowerCase().includes('laboratorio');
          const noVirtual = a.nomAula?.toLowerCase() !== 'virtual';
          return esLab && noVirtual;
        });

        // Indexar nombre por AMBAS claves (codAula Oracle y id MongoDB)
        lista.forEach(a => {
          const nombre = a.nomAula ?? `Laboratorio ${a.codAula}`;
          this.labNombreById.set(a.codAula, nombre);
          if (a.id && a.id !== a.codAula) {
            this.labNombreById.set(a.id, nombre);
          }
        });

        // Coordinador solo ve sus laboratorios asignados
        if (!this.esAdmin && this.esCoordinador && this.misAulasCodigos.length > 0) {
          lista = lista.filter(a => this.misAulasCodigos.includes(a.codAula));
        }

        this.laboratoriosOpt = [{ label: 'Todos', value: '' }, ...lista.map(a => ({
          label: a.nomAula ?? `Laboratorio ${a.codAula}`, value: a.codAula
        }))];
        this.cargarUsos();
      },
      error: () => this.cargarUsos()
    });
  }

  private getUsos$(): Observable<RegistroUsoDTO[]> {
    const srv = this.usosSrv as unknown as Record<string, unknown>;
    const names = ['getAll','listar','findAll'] as const;
    for (const n of names) {
      const fn = srv?.[n];
      if (typeof fn === 'function') {
        return (fn as unknown as () => Observable<RegistroUsoDTO[]>).call(srv);
      }
    }
    this.toast.add({ severity: 'error', summary: 'Servicio de usos', detail: 'Agrega getAll(), listar() o findAll().' });
    return of([]);
  }

  private cargarUsos(): void {
    this.getUsos$().subscribe({
      next: (lista: RegistroUsoDTO[]) => {
        let usos = (lista ?? []).map((u: any) => {
          const labId = this.extraerLabId(u);
          return {
            ...u,
            laboratorioId: labId,
            laboratorioNombre: this.resolverNombreLab(labId)
          } as RegistroUsoView;
        });

        // Coordinador solo ve registros de sus laboratorios
        if (!this.esAdmin && this.esCoordinador && this.misAulasCodigos.length > 0) {
          usos = usos.filter(u => this.misAulasCodigos.includes(String(u.laboratorioId)));
        }

        this.usos = usos;
        this.recalcularCatalogos();
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = 'No se pudieron cargar los registros de uso.';
      }
    });
  }

  /**
   * Enriquece los registros con datos reales de Oracle (nombre, programa, facultad,
   * semestre, genero). Si el usuario no está en Oracle, intenta con externos.
   */
  private enriquecerRegistros(registros: RegistroUsoView[]): Observable<RegistroUsoView[]> {
    const idsUnicos = [...new Set(registros.map(r => r.identificacion ?? '').filter(Boolean))];
    if (idsUnicos.length === 0) return of(registros);

    const oracleObs = idsUnicos.map(id =>
      this.oracleSrv.getByCodigo(id).pipe(catchError(() => of(null)))
    );

    return forkJoin(oracleObs).pipe(
      switchMap(oracleResults => {
        const datosById: Record<string, { nombre?: string; semestre?: string; programa?: string; facultad?: string; genero?: string; cargo?: string }> = {};
        idsUnicos.forEach((id, i) => {
          const u = oracleResults[i] as any;
          if (u?.nombre) {
            datosById[id] = {
              nombre:    u.nombre,
              semestre:  u.semestre  ?? undefined,
              programa:  u.programa  ?? undefined,
              facultad:  u.facultad  ?? undefined,
              genero:    u.genero    ?? undefined,
              cargo:     u.cargo     ?? undefined,
            };
          }
        });

        const sinDatos = idsUnicos.filter(id => !datosById[id]);
        if (sinDatos.length === 0) {
          return of(this.aplicarEnriquecimiento(registros, datosById));
        }

        const externosObs = sinDatos.map(id =>
          this.externosSrv.getByIdentificacion(id).pipe(catchError(() => of([])))
        );
        return forkJoin(externosObs).pipe(
          map((extResults: any[][]) => {
            sinDatos.forEach((id, i) => {
              const ext = extResults[i]?.[0];
              if (ext?.nombre) {
                datosById[id] = {
                  nombre:  ext.nombre,
                  genero:  ext.genero  ?? undefined,
                  cargo:   ext.cargo   ?? undefined,
                };
              }
            });
            return this.aplicarEnriquecimiento(registros, datosById);
          })
        );
      }),
      catchError(() => of(registros))
    );
  }

  private aplicarEnriquecimiento(
    registros: RegistroUsoView[],
    datosById: Record<string, { nombre?: string; semestre?: string; programa?: string; facultad?: string; genero?: string; cargo?: string }>
  ): RegistroUsoView[] {
    return registros.map(r => {
      const datos = datosById[r.identificacion ?? ''];
      if (!datos) return r;
      return {
        ...r,
        nombre:   datos.nombre   ?? r.nombre,
        semestre: datos.semestre ?? r.semestre,
        programa: datos.programa ?? r.programa,
        facultad: datos.facultad ?? r.facultad,
        genero:   datos.genero   ?? r.genero,
        rol:      datos.cargo    ?? r.rol,
      };
    });
  }

  /** Extrae el ID de laboratorio de un registro raw, probando varios campos posibles */
  private extraerLabId(raw: any): string {
    return String(
      raw?.laboratorioId ??
      raw?.codAula ??
      raw?.cod_aula ??
      raw?.fk_id_laboratorio ??
      raw?.idLaboratorio ??
      raw?.laboratorio?.codAula ??
      raw?.laboratorio?.id ??
      ''
    );
  }

  private resolverNombreLab(labId: string): string {
    if (!labId) return '—';
    const key = String(labId);
    return this.labNombreById.get(key) ?? key;
  }

  private recalcularCatalogos(): void {
    const fac = new Set<string>();
    const car = new Set<string>();
    const pro = new Set<string>();
    const sem = new Set<string>();

    this.usos.forEach(u => {
      const f = (u.facultad ?? '').toString().trim(); if (f) fac.add(f);
      const r = (u.rol ?? '').toString().trim();      if (r) car.add(r);
      const p = (u.programa ?? '').toString().trim(); if (p) pro.add(p);
      const s = (u.semestre ?? '').toString().trim(); if (s) sem.add(s);
    });

    this.facultadesOpt = [{ label: 'Todas', value: '' }, ...Array.from(fac).sort().map(x => ({ label: x, value: x }))];
    this.cargosOpt     = [{ label: 'Todos', value: '' }, ...Array.from(car).sort().map(x => ({ label: x, value: x }))];
    this.programasOpt  = [{ label: 'Todos', value: '' }, ...Array.from(pro).sort().map(x => ({ label: x, value: x }))];
    this.semestresOpt  = [{ label: 'Todos', value: '' }, ...Array.from(sem).sort().map(x => ({ label: x, value: x }))];
  }

  fmtFecha(fechaUso: string | Date | null | undefined): string {
    if (!fechaUso) return '—';
    if (fechaUso instanceof Date) return this.datePipe.transform(fechaUso, 'yyyy-MM-dd') ?? '—';
    return String(fechaUso);
  }

  fmtHora(h: string | Date | null | undefined): string {
    if (h == null) return '—';

    if (h instanceof Date) {
      let hh = h.getHours();
      const mm = h.getMinutes().toString().padStart(2, '0');
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      return `${hh}:${mm} ${ampm}`;
    }

    const s = String(h).trim();
    if (!s) return '—';

    let m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s);
    if (m) {
      const hh12 = (+m[1] % 12) || 12;
      return `${hh12}:${m[2]} ${m[3].toUpperCase()}`;
    }

    m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
    if (m) {
      let hh = parseInt(m[1], 10);
      const mm = m[2];
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      return `${hh}:${mm} ${ampm}`;
    }

    m = /^(\d{1,2})(\d{2})$/.exec(s);
    if (m) {
      let hh = parseInt(m[1], 10);
      const mm = m[2];
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      return `${hh}:${mm} ${ampm}`;
    }

    return s;
  }

  fmtGenero(g: string | null | undefined): string {
    const s = (g ?? '').toString().trim();
    if (!s) return '—';
    const up = s.toUpperCase();

    if (up === 'M' || up === 'MASCULINO') return 'Masculino';
    if (up === 'F' || up === 'FEMENINO')  return 'Femenino';
    if (up === 'O' || up === 'OTRO')      return 'Otro';

    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  aplicarFiltroGlobal(value: string): void {
    this.dt?.filterGlobal(value, 'contains');
  }
  
  limpiarFiltroGlobal(): void {
    this.dt?.clear();
    (document.getElementById('globalFilter') as HTMLInputElement | null)?.blur();
  }

  abrirDialogoExportar(): void { this.showDialog = true; }
  
  cerrarDialogo(): void { this.showDialog = false; }

  limpiarFiltrosDialog(): void {
    this.filtros = { rango: null, genero: '', laboratorioId: '', facultad: '', cargo: '', programa: '', semestre: '' };
    this.selectedGroupByKeys = [];
    this.resumenRows = [];
    this.resumenColumnas = [];
    this.restablecerColumnas();
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const range: Date[] = this.filtros.rango ?? ([] as Date[]);
    const d1: Date | null = range[0] ?? null;
    const d2: Date | null = range[1] ?? null;

    const desde      = d1 ? (this.datePipe.transform(this.alComienzo(d1), 'yyyy-MM-dd') ?? undefined) : undefined;
    const hasta      = d2 ? (this.datePipe.transform(this.alFinal(d2),   'yyyy-MM-dd') ?? undefined) : undefined;
    const laboratorioId = this.filtros.laboratorioId || undefined;
    const genero     = this.filtros.genero    || undefined;
    const facultad   = this.filtros.facultad  || undefined;
    const rol        = this.filtros.cargo     || undefined;
    const programa   = this.filtros.programa  || undefined;
    const semestre   = this.filtros.semestre  || undefined;

    this.cargando = true;
    this.errorCarga = '';

    if (this.reportMode !== 'detalle') {
      // Para modos de resumen: pedir directamente el resumen al backend
      this.querySrv.getInformeResumen({
        desde, hasta, laboratorioId, genero, facultad, rol, programa, semestre,
        reportMode: this.reportMode,
        groupBy: this.selectedGroupByKeys.length > 0 ? this.selectedGroupByKeys : undefined
      }).pipe(
        takeUntil(this.destroy$),
        switchMap(res => {
          // Necesitamos los registros detallados para enriquecer con nombre
          // y para que el coordinador pueda filtrar sus aulas
          return this.querySrv.getInforme({ desde, hasta, laboratorioId, genero, facultad, rol, programa, semestre }).pipe(
            switchMap(rows => this.enriquecerRegistros(this.mapearRegistros(rows ?? []))),
            map(enriched => ({ enriched, res }))
          );
        })
      ).subscribe({
        next: ({ enriched, res }) => {
          this.usos = this.filtrarPorCoordinador(enriched);
          this.usosFiltrados = this.usos;
          this.recalcularCatalogos();
          this.asignarResumen(res);
          this.cargando = false;
        },
        error: () => {
          this.usosFiltrados = this.usos;
          this.calcularResumen();
          this.cargando = false;
        }
      });
      return;
    }

    // Modo detalle: obtener registros filtrados del backend
    this.querySrv.getInforme({ desde, hasta, laboratorioId, genero, facultad, rol, programa, semestre }).pipe(
      takeUntil(this.destroy$),
      switchMap(rows => this.enriquecerRegistros(this.mapearRegistros(rows ?? [])))
    ).subscribe({
      next: (enriched) => {
        this.usos = this.filtrarPorCoordinador(enriched);
        this.usosFiltrados = this.usos;
        this.recalcularCatalogos();
        this.resumenRows = [];
        this.resumenColumnas = [];
        this.cargando = false;
        this.limpiarFiltroGlobal();
      },
      error: () => {
        this.cargando = false;
        this.errorCarga = 'No se pudieron cargar los registros desde el servidor.';
      }
    });
  }

  /** Asigna el resumen que devuelve el backend directamente al estado del componente */
  private asignarResumen(res: InformeResumenResponse): void {
    this.resumenRows = res.resumenRows as ResumenRow[];
    this.resumenColumnas = res.resumenColumnas;
    this.resumenSubLabel = res.resumenSubLabel;
    this.resumenDetalle  = res.resumenDetalle;
    this.expandedResumenRows = {};
  }


  private mapearRegistros(rows: any[]): RegistroUsoView[] {
    return rows.map((r: any) => {
      const labId = this.extraerLabId(r);
      return {
        id: r.id ? String(r.id) : undefined,
        identificacion: r.identificacion ?? undefined,
        fechaUso: String(r.fechaUso),
        horaInicio: r.horaInicio,
        horaFin: r.horaFin ?? null,
        laboratorioId: labId,
        laboratorioNombre: r.laboratorioNombre ?? this.resolverNombreLab(labId),
        semestre: r.semestre ?? '',
        genero: r.genero ?? '',
        rol: r.rol ?? '',
        programa: r.programa ?? '',
        facultad: r.facultad ?? '',
        motivo: r.motivo ?? '',
        observaciones: r.observaciones ?? null
      } as RegistroUsoView;
    });
  }

  private filtrarPorCoordinador(usos: RegistroUsoView[]): RegistroUsoView[] {
    if (this.esAdmin || !this.esCoordinador || this.misAulasCodigos.length === 0) {
      return usos;
    }
    return usos.filter(u => this.misAulasCodigos.includes(String(u.laboratorioId)));
  }

  private static readonly MOTIVOS_ESTRUCTURADA = [
    'asistencia_qr', 'asistencia', 'practica de laboratorio'
  ];

  private clasificarPractica(u: RegistroUsoView): string {
    const motivo = (u.motivo ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const obs    = (u.observaciones ?? '').trim().toLowerCase();
    if (InformeLaboratoriosComponent.MOTIVOS_ESTRUCTURADA.some(m => motivo === m || motivo.startsWith(m))) {
      return 'Práctica Estructurada';
    }
    if (obs.includes('materia') || obs.includes('qr')) {
      return 'Práctica Estructurada';
    }
    return 'Práctica No Estructurada';
  }

  calcularResumen(): void {
    const datos = this.usosFiltrados;
    const keys  = this.selectedGroupByKeys.length > 0
      ? this.selectedGroupByKeys
      : this.obtenerClavesDefault();

    const map = new Map<string, ResumenRow>();
    const subKey = this.obtenerSubClaveDetalle(keys);
    this.resumenSubLabel = this.labelDeKey(subKey);
    const detalleMap = new Map<string, Map<string, { subLabel: string; count: number; totalHoras: number }>>();

    datos.forEach(u => {
      const groupKey = keys.map((k: string) => this.valorGrupo(u, k)).join(' | ');
      const existing = map.get(groupKey);
      const dur = this.calcularDuracionHoras(u);

      if (existing) {
        existing['count'] = (existing['count'] as number) + 1;
        existing['totalHoras'] = Math.round(((existing['totalHoras'] as number) + dur) * 100) / 100;
      } else {
        const row: ResumenRow = { _key: groupKey, count: 1, totalHoras: Math.round(dur * 100) / 100, promedioHoras: 0 };
        keys.forEach((k: string) => { row[k] = this.valorGrupo(u, k); });
        map.set(groupKey, row);
      }

      const subVal = this.valorGrupo(u, subKey);
      if (!detalleMap.has(groupKey)) detalleMap.set(groupKey, new Map());
      const sub = detalleMap.get(groupKey)!;
      const sc = sub.get(subVal) ?? { subLabel: subVal, count: 0, totalHoras: 0 };
      sc.count += 1;
      sc.totalHoras = Math.round((sc.totalHoras + dur) * 100) / 100;
      sub.set(subVal, sc);
    });

    map.forEach(row => {
      const c = row['count'] as number;
      const t = row['totalHoras'] as number;
      row['promedioHoras'] = c > 0 ? Math.round((t / c) * 100) / 100 : 0;
    });

    this.resumenDetalle = {};
    detalleMap.forEach((sub, gk) => {
      this.resumenDetalle[gk] = Array.from(sub.values())
        .map(r => ({ ...r, promedioHoras: r.count > 0 ? Math.round(r.totalHoras / r.count * 100) / 100 : 0 }))
        .sort((a, b) => b.totalHoras - a.totalHoras);
    });

    this.expandedResumenRows = {};
    this.resumenColumnas = keys;
    this.resumenRows = Array.from(map.values())
      .sort((a, b) => (b['totalHoras'] as number) - (a['totalHoras'] as number));
  }

  private obtenerClavesDefault(): string[] {
    switch (this.reportMode) {
      case 'horas-por-motivo':         return ['motivo'];
      case 'horas-por-facultad':       return ['facultad'];
      case 'horas-por-tipo-practica':  return ['tipoPractica'];
      default:                         return ['motivo'];
    }
  }

  private obtenerSubClaveDetalle(keys: string[]): string {
    if (keys.includes('tipoPractica')) return 'motivo';
    if (keys.includes('motivo'))       return 'programa';
    if (keys.includes('laboratorio'))  return 'motivo';
    if (keys.includes('facultad'))     return 'programa';
    if (keys.includes('programa'))     return 'facultad';
    return 'motivo';
  }

  private valorGrupo(u: RegistroUsoView, key: string): string {
    switch (key) {
      case 'motivo':       return this.norm(u.motivo)      || '(Sin motivo)';
      case 'facultad':     return this.norm(u.facultad)    || '(Sin facultad)';
      case 'programa':     return this.norm(u.programa)    || '(Sin programa)';
      case 'rol':          return this.norm(u.rol)         || '(Sin rol)';
      case 'semestre':     return (u.semestre ?? '').trim() || '(Sin semestre)';
      case 'fechaUso':     return this.fmtFecha(u.fechaUso);
      case 'laboratorio':  return this.norm(u.laboratorioNombre) || this.norm(u.laboratorioId) || '(Sin laboratorio)';
      case 'fechaMes': {
        const [y, m] = String(u.fechaUso).split('-');
        return `${y}-${m ?? '??'}`;
      }
      case 'tipoPractica': return this.clasificarPractica(u);
      default:             return '—';
    }
  }

  private norm(val: string | null | undefined): string {
    if (!val) return '';
    return String(val).trim().replace(/\s+/g, ' ');
  }

  labelDeKey(key: string): string {
    const todas = Object.values(this.groupByOpciones).flat();
    return todas.find(o => o.value === key)?.label ?? key;
  }

  private calcularDuracionHoras(u: RegistroUsoView): number {
    const ini = this.parseTimeToMinutes(u.horaInicio);
    const fin = u.horaFin ? this.parseTimeToMinutes(u.horaFin) : ini;
    return Math.max(0, (fin - ini) / 60);
  }

  private parseFecha(isoYmd: string | Date): Date {
    if (isoYmd instanceof Date) return this.alComienzo(isoYmd);
    const [y, m, d] = String(isoYmd).split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }
  
  private alComienzo(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
  
  private alFinal(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }

  private restablecerColumnas(): void {
    this.columnas.forEach(c => {
      c.visible = this.columnasVisiblesPorDefecto.has(c.key);
    });
  }

  private parseTimeToMinutes(h: string | Date | null | undefined): number {
    if (!h) return 0;
    if (h instanceof Date) return h.getHours() * 60 + h.getMinutes();
    const s = String(h).trim();
    const m = /^([0-9]{1,2}):([0-9]{2})/.exec(s);
    if (m) return (parseInt(m[1], 10) % 24) * 60 + parseInt(m[2], 10);
    const mm = /^([0-9]{1,2})([0-9]{2})$/.exec(s);
    if (mm) return (parseInt(mm[1], 10) % 24) * 60 + parseInt(mm[2], 10);
    return 0;
  }

  onResumenRowExpand(event: { data: ResumenRow }): void {
    this.expandedResumenRows[event.data['_key'] as string] = true;
  }

  onResumenRowCollapse(event: { data: ResumenRow }): void {
    delete this.expandedResumenRows[event.data['_key'] as string];
  }

  exportDesdeServidor(): void {
    if (this.reportMode === 'detalle' || this.selectedGroupByKeys.length === 0) {
      this.toast.add({ severity: 'warn', summary: 'Exportar', detail: 'Seleccione un tipo de reporte distinto a Detalle y al menos una agrupación.' });
      return;
    }

    if (this.resumenRows.length === 0) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay datos de resumen para exportar. Aplique filtros primero.' });
      return;
    }

    this.exportarResumenXLSX();
  }

  private async exportarResumenXLSX(): Promise<void> {
    try {
      const XLSX = await import('xlsx');

      const colKeys = this.resumenColumnas;
      const header = [...colKeys.map(k => this.labelDeKey(k)), 'Registros', 'Total Horas', 'Promedio Horas'];
      const body = this.resumenRows.map(row => [
        ...colKeys.map(k => String(row[k] ?? '—')),
        row.count,
        row.totalHoras,
        row.promedioHoras
      ]);
      const aoa = [header, ...body];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const maxLen = header.map((h, i) => {
        const dataMax = Math.max(0, ...body.map(r => String(r[i]).length));
        return Math.min(60, Math.max(10, Math.max(h.length, dataMax) + 2));
      });
      (ws as any)['!cols'] = maxLen.map(wch => ({ wch }));

      XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      XLSX.writeFile(wb, `resumen_labs_${date}.xlsx`);
    } catch {
      this.toast.add({ severity: 'error', summary: 'Falta dependencia', detail: 'Para exportar a Excel instala: npm i xlsx' });
    }
  }

  async exportarResumenPDF(): Promise<void> {
    if (this.resumenRows.length === 0) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay datos de resumen para exportar.' });
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('l', 'pt', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let logoBase64: string | null = null;
      try {
        logoBase64 = await this.getImageBase64('assets/images/mariana2.png');
      } catch { }

      const colKeys = this.resumenColumnas;
      const head = [[...colKeys.map(k => this.labelDeKey(k)), 'Registros', 'Total Horas', 'Promedio Horas']];
      const body = this.resumenRows.map(row => [
        ...colKeys.map(k => String(row[k] ?? '—')),
        String(row.count),
        row.totalHoras.toFixed(2),
        row.promedioHoras.toFixed(2)
      ]);

      const dateStr = this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm');
      const colorPrimario: [number, number, number] = [0, 51, 102];
      const colorSecundario: [number, number, number] = [240, 240, 245];

      const tipoLabel = this.tiposReporteOpt.find(t => t.value === this.reportMode)?.label ?? this.reportMode;

      const addHeader = () => {
        if (logoBase64) doc.addImage(logoBase64, 'PNG', 25, 12, 45, 45);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorPrimario);
        doc.text('UNIVERSIDAD MARIANA', pageWidth / 2, 25, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Reporte: ${tipoLabel}`, pageWidth / 2, 40, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Fecha de generación: ${dateStr}`, pageWidth / 2, 55, { align: 'center' });
        doc.setDrawColor(...colorPrimario);
        doc.setLineWidth(1);
        doc.line(20, 62, pageWidth - 20, 62);
      };

      const addFooter = (pageNumber: number, totalPages: number) => {
        doc.setDrawColor(...colorPrimario);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Universidad Mariana - Sistema de Gestión de Laboratorios', 25, pageHeight - 18);
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
        doc.text(dateStr ?? '', pageWidth - 25, pageHeight - 18, { align: 'right' });
      };

      autoTable(doc, {
        head,
        body,
        startY: 72,
        styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak', halign: 'left', valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.5 },
        headStyles: { fillColor: colorPrimario, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        bodyStyles: { textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: colorSecundario },
        margin: { top: 72, left: 20, right: 20, bottom: 40 },
        theme: 'grid',
        didDrawPage: () => addHeader()
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      doc.save(`resumen_labs_${date}.pdf`);
    } catch {
      this.toast.add({ severity: 'error', summary: 'Falta dependencia', detail: 'Instala: npm i jspdf jspdf-autotable' });
    }
  }

  onReportModeChange(mode: TipoReporte): void {
    this.reportMode = mode;
    this.selectedGroupByKeys = [];
    this.resumenRows = [];
    this.resumenColumnas = [];
    if (mode === 'detalle') {
      this.selectedGroupBy = '';
    }
    this.aplicarFiltros();
  }

  toggleGroupBy(key: string): void {
    const idx = this.selectedGroupByKeys.indexOf(key);
    if (idx >= 0) {
      this.selectedGroupByKeys.splice(idx, 1);
    } else {
      this.selectedGroupByKeys.push(key);
    }
  }

  isGroupBySelected(key: string): boolean {
    return this.selectedGroupByKeys.includes(key);
  }

  private valorCelda(row: RegistroUsoView, key: ColKey): string {
    switch (key) {
      case 'fechaUso': return this.fmtFecha(row.fechaUso);
      case 'horaInicio': return this.fmtHora(row.horaInicio);
      case 'horaFin': return this.fmtHora(row.horaFin);
      case 'laboratorioNombre': return (row.laboratorioNombre ?? row.laboratorioId) as string;
      default: {
        const value = (row as unknown as Record<string, unknown>)[key];
        return (value as string) ?? '—';
      }
    }
  }

  async exportarXLSX(): Promise<void> {
    const rows = this.usosFiltrados;
    if (!rows.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar.' });
      return;
    }

    try {
      const XLSX = await import('xlsx');

      const cols = this.visibleColumns;
      const header = cols.map(c => c.label);
      const body = rows.map(r => cols.map(c => String(this.valorCelda(r, c.key))));
      const aoa = [header, ...body];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const maxLenByCol = cols.map((c) => {
        const headerLen = c.label.length;
        const dataMax = Math.max(
          0,
          ...rows.map(r => String(this.valorCelda(r, c.key)).length)
        );
        return Math.min(60, Math.max(10, Math.max(headerLen, dataMax) + 2));
      });
      
      interface WorksheetWithCols {
        '!cols'?: Array<{ wch: number }>;
        [key: string]: unknown;
      }
      (ws as WorksheetWithCols)['!cols'] = maxLenByCol.map(wch => ({ wch }));

      XLSX.utils.book_append_sheet(wb, ws, 'Informe');
      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      XLSX.writeFile(wb, `informe_labs_${date}.xlsx`);
    } catch {
      this.toast.add({
        severity: 'error',
        summary: 'Falta dependencia',
        detail: 'Para exportar a Excel instala: npm i xlsx'
      });
    }
  }

  private async getImageBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async exportarPDF(): Promise<void> {
    const rows = this.usosFiltrados;
    if (!rows.length) {
      this.toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros para exportar.' });
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('l', 'pt', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      let logoBase64: string | null = null;
      try {
        logoBase64 = await this.getImageBase64('assets/images/mariana2.png');
      } catch {
        
      }

      const cols = this.visibleColumns;
      const head = [cols.map(c => c.label)];
      const body = rows.map(r => cols.map(c => String(this.valorCelda(r, c.key) ?? '—')));

      const colWidths: Record<number, { cellWidth: number }> = {};
      const baseWidths = [60, 50, 50, 75, 65, 50, 85, 75, 45, 75, 122];
      
      cols.forEach((col, index) => {
        const originalIndex = this.columnas.findIndex(c => c.key === col.key);
        if (originalIndex >= 0 && originalIndex < baseWidths.length) {
          colWidths[index] = { 
            cellWidth: baseWidths[originalIndex],
            ...(col.key === 'observaciones' && { 
              overflow: 'linebreak',
              cellPadding: 3
            })
          };
        }
      });

      const dateStr = this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm');
      let currentPage = 0;

      const colorPrimario: [number, number, number] = [0, 51, 102];
      const colorSecundario: [number, number, number] = [240, 240, 245];

      const addHeader = () => {

        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 25, 12, 45, 45);
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorPrimario);
        doc.text('UNIVERSIDAD MARIANA', pageWidth / 2, 25, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Informe de Usos de Laboratorios', pageWidth / 2, 40, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Fecha de generación: ${dateStr}`, pageWidth / 2, 55, { align: 'center' });

        doc.setDrawColor(...colorPrimario);
        doc.setLineWidth(1);
        doc.line(20, 62, pageWidth - 20, 62);
      };

      const addFooter = (pageNumber: number, totalPages: number) => {
        doc.setDrawColor(...colorPrimario);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Universidad Mariana - Sistema de Gestión de Laboratorios', 25, pageHeight - 18);
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
        doc.text(dateStr ?? '', pageWidth - 25, pageHeight - 18, { align: 'right' });
      };

      autoTable(doc, {
        head,
        body,
        startY: 72,
        styles: {
          fontSize: 8,
          cellPadding: 5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.5
        },
        headStyles: {
          fillColor: colorPrimario,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8
        },
        bodyStyles: {
          textColor: [40, 40, 40]
        },
        alternateRowStyles: {
          fillColor: colorSecundario
        },
        columnStyles: colWidths,
        margin: { top: 72, left: 20, right: 20, bottom: 40 },
        theme: 'grid',
        tableLineColor: [180, 180, 180],
        tableLineWidth: 0.5,
        didDrawPage: (data: any) => {
          currentPage++;
          addHeader();
        }
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      const date = this.datePipe.transform(new Date(), 'yyyyMMdd_HHmmss');
      doc.save(`informe_labs_${date}.pdf`);
    } catch {
      this.toast.add({ severity: 'error', summary: 'Falta dependencia', detail: 'Instala: npm i jspdf jspdf-autotable' });
    }
  }
}
