import { Component, OnInit, inject, signal, computed, DestroyRef, effect, untracked } from '@angular/core';
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
import { ConfirmationService, MessageService } from 'primeng/api';
import type { ButtonSeverity } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { forkJoin, from } from 'rxjs';
import { concatMap, toArray, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { MovilidadPostulanteService } from '../../../core/services/movilidad-postulante.service';
import { MovilidadService } from '../../../core/services/movilidad.service';
import { ModalidadService } from '../../../core/services/modalidad.service';
import { Movilidad } from '../../../core/models/movilidad.model';
import { Modalidad } from '../../../core/models/modalidad.model';
import { PostulanteService } from '../../../core/services/postulante.service';
import { Postulante } from '../../../core/models/postulante.model';
import { ApoyoEconomicoService } from '../../../core/services/apoyo-economico.service';
import { ApoyoEconomico } from '../../../core/models/apoyo-economico.model';
import { RubroPresupuestalService } from '../../../core/services/rubro-presupuestal.service';
import { RubroPresupuestal } from '../../../core/models/rubros-presupuestales.model';
import { ActividadesAsignadasService } from '../../../core/services/actividades-asignadas.service';
import { ActividadAsignada } from '../../../core/models/actividades-asignadas.model';
import { ProductosCompromisosService } from '../../../core/services/productos-compromisos.service';
import { ProductosCompromisos } from '../../../core/models/productos-compromisos.model';
import { EstudianteService } from '../../../core/services/estudiante.service';
import { Estudiante } from '../../../core/models/estudiante.model';
import { UsuariosOracleService } from '../../../core/services/usuarios-oracle.service';
import { UsuarioOracle } from '../../../core/models/usuarios-oracle.model';
import { Opcion } from '../../../core/models/opcion.model';
import { InfoTableComponent, TableColumn, TableAction, InputComponent, SelectComponent, DatepickerComponent, SelectOption } from '@microfrontends/shared-ui';
import { AutorizacionService } from '../../../core/services/autorizacion.service';
import { AprobacionNivel } from '../../../core/models/autorizacion.model';
import { ProgramaService } from '../../../core/services/programas.service';
import { MovilidadEstadoService, MovilidadAgrupada } from '../../../core/services/movilidad-estado.service';
import { InternacionalizacionRealtimeService } from '../../../core/services/internacionalizacion-realtime.service';

interface MovilidadConRelaciones extends Movilidad {
  postulantes: Postulante[];
  estudiantes: Estudiante[];
  apoyosEconomicos: ApoyoEconomico[];
  rubrosPresupuestales: RubroPresupuestal[];
  actividadesAsignadas: ActividadAsignada[];
  productosCompromisos: ProductosCompromisos[];
  solicitarAutorizacion?: boolean;
  autorizacionCancelada?: boolean; // Nuevo campo para rastrear si fue cancelada
  movilidadPostulanteId?: string;
}

@Component({
  selector: 'app-movilidad-saliente-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TableModule, ButtonModule, CardModule, BadgeModule, ConfirmDialogModule, ToastModule, DialogModule, SelectModule, InfoTableComponent, InputComponent, SelectComponent, DatepickerComponent],
  providers: [ConfirmationService, MessageService],
  templateUrl: './movilidadSaliente-list-component.html',
})
export class MovilidadSalienteListComponent implements OnInit {
  private readonly movilidadPostulanteService = inject(MovilidadPostulanteService);
  private readonly movilidadService = inject(MovilidadService);
  private readonly postulanteService = inject(PostulanteService);
  private readonly apoyoEconomicoService = inject(ApoyoEconomicoService);
  private readonly rubroPresupuestalService = inject(RubroPresupuestalService);
  private readonly actividadesService = inject(ActividadesAsignadasService);
  private readonly productosService = inject(ProductosCompromisosService);
  private readonly estudianteService = inject(EstudianteService);
  private readonly api = inject(UsuariosOracleService);
  private readonly programaService = inject(ProgramaService);
  private readonly modalidadService = inject(ModalidadService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly movilidadEstadoService = inject(MovilidadEstadoService);
  private readonly autorizacionService = inject(AutorizacionService);

  movilidades: MovilidadConRelaciones[] = [];
  loading = false;
  expandedRows: { [key: string]: boolean } = {};
  movilidadSeleccionada: MovilidadConRelaciones | null = null;
  mostrarModalPostulantes = false;
  postulantesParaMostrar: UsuarioOracle[] = [];

  // Estadísticas para las cards
  estadisticas = {
    total: 0,
    totalPostulantes: 0,
    activas: 0
  };

  // Propiedades para filtros
  filtroNombre = '';
  filtroModalidad: Modalidad | null = null; // Cambiado de string a Modalidad
  filtroFechaDesde: Date | null = null;
  filtroFechaHasta: Date | null = null;
  movilidadesFiltradas: MovilidadConRelaciones[] = [];
  mostrarFiltros = false;

  // Opciones para filtros
  opcionesModalidad: SelectOption[] = []; // will hold {label,value} entries for component
  modalidadesBase: SelectOption[] = []; // master list used when filtering by tipo

  filtroFacultad = signal<string>('');
  filtroPrograma = signal<string>('');
  facultades = signal<Opcion[]>([]);
  programas = signal<any[]>([]);
  programasFiltrados = signal<Opcion[]>([]);

  // Opciones únicas para filtros
  opcionesFacultad = computed<Opcion[]>(() => {
    return this.facultades();
  });

  opcionesPrograma = computed<Opcion[]>(() => {
    return this.programasFiltrados();
  });

  // Configuración de la tabla reutilizable
  columns: TableColumn[] = [
    { field: 'nombreMovilidad', header: 'Nombre Movilidad', sortable: true },
    { field: 'modalidad', header: 'Modalidad', sortable: false, type: 'custom' },
    // nueva columnas de información académica
    { field: 'facultad', header: 'Facultad', sortable: true, type: 'custom' },
    { field: 'programa', header: 'Programa', sortable: true, type: 'custom' },
    { field: 'fechaInicio', header: 'Fecha Inicio', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' },
    { field: 'fechaFin', header: 'Fecha Fin', sortable: true, type: 'date', dateFormat: 'dd/MM/yyyy' },
    { field: 'apoyosEconomicos', header: 'Apoyos', sortable: false, type: 'custom' },
    { field: 'rubrosPresupuestales', header: 'Rubros', sortable: false, type: 'custom' },
    { field: 'actividadesAsignadas', header: 'Actividades', sortable: false, type: 'custom' },
    { field: 'productosCompromisos', header: 'Productos', sortable: false, type: 'custom' }
  ];

  actions: TableAction[] = [
    { icon: 'pi pi-file-pdf', label: '', tooltip: 'Generar PDF', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.generarPDF(row) },
    { icon: 'pi pi-pencil', label: '', tooltip: 'Editar movilidad', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.editarMovilidad(row) },
    { icon: 'pi pi-users', label: '', tooltip: 'Ver postulantes', severity: 'info', styleClass: 'text-blue-500', onClick: (row: any) => this.verPostulantes(row) },
    { icon: 'pi pi-check-circle', label: '', tooltip: 'Ver Autorizaciones', severity: 'success', styleClass: 'text-green-500', onClick: (row: any) => this.verAutorizaciones(row) },
    { icon: 'pi pi-trash', label: '', tooltip: 'Eliminar movilidad', severity: 'danger', styleClass: 'text-red-500', onClick: (row: any) => this.confirmarEliminar(row) }
  ];

  private readonly realtimeService = inject(InternacionalizacionRealtimeService);

  constructor() {
    // ⚡ Effect para detectar cambios en tiempo real (SSE)
    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          const movilidad = this.realtimeService.movilidadActualizada();
          if (movilidad) {
            this.messageService.add({
              severity: 'info',
              summary: 'Movilidad actualizada',
              detail: movilidad.message || 'Se ha detectado un cambio en movilidades',
              life: 4000
            });
            this.realtimeService.resetSignal('movilidad');
          }
          this.cargarMovilidadesSalientes();
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarFacultades();
    this.cargarProgramas();
    this.cargarModalidades();
    this.cargarMovilidadesSalientes();
    
    // Suscribirse a cambios en movilidades aprobadas para actualizar el estado de solicitarAutorizacion
    this.movilidadEstadoService.movilidadesAprobadas$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((movilidadesAprobadas: MovilidadAgrupada[]) => {
        this.actualizarEstadoSolicitarAutorizacion(movilidadesAprobadas);
      });
  }

  cargarMovilidadesSalientes(): void {
    this.loading = true;
    // Cargar solo las movilidades que están referenciadas desde MovilidadPostulante
    this.movilidadPostulanteService.getMovilidadesFromPostulantes().subscribe({
      next: (movilidades) => {
        if (!movilidades || movilidades.length === 0) {
          this.movilidades = [];
          this.loading = false;
          return;
        }

        const observablesPorMovilidad = movilidades.map(m => {
          const movilidadId = m.id!;
          return forkJoin({
            movilidad: this.movilidadService.getByIdOrNull(movilidadId),
            // la nueva variante ya devuelve null en 404 y no dispara errores globales
            postulantes: this.postulanteService.getByMovilidad(movilidadId).pipe(
              catchError(err => {
                console.error(`Error cargando postulantes para movilidad ${movilidadId}:`, err);
                return of([]);
              })
            ),
            estudiantes: this.estudianteService.getByMovilidad(movilidadId).pipe(
              catchError(err => {
                console.error(`Error cargando estudiantes para movilidad ${movilidadId}:`, err);
                return of([]);
              })
            ),
            apoyosEconomicos: this.apoyoEconomicoService.getByMovilidadId(movilidadId).pipe(
              catchError(err => {
                console.error(`Error cargando apoyos económicos para movilidad ${movilidadId}:`, err);
                return of([]);
              })
            ),
            rubrosPresupuestales: this.rubroPresupuestalService.getByMovilidadId(movilidadId).pipe(
              catchError(err => {
                console.error(`Error cargando rubros presupuestales para movilidad ${movilidadId}:`, err);
                return of([]);
              })
            ),
            actividadesAsignadas: this.actividadesService.getActividadesByMovilidad(movilidadId).pipe(
              catchError(err => {
                console.error(`Error cargando actividades para movilidad ${movilidadId}:`, err);
                return of([]);
              })
            ),
            productosCompromisos: this.productosService.getProductosByMovilidad(movilidadId).pipe(
              catchError(err => {
                console.error(`Error cargando productos para movilidad ${movilidadId}:`, err);
                return of([]);
              })
            ),
            aprobacionesNiveles: this.autorizacionService.getAprobacionesPorMovilidad(movilidadId).pipe(
              catchError(() => of([]))
            )
          });
        });

        forkJoin(observablesPorMovilidad).subscribe({
          next: (resultados) => {
            this.movilidades = movilidades.map((m, index) => {
              const postulantes = resultados[index].postulantes || [];
              const movilidad = resultados[index].movilidad;
              if (!movilidad) return null;
              return {
                ...movilidad,
                postulantes: postulantes,
                estudiantes: resultados[index].estudiantes || [],
                apoyosEconomicos: resultados[index].apoyosEconomicos || [],
                rubrosPresupuestales: resultados[index].rubrosPresupuestales || [],
                actividadesAsignadas: resultados[index].actividadesAsignadas || [],
                productosCompromisos: resultados[index].productosCompromisos || [],
                solicitarAutorizacion: postulantes.some((p: any) => p.solicitarAutorizacion === true),
                autorizacionesAprobadas: (resultados[index].aprobacionesNiveles as AprobacionNivel[] || []).some((a: AprobacionNivel) => a.estado === 'aprobado'),
                autorizacionCancelada: false, // Inicializar como no cancelada
                movilidadPostulanteId: m.id
              } as MovilidadConRelaciones;
            }).filter((m): m is MovilidadConRelaciones =>
              m !== null && m.estado === 'ACTIVO' // incluir también aquellas con estudiantes
            );

            this.aplicarFiltros();
            this.calcularEstadisticas();
            this.loading = false;
          },
          error: (err) => {
            console.error('Error cargando relaciones:', err);
            this.movilidades = [];
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error cargando movilidades desde MovilidadPostulante:', err);
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    const facultadFiltro = this.filtroFacultad();
    const programaFiltro = this.filtroPrograma();

    this.movilidadesFiltradas = this.movilidades.filter(movilidad => {
      const nombreMatch = !this.filtroNombre ||
        movilidad.nombreMovilidad?.toLowerCase().includes(this.filtroNombre.toLowerCase());
      const tipoMatch = true; // tipo filter removed
      const modalidadMatch = !this.filtroModalidad || movilidad.modalidad?.id === this.filtroModalidad.id;

      // filtros nuevos
      const facultadMatch = !facultadFiltro || String(movilidad.facultad) === String(facultadFiltro);
      const programaMatch = !programaFiltro || String(movilidad.programa) === String(programaFiltro);

      // Filtro por fecha de inicio
      const fechaInicioMatch = !this.filtroFechaDesde ||
        (movilidad.fechaInicio && new Date(movilidad.fechaInicio) >= this.filtroFechaDesde);

      // Filtro por fecha de fin
      const fechaFinMatch = !this.filtroFechaHasta ||
        (movilidad.fechaFin && new Date(movilidad.fechaFin) <= this.filtroFechaHasta);

      return nombreMatch && tipoMatch && modalidadMatch && facultadMatch && programaMatch && fechaInicioMatch && fechaFinMatch;
    });
  }

  calcularEstadisticas(): void {
    this.estadisticas.total = this.movilidades.length;
    this.estadisticas.totalPostulantes = this.movilidades.reduce((total, m) => total + m.postulantes.length, 0);
    this.estadisticas.activas = this.movilidades.filter(m => m.estado === 'ACTIVO').length;
  }

  /**
   * Actualiza el estado de solicitarAutorizacion basado en la lista de movilidades aprobadas
   */
  private actualizarEstadoSolicitarAutorizacion(movilidadesAprobadas: any[]): void {
    const idsAprobadas = new Set(movilidadesAprobadas.map(m => m.movilidadId));
    
    this.movilidades.forEach(movilidad => {
      const estabaAprobada = movilidad.solicitarAutorizacion;
      const ahoraAprobada = idsAprobadas.has(movilidad.id);
      
      if (estabaAprobada !== ahoraAprobada) {
        movilidad.solicitarAutorizacion = ahoraAprobada;
        // Forzar actualización de la vista
        this.movilidadesFiltradas = [...this.movilidadesFiltradas];
      }
    });
  }



  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroModalidad = null;
    this.filtroFechaDesde = null;
    this.filtroFechaHasta = null;
    this.aplicarFiltros();
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

  editarMovilidad(movilidad: MovilidadConRelaciones): void {
    // same behaviour as regular movilidad list: open the main mobility form
    this.router.navigate(['/app/movilidad'], { queryParams: { id: movilidad.id } });
  }

  crearNuevaMovilidad(): void {
    // Redirigir al formulario general de movilidad en lugar del editor de salientes
    this.router.navigate(['/app/movilidad']);
  }

  verDetalle(movilidad: MovilidadConRelaciones): void {
    this.router.navigate(['/app/movilidad-saliente-edit'], { queryParams: { id: movilidad.id, readonly: true } });
  }

  verAutorizaciones(movilidad: MovilidadConRelaciones): void {
    this.router.navigate(['/app/autorizacion'], { queryParams: { movilidadId: movilidad.id } });
  }



  getBotonSeverity(movilidad: MovilidadConRelaciones): 'success' | 'danger' {
    return movilidad?.solicitarAutorizacion ? 'danger' : 'success';
  }

  verPostulantes(movilidad: MovilidadConRelaciones): void {
    this.movilidadSeleccionada = movilidad;
    this.mostrarModalPostulantes = true;
    // Precargar con datos de Postulante
    this.postulantesParaMostrar = movilidad.postulantes.map(p => ({
      tipoIdentificacion: p.usuarioOracle?.tipoIdentificacion || '',
      numIdentificacion: p.numIdentificacion,
      nombres: p.nombres,
      apellidos: p.apellidos,
      programa: p.programa,
      vinculacion: p.vinculacion
    } as UsuarioOracle));
    // Cargar datos completos de Oracle
    const identificaciones = movilidad.postulantes.map(p => p.numIdentificacion);
    this.api.getByIdentificaciones(identificaciones).subscribe((usuarios: UsuarioOracle[]) => {
      if (usuarios && usuarios.length > 0) {
        this.postulantesParaMostrar = usuarios;
      }
    });
  }

  getFacultadNombre(id?: string): string {
    if (!id) return '';
    const op = this.facultades().find(f => String(f.value) === String(id));
    return op?.label || id;
  }

  getProgramaNombre(id?: string): string {
    if (!id) return '';
    const prog = this.programas().find(p => String(p.id) === String(id));
    return prog?.nombre || id;
  }

  eliminarPostulante(p: Postulante): void {
    if (!p.id) return;
    this.postulanteService.delete(p.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Postulante eliminado' });
        this.cargarMovilidadesSalientes();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar postulante' });
      }
    });
  }
    
  getPostulanteParaEliminar(p: UsuarioOracle): Postulante | null {
    if (!this.movilidadSeleccionada || !this.movilidadSeleccionada.postulantes) return null;
    return this.movilidadSeleccionada.postulantes.find(post => post.numIdentificacion === p.numIdentificacion) || null;
  }
    
  confirmarEliminar(movilidad: MovilidadConRelaciones): void {
    this.confirmationService.confirm({
      message: `¿Eliminar todos los datos asociados a la movilidad saliente "${movilidad.nombreMovilidad}"? Se eliminarán completamente todos los postulantes, apoyos económicos, rubros presupuestales, actividades asignadas, productos/compromisos y archivos asociados.`,
      header: 'Confirmar eliminación',
      accept: () => this.eliminarMovilidad(movilidad.id)
    });
  }

  async eliminarMovilidad(id: string): Promise<void> {
    try {
      // Eliminar postulantes y sus relaciones
      await this.movilidadPostulanteService.deleteByMovilidadId(id).toPromise();

      // Eliminar actividades asignadas
      await this.actividadesService.deleteByMovilidadId(id).toPromise();

      // Eliminar apoyos económicos
      await this.apoyoEconomicoService.deleteByMovilidadId(id).toPromise();

      // Eliminar productos compromisos
      await this.productosService.deleteByMovilidadId(id).toPromise();

      // Eliminar rubros presupuestales
      await this.rubroPresupuestalService.deleteByMovilidadId(id).toPromise();

      // Remover la movilidad de la lista local inmediatamente
      this.movilidades = this.movilidades.filter(m => m.id !== id);
      this.movilidadesFiltradas = this.movilidadesFiltradas.filter(m => m.id !== id);

      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Datos asociados a la movilidad eliminados completamente.' });
    } catch (error) {
      console.error('Error al eliminar:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar la movilidad y sus relaciones' });
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
      
      // Llamar al backend para generar el PDF
      this.movilidadService.generatePdf(movilidad.id).subscribe({
        next: (pdfBlob: Blob) => {
          // Crear URL temporal para el blob
          const url = window.URL.createObjectURL(pdfBlob);
          
          // Crear enlace temporal para descargar
          const link = document.createElement('a');
          link.href = url;
          link.download = `movilidad-${movilidad.nombreMovilidad?.replace(/[^a-zA-Z0-9]/g, '-') || 'sin-nombre'}.pdf`;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Limpiar
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'PDF generado correctamente'
          });
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

  generarExcel(movilidad: MovilidadConRelaciones): void {
    if (!movilidad.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede generar Excel: movilidad sin ID'
      });
      return;
    }

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
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Excel generado correctamente' });
      },
      error: (error) => {
        console.error('Error generando Excel:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar el Excel. Intente nuevamente.' });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  exportAllExcel(): void {
    this.loading = true;
    this.movilidadService.generateExcelSalientes().subscribe({
      next: (excelBlob: Blob) => {
        const url = window.URL.createObjectURL(excelBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movilidades-salientes.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Excel movilidades, generado correctamente' });
      },
      error: (error) => {
        console.error('Error generando Excel salientes:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar el Excel de movilidades salientes. Intente nuevamente.' });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  onFiltroFacultadChange(event: any): void {
    const facultadId = event.value || '';
    this.filtroFacultad.set(facultadId);
    this.filtrarProgramasPorFacultad(facultadId);

    // Resetear programa si no pertenece a la facultad seleccionada
    const programaActual = this.filtroPrograma();
    if (programaActual && facultadId) {
      const programa = this.programas().find(p => String(p.id).trim() === programaActual);
      if (programa && String(programa.idFacultad).trim() !== facultadId) {
        this.filtroPrograma.set('');
      }
    }

    this.aplicarFiltros();
  }

  onFiltroProgramaChange(event: any): void {
    this.filtroPrograma.set(event.value || '');
    this.aplicarFiltros();
  }


  private cargarFacultades(): void {
    this.programaService.getAllFacultades()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: {id: string, nombre: string}[]) => {
        // Filtrar cualquier facultad que contenga "todas" en el nombre (case insensitive)
        const facultadesFiltradas = data.filter((f: {id: string, nombre: string}) => 
          !f.nombre?.toLowerCase().includes('todas')
        );
        this.facultades.set(facultadesFiltradas.map((f: {id: string, nombre: string}) => ({ label: f.nombre, value: f.id })));
      });
  }

  private cargarProgramas(): void {
    this.programaService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: {id: string, nombre: string, idFacultad: string}[]) => {
        // Filtrar cualquier programa que contenga "todos" en el nombre (case insensitive)
        const programasFiltrados = data.filter((p: {id: string, nombre: string, idFacultad: string}) => 
          !p.nombre?.toLowerCase().includes('todos')
        );
        this.programas.set(programasFiltrados);
        this.actualizarProgramasFiltrados();
      });
  }

  private cargarModalidades(): void {
    this.modalidadService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: Modalidad[]) => {
        // convert to select options, ignoring entries without nombre
        const opts = data
          .filter(m => m && m.nombre)
          .map(m => ({ label: m.nombre, value: m.id }));
        this.modalidadesBase = opts;
        this.opcionesModalidad = opts;
      });
  }

  private filtrarProgramasPorFacultad(facultadId: string): void {
    const programas = this.programas();
    const opciones = facultadId
      ? programas.filter(p => p.idFacultad === facultadId)
      : programas;

    // Eliminar duplicados basados en el nombre
    const visto = new Set<string>();
    const sinDuplicados = opciones
      .filter(p => {
        if (visto.has(p.nombre)) {
          return false;
        }
        visto.add(p.nombre);
        return true;
      })
      .map(p => ({ label: p.nombre, value: p.id }));

    this.programasFiltrados.set(sinDuplicados);
  }

  private actualizarProgramasFiltrados(): void {
    const programas = this.programas();
    const opciones = programas.map(p => ({ label: p.nombre, value: p.id }));
    
    // Eliminar duplicados basados en el nombre
    const visto = new Set<string>();
    const sinDuplicados = opciones.filter(o => {
      if (visto.has(o.label)) {
        return false;
      }
      visto.add(o.label);
      return true;
    });
    
    this.programasFiltrados.set(sinDuplicados);
  }

  /**
   * Reduce the modalidad options based on current tipo filter and available movilidades.
   * If no tipo is selected the master list is restored.
   */
}
