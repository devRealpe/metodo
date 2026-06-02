import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  tipos = signal<string[]>([]);
  tiposConNombre = signal<{tipo: string, nombre: string}[]>([]);
  tipoSeleccionado = signal<string | null>(null);
  valores = signal<ListaValorNode[]>([]);
  valoresPlanos = signal<ListaValor[]>([]);
  valoresFiltrados = signal<ListaValorNode[]>([]);
  cargando = signal<boolean>(false);

  textoBusqueda = signal<string>('');

  mostrarModal = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  formulario!: FormGroup;
  valorEditando = signal<ListaValor | null>(null);

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
    
    this.listasValoresService.obtenerTiposConNombres().subscribe({
      next: (tiposConNombre: any) => {
        const tiposArray = Array.isArray(tiposConNombre) 
          ? tiposConNombre 
          : (tiposConNombre?.data || []);
        
        const tipos = tiposArray.map((t: any) => t.tipo);
        this.tipos.set(tipos);
        this.tiposConNombre.set(tiposArray);
        this.cargando.set(false);
      },
      error: (error) => {
        this.messageService.add({ 
          severity: 'warn', 
          summary: 'Catálogo', 
          detail: 'No se pudieron cargar los tipos de listas' 
        });
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

    valores.forEach((valor) => {
      map.set(valor.id, {
        ...valor,
        hijos: [],
        expandido: false,
        nivel: 0
      });
    });

    valores.forEach((valor) => {
      const nodo = map.get(valor.id);
      if (nodo) {
        if (valor.idPadre) {
          const padre = map.get(valor.idPadre);
          if (padre && padre.hijos) {
            nodo.nivel = (padre.nivel || 0) + 1;
            padre.hijos!.push(nodo);
          }
        } else {
          raices.push(nodo);
        }
      }
    });

    return raices;
  }

  filtrarValores(texto: string): void {
    this.textoBusqueda.set(texto);
    if (!texto || texto.trim() === '') {
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
      const coincideNombre = nodo.nombre.toLowerCase().includes(textoBusqueda);
      const coincideAbreviatura = nodo.abreviatura?.toLowerCase().includes(textoBusqueda);
      const coincide = coincideNombre || coincideAbreviatura;

      const hijosFiltrados = nodo.hijos ? this.filtrarNodosRecursivo(nodo.hijos, textoBusqueda) : [];

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

  abrirModalCrearTipo(): void {
    this.modoEdicion.set(false);
    this.valorEditando.set(null);
    this.formulario.reset({
      nombre: '',
      abreviatura: '',
      tipo: '',
      tipoOrden: TipoOrden.ALFABETICO_ASC,
      orden: null,
      idPadre: null
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

    const datos = this.formulario.value as ListaValorCreateDto | ListaValorUpdateDto;
    this.cargando.set(true);

    if (this.modoEdicion()) {
      const id = this.valorEditando()?.id;
      const esRaiz = !this.valorEditando()?.idPadre;
      const cambioTipoOrden = esRaiz && this.valorEditando()?.tipoOrden !== datos.tipoOrden && datos.tipoOrden;

      if (id) {
        this.listasValoresService.actualizar(id, datos as ListaValorUpdateDto).subscribe({
          next: () => {
            this.cerrarModal();
            if (cambioTipoOrden) {
              this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Tipo de orden actualizado exitosamente. Se aplicó a todos los elementos hijos.', life: 5000 });
            } else {
              this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'El valor se actualizó correctamente' });
            }
            this.cargarValoresPorTipo(this.tipoSeleccionado()!);
          },
          error: (error) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar: ' + error.message });
            this.cargando.set(false);
          }
        });
      }
    } else {
      this.listasValoresService.crear(datos as ListaValorCreateDto).subscribe({
        next: () => {
          this.cerrarModal();
          this.messageService.add({ severity: 'success', summary: 'Creado', detail: 'El valor se creó correctamente' });
          this.cargarValoresPorTipo(this.tipoSeleccionado()!);
          this.cargarTipos();
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear: ' + error.message });
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
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'El valor se eliminó correctamente' });
            this.cargarValoresPorTipo(this.tipoSeleccionado()!);
          },
          error: (error) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar: ' + error.message });
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

  editarTipo(tipo: string): void {
    if (this.tipoSeleccionado() !== tipo || this.valoresPlanos().length === 0) {
      this.cargando.set(true);
      this.listasValoresService.obtenerPorTipo(tipo).subscribe({
        next: (valores) => {
          const raiz = valores.find(v => v.tipo === tipo && !v.idPadre);
          this.cargando.set(false);
          if (raiz) {
            this.abrirModalEditar(raiz);
          } else {
            this.messageService.add({ 
              severity: 'warn', 
              summary: 'Advertencia', 
              detail: 'No se encontró el elemento raíz de este tipo' 
            });
          }
        },
        error: (error) => {
          this.cargando.set(false);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudieron cargar los valores del tipo' 
          });
        }
      });
    } else {
      const raiz = this.valoresPlanos().find(v => v.tipo === tipo && !v.idPadre);
      if (raiz) {
        this.abrirModalEditar(raiz);
      } else {
        this.messageService.add({ 
          severity: 'warn', 
          summary: 'Advertencia', 
          detail: 'No se encontró el elemento raíz de este tipo' 
        });
      }
    }
  }

  eliminarTipo(tipo: string): void {
    if (this.tipoSeleccionado() !== tipo || this.valoresPlanos().length === 0) {
      this.cargando.set(true);
      this.listasValoresService.obtenerPorTipo(tipo).subscribe({
        next: (valores) => {
          const raiz = valores.find(v => v.tipo === tipo && !v.idPadre);
          this.cargando.set(false);
          if (raiz) {
            this.confirmarEliminacionTipo(raiz);
          } else {
            this.messageService.add({ 
              severity: 'warn', 
              summary: 'Advertencia', 
              detail: 'No se encontró el elemento raíz de este tipo' 
            });
          }
        },
        error: (error) => {
          this.cargando.set(false);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudieron cargar los valores del tipo' 
          });
        }
      });
    } else {
      const raiz = this.valoresPlanos().find(v => v.tipo === tipo && !v.idPadre);
      if (raiz) {
        this.confirmarEliminacionTipo(raiz);
      } else {
        this.messageService.add({ 
          severity: 'warn', 
          summary: 'Advertencia', 
          detail: 'No se encontró el elemento raíz de este tipo' 
        });
      }
    }
  }

  private confirmarEliminacionTipo(raiz: ListaValor): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el tipo "${raiz.nombre}"?\n\nEsto eliminará TODOS los valores asociados a este tipo.`,
      header: 'Confirmar Eliminación de Tipo',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cargando.set(true);
        this.listasValoresService.eliminar(raiz.id).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Eliminado', 
              detail: 'El tipo y todos sus valores se eliminaron correctamente' 
            });
            this.tipoSeleccionado.set(null);
            this.valores.set([]);
            this.valoresPlanos.set([]);
            this.cargarTipos();
          },
          error: (error) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'No se pudo eliminar el tipo: ' + error.message 
            });
            this.cargando.set(false);
          }
        });
      }
    });
  }

  trackByTipo(_index: number, item: { tipo: string, nombre: string }): string {
    return item.tipo;
  }
}
