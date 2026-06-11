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
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { PaginatorModule } from 'primeng/paginator';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';

import { DependenciaService } from '../../core/services/dependencia.service';
import {
  DependenciaResponse,
  PagedDependenciaResponse,
} from '../../core/models/dependencia.models';
import { FormDependenciaModalComponent } from '../modals/modal-form-dependencia/form-dependencia-modal.component';
import { AccesosDependenciaModalComponent } from '../modals/modal-accesos-dependencia/accesos-dependencia-modal.component';

@Component({
  selector: 'app-gestion-dependencias',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    ToastModule,
    SkeletonModule,
    TooltipModule,
    SelectModule,
    InputTextModule,
    DialogModule,
    TextareaModule,
    PaginatorModule,
    ConfirmDialogModule,
    DividerModule,
    FormDependenciaModalComponent,
    AccesosDependenciaModalComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gestion-dependencias.component.html',
  styleUrl: './gestion-dependencias.component.scss',
})
export class GestionDependenciasComponent implements OnInit, OnDestroy {
  private readonly dependenciaService = inject(DependenciaService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ── Estado de la tabla ──────────────────────────────────────────────────
  dependencias = signal<DependenciaResponse[]>([]);
  cargando = signal(false);
  totalElementos = signal(0);
  paginaActual = signal(0);
  readonly tamanioPagina = 10;
  readonly skeletonRows = Array(6).fill(null);

  // ── Filtros ─────────────────────────────────────────────────────────────
  filtrosForm!: FormGroup;

  readonly estadoOptions = [
    { label: 'Todas', value: null },
    { label: 'Solo activas', value: true },
    { label: 'Solo inactivas', value: false },
  ];

  // ── Modal Crear / Editar ────────────────────────────────────────────────
  modalFormVisible = false;
  modoEdicion = false;
  dependenciaEditando: DependenciaResponse | null = null;
  guardando = signal(false);
  formDependencia!: FormGroup;

  // ── Modal Gestión de Accesos ─────────────────────────────────────────────
  modalAccesosVisible = false;
  dependenciaAccesos: DependenciaResponse | null = null;
  agregandoAcceso = signal(false);
  eliminandoAcceso = signal<string | null>(null);
  nuevoAcceso = '';

  // ── Dependencias con lógica implementada (no eliminables) ───────────────
  readonly dependenciasConLogica = ['Dirección de programa'];

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this._inicializarForms();
    this.cargarDependencias();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _inicializarForms(): void {
    this.filtrosForm = this.fb.group({
      soloActivas: [null],
    });

    this.formDependencia = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: [''],
      activo: [true],
      tipoAcceso: ['IDENTIFICACION'],
    });
  }

  // ── Cargar datos ────────────────────────────────────────────────────────

  cargarDependencias(pagina = 0): void {
    this.cargando.set(true);
    this.paginaActual.set(pagina);

    const { soloActivas } = this.filtrosForm.value;

    this.dependenciaService
      .listar(pagina, this.tamanioPagina, soloActivas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: PagedDependenciaResponse) => {
          this.dependencias.set(resp.content);
          this.totalElementos.set(resp.totalElements);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error al cargar',
            detail: 'No se pudieron cargar las dependencias.',
            life: 5000,
          });
        },
      });
  }

  aplicarFiltros(): void {
    this.cargarDependencias(0);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ soloActivas: null });
    this.cargarDependencias(0);
  }

  onPageChange(event: any): void {
    this.cargarDependencias(event.page);
  }

  // ── Modal Crear / Editar ────────────────────────────────────────────────

  abrirModalCrear(): void {
    this.modoEdicion = false;
    this.dependenciaEditando = null;
    this.formDependencia.reset({ nombre: '', descripcion: '', activo: true, tipoAcceso: 'IDENTIFICACION' });
    this.modalFormVisible = true;
  }

  abrirModalEditar(dep: DependenciaResponse): void {
    this.modoEdicion = true;
    this.dependenciaEditando = dep;
    this.formDependencia.patchValue({
      nombre: dep.nombre,
      descripcion: dep.descripcion ?? '',
      activo: dep.activo,
      tipoAcceso: dep.tipoAcceso ?? 'IDENTIFICACION',
    });
    this.modalFormVisible = true;
  }

  cerrarModalForm(): void {
    this.modalFormVisible = false;
    this.dependenciaEditando = null;
  }

  guardar(): void {
    if (this.formDependencia.invalid) {
      this.formDependencia.markAllAsTouched();
      return;
    }

    const { nombre, descripcion, activo, tipoAcceso } = this.formDependencia.value;
    this.guardando.set(true);

    if (this.modoEdicion && this.dependenciaEditando) {
      const req = { nombre, descripcion: descripcion || undefined, activo, tipoAcceso };
      this.dependenciaService
        .actualizar(this.dependenciaEditando.uuid, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Dependencia actualizada',
              detail: `"${nombre}" fue actualizada correctamente.`,
              life: 4000,
            });
            this.cerrarModalForm();
            this.cargarDependencias(this.paginaActual());
          },
          error: (err) => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error al actualizar',
              detail: err?.error?.message || 'No se pudo actualizar la dependencia.',
              life: 6000,
            });
          },
        });
    } else {
      const req = { nombre, descripcion: descripcion || undefined, tipoAcceso };
      this.dependenciaService
        .crear(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Dependencia creada',
              detail: `"${nombre}" fue creada exitosamente.`,
              life: 4000,
            });
            this.cerrarModalForm();
            this.cargarDependencias(0);
          },
          error: (err) => {
            this.guardando.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error al crear',
              detail: err?.error?.message || 'No se pudo crear la dependencia.',
              life: 6000,
            });
          },
        });
    }
  }

  // ── Eliminar ────────────────────────────────────────────────────────────

  confirmarEliminar(dep: DependenciaResponse): void {
    this.confirmationService.confirm({
      header: 'Eliminar Dependencia',
      message: `¿Está seguro de que desea eliminar la dependencia <strong>"${dep.nombre}"</strong>? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this._eliminar(dep),
    });
  }

  private _eliminar(dep: DependenciaResponse): void {
    this.dependenciaService
      .eliminar(dep.uuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Dependencia eliminada',
            detail: `"${dep.nombre}" fue eliminada correctamente.`,
            life: 4000,
          });
          this.cargarDependencias(this.paginaActual());
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al eliminar',
            detail: err?.error?.message || 'No se pudo eliminar la dependencia.',
            life: 6000,
          });
        },
      });
  }

  // ── Modal Gestión de Accesos ─────────────────────────────────────────────

  abrirModalAccesos(dep: DependenciaResponse): void {
    this.dependenciaAccesos = { ...dep };
    this.nuevoAcceso = '';
    this.modalAccesosVisible = true;
  }

  cerrarModalAccesos(): void {
    this.modalAccesosVisible = false;
    this.dependenciaAccesos = null;
    this.nuevoAcceso = '';
  }

  agregarAcceso(): void {
    if (!this.nuevoAcceso.trim() || !this.dependenciaAccesos) return;

    const valor = this.nuevoAcceso.trim();
    this.agregandoAcceso.set(true);

    const isCargo = this.dependenciaAccesos.tipoAcceso === 'CARGO';
    const request$ = isCargo
      ? this.dependenciaService.agregarCargo(this.dependenciaAccesos.uuid, valor)
      : this.dependenciaService.agregarUsuario(this.dependenciaAccesos.uuid, valor);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.dependenciaAccesos = updated;
          this.nuevoAcceso = '';
          this.agregandoAcceso.set(false);
          this._actualizarEnLista(updated);
          this.messageService.add({
            severity: 'success',
            summary: isCargo ? 'Cargo agregado' : 'Usuario agregado',
            detail: isCargo ? `El cargo ${valor} ahora tiene acceso.` : `El usuario ${valor} ahora tiene acceso.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.agregandoAcceso.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'No se pudo agregar el acceso.',
            life: 5000,
          });
        },
      });
  }

  eliminarAcceso(valor: string): void {
    if (!this.dependenciaAccesos) return;

    this.eliminandoAcceso.set(valor);

    const isCargo = this.dependenciaAccesos.tipoAcceso === 'CARGO';
    const request$ = isCargo
      ? this.dependenciaService.eliminarCargo(this.dependenciaAccesos.uuid, valor)
      : this.dependenciaService.eliminarUsuario(this.dependenciaAccesos.uuid, valor);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.dependenciaAccesos = updated;
          this.eliminandoAcceso.set(null);
          this._actualizarEnLista(updated);
          this.messageService.add({
            severity: 'success',
            summary: 'Acceso eliminado',
            detail: isCargo ? `El cargo ${valor} ya no tiene acceso.` : `El usuario ${valor} ya no tiene acceso.`,
            life: 3000,
          });
        },
        error: (err) => {
          this.eliminandoAcceso.set(null);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'No se pudo eliminar el acceso.',
            life: 5000,
          });
        },
      });
  }

  private _actualizarEnLista(updated: DependenciaResponse): void {
    this.dependencias.update((lista) =>
      lista.map((d) => (d.uuid === updated.uuid ? updated : d))
    );
  }

  // ── Helpers UI ──────────────────────────────────────────────────────────

  esEliminable(dep: DependenciaResponse): boolean {
    if (!dep || !dep.nombre) return true;
    const normalizeString = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const nombreNormalizado = normalizeString(dep.nombre);
    return !this.dependenciasConLogica.some(d => normalizeString(d) === nombreNormalizado);
  }

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

  get nombreError(): string | null {
    const ctrl = this.formDependencia.get('nombre');
    if (!ctrl?.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'El nombre es obligatorio';
    if (ctrl.errors['maxlength']) return 'Máximo 150 caracteres';
    return null;
  }
}
