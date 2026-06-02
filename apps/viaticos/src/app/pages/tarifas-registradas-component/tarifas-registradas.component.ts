import { Component, OnInit, OnDestroy, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TarifasViaticosService, TarifaUbicacion } from '../../core/services/tarifas-viaticos.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ListaValor } from '../../core/models/lista-valor.model';
import { UbicacionesGeograficasService, UbicacionGeografica } from '../../core/services/ubicaciones-geograficas.service';
import { ViaticosRealtimeService } from '../../core/services/viaticos-realtime.service';

@Component({
  selector: 'app-tarifas-registradas.component',
  standalone: true,
  styles: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressSpinnerModule,
    TooltipModule,
    InputNumberModule,
    CheckboxModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tarifas-registradas.component.html',
  styleUrl: './tarifas-registradas.component.scss',
})
export class TarifasRegistradasComponent implements OnInit, OnDestroy {
  private tarifasService = inject(TarifasViaticosService);
  private listasValoresService = inject(ListasValoresService);
  private ubicacionesService = inject(UbicacionesGeograficasService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private realtimeService = inject(ViaticosRealtimeService);

  volverAInicio(): void {
    this.router.navigate(['/app/inicio']);
  }

  tarifas: TarifaUbicacion[] = [];
  tarifasFiltradas: TarifaUbicacion[] = [];
  tarifaSeleccionada: TarifaUbicacion | null = null;
  
  // Variables para gestión de años y cierre
  anioActual = new Date().getFullYear();
  aniosDisponibles: number[] = [];
  opcionesAnios: { label: string; value: number }[] = [];
  anioSeleccionado = this.anioActual;
  estadisticas: any = null;
  cargando = false;
  procesando = false;
  mostrarDialogoDetalle = false;
  mostrarDialogoEdicion = false;
  mostrarDialogoCreacion = false;
  
  fechaActual = new Date();
  
  // Variables para creación de tarifas
  tarifaNueva: TarifaUbicacion = this.crearTarifaVacia();
  paisSeleccionado = 'Colombia';
  departamentoSeleccionado = '';
  departamentos: UbicacionGeografica[] = [];
  departamentosOptions: { label: string; value: string }[] = [];
  municipios: UbicacionGeografica[] = [];
  municipiosOptions: { label: string; value: string }[] = [];
  loadingDepartamentos = false;
  loadingMunicipios = false;
  
  // Variables para edición de tarifas
  paisEdicion = '';
  paisIdEdicion = '';
  paisesEdicion: UbicacionGeografica[] = [];
  paisesEdicionOptions: { label: string; value: string }[] = [];
  departamentoEdicion = '';
  departamentoIdEdicion = '';
  departamentosEdicion: UbicacionGeografica[] = [];
  departamentosEdicionOptions: { label: string; value: string }[] = [];
  municipiosEdicionOptions: { label: string; value: string }[] = [];
  loadingPaisesEdicion = false;
  loadingDepartamentosEdicion = false;
  loadingMunicipiosEdicion = false;
  
  categoriasMap = new Map<string, string>();
  conceptosMap = new Map<string, string>();
  // ✅ Mapeos centralizados desde el backend
  categoriasMapBackend: Record<string, string> = {};
  conceptosTarifasMapBackend: Record<string, string> = {};
  tiposViaticosMapBackend: Record<string, string> = {};

  filtroForm: FormGroup;
  edicionForm: FormGroup;

  opcionesCategoria: { label: string; value: string }[] = [];
  opcionesConcepto: { label: string; value: string }[] = [];
  opcionesTipoTransporte: { label: string; value: string }[] = [];

  opcionesEstado: { label: string; value: boolean }[] = [];

  // Opciones para filtro de estado de cierre
  opcionesEstadoCierre: { label: string; value: boolean | null }[] = [];

  // Filtro de estado de cierre
  filtroEstadoCierre: boolean | null = null;

  // Maneja cambio en filtro de estado de cierre
  onEstadoCierreChange(event: any): void {
    this.filtroEstadoCierre = event.value;
    this.aplicarFiltros();
  }

  constructor() {
    this.filtroForm = this.fb.group({
      ubicacion: [''],
      categoria: [''],
      concepto: [''],
      tipoTransporte: [''],
    });

    this.edicionForm = this.fb.group({
      paisNombre: [''],
      departamentoNombre: [''],
      ubicacionNombre: [''],
      categoriaCodigo: [''],
      conceptoCodigo: [''],
      tipoTransporte: [''],
      valorUnitario: [0],
      descripcion: [''],
      activo: [true]
    });

    this.filtroForm.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });

    effect(() => {
      const trigger = this.realtimeService.refreshTrigger();
      if (trigger > 0) {
        untracked(() => {
          const tarifa = this.realtimeService.tarifaModificada();
          if (tarifa) {
            this.messageService.add({ severity: 'info', summary: 'Tarifas Actualizadas', detail: tarifa.message || 'Las tarifas han sido modificadas', life: 5000 });
            this.realtimeService.resetSignal('tarifa_modificada');
          }
          this.cargarTarifas();
          this.cargarEstadisticas();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.realtimeService.resetAll();
  }

  // Inicializa componente y carga datos
  ngOnInit(): void {
    this.inicializarAnios();
    this.cargarMapeosCentralizados(); // ✅ Cargar mapeos centralizados primero
    this.cargarCategorias();
    this.cargarConceptos();
    this.cargarDepartamentos();
    this.cargarTarifas();
    this.cargarEstadisticas();
  }

  // Inicializa lista de años disponibles (2020 hasta 5 años adelante)
  private inicializarAnios(): void {
    const anioInicio = 2020;
    const anioFin = this.anioActual + 5;
    
    for (let anio = anioInicio; anio <= anioFin; anio++) {
      this.aniosDisponibles.push(anio);
    }

    this.opcionesAnios = this.aniosDisponibles.map(anio => ({
      label: anio.toString(),
      value: anio
    }));
  }

  /**
   * ✅ Carga los mapeos centralizados desde el backend
   * Evita hardcoding de mapeos en el frontend
   */
  private cargarMapeosCentralizados(): void {
    this.tarifasService.obtenerMapeos().subscribe({
      next: (mapeos) => {
        this.categoriasMapBackend = mapeos.categoriasMap;
        this.conceptosTarifasMapBackend = mapeos.conceptosTarifasMap;
        this.tiposViaticosMapBackend = mapeos.tiposViaticosMap;
        
        // ✅ Cargar opciones dinámicas desde el backend
        this.opcionesTipoTransporte = mapeos.opcionesTipoTransporte;
        this.opcionesEstado = mapeos.opcionesEstado;
        this.opcionesEstadoCierre = mapeos.opcionesEstadoCierre;
        // No cargar opcionesEstadoActivo - no se usa para filtrar
      },
      error: (error) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Error al cargar configuraciones del sistema' 
        });
      }
    });
  }

  // Maneja cambio de año seleccionado
  onAnioChange(): void {
    this.cargarTarifas();
    this.cargarEstadisticas();
  }

  // Carga estadísticas del año seleccionado
  cargarEstadisticas(): void {
    this.tarifasService.getEstadisticasPorAnio(this.anioSeleccionado).subscribe({
      next: (stats) => {
        this.estadisticas = stats;
      },
      error: () => {
        this.estadisticas = null;
      }
    });
  }

  // Carga categorías desde listas de valores
  cargarCategorias(): void {
    this.listasValoresService.obtenerPorTipo('CAT').subscribe({
      next: (categorias) => {
        const categoriasFiltradas = this.filtrarYOrdenarLista(categorias);
        this.populateCategoriasMap(categoriasFiltradas);
        this.opcionesCategoria = this.mapearAOpciones(categoriasFiltradas);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las categorías',
        });
      },
    });
  }

  // Filtra y ordena lista de valores
  private filtrarYOrdenarLista(items: ListaValor[]): ListaValor[] {
    return items
      .filter((item) => item.idPadre !== null)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  // Llena mapa de categorías
  private populateCategoriasMap(categorias: ListaValor[]): void {
    categorias.forEach((categoria) => {
      if (categoria.abreviatura) {
        this.categoriasMap.set(categoria.abreviatura, categoria.nombre);
      }
    });
  }

  // Mapea lista a opciones de selector
  private mapearAOpciones(items: ListaValor[]): { label: string; value: string }[] {
    return items
      .filter(item => item.abreviatura)
      .map((item) => ({
        label: item.nombre,
        value: item.abreviatura as string 
      }));
  }

  // Carga conceptos desde listas de valores
  cargarConceptos(): void {
    this.listasValoresService.obtenerPorTipo('CLV').subscribe({
      next: (conceptos) => {
        const conceptosFiltrados = this.filtrarYOrdenarLista(conceptos);
        this.populateConceptosMap(conceptosFiltrados);
        this.opcionesConcepto = conceptosFiltrados.map(item => ({
          label: item.nombre,
          value: this.eliminarTildes(item.nombre) 
        }));
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los conceptos',
        });
      },
    });
  }

  // Llena mapa de conceptos
  private populateConceptosMap(conceptos: ListaValor[]): void {
    conceptos.forEach((concepto) => {
      const nombreSinTildes = this.eliminarTildes(concepto.nombre);
      this.conceptosMap.set(nombreSinTildes, concepto.nombre);
    });
  }

  /**
   * Elimina tildes de un texto
   */
  private eliminarTildes(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  // Carga tarifas del año seleccionado
  cargarTarifas(): void {
    this.cargando = true;
    const filtros = this.filtroForm.value;
    
    // Llamar al backend con los filtros directamente
    this.tarifasService.buscarTarifas(
      this.anioSeleccionado,
      filtros.ubicacion || undefined,
      filtros.categoria || undefined,
      filtros.concepto || undefined,
      filtros.tipoTransporte || undefined,
      this.filtroEstadoCierre
    ).subscribe({
      next: (tarifas) => {
        this.tarifas = tarifas;
        this.tarifasFiltradas = tarifas; // Mostrar todas las tarifas (activas e inactivas)
        this.cargando = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Se cargaron ${this.tarifasFiltradas.length} tarifas`,
        });
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las tarifas',
        });
      },
    });
  }

  // Aplica filtros llamando al backend
  aplicarFiltros(): void {
    this.cargarTarifas(); 
  }

  // Limpia todos los filtros
  limpiarFiltros(): void {
    this.filtroForm.reset({
      ubicacion: '',
      categoria: '',
      concepto: '',
      tipoTransporte: '',
    });
    this.filtroEstadoCierre = null;
    this.aplicarFiltros();
  }

  // Muestra detalle de tarifa
  verDetalle(tarifa: TarifaUbicacion): void {
    this.tarifaSeleccionada = tarifa;
    this.mostrarDialogoDetalle = true;
  }

  // Cierra diálogo de detalle
  cerrarDialogoDetalle(): void {
    this.mostrarDialogoDetalle = false;
    this.tarifaSeleccionada = null;
  }

  // Abre diálogo de edición con datos
  editarTarifa(tarifa: TarifaUbicacion): void {
    if (tarifa.tarifaCerrada) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede editar una tarifa cerrada'
      });
      return;
    }
    
    this.tarifaSeleccionada = tarifa;
    this.paisEdicion = tarifa.paisNombre || '';
    this.departamentoEdicion = tarifa.departamentoNombre || '';
    
    this.edicionForm.patchValue({
      paisNombre: tarifa.paisNombre || '',
      departamentoNombre: tarifa.departamentoNombre || '',
      ubicacionNombre: tarifa.ubicacionNombre,
      categoriaCodigo: tarifa.categoriaCodigo,
      conceptoCodigo: tarifa.conceptoCodigo,
      tipoTransporte: tarifa.tipoTransporte,
      valorUnitario: tarifa.valorUnitario,
      descripcion: tarifa.descripcion || '',
      activo: tarifa.activo
    });

    // Cargar países primero
    this.cargarPaisesEdicion();
    
    this.mostrarDialogoEdicion = true;
  }

  // Cierra diálogo de edición
  cerrarDialogoEdicion(): void {
    this.mostrarDialogoEdicion = false;
    this.tarifaSeleccionada = null;
    this.edicionForm.reset();
    this.paisEdicion = '';
    this.paisIdEdicion = '';
    this.departamentoEdicion = '';
    this.departamentoIdEdicion = '';
    this.paisesEdicion = [];
    this.paisesEdicionOptions = [];
    this.departamentosEdicion = [];
    this.departamentosEdicionOptions = [];
    this.municipiosEdicionOptions = [];
  }

  // Guarda cambios de tarifa editada
  guardarTarifa(): void {
    if (!this.tarifaSeleccionada) {
      return;
    }

    if (!this.tarifaSeleccionada.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede actualizar tarifa sin ID',
      });
      return;
    }

    this.procesando = true;
    const datosEditados = this.edicionForm.value;

    this.tarifasService.actualizarTarifa(this.tarifaSeleccionada.id, datosEditados).subscribe({
      next: (tarifaActualizada) => {
        this.actualizarTarifaEnLista(tarifaActualizada);
        // No llamar a aplicarFiltros() para que la tarifa permanezca visible
        // independientemente de su estado activo/inactivo
        this.procesando = false;
        this.cerrarDialogoEdicion();
        
        this.messageService.add({
          severity: 'success',
          summary: 'Tarifa Actualizada',
          detail: 'La tarifa ha sido actualizada exitosamente',
        });
      },
      error: () => {
        this.procesando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar la tarifa',
        });
      },
    });
  }

  // Actualiza tarifa en lista local
  private actualizarTarifaEnLista(tarifaActualizada: TarifaUbicacion): void {
    if (!this.tarifaSeleccionada?.id) return;
    
    // Actualizar en la lista principal
    const index = this.tarifas.findIndex((t) => t.id === this.tarifaSeleccionada?.id);
    if (index !== -1) {
      this.tarifas[index] = tarifaActualizada;
    }
    
    // Actualizar también en la lista filtrada para que la tarifa permanezca visible
    const indexFiltrada = this.tarifasFiltradas.findIndex((t) => t.id === this.tarifaSeleccionada?.id);
    if (indexFiltrada !== -1) {
      this.tarifasFiltradas[indexFiltrada] = tarifaActualizada;
    }
  }

  // Marca formulario como tocado
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Valida si campo es inválido
  isFieldInvalid(fieldName: string): boolean {
    const field = this.edicionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Obtiene mensaje de error del campo
  getFieldError(fieldName: string): string {
    const field = this.edicionForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['min']) return 'El valor debe ser mayor a 0';
    }
    return '';
  }

  cerrarTarifasAnio(): void {
    // Primero validar con el backend
    this.cargando = true;
    this.tarifasService.validarCierreAnio(this.anioSeleccionado).subscribe({
      next: (validacion) => {
        this.cargando = false;
        
        if (!validacion.puedesCerrar) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No se puede cerrar',
            detail: validacion.motivosBloqueo?.join(', ') || 'No hay tarifas abiertas para cerrar'
          });
          return;
        }

        this.confirmationService.confirm({
          message: `¿Está seguro de cerrar ${validacion.tarifasAbiertas} tarifas del año ${this.anioSeleccionado}?`,
          header: 'Confirmar Cierre de Año',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Sí, cerrar',
          rejectLabel: 'Cancelar',
          acceptButtonStyleClass: 'p-button-danger',
          accept: () => {
            this.ejecutarCierreAnio();
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al validar el cierre'
        });
      }
    });
  }

  // Ejecuta el cierre de tarifas del año
  private ejecutarCierreAnio(): void {
    this.procesando = true;
    const usuarioCierre = 'admin@unimar.edu.co'; 
    
    this.tarifasService.cerrarTarifasDelAnio(this.anioSeleccionado, usuarioCierre).subscribe({
      next: (response) => {
        const exitosos = response.exitosos || 0;
        const fallidos = response.fallidos || 0;
        
        if (fallidos > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Cierre parcial',
            detail: `Se cerraron ${exitosos} tarifas. ${fallidos} fallaron.`,
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Se cerraron ${exitosos} tarifas del año ${this.anioSeleccionado}`
          });
        }
        
        this.cargarTarifas();
        this.cargarEstadisticas();
        this.procesando = false;
      },
      error: (error) => {
        this.procesando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.mensaje || 'Error al cerrar las tarifas'
        });
      }
    });
  }

  /**
   * Duplica tarifas a un nuevo año
   */
  duplicarTarifasANuevoAnio(): void {
    const anioDestino = this.anioSeleccionado + 1;
    
    this.confirmationService.confirm({
      message: `¿Desea duplicar todas las tarifas cerradas del año ${this.anioSeleccionado} al año ${anioDestino}? El backend validará los requisitos.`,
      header: 'Confirmar Duplicación',
      icon: 'pi pi-clone',
      acceptLabel: 'Sí, duplicar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.ejecutarDuplicacion(anioDestino);
      }
    });
  }

  // Ejecuta la duplicación de tarifas
  private ejecutarDuplicacion(anioDestino: number): void {
    this.procesando = true;
    const usuarioCreacion = 'admin@unimar.edu.co'; 
    
    this.tarifasService.duplicarTarifasANuevoAnio(
      this.anioSeleccionado,
      anioDestino,
      usuarioCreacion
    ).subscribe({
      next: (response) => {
        const exitosos = response.exitosos || 0;
        const fallidos = response.fallidos || 0;
        
        if (fallidos > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Duplicación parcial',
            detail: `Se duplicaron ${exitosos} tarifas. ${fallidos} fallaron.`,
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Se duplicaron ${exitosos} tarifas al año ${anioDestino}`
          });
        }
        
        this.anioSeleccionado = anioDestino;
        this.cargarTarifas();
        this.cargarEstadisticas();
        this.procesando = false;
      },
      error: (error) => {
        this.procesando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.mensaje || 'Error al duplicar las tarifas'
        });
      }
    });
  }

  /**
   * Cierra una tarifa individual
   */
  cerrarTarifaIndividual(tarifa: TarifaUbicacion): void {
    if (!tarifa.id) return;

    this.confirmationService.confirm({
      message: `¿Está seguro de cerrar la tarifa de ${tarifa.ubicacionNombre}?`,
      header: 'Confirmar Cierre',
      icon: 'pi pi-lock',
      acceptLabel: 'Sí, cerrar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.ejecutarCierreTarifa(tarifa.id!);
      }
    });
  }

  // Ejecuta el cierre de una tarifa individual
  private ejecutarCierreTarifa(tarifaId: string): void {
    this.procesando = true;
    const usuarioCierre = 'admin@unimar.edu.co'; 
    
    this.tarifasService.cerrarTarifaIndividual(tarifaId, usuarioCierre).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: response.mensaje || 'Tarifa cerrada correctamente'
        });
        this.cargarTarifas();
        this.cargarEstadisticas();
        this.cerrarDialogoDetalle();
        this.procesando = false;
      },
      error: () => {
        this.procesando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cerrar la tarifa'
        });
      }
    });
  }

  // Reabre una tarifa cerrada
  reabrirTarifa(tarifa: TarifaUbicacion): void {
    if (!tarifa.tarifaCerrada) {
      this.messageService.add({
        severity: 'info',
        summary: 'Información',
        detail: 'La tarifa ya está abierta',
        life: 3000
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro de reabrir la tarifa de ${tarifa.ubicacionNombre}? Esto permitirá editarla nuevamente.`,
      header: 'Confirmar Reapertura',
      icon: 'pi pi-unlock',
      acceptLabel: 'Sí, Reabrir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.procesando = true;
        const usuarioModificacion = 'admin@unimar.edu.co'; 
        
        this.tarifasService.reabrirTarifa(tarifa.id!, usuarioModificacion).subscribe({
          next: (response) => {
            if (response.advertencias && response.advertencias.length > 0) {
              response.advertencias.forEach((advertencia: string) => {
                this.messageService.add({
                  severity: 'warn',
                  summary: 'Advertencia',
                  detail: advertencia,
                  life: 5000
                });
              });
            }
            
            this.messageService.add({
              severity: 'success',
              summary: 'Tarifa Reabierta',
              detail: response.mensaje || `La tarifa de ${tarifa.ubicacionNombre} ha sido reabierta exitosamente`,
              life: 3000
            });
            
            const index = this.tarifas.findIndex(t => t.id === tarifa.id);
            if (index !== -1) {
              this.tarifas[index].tarifaCerrada = false;
              this.tarifas[index].fechaCierre = undefined;
              this.tarifas[index].usuarioCierre = undefined;
            }
            
            this.cargarEstadisticas();
            this.aplicarFiltros();
            this.procesando = false;
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo reabrir la tarifa. Por favor intente nuevamente.',
              life: 5000
            });
            this.procesando = false;
          }
        });
      }
    });
  }

  // Desactiva o activa tarifa
  desactivarTarifa(tarifa: TarifaUbicacion): void {
    const accion = tarifa.activo ? 'desactivar' : 'activar';
    const mensaje = tarifa.activo 
      ? `¿Está seguro de desactivar la tarifa para ${tarifa.ubicacionNombre}?`
      : `¿Está seguro de activar la tarifa para ${tarifa.ubicacionNombre}?`;

    this.confirmationService.confirm({
      message: mensaje,
      header: `Confirmar ${accion}`,
      icon: tarifa.activo ? 'pi pi-times-circle' : 'pi pi-check-circle',
      acceptLabel: `Sí, ${accion}`,
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: tarifa.activo ? 'p-button-danger' : 'p-button-success',
      accept: () => {
        if (tarifa.activo) {
          this.ejecutarDesactivacion(tarifa);
        } else {
          this.ejecutarActivacion(tarifa);
        }
      },
    });
  }

  // Ejecuta desactivación de tarifa
  private ejecutarDesactivacion(tarifa: TarifaUbicacion): void {
    if (!tarifa.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede desactivar tarifa sin ID',
      });
      return;
    }

    this.procesando = true;
    
    this.tarifasService.desactivarTarifaLogica(tarifa.id).subscribe({
      next: () => {
        if (tarifa.id) {
          this.marcarTarifaComoInactiva(tarifa.id);
        }
        this.aplicarFiltros();
        this.procesando = false;
        this.cerrarDialogoDetalle();
        
        this.messageService.add({
          severity: 'warn',
          summary: 'Tarifa Desactivada',
          detail: 'La tarifa ha sido desactivada exitosamente',
        });
      },
      error: () => {
        this.procesando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo desactivar la tarifa',
        });
      },
    });
  }

  // Marca tarifa como inactiva en lista
  private marcarTarifaComoInactiva(tarifaId: string): void {
    const index = this.tarifas.findIndex((t) => t.id === tarifaId);
    if (index !== -1) {
      this.tarifas[index].activo = false;
    }
  }

  // Ejecuta activación de tarifa
  private ejecutarActivacion(tarifa: TarifaUbicacion): void {
    if (!tarifa.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede activar tarifa sin ID',
      });
      return;
    }

    this.procesando = true;
    
    this.tarifasService.activarTarifa(tarifa.id).subscribe({
      next: () => {
        if (tarifa.id) {
          const index = this.tarifas.findIndex((t) => t.id === tarifa.id);
          if (index !== -1) {
            this.tarifas[index].activo = true;
          }
        }
        this.aplicarFiltros();
        this.procesando = false;
        this.cerrarDialogoDetalle();
        
        this.messageService.add({
          severity: 'success',
          summary: 'Tarifa Activada',
          detail: 'La tarifa ha sido activada exitosamente',
        });
      },
      error: () => {
        this.procesando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo activar la tarifa',
        });
      },
    });
  }

  // Exporta tarifas a Excel
  exportarExcel(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportar Excel',
      detail: 'Funcionalidad en desarrollo',
    });
  }

  // Exporta tarifas a PDF
  exportarPDF(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Exportar PDF',
      detail: 'Funcionalidad en desarrollo',
    });
  }

  // Obtiene nombre de categoría por código
  obtenerNombreCategoria(codigo: string | undefined): string {
    if (!codigo) return 'No especificado';
    return this.categoriasMap.get(codigo) || codigo;
  }

  obtenerNombreConcepto(codigo: string | undefined): string {
    if (!codigo) return 'No especificado';
    return this.conceptosMap.get(codigo) || codigo;
  }

  // Obtiene texto de tipo de transporte
  obtenerTextoTipoTransporte(tipo: string | undefined): string {
    const tipos: Record<string, string> = {
      aereo: 'Aéreo',
      terrestre: 'Terrestre',
      fluvial: 'Fluvial',
    };
    return tipos[tipo || ''] || tipo || 'No especificado';
  }

  // Obtiene texto de estado activo/inactivo
  obtenerTextoEstado(activo: boolean | undefined): string {
    return activo ? 'Activa' : 'Inactiva';
  }

  // Obtiene severidad para tag de estado
  obtenerSeveridadEstado(activo: boolean | undefined): 'success' | 'danger' {
    return activo ? 'success' : 'danger';
  }

  // Formatea valor monetario en pesos colombianos
  formatearValor(valor: number | undefined): string {
    if (!valor) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  }

  // Formatea fecha en formato local
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'No especificado';
    
    try {
      const date = new Date(fecha);
      return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return fecha;
    }
  }

  /**
   * Crea una tarifa vacía
   */
  private crearTarifaVacia(): TarifaUbicacion {
    return {
      paisNombre: 'Colombia',
      departamentoNombre: '',
      municipioNombre: '',
      ubicacionNombre: '',
      categoriaCodigo: '',
      conceptoCodigo: '',
      tipoTransporte: undefined,
      valorUnitario: 0,
      moneda: 'COP',
      descripcion: '',
      activo: true,
      anioVigencia: this.anioSeleccionado
    };
  }

  // ============================================================
  // MÉTODOS PARA CREACIÓN DE TARIFAS
  // ============================================================

  /**
   * Carga departamentos de Colombia
   */
  private cargarDepartamentos(): void {
    this.loadingDepartamentos = true;
    this.ubicacionesService.getDepartamentosColombia().subscribe({
      next: (departamentos) => {
        this.loadingDepartamentos = false;
        this.departamentos = departamentos;
        this.departamentosOptions = departamentos
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(d => ({
            label: d.nombre,
            value: d.id
          }));
      },
      error: () => {
        this.loadingDepartamentos = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar departamentos'
        });
      }
    });
  }

  /**
   * Maneja cambio de departamento
   */
  onDepartamentoChange(departamentoId: string): void {
    if (!departamentoId) {
      this.municipios = [];
      this.municipiosOptions = [];
      this.tarifaNueva.ubicacionNombre = '';
      return;
    }

    const departamento = this.departamentos.find(d => d.id === departamentoId);
    if (departamento) {
      this.tarifaNueva.departamentoNombre = departamento.nombre;
    }

    this.cargarMunicipios(departamentoId);
  }

  /**
   * Carga municipios por departamento
   */
  private cargarMunicipios(departamentoId: string): void {
    this.loadingMunicipios = true;
    this.municipios = [];
    this.municipiosOptions = [];
    
    this.ubicacionesService.getMunicipiosByDepartamento(departamentoId).subscribe({
      next: (municipios) => {
        this.loadingMunicipios = false;
        this.municipios = municipios;
        this.municipiosOptions = municipios
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(m => ({
            label: m.nombre,
            value: m.nombre
          }));
      },
      error: () => {
        this.loadingMunicipios = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar municipios'
        });
      }
    });
  }

  /**
   * Abre diálogo de creación
   */
  abrirDialogoCreacion(): void {
    this.tarifaNueva = this.crearTarifaVacia();
    this.paisSeleccionado = 'Colombia';
    this.departamentoSeleccionado = '';
    this.municipios = [];
    this.municipiosOptions = [];
    this.mostrarDialogoCreacion = true;
  }

  /**
   * Cierra diálogo de creación
   */
  cerrarDialogoCreacion(): void {
    this.mostrarDialogoCreacion = false;
    this.tarifaNueva = this.crearTarifaVacia();
    this.departamentoSeleccionado = '';
  }

  /**
   * Carga países para el formulario de edición
   */
  cargarPaisesEdicion(): void {
    this.loadingPaisesEdicion = true;
    
    this.ubicacionesService.getPaises().subscribe({
      next: (paises: UbicacionGeografica[]) => {
        this.paisesEdicion = paises;
        this.paisesEdicionOptions = paises
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(pais => ({
            label: pais.nombre,
            value: pais.id
          }));
        this.loadingPaisesEdicion = false;
        
        // Si hay un país seleccionado, buscar su ID y cargar departamentos
        if (this.paisEdicion) {
          const paisEncontrado = this.paisesEdicion.find(
            p => p.nombre === this.paisEdicion
          );
          if (paisEncontrado) {
            this.paisIdEdicion = paisEncontrado.id;
            this.cargarDepartamentosEdicion();
          }
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar países'
        });
        this.loadingPaisesEdicion = false;
      }
    });
  }

  /**
   * Maneja cambio de país en edición
   */
  onPaisEdicionChange(paisId: string): void {
    if (!paisId) {
      this.paisEdicion = '';
      this.paisIdEdicion = '';
      this.departamentoEdicion = '';
      this.departamentoIdEdicion = '';
      this.departamentosEdicionOptions = [];
      this.municipiosEdicionOptions = [];
      this.edicionForm.patchValue({
        paisNombre: '',
        departamentoNombre: '',
        ubicacionNombre: ''
      });
      return;
    }
    
    // Buscar el país por ID
    const pais = this.paisesEdicion.find(p => p.id === paisId);
    if (pais) {
      this.paisEdicion = pais.nombre;
      this.paisIdEdicion = pais.id;
      
      this.edicionForm.patchValue({
        paisNombre: pais.nombre,
        departamentoNombre: '',
        ubicacionNombre: ''
      });
      
      // Limpiar departamentos y municipios
      this.departamentoEdicion = '';
      this.departamentoIdEdicion = '';
      this.departamentosEdicionOptions = [];
      this.municipiosEdicionOptions = [];
      
      this.cargarDepartamentosEdicion();
    }
  }

  /**
   * Carga departamentos para el formulario de edición
   */
  cargarDepartamentosEdicion(): void {
    if (!this.paisIdEdicion) {
      return;
    }
    
    this.loadingDepartamentosEdicion = true;
    
    // Determinar qué método usar según el país
    const getDepartamentos$ = this.paisEdicion.toLowerCase().includes('colombia')
      ? this.ubicacionesService.getDepartamentosColombia()
      : this.ubicacionesService.getDepartamentosPorPais(this.paisIdEdicion);
    
    getDepartamentos$.subscribe({
      next: (departamentos: UbicacionGeografica[]) => {
        this.departamentosEdicion = departamentos;
        this.departamentosEdicionOptions = departamentos
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(dep => ({
            label: dep.nombre,
            value: dep.id
          }));
        this.loadingDepartamentosEdicion = false;
        
        // Si hay un departamento seleccionado, buscar su ID y cargar municipios
        if (this.departamentoEdicion) {
          const depEncontrado = this.departamentosEdicion.find(
            d => d.nombre === this.departamentoEdicion
          );
          if (depEncontrado) {
            this.departamentoIdEdicion = depEncontrado.id;
            this.cargarMunicipiosEdicion();
          }
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar departamentos'
        });
        this.loadingDepartamentosEdicion = false;
      }
    });
  }

  /**
   * Maneja cambio de departamento en edición
   */
  onDepartamentoEdicionChange(departamentoId: string): void {
    if (!departamentoId) {
      this.departamentoEdicion = '';
      this.departamentoIdEdicion = '';
      this.municipiosEdicionOptions = [];
      this.edicionForm.patchValue({
        departamentoNombre: '',
        ubicacionNombre: ''
      });
      return;
    }
    
    // Buscar el departamento por ID
    const departamento = this.departamentosEdicion.find(d => d.id === departamentoId);
    if (departamento) {
      this.departamentoEdicion = departamento.nombre;
      this.departamentoIdEdicion = departamento.id;
      
      this.edicionForm.patchValue({
        departamentoNombre: departamento.nombre,
        ubicacionNombre: '' // Limpiar municipio al cambiar departamento
      });
      
      this.cargarMunicipiosEdicion();
    }
  }

  /**
   * Carga municipios por departamento para edición
   */
  cargarMunicipiosEdicion(): void {
    if (!this.departamentoIdEdicion) {
      return;
    }
    
    this.loadingMunicipiosEdicion = true;
    this.municipiosEdicionOptions = [];
    
    this.ubicacionesService.getMunicipiosByDepartamento(this.departamentoIdEdicion).subscribe({
      next: (municipios: UbicacionGeografica[]) => {
        this.municipiosEdicionOptions = municipios
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(mun => ({
            label: mun.nombre,
            value: mun.nombre
          }));
        this.loadingMunicipiosEdicion = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar municipios'
        });
        this.loadingMunicipiosEdicion = false;
      }
    });
  }

  /**
   * Guarda nueva tarifa (ahora con validación en el backend)
   */
  guardarNuevaTarifa(): void {
    // Validaciones básicas del frontend
    if (!this.validarCamposBasicos()) {
      return;
    }

    this.procesando = true;

    this.tarifaNueva.paisNombre = this.paisSeleccionado;
    this.tarifaNueva.municipioNombre = this.tarifaNueva.ubicacionNombre;
    this.tarifaNueva.anioVigencia = this.anioSeleccionado;
    this.tarifaNueva.usuarioCreacion = 'admin@unimar.edu.co'; 

    // ✅ Usar mapeos centralizados desde el backend (sin hardcoding)
    this.tarifaNueva.categoriaCodigo = this.categoriasMapBackend[this.tarifaNueva.categoriaCodigo] || this.tarifaNueva.categoriaCodigo;
    this.tarifaNueva.conceptoCodigo = this.conceptosTarifasMapBackend[this.tarifaNueva.conceptoCodigo] || this.tarifaNueva.conceptoCodigo;

    if (!this.tarifaNueva.moneda) {
      this.tarifaNueva.moneda = 'COP';
    }

    this.tarifasService.validarTarifa(this.tarifaNueva).subscribe({
      next: (validacion) => {
        if (!validacion.valida) {

          validacion.errores.forEach((error: string) => {
            this.messageService.add({
              severity: 'warn',
              summary: 'Error de Validación',
              detail: error,
              life: 5000
            });
          });
          this.procesando = false;
          return;
        }

        this.tarifasService.crearTarifa(this.tarifaNueva).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Tarifa creada correctamente'
            });
            this.cargarTarifas();
            this.cargarEstadisticas();
            this.cerrarDialogoCreacion();
            this.procesando = false;
          },
          error: (error) => {
            this.procesando = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error?.mensaje || 'Error al crear la tarifa'
            });
          }
        });
      },
      error: () => {
        this.procesando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al validar la tarifa'
        });
      }
    });
  }

  /**
   * Valida campos básicos requeridos (validación ligera en frontend)
   */
  private validarCamposBasicos(): boolean {
    if (!this.paisSeleccionado || !this.paisSeleccionado.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El país es requerido'
      });
      return false;
    }

    if (!this.tarifaNueva.departamentoNombre?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El departamento es requerido'
      });
      return false;
    }

    if (!this.tarifaNueva.ubicacionNombre?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El municipio/ciudad es requerido'
      });
      return false;
    }

    if (!this.tarifaNueva.categoriaCodigo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'La categoría es requerida'
      });
      return false;
    }

    if (!this.tarifaNueva.conceptoCodigo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El concepto es requerido'
      });
      return false;
    }

    if (!this.tarifaNueva.valorUnitario || this.tarifaNueva.valorUnitario <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El valor unitario debe ser mayor a cero'
      });
      return false;
    }

    return true;
  }

  // ============================================================
  // CARGA MASIVA DESDE EXCEL
  // ============================================================

  /**
   * Maneja selección de archivo Excel
   */
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (!file) {
      return;
    }

    // Validar extensión
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo inválido',
        detail: 'Solo se permiten archivos Excel (.xlsx, .xls)'
      });
      event.target.value = ''; 
      return;
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; 
    if (file.size > maxSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: 'El archivo no debe superar los 5MB'
      });
      event.target.value = '';
      return;
    }

    // Confirmar carga
    this.confirmationService.confirm({
      message: `¿Está seguro de cargar tarifas desde el archivo "${file.name}"? Se crearán o actualizarán las tarifas existentes.`,
      header: 'Confirmar Carga Masiva',
      icon: 'pi pi-upload',
      acceptLabel: 'Sí, cargar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.cargarArchivoExcel(file);
      }
    });

    event.target.value = '';
  }

  /**
   * Ejecuta la carga del archivo Excel
   */
  private cargarArchivoExcel(file: File): void {
    this.procesando = true;

    this.tarifasService.cargarTarifasDesdeExcel(file).subscribe({
      next: (response) => {
        this.procesando = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Carga Exitosa',
          detail: response.mensaje,
          life: 5000
        });

        if (response.detalle) {
          setTimeout(() => {
            this.messageService.add({
              severity: 'info',
              summary: 'Detalle de Carga',
              detail: response.detalle,
              life: 7000
            });
          }, 500);
        }

        this.cargarTarifas();
        this.cargarEstadisticas();
      },
      error: (error) => {
        this.procesando = false;
        
        const mensajeError = error?.error?.mensaje || error?.error?.detalle || 'Error al cargar el archivo Excel';
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error en Carga',
          detail: mensajeError,
          life: 5000
        });
      }
    });
  }

  /**
   * Descarga la plantilla de Excel para carga masiva
   */
  descargarPlantillaExcel(): void {
    this.procesando = true;

    this.tarifasService.descargarPlantillaExcel().subscribe({
      next: (blob) => {
        this.procesando = false;

        // Crear un enlace temporal para descargar el archivo
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Plantilla_Tarifas_Viaticos.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Descarga Exitosa',
          detail: 'Plantilla de Excel descargada correctamente',
          life: 3000
        });
      },
      error: (error) => {
        this.procesando = false;
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error en Descarga',
          detail: 'No se pudo descargar la plantilla de Excel',
          life: 5000
        });
      }
    });
  }
}
