import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleButtonModule } from 'primeng/togglebutton';

// Services
import { ConfirmationService, MessageService } from 'primeng/api';

import { UbicacionesGeograficasService } from '../../core/services/ubicaciones-geograficas.service';
import { 
  UbicacionGeografica, 
  UbicacionGeograficaCreateDto, 
  UbicacionGeograficaUpdateDto,
  TipoOrdenUbicacion,
  TIPOS_ORDEN_LABELS
} from '../../core/models/ubicacion-geografica.model';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ListaValor } from '../../core/models/lista-valor.model';

@Component({
  selector: 'app-admin-ubicaciones',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    TableModule,
    TagModule,
    InputNumberModule,
    SelectModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    SkeletonModule,
    ToggleButtonModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-ubicaciones.component.html',
  styleUrls: ['./admin-ubicaciones.component.scss']
})
export class AdminUbicacionesComponent implements OnInit {
  
  // Signals para el estado
  tipos = signal<ListaValor[]>([]);
  tipoSeleccionado = signal<ListaValor | null>(null);
  ubicaciones = signal<UbicacionGeografica[]>([]);
  ubicacionesFiltradas = signal<UbicacionGeografica[]>([]);
  cargando = signal<boolean>(false);
  
  // Búsqueda y filtros
  textoBusqueda = signal<string>('');
  padreSeleccionado = signal<string | null>(null);
  
  // Filtros de país y departamento
  private readonly COLOMBIA_UUID = 'aa179357-8e10-4497-987e-9375e34b6881';
  paises = signal<UbicacionGeografica[]>([]);
  paisSeleccionado = signal<string | null>(this.COLOMBIA_UUID); // Por defecto Colombia
  departamentos = signal<UbicacionGeografica[]>([]);
  departamentoSeleccionado = signal<string | null>(null); // UUID del departamento seleccionado
  cargandoPaises = signal<boolean>(false);
  cargandoDepartamentos = signal<boolean>(false);
  
  // Modal y formulario
  mostrarModal = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  formulario!: FormGroup;
  ubicacionEditando = signal<UbicacionGeografica | null>(null);
  
  // Para el selector de padre
  ubicacionesParaPadre = signal<UbicacionGeografica[]>([]);
  todasLasUbicaciones = signal<UbicacionGeografica[]>([]);

  // Modo de reordenamiento
  modoReordenar = signal<boolean>(false);

  // Modal de cambio masivo de tipo_orden
  mostrarModalOrdenMasivo = signal<boolean>(false);
  tipoOrdenSeleccionado = signal<string>('AA');

  // Tipos de orden disponibles
  tiposOrden = Object.entries(TIPOS_ORDEN_LABELS).map(([value, label]) => ({ value, label }));
  TipoOrdenUbicacion = TipoOrdenUbicacion;

  constructor(
    private ubicacionesService: UbicacionesGeograficasService,
    private listasValoresService: ListasValoresService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.inicializarFormulario();
  }

  /**
   * Obtiene el nombre del país seleccionado
   */
  getNombrePaisSeleccionado(): string {
    const paisId = this.paisSeleccionado();
    if (!paisId || this.paises().length === 0) return 'País';
    const pais = this.paises().find(p => p.id == paisId);
    return pais ? pais.nombre : 'País';
  }

  /**
   * Obtiene el nombre del departamento seleccionado
   */
  getNombreDepartamentoSeleccionado(): string {
    const deptoId = this.departamentoSeleccionado();
    if (!deptoId || this.departamentos().length === 0) return 'Depto';
    const depto = this.departamentos().find(d => d.id == deptoId);
    return depto ? depto.nombre : 'Depto';
  }

  /**
   * Verifica si el código DIAN es Colombia (169) - solo para UI
   */
  esColombia(codigoPais: string | null | undefined): boolean {
    return codigoPais == '169';
  }

  /**
   * Obtiene el UUID de Colombia desde la lista de países
   */
  getColombiaId(): string | null {
    const colombia = this.paises().find(p => p.codigoPais == '169');
    return colombia ? colombia.id : null;
  }

  ngOnInit(): void {
    this.cargarTipos();
    this.cargarTodasLasUbicaciones();
    this.cargarPaises(); // Carga países, Colombia se selecciona después
  }

