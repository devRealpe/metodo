import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ConvocatoriaService } from '../../core/services/convocatoria.service';
import { Convocatoria } from '../../core/models/convocatoria.model';
import { TipoMovilidadService } from '../../core/services/tipo-movilidad.service';
import { ModalidadService } from '../../core/services/modalidad.service';
import { InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';

@Component({
  selector: 'app-convocatorias-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, TooltipModule, BadgeModule,
    DialogModule, ConfirmDialogModule, ToastModule, InputTextModule, Textarea,
    InfoTableComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './convocatorias-list.component.html',
  styles: [`
    .dashboard-card {
      transition: all 0.3s ease;
    }
    .dashboard-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class ConvocatoriasListComponent implements OnInit {
  private readonly convocatoriaService = inject(ConvocatoriaService);
  private readonly tipoMovilidadService = inject(TipoMovilidadService);
  private readonly modalidadService = inject(ModalidadService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  convocatorias: Convocatoria[] = [];
  convocatoriasFiltradas: Convocatoria[] = [];
  loading = false;

  filtroTitulo = '';
  filtroEstado = '';

  tiposMovilidad: any[] = [];
  modalidades: any[] = [];

  estadisticas = { total: 0, abiertas: 0, programadas: 0, cerradas: 0 };

  // Dialog para crear/editar
  mostrarDialog = false;
  editando = false;
  convocatoriaForm: Partial<Convocatoria> = {};

  columns: TableColumn[] = [
    { field: 'titulo', header: 'Título', sortable: true },
    { field: 'institucion', header: 'Institución', sortable: true },
    { field: 'pais', header: 'País', sortable: true },
    { field: 'fechaInicio', header: 'Fecha Inicio', sortable: true, type: 'date' },
    { field: 'fechaCierre', header: 'Fecha Cierre', sortable: true, type: 'date' },
    {
      field: 'estado', header: 'Estado', sortable: true, type: 'badge', badgeConfig: {
        getSeverity: (value: any) => value === 'ABIERTA' ? 'success' : value === 'PROGRAMADA' ? 'info' : 'danger',
        getLabel: (value: any) => value
      }
    }
  ];

  actions: TableAction[] = [
    { icon: 'pi pi-pencil', label: '', tooltip: 'Editar', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.editarConvocatoria(row) },
    { icon: 'pi pi-eye', label: '', tooltip: 'Ver detalles', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.verDetalle(row) },
    { icon: 'pi pi-trash', label: '', tooltip: 'Eliminar', severity: 'danger', styleClass: 'text-red-500', onClick: (row: any) => this.confirmarEliminar(row) }
  ];

  ngOnInit(): void {
    this.cargarConvocatorias();
    this.cargarTiposMovilidad();
    this.cargarModalidades();
  }

  cargarConvocatorias(): void {
    this.loading = true;
    this.convocatoriaService.getAll().subscribe({
      next: (data) => {
        this.convocatorias = data;
        this.calcularEstadisticas();
        this.aplicarFiltros();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  cargarTiposMovilidad(): void {
    this.tipoMovilidadService.getAllActive().subscribe({
      next: (data) => { this.tiposMovilidad = data; },
      error: () => {}
    });
  }

  cargarModalidades(): void {
    this.modalidadService.getAll().subscribe({
      next: (data) => { this.modalidades = data; },
      error: () => {}
    });
  }

  calcularEstadisticas(): void {
    this.estadisticas.total = this.convocatorias.length;
    this.estadisticas.abiertas = this.convocatorias.filter(c => c.estado === 'ABIERTA').length;
    this.estadisticas.programadas = this.convocatorias.filter(c => c.estado === 'PROGRAMADA').length;
    this.estadisticas.cerradas = this.convocatorias.filter(c => c.estado === 'CERRADA').length;
  }

  aplicarFiltros(): void {
    let resultado = [...this.convocatorias];

    if (this.filtroTitulo) {
      const busqueda = this.filtroTitulo.toLowerCase();
      resultado = resultado.filter(c =>
        c.titulo?.toLowerCase().includes(busqueda) ||
        c.institucion?.toLowerCase().includes(busqueda) ||
        c.pais?.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter(c => c.estado === this.filtroEstado);
    }

    this.convocatoriasFiltradas = resultado;
  }

  filtrarPorEstado(estado: string): void {
    this.filtroEstado = this.filtroEstado === estado ? '' : estado;
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.filtroTitulo = '';
    this.filtroEstado = '';
    this.aplicarFiltros();
  }

  abrirNueva(): void {
    this.editando = false;
    this.convocatoriaForm = { estado: 'ABIERTA' };
    this.mostrarDialog = true;
  }

  editarConvocatoria(conv: Convocatoria): void {
    this.editando = true;
    this.convocatoriaForm = { ...conv };
    this.mostrarDialog = true;
  }

  verDetalle(conv: Convocatoria): void {
    this.editando = true;
    this.convocatoriaForm = { ...conv };
    this.mostrarDialog = true;
  }

  guardarConvocatoria(): void {
    if (!this.convocatoriaForm.titulo || !this.convocatoriaForm.fechaInicio || !this.convocatoriaForm.fechaCierre) {
      this.messageService.add({ severity: 'warn', summary: 'Campos requeridos', detail: 'Complete el título y las fechas.' });
      return;
    }

    if (this.editando && this.convocatoriaForm.id) {
      this.convocatoriaService.update(this.convocatoriaForm.id, this.convocatoriaForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Actualizada', detail: 'Convocatoria actualizada exitosamente.' });
          this.mostrarDialog = false;
          this.cargarConvocatorias();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar la convocatoria.' });
        }
      });
    } else {
      this.convocatoriaService.create(this.convocatoriaForm).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Creada', detail: 'Convocatoria creada exitosamente.' });
          this.mostrarDialog = false;
          this.cargarConvocatorias();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al crear la convocatoria.' });
        }
      });
    }
  }

  confirmarEliminar(conv: Convocatoria): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar la convocatoria "${conv.titulo}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.convocatoriaService.delete(conv.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminada', detail: 'Convocatoria eliminada exitosamente.' });
            this.cargarConvocatorias();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar la convocatoria.' });
          }
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/app/inicio']);
  }
}
