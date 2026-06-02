import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { TarifasViaticosService, TarifaUbicacion } from '../../core/services/tarifas-viaticos.service';
import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ConceptosService } from '../../core/services/conceptos.service';
import { ListaValor } from '../../core/models/lista-valor.model';
import { UbicacionesGeograficasService, UbicacionGeografica } from '../../core/services/ubicaciones-geograficas.service';
import { SelectComponent } from "@microfrontends/shared-ui";

@Component({
  selector: 'app-registro-tarifas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    CardModule,
    CheckboxModule,
    SelectComponent
  ],
  providers: [MessageService],
  templateUrl: './registro-tarifas.component.html',
  styleUrl: './registro-tarifas.component.scss',
})
export class RegistroTarifasComponent implements OnInit {
  private tarifasService = inject(TarifasViaticosService);
  private listasValoresService = inject(ListasValoresService);
  private conceptosService = inject(ConceptosService);
  private ubicacionesService = inject(UbicacionesGeograficasService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  volverAInicio(): void {
    this.router.navigate(['/app/inicio']);
  }

  tarifaSeleccionada: TarifaUbicacion = this.crearTarifaVacia();

  categorias: ListaValor[] = [];
  categoriasOptions: { label: string; value: string }[] = [];
  conceptos: ListaValor[] = [];
  conceptosOptions: { label: string; value: string }[] = [];
  tiposTransporte: ListaValor[] = [];
  tiposTransporteOptions: { label: string; value: string }[] = [];
  
  // Países dinámicos
  paises: UbicacionGeografica[] = [];
  paisesOptions: { label: string; value: string }[] = [];
  paisSeleccionado = '';
  loadingPaises = false;
  
  departamentos: UbicacionGeografica[] = [];
  departamentosOptions: { label: string; value: string }[] = [];
  municipios: UbicacionGeografica[] = [];
  municipiosOptions: { label: string; value: string }[] = [];
  private _departamentoSeleccionado = '';

  get departamentoSeleccionado(): string {
    return this._departamentoSeleccionado;
  }

  set departamentoSeleccionado(value: string) {
    this._departamentoSeleccionado = value;
    this.onDepartamentoChange(value);
  }

  aniosVigencia: { label: string; value: number }[] = [];

  // Tarifa Internacional
  esInternacional = false;
  
  // Verificar si el concepto seleccionado es de transporte
  get esConceptoTransporte(): boolean {
    if (!this.tarifaSeleccionada.conceptoCodigo) return false;
    // Como ahora guardamos el nombre completo, buscamos directamente si contiene TRANSPORTE
    return this.tarifaSeleccionada.conceptoCodigo.toUpperCase().includes('TRANSPORTE');
  }
  paisInternacionalSeleccionado = '';
  ciudadesInternacionales: { label: string; value: string }[] = [];
  loadingCiudadesInternacionales = false;

  loading = false;
  loadingDepartamentos = false;
  loadingMunicipios = false;
  loadingCategorias = false;
  loadingConceptos = false;
  loadingTiposTransporte = false;

  // Valor formateado para mostrar
  valorUnitarioFormateado = '';

  ngOnInit(): void {
    this.inicializarAniosVigencia();
    this.cargarCategorias();
    this.cargarConceptos();
    this.cargarTiposTransporte();
    this.cargarPaises();
  }

  // Inicializa los años de vigencia (año actual ± 2 años)
  private inicializarAniosVigencia(): void {
    const anioActual = new Date().getFullYear();
    const anios: number[] = [];
    
    // Generar años: 2 años atrás, año actual, y 5 años adelante
    for (let i = -2; i <= 5; i++) {
      anios.push(anioActual + i);
    }
    
    this.aniosVigencia = anios.map(anio => ({
      label: anio.toString(),
      value: anio
    }));
  }

  /**
   * Carga todos los países disponibles desde el servicio
   */
  private cargarPaises(): void {
    this.loadingPaises = true;
    
    this.ubicacionesService.getPaises().subscribe({
      next: (paises) => {
        this.loadingPaises = false;
        this.paises = paises;
        
        // Actualizar opciones según el tipo de tarifa
        this.actualizarOpcionesPaises();
        
        // Establecer Colombia como país por defecto si no es internacional
        if (!this.esInternacional) {
          const colombia = paises.find(p => p.nombre === 'Colombia');
          if (colombia) {
            this.paisSeleccionado = colombia.id;
            this.cargarDepartamentos(colombia.id);
          }
        }
      },
      error: (error) => {
        this.loadingPaises = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los países'
        });
        
        // Fallback: crear opción manual de Colombia
        this.paisesOptions = [{ label: 'Colombia', value: 'Colombia' }];
        this.paisSeleccionado = 'Colombia';
        this.cargarDepartamentos('Colombia');
      }
    });
  }

  /**
   * Actualiza las opciones de países según si es tarifa internacional o no
   */
  private actualizarOpcionesPaises(): void {
    if (this.esInternacional) {
      // Internacional: todos los países alfabéticamente (sin Colombia primero)
      this.paisesOptions = this.paises
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(p => ({
          label: p.nombre,
          value: p.id
        }));
    } else {
      // Nacional: solo Colombia
      const colombia = this.paises.find(p => p.nombre === 'Colombia');
      if (colombia) {
        this.paisesOptions = [{
          label: 'Colombia',
          value: colombia.id
        }];
      } else {
        this.paisesOptions = [];
      }
    }
  }

  /**
   * Carga las ciudades internacionales disponibles desde el backend
   */
  private cargarCiudadesInternacionales(): void {
    this.loadingCiudadesInternacionales = true;

    this.tarifasService.getCiudadesInternacionales().subscribe({
      next: (ciudades) => {
        this.loadingCiudadesInternacionales = false;
        
        if (ciudades.length > 0) {
          this.ciudadesInternacionales = ciudades.map(ciudad => ({
            label: ciudad,
            value: ciudad
          }));
        } else {
          // Si no hay ciudades internacionales, agregar opciones comunes como sugerencia
          this.ciudadesInternacionales = [
            { label: 'Miami', value: 'Miami' },
            { label: 'New York', value: 'New York' },
            { label: 'Madrid', value: 'Madrid' },
            { label: 'París', value: 'París' },
            { label: 'Ciudad de México', value: 'Ciudad de México' },
            { label: 'Buenos Aires', value: 'Buenos Aires' },
            { label: 'Lima', value: 'Lima' },
            { label: 'Quito', value: 'Quito' }
          ];
        }
      },
      error: (error) => {
        this.loadingCiudadesInternacionales = false;
        
        // En caso de error, proporcionar ciudades comunes como alternativa
        this.ciudadesInternacionales = [
          { label: 'Miami', value: 'Miami' },
          { label: 'New York', value: 'New York' },
          { label: 'Madrid', value: 'Madrid' },
          { label: 'París', value: 'París' },
          { label: 'Ciudad de México', value: 'Ciudad de México' },
          { label: 'Buenos Aires', value: 'Buenos Aires' },
          { label: 'Lima', value: 'Lima' },
          { label: 'Quito', value: 'Quito' }
        ];
        
        this.messageService.add({
          severity: 'warn',
          summary: 'Atención',
          detail: 'No se pudieron cargar las ciudades internacionales. Se muestran ciudades comunes.'
        });
      }
    });
  }



  // Carga categorías desde listas de valores
  private cargarCategorias(): void {
    this.loadingCategorias = true;
    this.listasValoresService.obtenerPorTipo('CAT').subscribe({
      next: (response: ListaValor[]) => {
        const categorias = response
          .filter((item) => item.idPadre !== null)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0));
        
        this.loadingCategorias = false;
        this.categorias = categorias;
        this.categoriasOptions = categorias
          .filter(c => c.abreviatura)
          .map(c => ({
            label: c.nombre,
            value: c.abreviatura as string // Usar abreviatura para categorías (C0, C1, etc.)
          }));
      },
      error: () => {
        this.loadingCategorias = false;
        this.categoriasOptions = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar categorías'
        });
      }
    });
  }

  // Carga conceptos desde la base de datos
  private cargarConceptos(): void {
    this.loadingConceptos = true;
    
    // ID del concepto padre "Conceptos de liquidación de viáticos" en ge_listas_valores
    const idPadreConceptos = '0650f49b-afdf-4856-8893-8de4df5ff10a';
    
    this.listasValoresService.obtenerHijos(idPadreConceptos).subscribe({
      next: (response) => {
        
        const conceptos = Array.isArray(response) ? response : [];
        
        if (conceptos.length === 0) {
        }
        
        // Guardar los conceptos completos
        this.conceptos = conceptos;
        
        // Mapear los campos de ListaValor a los campos esperados para conceptos
        // Eliminando tildes para que coincidan con la BD
        this.conceptosOptions = conceptos.map(lv => ({
          label: lv.nombre,
          value: this.eliminarTildes(lv.nombre) // Nombre sin tildes
        }));
        
        this.loadingConceptos = false;
      },
      error: (error) => {
       this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los conceptos'
        });
        this.loadingConceptos = false;
      }
    });
  }

  /**
   * Obtiene el nombre corto del concepto para mostrar en el selector
   */
  private getNombreCortoConcepto(nombreCompleto: string): string {
    if (nombreCompleto.includes('ALIMENTACION')) return 'Alimentación';
    if (nombreCompleto.includes('ALOJAMIENTO')) return 'Alojamiento';
    if (nombreCompleto.includes('TRANSPORTE')) return 'Transporte';
    return nombreCompleto;
  }

  // Carga tipos de transporte desde listas de valores
  private cargarTiposTransporte(): void {
    this.loadingTiposTransporte = true;
    
    this.listasValoresService.obtenerPorTipo('TRT').subscribe({
      next: (response: ListaValor[]) => {
        const tiposTransporte = response
          .filter((item) => item.idPadre !== null)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0));
        
        this.loadingTiposTransporte = false;
        this.tiposTransporte = tiposTransporte;
        this.tiposTransporteOptions = tiposTransporte
          .filter(t => t.abreviatura)
          .map(t => ({
            label: t.nombre,
            value: t.abreviatura as string
          }));
        
      },
      error: (error) => {
        this.loadingTiposTransporte = false;
        this.tiposTransporteOptions = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar tipos de transporte'
        });
      }
    });
  }

  // Carga departamentos del país seleccionado
  private cargarDepartamentos(paisId?: string): void {
    this.loadingDepartamentos = true;
    const idPais = paisId || this.paisSeleccionado;
    
    if (!idPais) {
      this.loadingDepartamentos = false;
      return;
    }

    this.ubicacionesService.getDepartamentosPorPais(idPais).subscribe({
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
          detail: 'Error al cargar departamentos/estados'
        });
      }
    });
  }

  /**
   * Maneja el cambio de país
   */
  onPaisChange(paisId: string): void {
    const paisSeleccionado = this.paises.find(p => p.id === paisId);
    
    if (!paisSeleccionado) return;
    
    // Limpiar selecciones anteriores
    this.limpiarUbicaciones();
    
    // Todos los países cargan departamentos/estados
    this.esInternacional = paisSeleccionado.nombre !== 'Colombia';
    this.cargarDepartamentos(paisId);
    this.tarifaSeleccionada.paisNombre = paisSeleccionado.nombre;
  }

  /**
   * Carga ciudades de un país internacional específico
   */
  private cargarCiudadesInternacionalesPorPais(paisId: string): void {
    this.loadingCiudadesInternacionales = true;
    this.ciudadesInternacionales = [];
    
    this.ubicacionesService.getCiudadesByPais(paisId).subscribe({
      next: (ciudades) => {
        this.loadingCiudadesInternacionales = false;
        
        if (ciudades.length > 0) {
          this.ciudadesInternacionales = ciudades
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map(ciudad => ({
              label: ciudad.nombre,
              value: ciudad.nombre
            }));
        } else {
          // Si no hay ciudades en la BD, permitir ingreso manual o usar ciudades del backend
          this.cargarCiudadesInternacionales();
          this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'No hay ciudades registradas para este país. Se muestran ciudades internacionales disponibles.'
          });
        }
      },
      error: (error) => {
        this.loadingCiudadesInternacionales = false;
        // Fallback: cargar ciudades internacionales genéricas del backend
        this.cargarCiudadesInternacionales();
      }
    });
  }

  /**
   * Limpia ubicaciones al cambiar de país
   */
  private limpiarUbicaciones(): void {
    this._departamentoSeleccionado = '';
    this.municipios = [];
    this.municipiosOptions = [];
    this.ciudadesInternacionales = [];
    this.tarifaSeleccionada.departamentoNombre = '';
    this.tarifaSeleccionada.ubicacionNombre = '';
    this.tarifaSeleccionada.municipioNombre = '';
  }

  // Maneja cambio de departamento desde ngModel
  onDepartamentoChangeEvent(departamentoId: string): void {
    this._departamentoSeleccionado = departamentoId;
    this.onDepartamentoChange(departamentoId);
  }

  // Carga municipios del departamento seleccionado
  onDepartamentoChange(departamentoId: string): void {
    if (!departamentoId) {
      this.limpiarMunicipios();
      return;
    }

    this.asignarNombreDepartamento(departamentoId);
    this.cargarMunicipios(departamentoId);
  }

  // Limpia datos de municipios
  private limpiarMunicipios(): void {
    this.municipios = [];
    this.municipiosOptions = [];
    this.tarifaSeleccionada.ubicacionNombre = '';
  }

  // Asigna nombre del departamento seleccionado
  private asignarNombreDepartamento(departamentoId: string): void {
    const departamento = this.departamentos.find(d => d.id === departamentoId);
    if (departamento) {
      this.tarifaSeleccionada.departamentoNombre = departamento.nombre;
    }
  }

  // Carga municipios por departamento
  private cargarMunicipios(departamentoId: string): void {
    this.loadingMunicipios = true;
    this.limpiarMunicipios();
    
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
        this.municipios = [];
        this.municipiosOptions = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar municipios'
        });
      }
    });
  }

  /**
   * Maneja el cambio del checkbox de tarifa internacional
   */
  onInternacionalChange(esInternacional: boolean): void {
    this.esInternacional = esInternacional;

    // Actualizar opciones de países según el tipo de tarifa
    this.actualizarOpcionesPaises();
    
    // Limpiar ubicaciones
    this.limpiarUbicaciones();

    if (esInternacional) {
      // Internacional: limpiar selección de país para forzar selección
      this.paisSeleccionado = '';
      
      if (this.paisesOptions.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atención',
          detail: 'No hay países disponibles. Por favor agregue países en el sistema.'
        });
      }
    } else {
      // Nacional: seleccionar automáticamente Colombia
      const colombia = this.paises.find(p => p.nombre === 'Colombia');
      if (colombia) {
        this.paisSeleccionado = colombia.id;
        this.onPaisChange(colombia.id);
      }
    }
  }

  // Limpia el formulario para crear nueva tarifa
  limpiarFormulario(): void {
    this.tarifaSeleccionada = this.crearTarifaVacia();
    
    // Restablecer a tarifa nacional (no internacional)
    this.esInternacional = false;
    this.paisInternacionalSeleccionado = '';
    this.ciudadesInternacionales = [];
    
    // Actualizar opciones de países (solo Colombia para nacional)
    this.actualizarOpcionesPaises();
    
    // Seleccionar Colombia por defecto
    const colombia = this.paises.find(p => p.nombre === 'Colombia');
    if (colombia) {
      this.paisSeleccionado = colombia.id;
      this.cargarDepartamentos(colombia.id);
    }
    
    this._departamentoSeleccionado = '';
    this.municipios = [];
    this.municipiosOptions = [];
  }

  /**
   * Crea una nueva tarifa
   * El backend se encarga automáticamente de:
   * - Mapear códigos (CATEGORIA_1 -> C1, etc.)
   * - Inferir campos de ubicación (país, departamento, municipio)
   * - Establecer moneda por defecto (COP)
   */
  crearTarifa(): void {
    if (!this.validarTarifa()) {
      return;
    }

    this.loading = true;

    // Solo enviamos los datos básicos, el backend se encarga del resto
    this.tarifasService.crearTarifa(this.tarifaSeleccionada).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Tarifa creada correctamente'
        });
        this.limpiarFormulario();
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        const errorMsg = error?.error?.mensaje || error?.error?.errores?.join(', ') || 'Error al crear la tarifa';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg
        });
      }
    });
  }



  // Valida campos requeridos de tarifa
  validarTarifa(): boolean {
    if (!this.paisSeleccionado || !this.paisSeleccionado.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El país es requerido'
      });
      return false;
    }

    // Validar ubicación según tipo (nacional o internacional)
    if (this.esInternacional) {
      if (!this.tarifaSeleccionada.ubicacionNombre?.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validación',
          detail: 'La ciudad internacional es requerida'
        });
        return false;
      }
    } else {
      if (!this.tarifaSeleccionada.departamentoNombre?.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validación',
          detail: 'El departamento es requerido'
        });
        return false;
      }

      if (!this.tarifaSeleccionada.ubicacionNombre?.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validación',
          detail: 'El municipio/ciudad es requerido'
        });
        return false;
      }
    }

    if (!this.tarifaSeleccionada.categoriaCodigo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'La categoría es requerida'
      });
      return false;
    }

    if (!this.tarifaSeleccionada.conceptoCodigo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El concepto es requerido'
      });
      return false;
    }

    if (!this.tarifaSeleccionada.valorUnitario || this.tarifaSeleccionada.valorUnitario <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El valor unitario debe ser mayor a cero'
      });
      return false;
    }

    if (!this.tarifaSeleccionada.anioVigencia) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El año de vigencia es requerido'
      });
      return false;
    }

    return true;
  }

  /**
   * Obtiene el nombre de la categoría desde el código
   */
  obtenerNombreCategoria(abreviatura: string): string {
    const categoria = this.categorias.find(c => c.abreviatura === abreviatura);
    return categoria ? categoria.nombre : abreviatura;
  }

  /**
   * Elimina tildes y caracteres especiales de un texto
   */
  private eliminarTildes(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  /**
   * Obtiene el nombre del concepto desde el código
   */
  obtenerNombreConcepto(nombreConcepto: string): string {
    const concepto = this.conceptos.find(c => c.nombre === nombreConcepto);
    return concepto ? this.getNombreCortoConcepto(concepto.nombre) : nombreConcepto;
  }

  /**
   * Crea una tarifa vacía para el año actual
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
      anioVigencia: new Date().getFullYear()
    };
  }

  /**
   * Formatea el valor unitario con separador de miles y símbolo de pesos
   */
  formatearValorMoneda(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/[^\d]/g, ''); // Solo números
    
    if (valor === '') {
      this.tarifaSeleccionada.valorUnitario = 0;
      this.valorUnitarioFormateado = '';
      return;
    }

    const numeroValor = parseInt(valor, 10);
    this.tarifaSeleccionada.valorUnitario = numeroValor;
    this.valorUnitarioFormateado = this.formatearPesos(numeroValor);
  }

  /**
   * Formatea un número a formato de pesos colombianos
   */
  formatearPesos(valor: number): string {
    if (!valor || valor === 0) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  /**
   * Maneja el evento blur del input para formatear el valor
   */
  onValorBlur(): void {
    if (this.tarifaSeleccionada.valorUnitario > 0) {
      this.valorUnitarioFormateado = this.formatearPesos(this.tarifaSeleccionada.valorUnitario);
    }
  }

  /**
   * Maneja el evento focus del input para mostrar el valor sin formato
   */
  onValorFocus(): void {
    this.valorUnitarioFormateado = this.tarifaSeleccionada.valorUnitario > 0 
      ? this.tarifaSeleccionada.valorUnitario.toString() 
      : '';
  }


}
