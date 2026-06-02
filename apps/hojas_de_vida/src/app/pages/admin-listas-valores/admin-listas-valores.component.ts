import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

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

// Services
import { ConfirmationService, MessageService } from 'primeng/api';

import { ListasValoresService } from '../../core/services/listas-valores.service';
import { ListaValor, TipoOrden, TIPOS_ORDEN_LABELS, ListaValorCreateDto, ListaValorUpdateDto } from '../../core/models/lista-valor.model';

interface ListaValorNode extends ListaValor {
  hijos?: ListaValorNode[];
  expandido?: boolean;
  nivel?: number;
}

@Component({
  selector: 'app-admin-listas-valores',
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
    SkeletonModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-listas-valores.component.html',
  styleUrls: ['./admin-listas-valores.component.scss']
})
export class AdminListasValoresComponent implements OnInit {
  
  // Signals para el estado
  tipos = signal<string[]>([]);
  tiposConNombre = signal<{tipo: string, nombre: string}[]>([]); // Nuevos tipos con nombre completo
  tipoSeleccionado = signal<string | null>(null);
  valores = signal<ListaValorNode[]>([]);
  valoresPlanos = signal<ListaValor[]>([]);
  valoresFiltrados = signal<ListaValorNode[]>([]);
  cargando = signal<boolean>(false);
  
  // Búsqueda
  textoBusqueda = signal<string>('');
  
  // Modal y formulario
  mostrarModal = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  formulario!: FormGroup;
  valorEditando = signal<ListaValor | null>(null);
  
  // Constantes
  tiposOrden = [
    { value: TipoOrden.ALFABETICO_ASC, label: TIPOS_ORDEN_LABELS[TipoOrden.ALFABETICO_ASC] },
    { value: TipoOrden.ALFABETICO_DESC, label: TIPOS_ORDEN_LABELS[TipoOrden.ALFABETICO_DESC] },
    { value: TipoOrden.PERSONALIZADO_ASC, label: TIPOS_ORDEN_LABELS[TipoOrden.PERSONALIZADO_ASC] },
    { value: TipoOrden.PERSONALIZADO_DESC, label: TIPOS_ORDEN_LABELS[TipoOrden.PERSONALIZADO_DESC] }
  ];
  tiposOrdenLabels = TIPOS_ORDEN_LABELS;

