import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';

import { SolicitudService } from '../../../../core/services/solicitud.service';
import { ConsultasService } from '../../../../core/services/consultas.service';
import { DependenciaResponse } from '../../../../core/models/dependencia.models';
import {
  EstadoSolicitud,
  EstudianteConsultaResponse,
  PagedSolicitudResponse,
  SolicitudFilter,
  SolicitudResponse,
  ValidacionRequisitos,
} from '../../../../core/models/solicitud.models';
import { ValidacionRequisitosDireccionComponent } from '../../../modals/modal-validacion-requisitos-direccion/validacion-requisitos-direccion-modal.component';

@Component({
  selector: 'app-direccion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    SkeletonModule,
    TooltipModule,
    DividerModule,
    SelectModule,
    InputTextModule,
    PaginatorModule,
    ValidacionRequisitosDireccionComponent,
  ],
  // No se declara providers: [MessageService] — se hereda del componente padre
  // para que los mensajes aparezcan en el <p-toast> del orquestador.
  templateUrl: './direccion.component.html',
  styleUrl: './direccion.component.scss',
})
export class DireccionComponent implements OnInit, OnDestroy {
  /** Dependencia a la que pertenece esta vista. */
  @Input({ required: true }) dependencia!: DependenciaResponse;

  /** Identificación del usuario autenticado. */
  @Input({ required: true }) identificacionUsuario!: string;

  /** Nombre completo del usuario autenticado. */
  @Input({ required: true }) usuarioNombre!: string;

  /** Cargo del usuario autenticado. */
  @Input({ required: true }) usuarioCargo!: string;

  /** Programa académico del usuario autenticado. */
  @Input({ required: true }) usuarioPrograma!: string;

