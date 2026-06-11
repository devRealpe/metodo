import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';

import { TipoSolicitudAdminService } from '../../core/services/tipo-solicitud-admin.service';
import { DependenciaService } from '../../core/services/dependencia.service';
import {
  PagedTipoSolicitudResponse,
  ReordenarDependenciaItem,
  TipoDependenciaItem,
  TipoSolicitudAdmin,
} from '../../core/models/tipo-solicitud-admin.models';
import { DependenciaResponse } from '../../core/models/dependencia.models';

import { EliminarTipoModalComponent } from '../modals/modal-eliminar-tipo/eliminar-tipo-modal.component';
import { FormTipoModalComponent } from '../modals/modal-form-tipo/form-tipo-modal.component';
import { FlujoDependenciasModalComponent } from '../modals/modal-flujo-dependencias/flujo-dependencias-modal.component';

@Component({
  selector: 'app-gestion-tipos-solicitud',
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
    SelectModule,
    PaginatorModule,
    EliminarTipoModalComponent,
    FormTipoModalComponent,
    FlujoDependenciasModalComponent
  ],
  providers: [MessageService],
  templateUrl: './gestion-tipos-solicitud.component.html',
  styleUrl: './gestion-tipos-solicitud.component.scss',
})
export class GestionTiposSolicitudComponent implements OnInit, OnDestroy {
  private readonly tipoService = inject(TipoSolicitudAdminService);
  private readonly dependenciaService = inject(DependenciaService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ── Estado de la tabla principal ─────────────────────────────────────────
  tipos = signal<TipoSolicitudAdmin[]>([]);
  cargando = signal(false);
  totalElementos = signal(0);
  paginaActual = signal(0);
  readonly tamanioPagina = 10;
  readonly skeletonRows = Array(6).fill(null);

  // ── Filtros ─────────────────────────────────────────────────────────────
  filtrosForm!: FormGroup;

  readonly estadoOptions = [
    { label: 'Todos', value: null },
    { label: 'Solo activos', value: true },
    { label: 'Solo inactivos', value: false },
  ];

  // ── Modal Crear / Editar ────────────────────────────────────────────────
  modalFormVisible = false;
  tipoEditando: TipoSolicitudAdmin | null = null;
  guardando = signal(false);

  // ── Modal Eliminar ──────────────────────────────────────────────────────
  modalEliminarVisible = false;
  tipoParaEliminar: TipoSolicitudAdmin | null = null;

  // ── Modal Flujo de Dependencias ─────────────────────────────────────────
  modalFlujoVisible = false;
  tipoFlujo: TipoSolicitudAdmin | null = null;
  dependenciasActivas = signal<DependenciaResponse[]>([]);
  
  agregandoDependencia = signal(false);
  eliminandoDependenciaId = signal<string | null>(null);
  guardandoOrdenId = signal<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this._inicializarForms();
    this.cargarTipos();
    this.cargarDependenciasActivas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _inicializarForms(): void {
    this.filtrosForm = this.fb.group({
      soloActivas: [null],
    });
  }

  // ── Cargar datos ────────────────────────────────────────────────────────

  cargarTipos(pagina = 0): void {
    this.cargando.set(true);
    this.paginaActual.set(pagina);

    const { soloActivas } = this.filtrosForm.value;

    this.tipoService
      .listar(pagina, this.tamanioPagina, soloActivas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: PagedTipoSolicitudResponse) => {
          this.tipos.set(resp.content);
          this.totalElementos.set(resp.totalElements);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error al cargar',
            detail: 'No se pudieron cargar los tipos de solicitud.',
            life: 5000,
          });
        },
      });
  }

  cargarDependenciasActivas(): void {
    this.dependenciaService
      .listar(0, 100, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.dependenciasActivas.set(resp.content);
        },
      });
  }

  aplicarFiltros(): void {
    this.cargarTipos(0);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ soloActivas: null });
    this.cargarTipos(0);
  }

  onPageChange(event: any): void {
    this.cargarTipos(event.page);
  }

  // ── Modal Crear / Editar ────────────────────────────────────────────────

  abrirModalCrear(): void {
    this.tipoEditando = null;
    this.modalFormVisible = true;
  }

  abrirModalEditar(tipo: TipoSolicitudAdmin): void {
    this.tipoEditando = tipo;
    this.modalFormVisible = true;
  }

  guardarTipo(data: { nombre: string; descripcion?: string; activo?: boolean }): void {
    this.guardando.set(true);

    if (this.tipoEditando) {
      const req = { 
        nombre: data.nombre, 
        descripcion: data.descripcion, 
        activo: data.activo ?? this.tipoEditando.activo 
      };
      this.tipoService
        .actualizar(this.tipoEditando.uuid, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Actualizado',
              detail: `"${data.nombre}" fue actualizado correctamente.`,
              life: 4000,
            });
            this.modalFormVisible = false;
            this.cargarTipos(this.paginaActual());
          },
          error: (err) => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error al actualizar',
              detail: err?.error?.message || 'No se pudo actualizar el tipo.',
              life: 6000,
            });
          },
        });
    } else {
      const req = { nombre: data.nombre, descripcion: data.descripcion };
      this.tipoService
        .crear(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Creado',
              detail: `"${data.nombre}" fue creado exitosamente.`,
              life: 4000,
            });
            this.modalFormVisible = false;
            this.cargarTipos(0);
          },
          error: (err) => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error al crear',
              detail: err?.error?.message || 'No se pudo crear el tipo.',
              life: 6000,
            });
          },
        });
    }
  }

  // ── Eliminar ────────────────────────────────────────────────────────────

  confirmarEliminar(tipo: TipoSolicitudAdmin): void {
    this.tipoParaEliminar = tipo;
    this.modalEliminarVisible = true;
  }

  ejecutarEliminar(): void {
    if (!this.tipoParaEliminar) return;
    
    const tipo = this.tipoParaEliminar;
    this.tipoService
      .eliminar(tipo.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Eliminado',
            detail: `"${tipo.nombre}" fue eliminado correctamente.`,
            life: 4000,
          });
          this.modalEliminarVisible = false;
          this.cargarTipos(this.paginaActual());
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al eliminar',
            detail: err?.error?.message || 'No se pudo eliminar el tipo.',
            life: 6000,
          });
        },
      });
  }

  // ── Modal Flujo de Dependencias ─────────────────────────────────────────

  abrirModalFlujo(tipo: TipoSolicitudAdmin): void {
    this.tipoFlujo = { ...tipo };
    this.modalFlujoVisible = true;
  }

  agregarDependenciaAlFlujo(data: { uuidDependencia: string; ordenFlujo: number; flujoParalelo: boolean }): void {
    if (!this.tipoFlujo) return;

    this.agregandoDependencia.set(true);

    this.tipoService
      .agregarDependencia(this.tipoFlujo.uuid, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nuevaDep) => {
          if (this.tipoFlujo) {
            this.tipoFlujo.dependencias = [...this.tipoFlujo.dependencias, nuevaDep]
              .sort((a, b) => a.ordenFlujo - b.ordenFlujo);
            this._actualizarEnLista(this.tipoFlujo);
            // Re-assign object reference to trigger ngOnChanges in modal
            this.tipoFlujo = { ...this.tipoFlujo };
          }
          this.agregandoDependencia.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Dependencia agregada',
            detail: `La dependencia fue agregada al flujo.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.agregandoDependencia.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'No se pudo agregar la dependencia al flujo.',
            life: 5000,
          });
        },
      });
  }

  eliminarDependenciaDelFlujo(uuidTipoDependencia: string): void {
    if (!this.tipoFlujo) return;

    this.eliminandoDependenciaId.set(uuidTipoDependencia);

    this.tipoService
      .eliminarDependencia(this.tipoFlujo.uuid, uuidTipoDependencia)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.tipoFlujo) {
            this.tipoFlujo.dependencias = this.tipoFlujo.dependencias
              .filter(d => d.uuid !== uuidTipoDependencia);
            this._actualizarEnLista(this.tipoFlujo);
            // Re-assign object reference to trigger ngOnChanges in modal
            this.tipoFlujo = { ...this.tipoFlujo };
          }
          this.eliminandoDependenciaId.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Dependencia eliminada',
            detail: `La dependencia fue retirada del flujo.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.eliminandoDependenciaId.set(null);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'No se pudo eliminar la dependencia del flujo.',
            life: 5000,
          });
        },
      });
  }

  guardarOrden(data: { dep: TipoDependenciaItem; nuevoOrden: number }): void {
    if (!this.tipoFlujo) return;

    this.guardandoOrdenId.set(data.dep.uuid);

    const item: ReordenarDependenciaItem = {
      uuidTipoDependencia: data.dep.uuid,
      nuevoOrden: data.nuevoOrden
    };

    this.tipoService
      .reordenarDependencias(this.tipoFlujo.uuid, [item])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dependenciasActualizadas) => {
          if (this.tipoFlujo) {
            this.tipoFlujo.dependencias = dependenciasActualizadas;
            this._actualizarEnLista(this.tipoFlujo);
            this.tipoFlujo = { ...this.tipoFlujo };
          }
          this.guardandoOrdenId.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Orden actualizado',
            detail: 'El flujo ha sido reordenado.',
            life: 3000,
          });
        },
        error: (err) => {
          this.guardandoOrdenId.set(null);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'No se pudo reordenar.',
            life: 5000,
          });
        }
      });
  }

  private _actualizarEnLista(updated: TipoSolicitudAdmin): void {
    this.tipos.update((lista) =>
      lista.map((t) => (t.uuid === updated.uuid ? updated : t))
    );
  }

  // ── Helpers UI ──────────────────────────────────────────────────────────

  get hayFiltrosActivos(): boolean {
    return this.filtrosForm.value.soloActivas !== null;
  }

  formatearFecha(fechaStr: string | null): string {
    if (!fechaStr) return '—';
    return new Date(fechaStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