  constructor(
    private listasValoresService: ListasValoresService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarTipos();
  }

  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      abreviatura: ['', Validators.maxLength(10)],
      tipo: ['', [Validators.required, Validators.maxLength(5)]],
      tipoOrden: [''],
      orden: [null, [Validators.min(0)]],
      idPadre: [null]
    });
  }

  cargarTipos(): void {
    this.cargando.set(true);
    this.listasValoresService.obtenerTipos().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        // Obtener los nombres completos de cada tipo
        this.cargarNombresCompletos(tipos);
      },
      error: (error) => {
        this.cargando.set(false);
      }
    });
  }

  private cargarNombresCompletos(tipos: string[]): void {
    // Obtener el primer registro de cada tipo para obtener su nombre completo
    const observables = tipos.map(tipo => 
      this.listasValoresService.obtenerRaicesPorTipo(tipo)
    );

    // Usar forkJoin para esperar a que todas las peticiones terminen
    forkJoin(observables).subscribe({
      next: (resultados) => {
        const tiposConNombre = tipos.map((tipo, index) => {
          const raices = resultados[index];
          // Buscar la raíz que representa el tipo
          const raizTipo = raices.find(r => r.tipo === tipo && !r.idPadre);
          return {
            tipo: tipo,
            nombre: raizTipo ? raizTipo.nombre : tipo
          };
        });
        this.tiposConNombre.set(tiposConNombre);
        this.cargando.set(false);
      },
      error: (error) => {
        const tiposConNombre = tipos.map(tipo => ({
          tipo: tipo,
          nombre: tipo
        }));
        this.tiposConNombre.set(tiposConNombre);
        this.cargando.set(false);
      }
    });
  }

  seleccionarTipo(tipo: string): void {
    this.tipoSeleccionado.set(tipo);
    this.cargarValoresPorTipo(tipo);
  }

  cargarValoresPorTipo(tipo: string): void {
    this.cargando.set(true);
    this.textoBusqueda.set(''); 
    this.listasValoresService.obtenerPorTipo(tipo).subscribe({
      next: (valores) => {
        this.valoresPlanos.set(valores);
        const jerarquia = this.construirJerarquia(valores);
        this.valores.set(jerarquia);
        this.valoresFiltrados.set(jerarquia);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
      }
    });
  }

  private construirJerarquia(valores: ListaValor[]): ListaValorNode[] {
    const map = new Map<string, ListaValorNode>();
    const raices: ListaValorNode[] = [];

    // Crear mapa de todos los valores
    valores.forEach((valor) => {
      map.set(valor.id, { 
        ...valor, 
        hijos: [], 
        expandido: false,
        nivel: 0
      });
    });

    // Construir jerarquía
    valores.forEach((valor) => {
      const nodo = map.get(valor.id);
      if (nodo) {
        if (valor.idPadre) {
          const padre = map.get(valor.idPadre);
          if (padre && padre.hijos) {
            nodo.nivel = (padre.nivel || 0) + 1;
            padre.hijos.push(nodo);
          }
        } else {
          raices.push(nodo);
        }
      }
    });

    return raices;
  }

  // Método para filtrar valores por texto de búsqueda
  filtrarValores(texto: string): void {
    this.textoBusqueda.set(texto);
    
    if (!texto || texto.trim() === '') {
      // Si no hay búsqueda, mostrar todos
      this.valoresFiltrados.set(this.valores());
      return;
    }

    const textoLower = texto.toLowerCase().trim();
    const valoresFiltrados = this.filtrarNodosRecursivo(this.valores(), textoLower);
    this.valoresFiltrados.set(valoresFiltrados);
  }

  private filtrarNodosRecursivo(nodos: ListaValorNode[], textoBusqueda: string): ListaValorNode[] {
    const resultado: ListaValorNode[] = [];

    nodos.forEach(nodo => {
      // Verificar si el nodo actual coincide
      const coincideNombre = nodo.nombre.toLowerCase().includes(textoBusqueda);
      const coincideAbreviatura = nodo.abreviatura?.toLowerCase().includes(textoBusqueda);
      const coincide = coincideNombre || coincideAbreviatura;

      // Filtrar hijos recursivamente
      const hijosFiltrados = nodo.hijos ? this.filtrarNodosRecursivo(nodo.hijos, textoBusqueda) : [];

      // Incluir el nodo si coincide o si tiene hijos que coinciden
      if (coincide || hijosFiltrados.length > 0) {
        resultado.push({
          ...nodo,
          hijos: hijosFiltrados,
          expandido: hijosFiltrados.length > 0 
        });
      }
    });

    return resultado;
  }

  // Limpiar búsqueda
  limpiarBusqueda(): void {
    this.textoBusqueda.set('');
    this.valoresFiltrados.set(this.valores());
  }

  aplanarJerarquia(nodos: ListaValorNode[]): ListaValorNode[] {
    const resultado: ListaValorNode[] = [];
    
    const aplanar = (nodos: ListaValorNode[]) => {
      nodos.forEach(nodo => {
        resultado.push(nodo);
        if (nodo.expandido && nodo.hijos && nodo.hijos.length > 0) {
          aplanar(nodo.hijos);
        }
      });
    };
    
    aplanar(nodos);
    return resultado;
  }

  toggleExpansion(nodo: ListaValorNode): void {
    nodo.expandido = !nodo.expandido;
    // Forzar actualización de la vista
    this.valores.set([...this.valores()]);
  }

  abrirModalCrear(padre?: ListaValor): void {
    this.modoEdicion.set(false);
    this.valorEditando.set(null);
    this.formulario.reset({
      tipo: this.tipoSeleccionado(),
      idPadre: padre?.id || null,
      tipoOrden: padre ? null : TipoOrden.ALFABETICO_ASC
    });
    this.mostrarModal.set(true);
  }

  abrirModalEditar(valor: ListaValor): void {
    this.modoEdicion.set(true);
    this.valorEditando.set(valor);
    this.formulario.patchValue({
      nombre: valor.nombre,
      abreviatura: valor.abreviatura,
      tipo: valor.tipo,
      tipoOrden: valor.tipoOrden,
      orden: valor.orden,
      idPadre: valor.idPadre
    });
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.formulario.reset();
    this.valorEditando.set(null);
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.value;
    this.cargando.set(true);

    if (this.modoEdicion()) {
      // Actualizar
      const id = this.valorEditando()?.id;
      const esRaiz = !this.valorEditando()?.idPadre;
      const cambioTipoOrden = esRaiz && 
        this.valorEditando()?.tipoOrden !== datos.tipoOrden && 
        datos.tipoOrden;
      
      if (id) {
        this.listasValoresService.actualizar(id, datos as ListaValorUpdateDto).subscribe({
          next: () => {
            this.cerrarModal();
            
            // Mostrar mensaje de éxito
            if (cambioTipoOrden) {
              this.messageService.add({
                severity: 'success',
                summary: 'Actualizado',
                detail: 'Tipo de orden actualizado exitosamente. Se aplicó a todos los elementos hijos.',
                life: 5000
              });
            } else {
              this.messageService.add({
                severity: 'success',
                summary: 'Actualizado',
                detail: 'El valor se actualizó correctamente'
              });
            }
            
            this.cargarValoresPorTipo(this.tipoSeleccionado()!);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo actualizar: ' + error.message
            });
            this.cargando.set(false);
          }
        });
      }
    } else {
      this.listasValoresService.crear(datos as ListaValorCreateDto).subscribe({
        next: () => {
          this.cerrarModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Creado',
            detail: 'El valor se creó correctamente'
          });
          this.cargarValoresPorTipo(this.tipoSeleccionado()!);
          this.cargarTipos(); // Recargar tipos por si es uno nuevo
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear: ' + error.message
          });
          this.cargando.set(false);
        }
      });
    }
  }

  eliminar(valor: ListaValorNode): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar "${valor.nombre}"?${valor.hijos?.length ? '\n\nEsto también eliminará sus elementos hijos.' : ''}`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cargando.set(true);
        this.listasValoresService.eliminar(valor.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'El valor se eliminó correctamente'
            });
            this.cargarValoresPorTipo(this.tipoSeleccionado()!);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar: ' + error.message
            });
            this.cargando.set(false);
          }
        });
      }
    });
  }

  get valoresAplanados(): ListaValorNode[] {
    return this.aplanarJerarquia(this.valoresFiltrados());
  }

  esRaiz(valor: ListaValor): boolean {
    return !valor.idPadre;
  }

  obtenerTipoOrdenLabel(tipoOrden?: string): string {
    if (!tipoOrden) return 'No definido';
    return this.tiposOrdenLabels[tipoOrden as TipoOrden] || tipoOrden;
  }

  obtenerNombreTipo(tipo: string): string {
    const tipoInfo = this.tiposConNombre().find(t => t.tipo === tipo);
    return tipoInfo ? tipoInfo.nombre : tipo;
  }
}