  private readonly solicitudService = inject(SolicitudService);
  private readonly consultasService = inject(ConsultasService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ── Tabla de solicitudes ────────────────────────────────────────────────
  solicitudes = signal<SolicitudResponse[]>([]);
  cargando = signal(false);
  totalElementos = signal(0);
  paginaActual = signal(0);
  readonly tamanioPagina = 10;
  readonly skeletonRows = Array(6).fill(null);

  // ── Panel de validación ─────────────────────────────────────────────────
  solicitudSeleccionada = signal<SolicitudResponse | null>(null);
  panelVisible = false;

  estudianteDatos = signal<EstudianteConsultaResponse | null>(null);
  validacion = signal<ValidacionRequisitos | null>(null);
  cargandoEstudiante = signal(false);
  aprobando = signal(false);

  // ── Filtros ─────────────────────────────────────────────────────────────
  filtrosForm!: FormGroup;

  readonly estadoOptions = [
    { label: 'Todos', value: null },
    { label: 'Pendientes de aprobación', value: 'PENDIENTE' },
    { label: 'Aprobadas (sello otorgado)', value: 'APROBADO' },
  ];

  readonly periodoOptions = [
    { label: 'Todos los períodos', value: null },
    { label: 'Período 1', value: 1 },
    { label: 'Período 2', value: 2 },
  ];

  readonly anioActual = new Date().getFullYear();
  readonly anioOptions = Array.from({ length: 3 }, (_, i) => ({
    label: String(this.anioActual - i),
    value: this.anioActual - i,
  }));
  readonly anioOptionsConTodos = [
    { label: 'Todos los años', value: null },
    ...this.anioOptions,
  ];

  // ── Ciclo de vida ───────────────────────────────────────────────────────

  ngOnInit(): void {
    this._inicializarForms();
    this.cargarSolicitudes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Inicialización ──────────────────────────────────────────────────────

  private _inicializarForms(): void {
    this.filtrosForm = this.fb.group({
      estado: [null],
      anio: [null],
      periodo: [null],
    });
  }

  // ── Carga de solicitudes ────────────────────────────────────────────────

  /**
   * Carga las solicitudes asignadas al revisor (filtradas por el backend
   * según el programa del director de programa).
   */
  cargarSolicitudes(pagina = 0): void {
    const v = this.filtrosForm.value;
    const filtros: SolicitudFilter = {
      estado: v.estado || null,
      anio: v.anio || null,
      periodo: v.periodo || null,
    };

    this.cargando.set(true);
    this.paginaActual.set(pagina);

    const isDirector = this.usuarioCargo === 'DIRECTOR DE PROGRAMA';
    const request$ = isDirector
      ? this.solicitudService.listarPorPrograma(
        this.usuarioPrograma,
        filtros,
        pagina,
        this.tamanioPagina
      )
      : this.solicitudService.listarPorRevisor(
        this.identificacionUsuario,
        filtros,
        pagina,
        this.tamanioPagina
      );

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: PagedSolicitudResponse) => {
          this.solicitudes.set(resp.content);
          this.totalElementos.set(resp.totalElements);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error al cargar',
            detail: 'No se pudieron cargar las solicitudes.',
            life: 6000,
          });
        },
      });
  }

  aplicarFiltros(): void {
    this.cargarSolicitudes(0);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ estado: null, anio: null, periodo: null });
    this.cargarSolicitudes(0);
  }

  onPageChange(event: any): void {
    this.cargarSolicitudes(event.page);
  }

  // ── Panel de validación ─────────────────────────────────────────────────

  abrirPanel(solicitud: SolicitudResponse): void {
    this.solicitudSeleccionada.set(solicitud);
    this.estudianteDatos.set(null);
    this.validacion.set(null);
    this.panelVisible = true;
    this._cargarDatosEstudiante(solicitud.cedula);
  }

  cerrarPanel(): void {
    this.panelVisible = false;
    this.solicitudSeleccionada.set(null);
    this.estudianteDatos.set(null);
    this.validacion.set(null);
  }

  private _cargarDatosEstudiante(cedula: number): void {
    this.cargandoEstudiante.set(true);

    this.consultasService
      .getEstudianteByIdentificacion(cedula)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (datos) => {
          this.cargandoEstudiante.set(false);
          if (datos && datos.length > 0) {
            const estudiante = datos[0];
            this.estudianteDatos.set(estudiante);
            this.validacion.set(
              this.consultasService.calcularValidacion(estudiante)
            );
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Estudiante no encontrado',
              detail: 'No se encontraron datos académicos para esta cédula.',
              life: 6000,
            });
          }
        },
        error: () => {
          this.cargandoEstudiante.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos del estudiante.',
            life: 6000,
          });
        },
      });
  }

  otorgarSello(observacion: string): void {
    const solicitud = this.solicitudSeleccionada();
    if (!solicitud) return;

    const revision = solicitud.revisiones.find(
      (r) =>
        r.puedeAprobar &&
        r.estado === 'PENDIENTE' &&
        r.uuidDependencia === this.dependencia.uuid
    );

    if (!revision) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin revisión pendiente',
        detail: 'Esta solicitud no tiene revisiones pendientes para su cargo.',
        life: 6000,
      });
      return;
    }

    this.aprobando.set(true);
    this.solicitudService
      .aprobarRevision(revision.uuid, { observacion: observacion || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.aprobando.set(false);
          this.messageService.add({
            severity: 'success',
            summary: '¡Sello otorgado!',
            detail: 'La revisión fue aprobada exitosamente.',
            life: 4000,
          });
          this.cerrarPanel();
          this.cargarSolicitudes(this.paginaActual());
        },
        error: (err) => {
          this.aprobando.set(false);
          const detalle =
            err?.error?.message ||
            'No se pudo otorgar el sello. Intente de nuevo.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error al aprobar',
            detail: detalle,
            life: 6000,
          });
        },
      });
  }

  // ── Helpers UI ──────────────────────────────────────────────────────────

  getSeveridadEstado(
    estado: EstadoSolicitud
  ): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const map: Record<
      EstadoSolicitud,
      'success' | 'warn' | 'danger' | 'info' | 'secondary'
    > = {
      PENDIENTE: 'warn',
      EN_PROCESO: 'info',
      OBSERVACION: 'warn',
      RECHAZADO: 'danger',
      FINALIZADO: 'success',
    };
    return map[estado] ?? 'secondary';
  }

  getEtiquetaEstado(estado: EstadoSolicitud): string {
    const map: Record<EstadoSolicitud, string> = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En Proceso',
      OBSERVACION: 'Observación',
      RECHAZADO: 'Rechazado',
      FINALIZADO: 'Finalizado',
    };
    return map[estado] ?? estado;
  }

  getIconoEstado(estado: EstadoSolicitud): string {
    const map: Record<EstadoSolicitud, string> = {
      PENDIENTE: 'pi pi-clock',
      EN_PROCESO: 'pi pi-cog',
      OBSERVACION: 'pi pi-exclamation-triangle',
      RECHAZADO: 'pi pi-times-circle',
      FINALIZADO: 'pi pi-check-circle',
    };
    return map[estado] ?? 'pi pi-circle';
  }

  getSeveridadSolicitudGrado(
    estado: string
  ): 'success' | 'warn' | 'danger' | 'secondary' {
    const s = (estado ?? '').toLowerCase();
    if (s === 'aprobado') return 'success';
    if (s === 'solicitado') return 'info' as any;
    if (s === 'rechazado') return 'danger';
    return 'secondary';
  }

  formatearFecha(fechaStr: string | null): string {
    if (!fechaStr) return '—';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatearCargo(cargo: string): string {
    return cargo
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  get hayFiltrosActivos(): boolean {
    const v = this.filtrosForm.value;
    return !!(v.estado || v.anio || v.periodo);
  }

  get revisionPendiente() {
    const s = this.solicitudSeleccionada();
    if (!s) return null;
    return (
      s.revisiones.find(
        (r) =>
          r.puedeAprobar &&
          r.estado === 'PENDIENTE' &&
          r.uuidDependencia === this.dependencia.uuid
      ) ?? null
    );
  }

  get puedeOtorgarSello(): boolean {
    return !!(
      this.validacion()?.todosCumplidos &&
      this.revisionPendiente &&
      !this.aprobando()
    );
  }

  /** Retorna true si la dependencia actual ya aprobó su revisión para la solicitud dada. */
  selloOtorgado(solicitud: SolicitudResponse): boolean {
    return solicitud.revisiones.some(
      (r) =>
        r.uuidDependencia === this.dependencia.uuid &&
        r.estado === 'APROBADO'
    );
  }
}
