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
import { Autorizacion } from '../../../core/models/autorizacion.model';
import { MovilidadService } from '../../../core/services/movilidad.service';
import { Movilidad } from '../../../core/models/movilidad.model';
import { MOVILIDADESTADO, COBERTURA } from '../../../core/constants/movilidad-constants';
import { Opcion } from '../../../core/models/opcion.model';
import { UbicacionesGeograficasService } from '../../../core/services/ubicaciones-geograficas.service';
import { ProgramaService } from '../../../core/services/programas.service';
import { InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { TipoMovilidadService } from '../../../core/services/tipo-movilidad.service';
import { ModalidadService } from '../../../core/services/modalidad.service';
import { TipoMovilidad } from '../../../core/models/tipo-movilidad.model';
import { Modalidad } from '../../../core/models/modalidad.model';

@Component({
  selector: 'app-movilidad-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule, BadgeModule, ConfirmDialogModule, ToastModule, InfoTableComponent, InputComponent, SelectComponent, DatepickerComponent],
  providers: [ConfirmationService, MessageService],
  templateUrl: './movilidad-list.component.html',
})
export class MovilidadListComponent implements OnInit {
  private readonly movilidadService = inject(MovilidadService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly ubicacionesService = inject(UbicacionesGeograficasService);
  private readonly programaService = inject(ProgramaService);
  private readonly tipoMovilidadService = inject(TipoMovilidadService);
  private readonly modalidadService = inject(ModalidadService);

  movilidades: Movilidad[] = [];
  movilidadesFiltradas: Movilidad[] = [];
  loading = false;
  filtroNombre = '';
  filtroModalidad = '';
  filtroTipo = '';
  filtroFechaDesde: Date | null = null;
  filtroFechaHasta: Date | null = null;
  filtroEstado: string = ''; // Nuevo filtro para las tarjetas

  // Modo de visualización: list normal (activas/inactivas) o solo cerradas
  viewMode: 'normal' | 'cerradas' = 'normal';
  filtroCobertura: string = '';
  opcionesModalidad: {label:string,value:string}[] = [];
  readonly opcionesEstado = MOVILIDADESTADO;
  opcionesTipo: {label:string,value:string}[] = [];
  // coberturas vienen de constantes, convertir a label/value para select
  // asegurarse de no producir undefined para cumplir con el tipo
  opcionesCobertura: {label:string,value:string}[] = COBERTURA.map(c => ({ label: c.nombre || '', value: c.id || '' }));
  paises: Opcion[] = [];
  programas: {id: string, nombre: string, idFacultad: string}[] = [];
  facultades: {id: string, nombre: string}[] = [];

  // Estadísticas
  estadisticas = {
    total: 0,
    activas: 0,
    inactivas: 0,
    cerradas: 0
  };

  mostrarFiltros = false;

  // Configuración de la tabla reutilizable
  columns: TableColumn[] = [
    { field: 'nombreMovilidad', header: 'Nombre', sortable: true },
    { field: 'modalidad', header: 'Modalidad', sortable: true, type: 'custom' },
    { field: 'facultad', header: 'Facultad', sortable: true, type: 'custom' },
    { field: 'programa', header: 'Programa', sortable: true, type: 'custom' },
    { field: 'lugarDestino', header: 'Destino', sortable: true },
    { field: 'cobertura', header: 'Cobertura', sortable: true, type: 'custom' },
    { field: 'pais', header: 'País', sortable: true, type: 'custom' },
    { field: 'fechaInicio', header: 'Fecha Inicio', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' },
    { field: 'estado', header: 'Estado', sortable: true, type: 'badge', badgeConfig: {
      getSeverity: (value: any) => value === 'ACTIVO' ? 'success' : 'danger',
      getLabel: (value: any) => value === 'ACTIVO' ? 'Activo' : 'Inactivo'
    }}
  ];

  actions: TableAction[] = [
    { icon: 'pi pi-print', label: '', tooltip: 'Imprimir PDF', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.generarPDF(row) },
    { icon: 'pi pi-pencil', label: '', tooltip: 'Editar movilidad', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.editarMovilidad(row) },
    { icon: 'pi pi-eye', label: '', tooltip: 'Ver detalles', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.verDetalle(row) },
    { icon: 'pi pi-power-off', label: '', tooltip: 'Cambiar estado', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.toggleEstado(row) },
    { icon: 'pi pi-trash', label: '', tooltip: 'Eliminar movilidad', severity: 'danger', styleClass: 'text-red-500', onClick: (row: any) => this.confirmarEliminar(row) }
  ];

  ngOnInit(): void {
    this.cargarMovilidades();
    this.cargarPaises();
    this.cargarProgramas();
    this.cargarFacultades();
    this.cargarModalidades();
    this.cargarTiposMovilidad();
  }

  cargarMovilidades(): void {
    this.loading = true;
    this.movilidadService.getAll().subscribe({
      next: (data) => {
        this.movilidades = data.map(m => ({ 
          ...m, 
          estado: m.estado || 'ACTIVO'
        }));
        // Mostrar todas las movilidades inicialmente sin filtros
        this.movilidadesFiltradas = [...this.movilidades];
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando movilidades:', err);
        this.loading = false;
      },
    });
  }

  cargarPaises(): void {
    this.ubicacionesService.obtenerPaises().subscribe({
      next: (data: {id: string, nombre: string}[]) => {
        this.paises = data.map(p => ({ label: p.nombre, value: p.id }));
      },
      error: (err) => {
        console.error('Error cargando países:', err);
      }
    });
  }

  cargarProgramas(): void {
    this.programaService.getAll().subscribe({
      next: (data) => {
        this.programas = data;
      },
      error: (err) => {
        console.error('Error cargando programas:', err);
      }
    });
  }

  cargarFacultades(): void {
    this.programaService.getAllFacultades().subscribe({
      next: (data: {id: string, nombre: string}[]) => {
        this.facultades = data;
      },
      error: (err) => {
        console.error('Error cargando facultades:', err);
      }
    });
  }

  aplicarFiltros(): void {
    // Si no hay filtros activos y no estamos en vista cerradas, mostrar todas las movilidades
    if (this.viewMode === 'normal' && !this.filtroNombre && !this.filtroModalidad && !this.filtroTipo && !this.filtroFechaDesde && !this.filtroFechaHasta && !this.filtroEstado && !this.filtroCobertura) {
      this.movilidadesFiltradas = [...this.movilidades];
      return;
    }
    this.movilidadesFiltradas = this.movilidades.filter(movilidad =>
      this.coincideTexto(movilidad.nombreMovilidad, this.filtroNombre) &&
      this.coincideTexto(movilidad.modalidad?.nombre, this.filtroModalidad) &&
      this.coincideTexto(movilidad.tipoMovilidad?.nombre, this.filtroTipo) &&
      this.coincideTexto(movilidad.cobertura?.nombre, this.filtroCobertura) &&
      this.coincideFecha(movilidad) &&
      this.coincideEstado(movilidad)
    );
  }

  private coincideTexto(texto: string, filtro: string): boolean {
    return !filtro || texto.toLowerCase().includes(filtro.toLowerCase());
  }

  private coincideFecha(movilidad: Movilidad): boolean {
    if (!this.filtroFechaDesde && !this.filtroFechaHasta) return true;

    const fechaMovilidad = new Date(movilidad.fechaInicio).getTime();
    const fechaDesde = this.filtroFechaDesde ? new Date(this.filtroFechaDesde).setHours(0, 0, 0, 0) : null;
    const fechaHasta = this.filtroFechaHasta ? new Date(this.filtroFechaHasta).setHours(23, 59, 59, 999) : null;

    return (!fechaDesde || fechaMovilidad >= fechaDesde) && (!fechaHasta || fechaMovilidad <= fechaHasta);
  }

  private coincideEstado(movilidad: Movilidad): boolean {
    // Si estamos en la vista de cerradas únicamente dejamos pasar aquellas con estadoAprobacion CERRADA
    if (this.viewMode === 'cerradas') {
      return movilidad.estadoAprobacion === 'CERRADA';
    }

    if (!this.filtroEstado || this.filtroEstado === 'total') return true;
    const estado = movilidad.estado;
    return estado === this.filtroEstado.toUpperCase().replace('ACTIVAS', 'ACTIVO').replace('INACTIVAS', 'INACTIVO');
  }

  // coincideCobertura removed – cobertura comparison now handled by coincideTexto above

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroModalidad = '';
    this.filtroTipo = '';
    this.filtroFechaDesde = null;
    this.filtroFechaHasta = null;
    this.filtroEstado = '';
    this.filtroCobertura = '';
    this.viewMode = 'normal';
    this.aplicarFiltros();
  }

  filtrarPorEstado(estado: string): void {
    if (estado === 'cerradas') {
      this.viewMode = 'cerradas';
      this.filtroEstado = '';
    } else {
      this.viewMode = 'normal';
      this.filtroEstado = estado;
    }
    this.aplicarFiltros();
  }

  calcularEstadisticas(): void {
    this.estadisticas.total = this.movilidades.length;
    this.estadisticas.activas = this.movilidades.filter(m => m.estado === 'ACTIVO').length;
    this.estadisticas.inactivas = this.movilidades.filter(m => m.estado === 'INACTIVO').length;
    this.estadisticas.cerradas = this.movilidades.filter(m => m.estadoAprobacion === 'CERRADA').length;
  }

  editarMovilidad(movilidad: Movilidad): void {
    this.router.navigate(['/app/movilidad'], { queryParams: { id: movilidad.id } });
  }

  volverAlFormulario(): void {
    this.router.navigate(['/app/movilidad']);
  }

  verDetalle(movilidad: Movilidad): void {
    this.router.navigate(['/app/movilidad'], { queryParams: { id: movilidad.id, readonly: true } });
  }

  confirmarEliminar(movilidad: Movilidad): void {
    this.confirmationService.confirm({
      message: `¿Eliminar todos los datos asociados a "${movilidad.nombreMovilidad}"?`,
      header: 'Confirmar eliminación',
      accept: () => this.eliminarMovilidad(movilidad.id)
    });
  }

  async eliminarMovilidad(id: string): Promise<void> {
    try {
      await this.movilidadService.deleteMovilidadWithRelations(id).toPromise();
      this.cargarMovilidades();
    } catch (error) {
      console.error('Error al eliminar:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar movilidad' });
    }
  }

  getPaisNombre(paisId: string): string {
    return paisId ? this.paises.find(p => p.value === paisId)?.label || '' : '';
  }

  getProgramaNombre(programaId: string): string {
    return programaId ? this.programas.find(p => p.id === programaId)?.nombre || '' : '';
  }

  getFacultadNombre(facultadId: string): string {
    return facultadId ? this.facultades.find(f => f.id === facultadId)?.nombre || '' : '';
  }

  getConvenioCodigo(convenioId: string): string {
    // Asumiendo que tienes convenios cargados, pero por simplicidad, devolver el ID
    return convenioId || 'N/A';
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/app']);
    }
  }

  toggleEstado(movilidad: Movilidad): void {
    const nuevoEstado = movilidad.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.movilidadService.update(movilidad.id, { estado: nuevoEstado }).subscribe({
      next: (updatedMovilidad) => {
        movilidad.estado = updatedMovilidad.estado;
        this.calcularEstadisticas();
        this.aplicarFiltros();
        this.messageService.add({
          severity: 'success',
          summary: 'Estado Actualizado',
          detail: `La movilidad ha sido ${nuevoEstado === 'ACTIVO' ? 'activada' : 'desactivada'} exitosamente.`,
          life: 4000
        });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Error al actualizar estado: ${err.message || 'Error desconocido'}` });
      }
    });
  }

  private cargarModalidades(): void {
    this.modalidadService.getAll().subscribe({
      next: (data) => {
        // primer campo debe ser label/value para <app-select>
        this.opcionesModalidad = (data || []).map(m => ({ label: m.nombre || '', value: m.id || '' } as any));
      },
      error: (err) => {
        console.error('Error cargando modalidades:', err);
      }
    });
  }

  private cargarTiposMovilidad(): void {
    this.tipoMovilidadService.getAllActive().subscribe({
      next: (data: TipoMovilidad[]) => {
        // generate label/value array
        this.opcionesTipo = (data || []).map(t => ({ label: t.nombre, value: t.id } as any));
      },
      error: (err: any) => {
        console.error('Error cargando tipos de movilidad:', err);
      }
    });
  }

  formatDate(date: string | Date): string {
    if (!date) return 'No definida';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  generarPDF(movilidad: Movilidad): void {
    if (!movilidad || !movilidad.id) {
      return;
    }
    this.movilidadService.generatePdf(movilidad.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `formato-solicitud-${movilidad.nombreMovilidad || 'sin-nombre'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al generar PDF:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF en el servidor' });
      }
    });
  }

  exportFilteredExcel(): void {
    if (!this.movilidadesFiltradas.length) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay movilidades para exportar.' });
      return;
    }
    // convert label filters back to their corresponding ids for the backend
    const modalidadId = this.opcionesModalidad.find(o => o.label === this.filtroModalidad)?.value;
    const tipoId = this.opcionesTipo.find(o => o.label === this.filtroTipo)?.value;
    const coberturaId = this.opcionesCobertura.find(o => o.label === this.filtroCobertura)?.value;

    this.movilidadService.exportExcel({
      nombre: this.filtroNombre,
      modalidad: modalidadId,
      tipoMovilidad: tipoId,
      estado: this.filtroEstado,
      viewMode: this.viewMode,
      cobertura: coberturaId,
      fechaDesde: this.filtroFechaDesde || undefined,
      fechaHasta: this.filtroFechaHasta || undefined
    });
  }

}
