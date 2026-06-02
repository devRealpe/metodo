import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { InfoTableComponent, TableColumn, TableAction, InputComponent, TextareaComponent, SelectComponent } from '@microfrontends/shared-ui';
import { ActivatedRoute } from '@angular/router';
import { ActividadesAsignadasService } from '../../core/services/actividades-asignadas.service';
import { ActividadAsignada } from '../../core/models/actividades-asignadas.model';
import { ACTIVIDADES_ASIGNADAS_CONSTANTS } from '../../core/constants/actividades-asignadas.constants';
import { NotificationService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-actividades-asignadas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RadioButtonModule,
    ButtonModule,
    InfoTableComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent
  ],
  templateUrl: './actividadesAsignadas.html'
})
export class ActividadesAsignadasComponent implements OnInit, OnChanges {
  @Input() movilidadId?: string = '';
  @Input() relationshipId?: string = '';
  @Input() relationshipType: 'postulante' | 'estudiante' = 'postulante';
  @Input() isEditMode: boolean = false;
  @Input() actividadesParaEditar: ActividadAsignada[] | null = null;
  @Input() showButtons: boolean = true;
  @Output() onSaved = new EventEmitter<ActividadAsignada[]>();
  @Output() onChanged = new EventEmitter<ActividadAsignada[]>();
  @Output() onError = new EventEmitter<string>();

  actividades: ActividadAsignada[] = [];
  actividadesOriginales: ActividadAsignada[] = [];

  opcionesLabores = [
    { label: 'Investigación', value: 'investigación' },
    { label: 'Extensión', value: 'extensión' },
    { label: 'Docencia', value: 'docencia' }
  ];
  loading = signal<boolean>(false);
  error = signal<string | undefined>(undefined);
  modoEdicion = signal<boolean>(false);

  nuevaActividad: ActividadAsignada = {
    nombre: '',
    compromiso: '',
    verificacion: '',
    observaciones: '',
    estado: ACTIVIDADES_ASIGNADAS_CONSTANTS.ESTADO_PENDIENTE
  };

  isEditing: boolean = false;
  actividadEditandoIndex: number = -1;

  private cambiosPendientes: {
    crear: ActividadAsignada[],
    actualizar: { id: string, data: any }[],
    eliminar: string[]
  } = { crear: [], actualizar: [], eliminar: [] };

  // Configuración de la tabla reutilizable
  columns: TableColumn[] = [
    { field: 'nombre', header: ACTIVIDADES_ASIGNADAS_CONSTANTS.TABLE_HEADERS.NOMBRE, sortable: true },
    { field: 'compromiso', header: ACTIVIDADES_ASIGNADAS_CONSTANTS.TABLE_HEADERS.COMPROMISO, sortable: true, type: 'custom' },
    { field: 'verificacion', header: ACTIVIDADES_ASIGNADAS_CONSTANTS.TABLE_HEADERS.VERIFICACION, sortable: true, type: 'custom' },
    { field: 'observaciones', header: ACTIVIDADES_ASIGNADAS_CONSTANTS.TABLE_HEADERS.OBSERVACIONES, sortable: true, type: 'custom' },
    { field: 'estado', header: ACTIVIDADES_ASIGNADAS_CONSTANTS.TABLE_HEADERS.ESTADO, sortable: true, type: 'custom' }
  ];

  actions: TableAction[] = [
    { 
      label: ACTIVIDADES_ASIGNADAS_CONSTANTS.ACTIONS.EDITAR.LABEL, 
      icon: ACTIVIDADES_ASIGNADAS_CONSTANTS.ACTIONS.EDITAR.ICON, 
      tooltip: ACTIVIDADES_ASIGNADAS_CONSTANTS.ACTIONS.EDITAR.TOOLTIP, 
      onClick: (row: ActividadAsignada) => this.editarActividad(row) 
    },
    { 
      label: ACTIVIDADES_ASIGNADAS_CONSTANTS.ACTIONS.ELIMINAR.LABEL, 
      icon: ACTIVIDADES_ASIGNADAS_CONSTANTS.ACTIONS.ELIMINAR.ICON, 
      tooltip: ACTIVIDADES_ASIGNADAS_CONSTANTS.ACTIONS.ELIMINAR.TOOLTIP, 
      onClick: (row: ActividadAsignada) => this.eliminarActividad(row) 
    }
  ];

