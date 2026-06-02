import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { forkJoin, from, Observable, catchError, of } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { Movilidad } from '../../../core/models/movilidad.model';
import { Estudiante } from '../../../core/models/estudiante.model';
import { EstudiantesOracle } from '../../../core/models/estudiantes-oracle.model';
import { Modalidad } from '../../../core/models/modalidad.model';
import { TipoMovilidad } from '../../../core/models/tipo-movilidad.model';
import { MovilidadService } from '../../../core/services/movilidad.service';
import { EstudianteService } from '../../../core/services/estudiante.service';
import { EstudiantesOracleService } from '../../../core/services/estudiantes-oracle.service';
import { ModalidadService } from '../../../core/services/modalidad.service';
import { TipoMovilidadService } from '../../../core/services/tipo-movilidad.service';
import { InfoTableComponent, TableColumn, TableAction, InputComponent, SelectComponent } from '@microfrontends/shared-ui';

import { MovilidadEstadoService, MovilidadAgrupada } from '../../../core/services/movilidad-estado.service';


interface MovilidadConRelaciones extends Movilidad {
  estudiantes: Estudiante[];
  solicitarAutorizacion?: boolean;
  autorizacionCancelada?: boolean; 
}

@Component({
  selector: 'app-movilidad-estudiantes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, ButtonModule, CardModule, BadgeModule, ConfirmDialogModule, ToastModule, DialogModule, InfoTableComponent, InputComponent, SelectComponent],
  providers: [ConfirmationService, MessageService],
  templateUrl: './movilidadEstudiantes-list-component.html',
})
export class MovilidadEstudiantesListComponent implements OnInit {
  private readonly movilidadService = inject(MovilidadService);
  private readonly estudianteService = inject(EstudianteService);
  private readonly api = inject(EstudiantesOracleService);
  private readonly modalidadService = inject(ModalidadService);
  private readonly tipoMovilidadService = inject(TipoMovilidadService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly movilidadEstadoService = inject(MovilidadEstadoService);
  private readonly destroyRef = inject(DestroyRef);

  movilidades: MovilidadConRelaciones[] = [];
  loading = false;
  expandedRows: { [key: string]: boolean } = {};
  movilidadSeleccionada: MovilidadConRelaciones | null = null;
  mostrarModalEstudiantes = false;
  estudiantesParaMostrar: EstudiantesOracle[] = [];
  estadisticas = {
    total: 0,
    totalEstudiantes: 0,
    activas: 0
  };
  filtroNombre = '';
  filtroTipo = '';
  filtroModalidad: Modalidad | null = null;
  filtroFechaDesde: Date | null = null;
  filtroFechaHasta: Date | null = null;
  movilidadesFiltradas: MovilidadConRelaciones[] = [];
  mostrarFiltros = false;

  opcionesTipo: string[] = [];
  opcionesModalidad: Modalidad[] = [];

  columns: TableColumn[] = [
    { field: 'nombreMovilidad', header: 'Nombre de Movilidad', sortable: true },
    { field: 'tipoMovilidad', header: 'Tipo', sortable: true, type: 'custom' },
    { field: 'modalidad', header: 'Modalidad', sortable: true, type: 'custom' },
    { field: 'fechaInicio', header: 'Fecha Inicio', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' },
    { field: 'fechaFin', header: 'Fecha Fin', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' }
  ];

  actions: TableAction[] = [
    { icon: 'pi pi-file-pdf', label: '', tooltip: 'Generar PDF', severity: 'info', styleClass: 'text-blue-500', onClick: async (row: any) => await this.generarPDF(row) },
    { icon: 'pi pi-pencil', label: '', tooltip: 'Editar movilidad', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.editarMovilidad(row) },
    { icon: 'pi pi-users', label: '', tooltip: 'Ver estudiantes', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.verEstudiantes(row) },
    { icon: 'pi pi-check-circle', label: '', tooltip: 'Ver Autorizaciones', severity: 'success', styleClass: 'text-green-500', onClick: (row: any) => this.verAutorizaciones(row) },
    { icon: 'pi pi-trash', label: '', tooltip: 'Eliminar estudiantes', severity: 'danger', styleClass: 'text-red-500', onClick: (row: any) => this.confirmarEliminar(row) }
  ];

  ngOnInit(): void {
    this.cargarModalidades();
    this.cargarTiposMovilidad();
    this.cargarMovilidadesEstudiantes();
    
    // Suscribirse a cambios en movilidades aprobadas para actualizar el estado de solicitarAutorizacion
    this.movilidadEstadoService.movilidadesAprobadas$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((movilidadesAprobadas: MovilidadAgrupada[]) => {
        this.actualizarEstadoSolicitarAutorizacion(movilidadesAprobadas);
      });

    // Escuchar actualizaciones por movilidad para sincronizar `solicitarAutorizacion` con la BD
    this.movilidadEstadoService.movilidadActualizada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((movilidadId: string | null) => {
        if (!movilidadId) return;
        const idx = this.movilidades.findIndex(m => m.id === movilidadId);
        if (idx === -1) return; // esta vista no tiene la movilidad en lista

        // Reconsultar estudiantes para esa movilidad y actualizar el flag a partir de la BD
        this.estudianteService.getByMovilidad(movilidadId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (estudiantes: any[]) => {
            const tieneSolicitar = (estudiantes || []).some(e => e.solicitarAutorizacion === true);
            this.movilidades[idx].solicitarAutorizacion = tieneSolicitar;
            // Forzar refresco de la lista y filtros
            this.movilidadesFiltradas = [...this.movilidades];
            this.calcularEstadisticas();
          },
          error: () => {
            // Si falla la recarga, no cambiar el estado local y dejar que el usuario intente de nuevo
            console.error('No se pudo recargar estudiantes para movilidad', movilidadId);
          }
        });
      });
  }

  cargarModalidades(): void {
    this.modalidadService.getAll().subscribe({
      next: (modalidades) => {
        this.opcionesModalidad = modalidades;
      },
      error: (err) => {
        console.error('Error cargando modalidades:', err);
      }
    });
  }

  cargarTiposMovilidad(): void {
    this.tipoMovilidadService.getAllActive().subscribe({
      next: (tipos: TipoMovilidad[]) => {
        this.opcionesTipo = tipos.map(t => t.nombre);
      },
      error: (err: any) => {
        console.error('Error cargando tipos de movilidad:', err);
      }
    });
  }

  cargarMovilidadesEstudiantes(): void {
    this.loading = true;
    this.movilidadService.getAll().subscribe({
      next: (movilidades) => {
        if (movilidades.length === 0) {
          this.movilidades = [];
          this.loading = false;
          return;
        }

        const observablesPorMovilidad = movilidades.map(m => {
          const movilidadId = m.id!;
          const forkJoinData: any = {
            estudiantes: this.estudianteService.getByMovilidad(movilidadId).pipe(
              catchError(() => of([]))
            )
          };

          return forkJoin(forkJoinData);
        });

        forkJoin(observablesPorMovilidad).subscribe({
          next: (resultados: any[]) => {
            const movilidadesConRelaciones: MovilidadConRelaciones[] = movilidades.map((m, index) => {
              const result = resultados[index] as any;
              const estudiantes = result.estudiantes || [];
              
              // Calcular dinámicamente solicitarAutorizacion basado en los estudiantes
              const tieneSolicitarAutorizacion = estudiantes.some((e: any) => e.solicitarAutorizacion === true);
              
              return {
                ...m,
                solicitarAutorizacion: tieneSolicitarAutorizacion, // Sobrescribir con el valor calculado
                estudiantes,
                autorizacionCancelada: false // Inicializar como no cancelada
              };
            });

            this.movilidades = movilidadesConRelaciones.filter(m =>
              m.estado === 'ACTIVO' && m.estudiantes.length > 0
            );
            this.movilidadesFiltradas = [...this.movilidades];

            this.calcularEstadisticas();
            this.loading = false;
            this.aplicarFiltros();
          },
          error: (err) => {
            console.error('Error cargando relaciones:', err);
            this.movilidades = [];
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error cargando movilidades:', err);
        this.loading = false;
      },
    });
  }

  aplicarFiltros(): void {
    this.movilidadesFiltradas = this.movilidades.filter(movilidad => {
      const nombreMatch = !this.filtroNombre ||
        movilidad.nombreMovilidad?.toLowerCase().includes(this.filtroNombre.toLowerCase());
      const tipoMatch = !this.filtroTipo || movilidad.tipoMovilidad?.nombre?.toLowerCase().includes(this.filtroTipo.toLowerCase());
      const modalidadMatch = !this.filtroModalidad || movilidad.modalidad?.id === this.filtroModalidad.id;

      // Filtro por fecha de inicio
      const fechaInicioMatch = !this.filtroFechaDesde ||
        (movilidad.fechaInicio && new Date(movilidad.fechaInicio) >= this.filtroFechaDesde);

      // Filtro por fecha de fin
      const fechaFinMatch = !this.filtroFechaHasta ||
        (movilidad.fechaFin && new Date(movilidad.fechaFin) <= this.filtroFechaHasta);

      return nombreMatch && tipoMatch && modalidadMatch && fechaInicioMatch && fechaFinMatch;
    });
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroTipo = '';
    this.filtroModalidad = null;
    this.filtroFechaDesde = null;
    this.filtroFechaHasta = null;
    this.aplicarFiltros();
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  calcularEstadisticas(): void {
    this.estadisticas.total = this.movilidades.length;
    this.estadisticas.totalEstudiantes = this.movilidades.reduce((total, m) => total + m.estudiantes.length, 0);
    this.estadisticas.activas = this.movilidades.length; // Todas son activas por el filtro automático
  }

  volverAlMenu(): void {
    this.router.navigate(['/app/inicio']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/app/inicio']);
    }
  }

  /**
   * Descarga un Excel con todos los estudiantes de todas las movilidades.
   */
  exportAllEstudiantesExcel(): void {
    this.loading = true;
    this.movilidadService.generateExcelEstudiantes().subscribe({
      next: (excelBlob: Blob) => {
        const url = window.URL.createObjectURL(excelBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movilidades-estudiantes.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Excel movilidades-estudiantes generado correctamente' });
      },
      error: (error) => {
        console.error('Error generando Excel all estudiantes:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar el Excel de estudiantes. Intente nuevamente.' });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
  editarMovilidad(movilidad: MovilidadConRelaciones): void {
    // same destination as other lists: open the generic movilidad form
    this.router.navigate(['/app/movilidad'], { queryParams: { id: movilidad.id } });
  }
  crearNuevaMovilidad(): void {
    // navegar al formulario general de movilidad en lugar del específico de estudiantes
    this.router.navigate(['/app/movilidad']);
  }
  verDetalle(movilidad: MovilidadConRelaciones): void {
    this.router.navigate(['/app/movilidad-estudiante-edit'], { queryParams: { id: movilidad.id, readonly: true } });
  }

  verEstudiantes(movilidad: MovilidadConRelaciones): void {
    this.movilidadSeleccionada = movilidad;
    this.mostrarModalEstudiantes = true;
    this.estudiantesParaMostrar = movilidad.estudiantes.map(e => ({
      idEstudiante: e.idEstudiante,
      nombre: e.nombre,
      semestre: e.semestre,
      fechaInicio: e.fechaInicio,
      fechaFin: e.fechaFin,
      periodo: 0 
    }));
    const identificaciones = movilidad.estudiantes.map(e => e.idEstudiante);
    this.api.getByIdEstudiantes(identificaciones).subscribe(estudiantes => {
      if (estudiantes && estudiantes.length > 0) {
        this.estudiantesParaMostrar = estudiantes;
      }
    });
  }

  eliminarEstudiante(e: Estudiante): void {
    if (!e.id) return;

    const movilidadId = this.movilidadSeleccionada?.id || this.movilidades.find(m => m.estudiantes.some(st => st.id === e.id))?.id;

    this.estudianteService.delete(e.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estudiante eliminado' });

        // Actualizar UI inmediatamente si la movilidad está abierta en el modal
        if (movilidadId && this.movilidadSeleccionada && this.movilidadSeleccionada.id === movilidadId) {
          this.movilidadSeleccionada.estudiantes = this.movilidadSeleccionada.estudiantes.filter(st => st.id !== e.id);
        }

        // Si no conseguimos movilidadId, recargar la lista y salir
        if (!movilidadId) {
          this.cargarMovilidadesEstudiantes();
          return;
        }

        // Comprobar estudiantes restantes para decidir si hay que limpiar el flag en BD
        this.estudianteService.getByMovilidad(movilidadId).subscribe({
          next: (remainingStudents: any[]) => {
            const anySolicitar = remainingStudents.some((s: any) => s.solicitarAutorizacion === true);

            if (!anySolicitar) {
              // Ningún estudiante restante solicita autorización -> persistir false en backend
              this.estudianteService.updateAutorizacionForMovilidad(movilidadId, false).subscribe({
                next: () => {
                  // Actualizar estado local y forzar refresco
                  const idx = this.movilidades.findIndex(m => m.id === movilidadId);
                  if (idx >= 0) {
                    this.movilidades[idx].solicitarAutorizacion = false;
                    this.movilidades[idx].estudiantes = remainingStudents;
                  }

                  if (this.movilidadSeleccionada && this.movilidadSeleccionada.id === movilidadId) {
                    this.movilidadSeleccionada.solicitarAutorizacion = false;
                    this.movilidadSeleccionada.estudiantes = remainingStudents;
                  }

                  this.movilidadEstadoService.notificarMovilidadActualizada(movilidadId);
                  this.cargarMovilidadesEstudiantes();
                },
                error: () => {
                  // No bloquear UX si falla la persistencia; recargar para mantener coherencia visual
                  this.cargarMovilidadesEstudiantes();
                }
              });
            } else {
              // Aún hay estudiantes solicitando -> sólo recargar la lista
              this.cargarMovilidadesEstudiantes();
            }
          },
          error: () => {
            this.cargarMovilidadesEstudiantes();
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar estudiante' });
      }
    });
  }

  getEstudianteParaEliminar(e: EstudiantesOracle): Estudiante | null {
    if (!this.movilidadSeleccionada || !this.movilidadSeleccionada.estudiantes) return null;
    return this.movilidadSeleccionada.estudiantes.find(est => est.idEstudiante === e.idEstudiante) || null;
  }

  confirmarEliminar(movilidad: MovilidadConRelaciones): void {
    this.confirmationService.confirm({
      message: `¿Eliminar todos los estudiantes de la movilidad "${movilidad.nombreMovilidad}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      accept: () => this.eliminarMovilidad(movilidad.id)
    });
  }

  async eliminarMovilidad(id: string): Promise<void> {
    try {
      await this.movilidadService.deleteMovilidadWithRelations(id).toPromise();

      // Asegurar que el flag solicitarAutorizacion en participantes quede en false
      // (backend normalmente eliminará las relaciones, pero forzamos la sincronización por seguridad)
      this.estudianteService.updateAutorizacionForMovilidad(id, false).subscribe({
        next: () => {},
        error: () => {}
      });
      if (this.movilidadSeleccionada && this.movilidadSeleccionada.id === id) {
        this.movilidadSeleccionada = null;
        this.estudiantesParaMostrar = [];
      }

      this.movilidades = this.movilidades.filter(m => m.id !== id);
      this.movilidadesFiltradas = [...this.movilidades];
      this.movilidadEstadoService.notificarMovilidadActualizada(id);

      this.cargarMovilidadesEstudiantes();
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'La movilidad ha sido eliminada completamente' });
    } catch (error) {
      console.error('Error al eliminar movilidad:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Hubo un problema al eliminar la movilidad' });
    }
  }

  async generarPDF(movilidad: MovilidadConRelaciones): Promise<void> {
    if (!movilidad.id) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se puede generar PDF: movilidad sin ID' 
      });
      return;
    }

    try {
      this.loading = true;
            this.movilidadService.generatePdf(movilidad.id).subscribe({
        next: (pdfBlob: Blob) => {
          const url = window.URL.createObjectURL(pdfBlob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `movilidad-${movilidad.nombreMovilidad?.replace(/[^a-zA-Z0-9]/g, '-') || 'sin-nombre'}.pdf`;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error generando PDF:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al generar el PDF. Intente nuevamente.'
          });
        },
        complete: () => {
          this.loading = false;
        }
      });
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el PDF. Intente nuevamente.'
      });
      this.loading = false;
    }
  }

  /**
   * Descargar Excel generado por backend, similar a la lógica de PDF
   */
  async generarExcel(movilidad: MovilidadConRelaciones): Promise<void> {
    if (!movilidad.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede generar Excel: movilidad sin ID'
      });
      return;
    }

    try {
      this.loading = true;
      this.movilidadService.generateExcel(movilidad.id).subscribe({
        next: (excelBlob: Blob) => {
          const url = window.URL.createObjectURL(excelBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `movilidad-${movilidad.nombreMovilidad?.replace(/[^a-zA-Z0-9]/g, '-') || 'sin-nombre'}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error generando Excel:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al generar el Excel. Intente nuevamente.'
          });
        },
        complete: () => {
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('Error generando Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el Excel. Intente nuevamente.'
      });
      this.loading = false;
    }
  }

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



  private actualizarEstadoSolicitarAutorizacion(movilidadesAprobadas: any[]): void {
    const idsAprobadas = new Set(movilidadesAprobadas.map(m => m.movilidadId));
    
    this.movilidades.forEach(movilidad => {
      const estabaAprobada = movilidad.solicitarAutorizacion;
      const ahoraAprobada = idsAprobadas.has(movilidad.id);
      
      // Solo cambiar cuando pasa de false -> true (no revertir true->false)
      if (!estabaAprobada && ahoraAprobada) {
        movilidad.solicitarAutorizacion = true;
        // Forzar actualización de la vista
        this.movilidadesFiltradas = [...this.movilidadesFiltradas];
      }
    });
  }

  verAutorizaciones(movilidad: MovilidadConRelaciones): void {
    this.router.navigate(['/app/autorizacion'], { queryParams: { movilidadId: movilidad.id } });
  }


}