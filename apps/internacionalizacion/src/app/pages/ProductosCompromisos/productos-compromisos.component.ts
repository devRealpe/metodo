import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { InputComponent, SelectComponent, TextareaComponent, DatepickerComponent, InfoTableComponent, TableColumn, TableAction } from '@microfrontends/shared-ui';
import { ActivatedRoute } from '@angular/router';
import { ProductosCompromisosService } from '../../core/services/productos-compromisos.service';
import { ProductosCompromisos } from '../../core/models/productos-compromisos.model';
import { NotificationService } from '@microfrontends/shared-services';

@Component({
  selector: 'app-productos-compromisos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RadioButtonModule,
    ButtonModule,
    DatepickerComponent,
    InfoTableComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent
  ],
  templateUrl: './productos-compromisos.html'
})
export class ProductosCompromisosComponent implements OnInit, OnChanges {
  @Input() movilidadId?: string = '';
  @Input() productosParaEditar?: any[];
  @Input() showButtons: boolean = false;
  @Input() isEditMode: boolean = false;
  @Output() onSaved = new EventEmitter<any[]>();
  @Output() onChanged = new EventEmitter<any[]>();
  @Output() onError = new EventEmitter<string>();

  productos: any[] = [];
  productosOriginales: any[] = [];

  opcionesEstado = [
    { label: 'Sí', value: 'si' },
    { label: 'No', value: 'no' },
    { label: 'Pendiente', value: 'pendiente' }
  ];
  loading = signal<boolean>(false);
  error = signal<string | undefined>(undefined);

  nuevoProducto: any = {
    compromiso: '',
    fechaEntrega: null,
    estado: 'pendiente',
    observaciones: ''
  };

  showEditDialog: boolean = false;
  productoEditando: any = {};

  isEditing: boolean = false;
  productoEditandoIndex: number = -1;

  // Estado temporal para cambios pendientes
  private cambiosPendientes: {
    crear: any[],
    actualizar: { id: string, data: any }[],
    eliminar: string[]
  } = { crear: [], actualizar: [], eliminar: [] };

  // Configuración de la tabla reutilizable
  columns: TableColumn[] = [
    { field: 'compromiso', header: 'Compromisos', sortable: true },
    { field: 'fechaEntrega', header: 'Fecha de entrega de producto o actividad', sortable: true },
    { field: 'observaciones', header: 'Observaciones', sortable: true },
    { field: 'estadoFormateado', header: 'Verificación de cumplimiento', sortable: true, type: 'custom' }
  ];

  actions: TableAction[] = [
    { label: '', icon: 'pi pi-pencil', tooltip: 'Editar producto', onClick: (row: any) => this.editarProducto(row) },
    { label: '', icon: 'pi pi-trash', tooltip: 'Eliminar producto', onClick: (row: any) => this.eliminarProducto(row) }
  ];