  private actividadesService = inject(ActividadesAsignadasService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.inicializarComponente();
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const key in changes) {
      switch (key) {
        case 'movilidadId':
          this.handleMovilidadIdChange();
          break;
        case 'actividadesParaEditar':
          this.handleActividadesParaEditarChange();
          break;
        case 'isEditMode':
          this.modoEdicion.set(this.isEditMode);
          break;
      }
    }
  }

  private inicializarComponente(): void {
    if (this.movilidadId) {
      this.loadActividades();
    } else {
      this.route.params.subscribe(params => {
        const id = params['movilidadId'];
        if (id) {
          this.movilidadId = id;
          this.loadActividades();
        }
      });
    }
  }

  private handleMovilidadIdChange(): void {
    if (!this.movilidadId) {
      return;
    }
    if (this.actividades && this.actividades.length > 0) {
      this.cambiosPendientes.crear = [...this.actividades];
    } else {
      this.loadActividades();
    }
  }

  private handleActividadesParaEditarChange(): void {
    if (this.isEditMode && this.actividadesParaEditar && this.actividadesParaEditar.length > 0) {
      this.actividades = [...this.actividadesParaEditar];
      this.actividadesOriginales = JSON.parse(JSON.stringify(this.actividadesParaEditar));
    }
  }

  loadActividades(): void {
    if (!this.movilidadId || this.movilidadId.trim() === '') {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(undefined);

    this.actividadesService.getActividadesByMovilidad(this.movilidadId!).subscribe({
      next: (data) => this.manejarCargaExitosa(data),
      error: (error) => {
        // Solo tratar como "no data" si es 404, otros errores son problemas reales
        if (error.status === 404) {
          this.manejarCargaExitosa([]);
        } else {
          this.manejarErrorEnCarga(error);
        }
      }
    });
  }

  private manejarCargaExitosa(data: ActividadAsignada[]): void {
    this.actividades = data;
    this.actividadesOriginales = [...this.actividades];
    this.modoEdicion.set(data.length > 0);
    this.loading.set(false);
  }

  private manejarErrorEnCarga(error: any): void {
    const mensajeError = error.status 
      ? `Error ${error.status}: ${error.statusText || 'Error al cargar actividades'}`
      : ACTIVIDADES_ASIGNADAS_CONSTANTS.MESSAGES.LOAD_ERROR;
    
    this.manejarError(mensajeError);
    this.actividades = [];
    this.loading.set(false);
  }

  onActividadChange(): void {
    this.onChanged.emit([...this.actividades]);
  }

  onEstadoChange(row: ActividadAsignada): void {
    this.onActividadChange();
  }

  guardarCambios(): void {
    // Guardar cambios automáticamente cuando se hace blur en los inputs
    this.actualizar(false); // false = no mostrar mensaje de éxito
  }

  agregarActividad(): void {
    const esValida = this.nuevaActividad.nombre.trim() && this.nuevaActividad.compromiso.trim();
    
    if (!esValida) {
      this.notificationService.showNotification('warn', 'Nombre y Compromiso son obligatorios');
      return;
    }

    if (this.isEditing) {
      this.actualizarActividadExistente();
    } else {
      this.crearNuevaActividad();
    }
    this.onActividadChange();
  }

  private actualizarActividadExistente(): void {
    const actividadActualizada = { ...this.nuevaActividad };
    const actividadOriginal = this.actividades[this.actividadEditandoIndex];
    
    this.actividades[this.actividadEditandoIndex] = actividadActualizada;
    
    if (actividadOriginal.id) {
      this.cambiosPendientes.actualizar.push({
        id: actividadOriginal.id,
        data: actividadActualizada
      });
    }
    
    this.cancelarEdicion();
  }

  private crearNuevaActividad(): void {
    const actividadNueva = {
      ...this.nuevaActividad,
      movilidad: this.movilidadId ? { id: this.movilidadId } : undefined
    };
    this.actividades = [...this.actividades, actividadNueva];
    this.cambiosPendientes.crear.push(actividadNueva);
    this.nuevaActividad = this.crearActividadVacia();
  }

  editarActividad(actividad: ActividadAsignada): void {
    const index = this.actividades.findIndex(a => 
      a.id ? a.id === actividad.id : a === actividad
    );
    
    if (index > -1) {
      this.actividadEditandoIndex = index;
      this.nuevaActividad = { ...actividad };
      this.isEditing = true;
    }
  }

  cancelarEdicion(): void {
    this.isEditing = false;
    this.actividadEditandoIndex = -1;
    this.nuevaActividad = this.crearActividadVacia();
  }

  eliminarActividad(actividad: ActividadAsignada): void {
    const index = this.actividades.findIndex(a => 
      a.id ? a.id === actividad.id : a === actividad
    );
    
    if (index > -1) {
      if (actividad.id) {
        this.cambiosPendientes.eliminar.push(actividad.id);
        this.cambiosPendientes.actualizar = this.cambiosPendientes.actualizar.filter(u => u.id !== actividad.id);
      } else {
        this.cambiosPendientes.crear = this.cambiosPendientes.crear.filter(a => a !== actividad);
      }
      this.actividades.splice(index, 1);
      this.onActividadChange();
    }
  }

  private crearActividadVacia(): ActividadAsignada {
    return {
      nombre: '',
      compromiso: '',
      verificacion: '',
      observaciones: '',
      estado: ACTIVIDADES_ASIGNADAS_CONSTANTS.ESTADO_PENDIENTE,
      movilidad: this.movilidadId ? { id: this.movilidadId } : undefined
    };
  }

  private manejarError(mensaje: string, mostrarNotificacion: boolean = true): void {
    this.error.set(mensaje);
    if (mostrarNotificacion) {
      this.notificationService.showNotification('error', mensaje);
    }
  }

  private hayCambiosPendientes(): boolean {
    return this.cambiosPendientes.crear.length > 0 ||
           this.cambiosPendientes.actualizar.length > 0 ||
           this.cambiosPendientes.eliminar.length > 0;
  }

  private limpiarCambiosPendientes(): void {
    this.cambiosPendientes = { crear: [], actualizar: [], eliminar: [] };
  }

  async actualizar(mostrarMensaje: boolean = true): Promise<void> {
    if (!this.hayCambiosPendientes()) {
      return Promise.resolve();
    }

    this.loading.set(true);
    this.error.set(undefined);

    try {
      await Promise.all([
        // Eliminar en paralelo solo IDs específicos
        ...this.cambiosPendientes.eliminar.map(id => 
          this.actividadesService.delete(id).toPromise()
        ),
        
        // Actualizar solo actividades modificadas
        ...this.cambiosPendientes.actualizar.map(({ id, data }) =>
          this.actividadesService.update(id, data).toPromise()
        ),
        
        // Crear solo actividades nuevas
        ...this.cambiosPendientes.crear.map(actividad =>
          this.relationshipType === 'postulante' 
            ? this.actividadesService.createForPostulante(this.relationshipId!, actividad).toPromise()
            : this.actividadesService.createForEstudiante(this.relationshipId!, actividad).toPromise()
        )
      ]);

      this.limpiarCambiosPendientes();
      this.loadActividades();

      if (mostrarMensaje) {
        this.notificationService.showNotification('success', ACTIVIDADES_ASIGNADAS_CONSTANTS.MESSAGES.SAVE_SUCCESS);
      }
      this.onSaved.emit(this.actividades);

    } catch (error: any) {
      // El servicio ya logueó el error HTTP, aquí solo manejamos la UI
      const mensajeError = error.status 
        ? `Error ${error.status}: ${error.statusText || error.message}`
        : ACTIVIDADES_ASIGNADAS_CONSTANTS.MESSAGES.SAVE_ERROR;
      
      this.manejarError(mensajeError);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
}