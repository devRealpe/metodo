import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { PaginatorModule } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AuthService } from '@microfrontends/shared-services';
import { SolicitudService } from '../../core/services/solicitud.service';
import { UsuarioOracleService } from '../../core/services/usuario-oracle.service';
import {
  SolicitudResponse,
  EstadoSolicitud,
  SolicitudFilter,
  PagedSolicitudResponse,
} from '../../core/models/solicitud.models';
import { DetalleSolicitudModalComponent } from '../modals/modal-detalle-solicitud/detalle-solicitud-modal.component';
import { EliminarSolicitudModalComponent } from '../modals/modal-eliminar-solicitud/eliminar-solicitud-modal.component';

const ROL_DIRECTOR = 'PLANES_DIRECTOR';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    ToastModule,
    SkeletonModule,
    TooltipModule,
    DividerModule,
    SelectModule,
    InputTextModule,
    PaginatorModule,
    DialogModule,
    TimelineModule,
    CardModule,
    DetalleSolicitudModalComponent,
    EliminarSolicitudModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.scss',
})
export class MisSolicitudesComponent implements OnInit, OnDestroy {
  private readonly solicitudService = inject(SolicitudService);
  private readonly usuarioOracleService = inject(UsuarioOracleService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Estado del director
  directorPrograma = signal<string>('');
  directorNombre = signal<string>('');
  cargandoDirector = signal(true);
  esDirector = signal(false);

  // Datos de la tabla
  solicitudes = signal<SolicitudResponse[]>([]);
  cargando = signal(false);
  totalElementos = signal(0);
  paginaActual = signal(0);
  readonly tamanioPagina = 10;

  // Detalle modal
  solicitudDetalle = signal<SolicitudResponse | null>(null);
  detalleVisible = false;

  // Eliminar modal
  solicitudAEliminar = signal<SolicitudResponse | null>(null);
  eliminarVisible = false;

  // Filtros
  filtrosForm!: FormGroup;

  readonly estadoOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'En Proceso', value: 'EN_PROCESO' },
    { label: 'Observación', value: 'OBSERVACION' },
    { label: 'Rechazado', value: 'RECHAZADO' },
    { label: 'Finalizado', value: 'FINALIZADO' },
  ];

  readonly periodoOptions = [
    { label: 'Todos los períodos', value: null },
    { label: 'Período 1', value: 1 },
    { label: 'Período 2', value: 2 },
  ];

  readonly anioActual = new Date().getFullYear();
  readonly anioOptions = Array.from({ length: 1 }, (_, i) => ({
    label: String(this.anioActual - i),
    value: this.anioActual - i,
  }));
  readonly anioOptionsConTodos = [
    { label: 'Todos los años', value: null },
    ...this.anioOptions,
  ];

  // Computed: filas skeleton
  readonly skeletonRows = Array(6).fill(null);

  ngOnInit(): void {
    this._inicializarFiltros();
    this._inicializarDirector();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _inicializarFiltros(): void {
    this.filtrosForm = this.fb.group({
      estado: [null],
      anio: [null],
      periodo: [null],
    });
  }

  private _inicializarDirector(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (!user) return;

        const esDirector = user.roles.includes(ROL_DIRECTOR);
        this.esDirector.set(esDirector);

        if (!esDirector) {
          this.cargandoDirector.set(false);
          return;
        }

        const identificacion = user.identificacion || user.username;
        if (!identificacion) {
          this.cargandoDirector.set(false);
          return;
        }

        this.usuarioOracleService
          .getByIdentificacion(identificacion)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (info) => {
              this.cargandoDirector.set(false);
              if (info?.programa) {
                this.directorPrograma.set(info.programa);
                this.directorNombre.set(info.nombre);
                this.cargarSolicitudes();
              }
            },
            error: () => {
              this.cargandoDirector.set(false);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo obtener la información del director.',
                life: 6000,
              });
            },
          });
      });
  }

  cargarSolicitudes(pagina = 0): void {
    const programa = this.directorPrograma();
    if (!programa) return;

    const v = this.filtrosForm.value;
    const filtros: SolicitudFilter = {
      estado: v.estado || null,
      anio: v.anio || null,
      periodo: v.periodo || null,
    };

    this.cargando.set(true);
    this.paginaActual.set(pagina);

    this.solicitudService
      .listarPorPrograma(programa, filtros, pagina, this.tamanioPagina)
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
            detail: 'No se pudieron cargar las solicitudes. Intente de nuevo.',
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

  confirmarEliminacion(solicitud: SolicitudResponse): void {
    this.solicitudAEliminar.set(solicitud);
    this.eliminarVisible = true;
  }

  onConfirmarEliminacion(): void {
    const solicitud = this.solicitudAEliminar();
    if (solicitud) {
      this.eliminarSolicitud(solicitud.uuid);
    }
  }

  private eliminarSolicitud(uuid: string): void {
    this.cargando.set(true);
    this.solicitudService.eliminar(uuid).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Solicitud eliminada correctamente',
          life: 3000
        });
        this.cargarSolicitudes(this.paginaActual());
      },
      error: () => {
        this.cargando.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la solicitud',
          life: 6000
        });
      }
    });
  }

  verDetalle(solicitud: SolicitudResponse): void {
    this.solicitudDetalle.set(solicitud);
    this.detalleVisible = true;
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.solicitudDetalle.set(null);
  }

  // ── Helpers UI ──

  getSeveridadEstado(
    estado: EstadoSolicitud
  ): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const map: Record<EstadoSolicitud, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
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

  getSeveridadRevision(
    estado: string
  ): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
      PENDIENTE: 'secondary',
      APROBADO: 'success',
      RECHAZADO: 'danger',
      OBSERVACION: 'warn',
    };
    return map[estado] ?? 'secondary';
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

  get hayFiltrosActivos(): boolean {
    const v = this.filtrosForm.value;
    return !!(v.estado || v.anio || v.periodo);
  }
}