  private productosService = inject(ProductosCompromisosService);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.inicializarComponente();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movilidadId'] && !changes['movilidadId'].firstChange) {
      this.handleMovilidadIdChange();
    }
    if (changes['productosParaEditar']) {
      this.handleProductosParaEditarChange();
    }
  }

  private inicializarComponente(): void {
    // Si no nos pasaron movilidadId via @Input, intentar leerlo de la ruta
    if (!this.movilidadId) {
      this.route.params.subscribe(params => {
        const id = params['movilidadId'];
        if (id) {
          this.movilidadId = id;
          this.loadProductos();
        }
      });
    } else {
      // Si ya tenemos movilidadId (por Input), cargar productos
      if (this.productosParaEditar && this.productosParaEditar.length > 0) {
        this.handleProductosParaEditarChange();
      } else {
        this.loadProductos();
      }
    }
  }

  private handleMovilidadIdChange(): void {
    const id = this.movilidadId;
    if (!id) return;
    // Don't reload from the server if there are locally added products
    // that haven't been saved yet — they would be wiped by the empty response
    if (this.cambiosPendientes.crear.length > 0) return;
    this.loadProductos();
  }

  private handleProductosParaEditarChange(): void {
    if (this.productosParaEditar && this.productosParaEditar.length > 0) {
      this.productos = this.productosParaEditar.map(p => ({
        ...p,
        fechaEntrega: this.convertirDateStringAFecha(p.fechaEntrega || ''),
        estadoFormateado: this.formatearEstado(p.estado)
      }));
      this.productosOriginales = [...this.productos];
    }
  }

  loadProductos(): void {
    if (!this.movilidadId) return;

    this.loading.set(true);

    this.productosService.getProductosByMovilidad(this.movilidadId!).subscribe({
      next: (data) => this.manejarCargaExitosa(data),
    });
  }

  private manejarCargaExitosa(data: any[]): void {
    this.productos = data.length > 0 ? data.map(p => ({
      ...p,
      fechaEntrega: this.convertirDateStringAFecha(p.fechaEntrega || ''),
      estadoFormateado: this.formatearEstado(p.estado)
    })) : this.getDefaultProductos();
    this.productosOriginales = [...this.productos];
    this.loading.set(false);
  }

  private manejarErrorEnCarga(error: any): void {
    this.manejarError('No se pudieron cargar los productos');
    this.productos = this.getDefaultProductos();
    this.loading.set(false);
  }

  getDefaultProductos(): any[] {
    return [];
  }

  public async actualizar(mostrarMensaje: boolean = true): Promise<void> {
    if (!this.validarMovilidad()) {
      throw new Error('No se ha especificado una movilidad');
    }

    if (!this.validarFormulario()) {
      throw new Error('El formulario no es válido');
    }

    try {
      this.loading.set(true);
      this.error.set(undefined);

      // Convertir fechas antes de guardar y limpiar campos UI-only (estadoFormateado, movilidad)
      // El backend toma movilidadId del path y no necesita el objeto movilidad en el body
      const productosParaGuardar = this.productos.map(({ estadoFormateado, movilidad, ...producto }) => ({
        ...producto,
        fechaEntrega: this.convertirFechaADateString(producto.fechaEntrega || '')
      }));

      // Guardar todos los productos (este servicio reemplaza todos los productos de la movilidad)
      const saved = await new Promise<ProductosCompromisos[]>((resolve, reject) => {
        this.productosService.saveProductos(this.movilidadId!, productosParaGuardar).subscribe({
          next: (result) => resolve(result),
          error: (error) => reject(error)
        });
      });

      // Actualizar el estado local con los productos guardados
      this.productos = saved.map(p => ({
        ...p,
        fechaEntrega: this.convertirDateStringAFecha(p.fechaEntrega || ''),
        estadoFormateado: this.formatearEstado(p.estado)
      }));
      this.productosOriginales = [...this.productos];

      // Limpiar cambios pendientes después del éxito
      this.cambiosPendientes = {
        crear: [],
        actualizar: [],
        eliminar: []
      };

      if (mostrarMensaje) {
        this.notificationService.showNotification('success', 'Productos actualizados correctamente');
      }
      this.onSaved.emit(saved);

    } catch (error: any) {
      console.error('Error al actualizar productos:', error);
      
      // Revertir cambios en caso de error
      this.revertirCambios();
      
      this.notificationService.showNotification('error', 'Error al actualizar los productos');
      this.onError.emit('Error al actualizar los productos');
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  private validarMovilidad(): boolean {
    if (!this.movilidadId) {
      this.manejarError('No se ha especificado una movilidad', false);
      this.notificationService.showNotification('warn', 'No se ha especificado una movilidad');
      return false;
    }
    return true;
  }

  private revertirCambios(): void {
    // Restaurar el estado original
    this.productos = [...this.productosOriginales];
    this.onChanged.emit(this.productos);
    
    // Limpiar cambios pendientes
    this.cambiosPendientes = {
      crear: [],
      actualizar: [],
      eliminar: []
    };
  }

  private manejarGuardadoExitoso(saved: any[]): void {
    this.productos = saved.map(p => ({
      ...p,
      fechaEntrega: this.convertirDateStringAFecha(p.fechaEntrega || ''),
      estadoFormateado: this.formatearEstado(p.estado)
    }));
    this.productosOriginales = [...this.productos];
    this.onSaved.emit(saved);
    this.loading.set(false);
  }

  private manejarErrorEnActualizacion(error: any): void {
    this.manejarError('No se pudieron actualizar los productos');
    this.onError.emit('Error al actualizar los productos');
    this.loading.set(false);
  }

  crearDefault(): void {
    if (!this.validarMovilidad()) {
      return;
    }

    this.ejecutarCrearDefault();
  }

  private ejecutarCrearDefault(): void {
    this.loading.set(true);

    this.productosService.createDefaultProductos(this.movilidadId!).subscribe({
      next: (data) => this.manejarCrearDefaultExitoso(data),
      error: (error) => this.manejarErrorCrearDefault(error)
    });
  }

  private manejarCrearDefaultExitoso(data: any[]): void {
    this.productos = data.map(p => ({
      ...p,
      fechaEntrega: this.convertirDateStringAFecha(p.fechaEntrega || ''),
      estadoFormateado: this.formatearEstado(p.estado)
    }));
    this.productosOriginales = [...this.productos];
    this.loading.set(false);
  }

  private manejarErrorCrearDefault(error: any): void {
    this.loading.set(false);
  }

  limpiarFormulario(): void {
    this.productos = this.getDefaultProductos();
    this.error.set(undefined);
  }

  cancelar(): void {
    this.productos = [...this.productosOriginales];
    this.error.set(undefined);
  }

  agregarProducto(): void {
    if (this.nuevoProducto.compromiso.trim()) {
      if (this.isEditing) {
        // Actualizar producto existente
        const productoActualizado = {
          ...this.nuevoProducto,
          estadoFormateado: this.formatearEstado(this.nuevoProducto.estado)
        };
        this.productos[this.productoEditandoIndex] = productoActualizado;
        
        // Agregar a cambios pendientes
        this.cambiosPendientes.actualizar.push(productoActualizado);
        
        this.cancelarEdicion();
      } else {
        // Agregar nuevo producto
        const productoConMovilidad = {
          ...this.nuevoProducto,
          movilidad: { id: this.movilidadId },
          estadoFormateado: this.formatearEstado(this.nuevoProducto.estado)
        };
        this.productos.push(productoConMovilidad);
        
        // Agregar a cambios pendientes
        this.cambiosPendientes.crear.push(productoConMovilidad);
        
        this.nuevoProducto = {
          compromiso: '',
          fechaEntrega: null,
          estado: 'pendiente',
          observaciones: ''
        };
      }
      this.onChanged.emit(this.productos);
    }
  }

  editarProducto(producto: any): void {
    this.productoEditandoIndex = this.productos.indexOf(producto);
    this.nuevoProducto = { ...producto, fechaEntrega: this.convertirFechaStringADate(producto.fechaEntrega) };
    this.isEditing = true;
  }

  cancelarEdicion(): void {
    this.isEditing = false;
    this.productoEditandoIndex = -1;
    this.nuevoProducto = {
      compromiso: '',
      fechaEntrega: null,
      estado: 'pendiente',
      observaciones: ''
    };
  }

  eliminarProducto(producto: any): void {
    // Marcar para eliminación en cambios pendientes
    this.cambiosPendientes.eliminar.push(producto);
    
    // Remover del array local inmediatamente (UI optimista)
    const index = this.productos.indexOf(producto);
    if (index > -1) {
      this.productos.splice(index, 1);
      this.onChanged.emit(this.productos);
    }
  }

  private validarFormulario(): boolean {
    return this.validarYReportarError(
      () => this.validarProductos(),
      'Todos los compromisos deben tener descripción'
    );
  }

  private validarProductos(): boolean {
    return this.productos.every(producto =>
      producto.compromiso?.trim()
    );
  }

  private manejarError(mensaje: string, mostrarNotificacion: boolean = true): void {
    this.error.set(mensaje);
    if (mostrarNotificacion) {
      this.notificationService.showNotification('error', mensaje);
    }
  }

  private validarYReportarError(validacion: () => boolean, mensajeError: string): boolean {
    if (!validacion()) {
      this.manejarError(mensajeError, false);
      return false;
    }
    return true;
  }

  // Métodos de conversión de fechas
  private convertirFechaADateString(fecha: any): string | undefined {
    if (!fecha) return undefined;
    if (fecha instanceof Date) {
      return fecha.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    if (typeof fecha === 'string') {
      // Asumir formato DD/MM/AAAA
      const partes = fecha.split('/');
      if (partes.length === 3) {
        const [dia, mes, anio] = partes;
        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      return fecha; // Si ya está en formato YYYY-MM-DD, devolver como está
    }
    return undefined;
  }

  private convertirFechaStringADate(fechaStr: string): Date | null {
    if (!fechaStr) return null;
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes;
      return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    }
    return null;
  }

  private convertirDateStringAFecha(fecha: any): string {
    if (!fecha) return '';
    if (fecha instanceof Date) {
      return fecha.toLocaleDateString('es-ES'); // DD/MM/YYYY
    }
    if (typeof fecha === 'string') {
      // Asumir formato YYYY-MM-DD y convertir a DD/MM/AAAA
      const partes = fecha.split('-');
      if (partes.length === 3) {
        const [anio, mes, dia] = partes;
        return `${dia}/${mes}/${anio}`;
      }
      return fecha; // Si ya está en formato DD/MM/AAAA, devolver como está
    }
    return '';
  }

  onEstadoChange(row: any): void {
    row.estadoFormateado = this.formatearEstado(row.estado);
    this.actualizar();
  }

  guardar(): void {
    this.actualizar();
  }

  formatearEstado(estado: string): string {
    switch (estado) {
      case 'si': return 'Sí';
      case 'no': return 'No';
      case 'pendiente': return 'Pendiente';
      default: return estado;
    }
  }
}