  /**
   * Inicializa el formulario para crear/editar ubicaciones
   */
  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      id: [''],
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      idTipoLv: ['', Validators.required],
      idPadre: [null],
      tipoOrden: ['PA', Validators.required]
    });

    // Escuchar cambios en el tipo de ubicación para actualizar ubicaciones padre
    this.formulario.get('idTipoLv')?.valueChanges.subscribe((idTipo) => {
      this.actualizarUbicacionesPadrePorTipo(idTipo);
    });
  }

  /**
   * Carga los tipos de ubicaciones geográficas desde listas de valores
   */
  cargarTipos(): void {
    this.cargando.set(true);
    
    // Cargar tipos desde listas de valores (TUG = Tipo Ubicación Geográfica)
    this.listasValoresService.obtenerPorTipo('TUG').subscribe({
      next: (tipos) => {
        // Filtrar solo los tipos válidos: País, Departamento, Ciudad
        // Excluir el tipo padre "TUG" y "Municipio"
        const tiposFiltrados = tipos.filter(t => {
          const nombre = t.nombre.toLowerCase();
          const abrev = t.abreviatura?.toLowerCase() || '';
          
          // Incluir solo: País, Departamento, Ciudad
          const esValido = (
            nombre.includes('país') || nombre.includes('pais') || abrev === 'pais' ||
            nombre.includes('departamento') || abrev === 'depto' ||
            nombre.includes('ciudad') || abrev === 'ciud'
          );
          
          // Excluir el tipo padre TUG
          const esTipoPadre = abrev === 'tug' || nombre === 'tipo ubicación geográfica';
          
          return esValido && !esTipoPadre;
        });
        
        this.tipos.set(tiposFiltrados);
        this.cargando.set(false);
        
        // Auto-seleccionar países si existe
        const paisTipo = tiposFiltrados.find(t => t.nombre.toLowerCase().includes('país') || t.nombre.toLowerCase().includes('pais'));
        if (paisTipo) {
          this.seleccionarTipo(paisTipo);
        }
      },
      error: (error) => {
        this.cargando.set(false);
      }
    });
  }

  /**
   * Carga todas las ubicaciones (para el selector de padre)
   */
  cargarTodasLasUbicaciones(): void {
    this.ubicacionesService.obtenerTodas().subscribe({
      next: (ubicaciones) => {
        this.todasLasUbicaciones.set(ubicaciones);
      },
      error: (error) => {
      }
    });
  }

  /**
   * Selecciona un tipo de ubicación y carga sus valores
   */
  seleccionarTipo(tipo: ListaValor): void {
    this.tipoSeleccionado.set(tipo);
    this.limpiarBusqueda();
    
    const nombreTipo = tipo.nombre.toLowerCase();
    
    // Si es Departamento, usar Colombia por defecto
    if (nombreTipo.includes('departamento')) {
      this.paisSeleccionado.set(this.COLOMBIA_UUID);
      this.departamentoSeleccionado.set(null);
      this.cargarDepartamentosPorPais(this.COLOMBIA_UUID);
    } 
    // Si es Ciudad/Municipio, mantener Colombia seleccionado
    else if (nombreTipo.includes('ciudad') || nombreTipo.includes('municipio')) {
      if (!this.paisSeleccionado()) {
        this.paisSeleccionado.set(this.COLOMBIA_UUID);
        this.cargarDepartamentosPorPais(this.COLOMBIA_UUID);
      }
      this.departamentoSeleccionado.set(null);
      // No cargar hasta que se seleccione un departamento
      this.ubicaciones.set([]);
      this.ubicacionesFiltradas.set([]);
    } 
    // Si es País u otro tipo, cargar normalmente
    else {
      this.cargarUbicacionesPorTipo(tipo.id);
    }
  }

  /**
   * Carga todas las ubicaciones de un tipo específico
   */
  cargarUbicacionesPorTipo(idTipo: string): void {
    this.cargando.set(true);
    
    // Si es tipo Departamento, aplicar filtro por país
    const tipoSeleccionado = this.tipos().find(t => t.id === idTipo);
    const nombreTipo = tipoSeleccionado?.nombre.toLowerCase() || '';
    
    if (nombreTipo.includes('departamento') && this.paisSeleccionado()) {
      // Cargar departamentos filtrados por país
      this.cargarDepartamentosPorPais(this.paisSeleccionado()!);
      return;
    }
    
    // Si es tipo Ciudad/Municipio y hay departamento seleccionado, filtrar
    if ((nombreTipo.includes('ciudad') || nombreTipo.includes('municipio')) && this.departamentoSeleccionado()) {
      this.cargarMunicipiosPorDepartamento(this.departamentoSeleccionado()!);
      return;
    }
    
    this.ubicacionesService.obtenerPorTipo(idTipo).subscribe({
      next: (ubicaciones) => {
        this.ubicaciones.set(ubicaciones);
        this.ubicacionesFiltradas.set(ubicaciones);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
      }
    });
  }

  /**
   * Carga todos los países disponibles
   */
  cargarPaises(): void {
    this.cargandoPaises.set(true);
    this.ubicacionesService.obtenerPaises().subscribe({
      next: (paises) => {
        this.paises.set(paises);
        this.cargandoPaises.set(false);
      },
      error: (error) => {
        this.cargandoPaises.set(false);
      }
    });
  }

  /**
   * Carga los departamentos de un país específico usando su UUID
   * La asociación se hace mediante id_padre = paisId
   */
  cargarDepartamentosPorPais(paisId: string): void {
    this.cargandoDepartamentos.set(true);
    this.cargando.set(true);

    // Cargar departamentos del país usando su UUID (asociación real por id_padre)
    this.ubicacionesService.obtenerDepartamentosPorPais(paisId).subscribe({
      next: (departamentos) => {
        this.departamentos.set(departamentos);
        
        // Si estamos viendo departamentos, actualizar la vista
        const tipoSeleccionado = this.tipoSeleccionado();
        if (tipoSeleccionado && tipoSeleccionado.nombre.toLowerCase().includes('departamento')) {
          this.ubicaciones.set(departamentos);
          this.ubicacionesFiltradas.set(departamentos);
        }
        
        this.cargandoDepartamentos.set(false);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargandoDepartamentos.set(false);
        this.cargando.set(false);
      }
    });
  }

  /**
   * Carga los municipios de un departamento específico
   */
  cargarMunicipiosPorDepartamento(departamentoId: string): void {
    this.cargando.set(true);
    
    this.ubicacionesService.obtenerMunicipiosPorDepartamento(departamentoId).subscribe({
      next: (municipios) => {
        this.ubicaciones.set(municipios);
        this.ubicacionesFiltradas.set(municipios);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
      }
    });
  }

  /**
   * Maneja el cambio de país seleccionado (usando UUID)
   */
  onPaisChange(paisId: string | null): void {
    this.paisSeleccionado.set(paisId);
    this.departamentoSeleccionado.set(null);
    
    if (paisId) {
      this.cargarDepartamentosPorPais(paisId);
    } else {
      this.departamentos.set([]);
      // Si estamos viendo departamentos, recargar todos
      const tipoSeleccionado = this.tipoSeleccionado();
      if (tipoSeleccionado && tipoSeleccionado.nombre.toLowerCase().includes('departamento')) {
        this.cargarUbicacionesPorTipo(tipoSeleccionado.id);
      }
    }
  }

  /**
   * Maneja el cambio de departamento seleccionado
   */
  onDepartamentoChange(departamentoId: string | null): void {
    this.departamentoSeleccionado.set(departamentoId);
    
    if (departamentoId) {
      this.cargarMunicipiosPorDepartamento(departamentoId);
    } else {
      // Si estamos viendo municipios/ciudades, limpiar la vista
      const tipoSeleccionado = this.tipoSeleccionado();
      if (tipoSeleccionado) {
        const nombreTipo = tipoSeleccionado.nombre.toLowerCase();
        if (nombreTipo.includes('ciudad') || nombreTipo.includes('municipio')) {
          this.ubicaciones.set([]);
          this.ubicacionesFiltradas.set([]);
        }
      }
    }
  }

  /**
   * Abre el modal para crear una nueva ubicación
   */
  abrirModalNuevo(): void {
    this.modoEdicion.set(false);
    this.ubicacionEditando.set(null);
    this.formulario.reset();
    
    // Establecer el tipo seleccionado
    if (this.tipoSeleccionado()) {
      this.formulario.patchValue({
        idTipoLv: this.tipoSeleccionado()!.id
      });
    }
    
    this.cargarUbicacionesParaPadre();
    this.mostrarModal.set(true);
  }

  /**
   * Abre el modal para editar una ubicación existente
   */
  abrirModalEditar(ubicacion: UbicacionGeografica): void {
    this.modoEdicion.set(true);
    this.ubicacionEditando.set(ubicacion);
    
    this.formulario.patchValue({
      id: ubicacion.id,
      nombre: ubicacion.nombre,
      idTipoLv: ubicacion.idTipoLv,
      idPadre: ubicacion.idPadre,
      tipoOrden: ubicacion.tipoOrden || 'PA'
    });
    
    this.cargarUbicacionesParaPadre();
    this.mostrarModal.set(true);
  }

  /**
   * Carga las ubicaciones disponibles como padre
   */
  cargarUbicacionesParaPadre(): void {
    const idTipoSeleccionado = this.formulario.get('idTipoLv')?.value;
    this.actualizarUbicacionesPadrePorTipo(idTipoSeleccionado);
  }

  /**
   * Actualiza las ubicaciones disponibles como padre según el tipo de ubicación seleccionado
   * Lógica jerárquica:
   * - País: Sin padre (array vacío)
   * - Departamento: Solo países
   * - Ciudad: Solo departamentos
   * - Municipio: Solo ciudades
   */
  actualizarUbicacionesPadrePorTipo(idTipo: string): void {
    if (!idTipo) {
      this.ubicacionesParaPadre.set([]);
      return;
    }

    // Obtener el tipo seleccionado
    const tipoSeleccionado = this.tipos().find(t => t.id === idTipo);
    if (!tipoSeleccionado) {
      this.ubicacionesParaPadre.set([]);
      return;
    }

    const nombreTipo = tipoSeleccionado.nombre.toLowerCase();
    
    // Determinar qué tipo de ubicaciones puede ser padre
    let tiposPadrePermitidos: string[] = [];
    
    if (nombreTipo.includes('país') || nombreTipo.includes('pais')) {
      // Los países no tienen padre
      tiposPadrePermitidos = [];
    } else if (nombreTipo.includes('departamento') || nombreTipo.includes('estado') || nombreTipo.includes('provincia')) {
      // Los departamentos pueden tener como padre solo países
      const paisTipo = this.tipos().find(t => 
        t.nombre.toLowerCase().includes('país') || 
        t.nombre.toLowerCase().includes('pais')
      );
      if (paisTipo) {
        tiposPadrePermitidos = [paisTipo.id];
      }
    } else if (nombreTipo.includes('ciudad')) {
      // Las ciudades pueden tener como padre solo departamentos
      const deptoTipo = this.tipos().find(t => 
        t.nombre.toLowerCase().includes('departamento') ||
        t.nombre.toLowerCase().includes('estado') ||
        t.nombre.toLowerCase().includes('provincia')
      );
      if (deptoTipo) {
        tiposPadrePermitidos = [deptoTipo.id];
      }
    } else if (nombreTipo.includes('municipio')) {
      // Los municipios pueden tener como padre solo ciudades
      const ciudadTipo = this.tipos().find(t => 
        t.nombre.toLowerCase().includes('ciudad')
      );
      if (ciudadTipo) {
        tiposPadrePermitidos = [ciudadTipo.id];
      }
    }

    // Filtrar ubicaciones según los tipos permitidos
    let ubicacionesFiltradas = this.todasLasUbicaciones().filter((u: UbicacionGeografica) => {
      // Excluir la ubicación que se está editando
      if (this.ubicacionEditando() && u.id === this.ubicacionEditando()!.id) {
        return false;
      }
      // Solo incluir ubicaciones del tipo padre permitido
      return tiposPadrePermitidos.includes(u.idTipoLv);
    });

    this.ubicacionesParaPadre.set(ubicacionesFiltradas);

    // Si no hay ubicaciones padre disponibles y el tipo requiere padre, limpiar el campo
    if (tiposPadrePermitidos.length > 0 && ubicacionesFiltradas.length === 0) {
      this.formulario.patchValue({ idPadre: null });
    }
  }

  /**
   * Cierra el modal
   */
  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.formulario.reset();
    this.ubicacionEditando.set(null);
  }

  /**
   * Guarda una ubicación (crear o actualizar)
   */
  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const formValue = this.formulario.value;
    this.cargando.set(true);

    if (this.modoEdicion()) {
      // Actualizar
      const dto: UbicacionGeograficaUpdateDto = {
        id: formValue.id,
        nombre: formValue.nombre,
        idTipoLv: formValue.idTipoLv,
        idPadre: formValue.idPadre || null,
        tipoOrden: formValue.tipoOrden || 'PA'
      };

      this.ubicacionesService.actualizar(dto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'La ubicación se actualizó correctamente'
          });
          this.cargarUbicacionesPorTipo(this.tipoSeleccionado()!.id);
          this.cerrarModal();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la ubicación'
          });
          this.cargando.set(false);
        }
      });
    } else {
      // Crear
      const dto: UbicacionGeograficaCreateDto = {
        nombre: formValue.nombre,
        idTipoLv: formValue.idTipoLv,
        idPadre: formValue.idPadre || null,
        tipoOrden: formValue.tipoOrden || 'PA'
      };

      this.ubicacionesService.crear(dto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Creado',
            detail: 'La ubicación se creó correctamente'
          });
          this.cargarUbicacionesPorTipo(this.tipoSeleccionado()!.id);
          this.cerrarModal();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la ubicación'
          });
          this.cargando.set(false);
        }
      });
    }
  }

  /**
   * Elimina una ubicación
   */
  eliminar(ubicacion: UbicacionGeografica): void {
    this.confirmationService.confirm({
      message: `¿Está seguro que desea eliminar "${ubicacion.nombre}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cargando.set(true);
        this.ubicacionesService.eliminar(ubicacion.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'La ubicación se eliminó correctamente'
            });
            this.cargarUbicacionesPorTipo(this.tipoSeleccionado()!.id);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar. Puede tener ubicaciones dependientes.'
            });
            this.cargando.set(false);
          }
        });
      }
    });
  }

  /**
   * Filtra ubicaciones según el texto de búsqueda y el padre seleccionado
   */
  filtrarUbicaciones(texto?: string): void {
    if (texto !== undefined) {
      this.textoBusqueda.set(texto);
    }
    
    this.aplicarFiltros();
  }

  /**
   * Filtra por ubicación padre
   */
  filtrarPorPadre(idPadre: string | null): void {
    this.padreSeleccionado.set(idPadre);
    this.aplicarFiltros();
  }

  /**
   * Aplica todos los filtros activos
   */
  private aplicarFiltros(): void {
    let resultado = [...this.ubicaciones()];
    
    // Filtro por texto de búsqueda
    const texto = this.textoBusqueda();
    if (texto && texto.trim() !== '') {
      const textoLower = texto.toLowerCase().trim();
      resultado = resultado.filter(ubicacion =>
        ubicacion.nombre.toLowerCase().includes(textoLower) ||
        (ubicacion.nombrePadre && ubicacion.nombrePadre.toLowerCase().includes(textoLower)) ||
        (ubicacion.nombreTipo && ubicacion.nombreTipo.toLowerCase().includes(textoLower))
      );
    }
    
    // Filtro por padre
    const idPadre = this.padreSeleccionado();
    if (idPadre) {
      resultado = resultado.filter(ubicacion => ubicacion.idPadre === idPadre);
    }
    
    this.ubicacionesFiltradas.set(resultado);
  }

  /**
   * Limpia todos los filtros
   */
  limpiarFiltros(): void {
    this.textoBusqueda.set('');
    this.padreSeleccionado.set(null);
    
    // Mantener filtros de país y departamento si aplican
    const tipoSeleccionado = this.tipoSeleccionado();
    if (tipoSeleccionado) {
      const nombreTipo = tipoSeleccionado.nombre.toLowerCase();
      
      // Si es departamento, mantener Colombia seleccionado y recargar
      if (nombreTipo.includes('departamento')) {
        this.paisSeleccionado.set(this.COLOMBIA_UUID);
        this.cargarDepartamentosPorPais(this.COLOMBIA_UUID);
      } 
      // Si es municipio/ciudad, solo limpiar departamento pero mantener país
      else if (nombreTipo.includes('ciudad') || nombreTipo.includes('municipio')) {
        this.departamentoSeleccionado.set(null);
        this.ubicaciones.set([]);
        this.ubicacionesFiltradas.set([]);
      } 
      // Para países u otros, simplemente aplicar filtros
      else {
        this.ubicacionesFiltradas.set(this.ubicaciones());
      }
    } else {
      this.ubicacionesFiltradas.set(this.ubicaciones());
    }
    
    this.messageService.add({
      severity: 'info',
      summary: 'Filtros restablecidos',
      detail: 'Se han limpiado los filtros de búsqueda',
      life: 2000
    });
  }

  /**
   * Limpia el filtro de búsqueda (mantiene compatibilidad)
   */
  limpiarBusqueda(): void {
    this.limpiarFiltros();
  }

  /**
   * Obtiene las ubicaciones que pueden ser padres (para el filtro)
   * Excluye las ubicaciones del mismo tipo
   */
  obtenerUbicacionesParaFiltro(): UbicacionGeografica[] {
    const tipoActual = this.tipoSeleccionado();
    if (!tipoActual) return [];
    
    // Obtener ubicaciones de tipos que pueden ser padres
    return this.todasLasUbicaciones().filter(u => 
      u.idTipoLv !== tipoActual.id && 
      this.ubicaciones().some(ub => ub.idPadre === u.id)
    );
  }

  /**
   * Obtiene las opciones para el filtro de padre (incluyendo la opción "Todas")
   */
  obtenerOpcionesFiltro(): Array<{id: string | null, nombre: string}> {
    const opciones = [{id: null, nombre: 'Todas las ubicaciones padre'}];
    const ubicaciones = this.obtenerUbicacionesParaFiltro().map(u => ({id: u.id, nombre: u.nombre}));
    return [...opciones, ...ubicaciones];
  }

  /**
   * Verifica si hay filtros activos
   */
  hayFiltrosActivos(): boolean {
    return !!this.textoBusqueda() || !!this.padreSeleccionado();
  }

  /**
   * Obtiene el nombre del tipo de ubicación
   */
  getNombreTipo(idTipo: string): string {
    const tipo = this.tipos().find(t => t.id === idTipo);
    return tipo?.nombre || 'Desconocido';
  }

  /**
   * Obtiene el nombre del padre de una ubicación
   */
  getNombrePadre(idPadre: string | null): string {
    if (!idPadre) return '-';
    const padre = this.todasLasUbicaciones().find(u => u.id === idPadre);
    return padre?.nombre || 'Desconocido';
  }

  /**
   * Verifica si el tipo seleccionado es País
   */
  esTipoPais(): boolean {
    const idTipo = this.formulario.get('idTipoLv')?.value;
    if (!idTipo) return false;
    const tipo = this.tipos().find(t => t.id === idTipo);
    if (!tipo) return false;
    const nombre = tipo.nombre.toLowerCase();
    return nombre.includes('país') || nombre.includes('pais');
  }

  /**
   * Obtiene el mensaje de ayuda para el selector de padre según el tipo
   */
  getMensajeAyudaPadre(): string {
    const idTipo = this.formulario.get('idTipoLv')?.value;
    if (!idTipo) return '';
    
    const tipo = this.tipos().find(t => t.id === idTipo);
    if (!tipo) return '';
    
    const nombre = tipo.nombre.toLowerCase();
    
    if (nombre.includes('departamento') || nombre.includes('estado') || nombre.includes('provincia')) {
      return 'Selecciona el país al que pertenece';
    } else if (nombre.includes('ciudad')) {
      return 'Selecciona el departamento al que pertenece';
    } else if (nombre.includes('municipio')) {
      return 'Selecciona la ciudad a la que pertenece';
    }
    
    return '';
  }

  // ==================== Métodos de Reordenamiento ====================

  /**
   * Activa/desactiva el modo de reordenamiento
   */
  toggleModoReordenar(): void {
    this.modoReordenar.set(!this.modoReordenar());
  }

  /**
   * Mueve una ubicación hacia arriba en el orden
   */
  moverUbicacionArriba(index: number): void {
    if (index === 0) return;
    
    const ubicacionesActuales = [...this.ubicacionesFiltradas()];
    // Intercambiar posiciones
    [ubicacionesActuales[index], ubicacionesActuales[index - 1]] = 
    [ubicacionesActuales[index - 1], ubicacionesActuales[index]];
    
    this.ubicacionesFiltradas.set(ubicacionesActuales);
    this.guardarNuevoOrdenUbicaciones();
  }

  /**
   * Mueve una ubicación hacia abajo en el orden
   */
  moverUbicacionAbajo(index: number): void {
    if (index === this.ubicacionesFiltradas().length - 1) return;
    
    const ubicacionesActuales = [...this.ubicacionesFiltradas()];
    // Intercambiar posiciones
    [ubicacionesActuales[index], ubicacionesActuales[index + 1]] = 
    [ubicacionesActuales[index + 1], ubicacionesActuales[index]];
    
    this.ubicacionesFiltradas.set(ubicacionesActuales);
    this.guardarNuevoOrdenUbicaciones();
  }

  /**
   * Cambia el orden de una ubicación al nuevo número especificado
   * El backend reorganizará automáticamente las demás ubicaciones
   */
  cambiarOrdenUbicacion(ubicacion: UbicacionGeografica, nuevoOrden: number | null): void {
    if (nuevoOrden === null || nuevoOrden < 1) {
      return;
    }

    // Optimista: actualizar UI primero
    const ordenAnterior = ubicacion.orden;
    
    this.cargando.set(true);
    this.ubicacionesService.cambiarOrden(ubicacion.id, nuevoOrden).subscribe({
      next: (response: { actualizados: number }) => {
        // Recargar la lista completa para reflejar todos los cambios
        const tipoActual = this.tipoSeleccionado();
        if (tipoActual) {
          this.cargarUbicacionesPorTipo(tipoActual.id);
        }
        this.actualizarTodasLasUbicaciones();
        this.cargando.set(false);
      },
      error: (error: any) => {
        // Recargar para volver al estado correcto
        const tipoActual = this.tipoSeleccionado();
        if (tipoActual) {
          this.cargarUbicacionesPorTipo(tipoActual.id);
        }
        this.cargando.set(false);
      }
    });
  }

  /**
   * Guarda el nuevo orden de ubicaciones en la base de datos
   */
  private guardarNuevoOrdenUbicaciones(): void {
    const ordenes = this.ubicacionesFiltradas().map((ubicacion, index) => ({
      id: ubicacion.id,
      orden: index + 1
    }));
    
    this.ubicacionesService.actualizarOrden(ordenes).subscribe({
      next: (response) => {
        // También actualizar el array de todas las ubicaciones
        this.actualizarTodasLasUbicaciones();
      },
      error: (error) => {
        // Recargar el orden original de la BD
        const tipoActual = this.tipoSeleccionado();
        if (tipoActual) {
          this.cargarUbicacionesPorTipo(tipoActual.id);
        }
      }
    });
  }

  /**
   * Actualiza el array de todas las ubicaciones después de reordenar
   */
  private actualizarTodasLasUbicaciones(): void {
    this.ubicacionesService.obtenerTodas().subscribe({
      next: (ubicaciones) => {
        this.todasLasUbicaciones.set(ubicaciones);
      }
    });
  }

  /**
   * Abre el modal para cambio masivo de tipo_orden
   */
  abrirModalCambioOrdenMasivo(): void {
    // Establecer el tipo de orden actual del tipo seleccionado como valor inicial
    const tipoActual = this.tipoSeleccionado();
    if (tipoActual?.tipoOrden) {
      this.tipoOrdenSeleccionado.set(tipoActual.tipoOrden);
    } else {
      this.tipoOrdenSeleccionado.set('PA');
    }
    this.mostrarModalOrdenMasivo.set(true);
  }

  /**
   * Cierra el modal de cambio masivo
   */
  cerrarModalOrdenMasivo(): void {
    this.mostrarModalOrdenMasivo.set(false);
  }

  /**
   * Aplica el cambio de tipo_orden a todas las ubicaciones del tipo seleccionado
   */
  aplicarCambioOrdenMasivo(nuevoTipoOrden: string): void {
    const tipoActual = this.tipoSeleccionado();
    if (!tipoActual) {
      return;
    }

    // Confirmar la acción
    const totalUbicaciones = this.ubicaciones().length;
    this.confirmationService.confirm({
      message: `¿Estás seguro de cambiar el tipo de ordenamiento de TODAS las ${totalUbicaciones} ubicaciones de tipo "${tipoActual.nombre}" a "${nuevoTipoOrden}"?\n\nEsta acción no se puede deshacer.`,
      header: 'Confirmar Cambio Masivo',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.cargando.set(true);
        this.ubicacionesService.actualizarTipoOrdenMasivo(tipoActual.id, nuevoTipoOrden).subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Actualizado',
              detail: `Se actualizó el tipo de ordenamiento de ${totalUbicaciones} ubicaciones exitosamente.`,
              life: 5000
            });
            this.cargarUbicacionesPorTipo(tipoActual.id);
            this.cerrarModalOrdenMasivo();
            this.cargando.set(false);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo actualizar el tipo de ordenamiento'
            });
            this.cargando.set(false);
          }
        });
      }
    });
  }
}
