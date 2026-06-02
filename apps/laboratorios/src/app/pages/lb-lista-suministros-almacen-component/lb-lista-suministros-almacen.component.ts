import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { LbSuministroAlmacenService } from '../../core/services/lb-suministro-almacen.service';
import { LbSuministroAlmacen } from '../../core/models/lb-suministro-almacen.model';
import { LbListaValoresSuministroService } from '../../core/services/lb-lista-valores-suministro.service';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-lista-suministros-almacen',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    ProgressSpinnerModule,
    InputComponent,
    SelectComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-lista-suministros-almacen.component.html',
})
export class LbListaSuministrosAlmacenComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private suministroAlmacenService = inject(LbSuministroAlmacenService);
  private listaValoresSuministroService = inject(LbListaValoresSuministroService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  suministros = signal<LbSuministroAlmacen[]>([]);
  categoriasOpciones = signal<OpcionSelect[]>([]);
  undMedidasOpciones = signal<OpcionSelect[]>([]);
  categoriaEdicionOpciones = signal<OpcionSelect[]>([{ label: 'Seleccionar categoría...', value: '' }]);
  undMedidaEdicionOpciones = signal<OpcionSelect[]>([{ label: 'Seleccionar unidad de medida...', value: '' }]);

  cargando = false;
  guardandoEdicion = false;
  mostrarModalEdicion = false;
  suministroSeleccionado: LbSuministroAlmacen | null = null;
  filter = true;

  // Filtros
  filtroTexto = '';
  filtroCategoria = '';
  filtroUndMedida = '';

  get suministrosFiltrados(): LbSuministroAlmacen[] {
    let lista = this.suministros();
    const texto = this.filtroTexto.toLowerCase().trim();
    if (texto) lista = lista.filter(s =>
      s.nombre.toLowerCase().includes(texto) ||
      s.codigo.toLowerCase().includes(texto)
    );
    if (this.filtroCategoria) lista = lista.filter(s => s.categoria === this.filtroCategoria);
    if (this.filtroUndMedida) lista = lista.filter(s => s.undMedida === this.filtroUndMedida);
    return lista;
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroTexto || this.filtroCategoria || this.filtroUndMedida);
  }

  formularioEdicion = this.formBuilder.group({
    codigo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    categoria: ['', [Validators.required, Validators.maxLength(80)]],
    undMedida: ['', [Validators.required, Validators.maxLength(30)]],
    stock: [0 as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.cargarSuministros();
    this.listaValoresSuministroService.obtenerHijosPorNombrePadre('TIPO_SUMINISTRO').subscribe({
      next: (valores) => {
        const opciones = valores.map(v => ({ label: v.nombre, value: v.nombre }));
        this.categoriaEdicionOpciones.set([{ label: 'Seleccionar categoría...', value: '' }, ...opciones]);
        this.categoriasOpciones.set([{ label: 'Todas las categorías', value: '' }, ...opciones]);
      },
    });
    this.listaValoresSuministroService.obtenerHijosPorNombrePadre('UND_MEDIDA_SUMINISTRO').subscribe({
      next: (valores) => {
        const opciones = valores.map(v => ({ label: v.nombre, value: v.nombre }));
        this.undMedidaEdicionOpciones.set([{ label: 'Seleccionar unidad de medida...', value: '' }, ...opciones]);
        this.undMedidasOpciones.set([{ label: 'Todas las unidades', value: '' }, ...opciones]);
      },
    });
  }

  async cargarSuministros(): Promise<void> {
    this.cargando = true;
    try {
      const lista = await this.suministroAlmacenService.getAll().toPromise();
      this.suministros.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los suministros' });
    } finally {
      this.cargando = false;
    }
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroCategoria = '';
    this.filtroUndMedida = '';
  }

  editarSuministro(suministro: LbSuministroAlmacen): void {
    this.suministroSeleccionado = suministro;
    this.formularioEdicion.patchValue({
      codigo: suministro.codigo,
      nombre: suministro.nombre,
      categoria: suministro.categoria,
      undMedida: suministro.undMedida,
      stock: suministro.stock,
    });
    this.mostrarModalEdicion = true;
  }

  cerrarModalEdicion(): void {
    this.mostrarModalEdicion = false;
    this.suministroSeleccionado = null;
    this.formularioEdicion.reset({ codigo: '', nombre: '', categoria: '', undMedida: '', stock: 0 });
  }

  async guardarEdicion(): Promise<void> {
    if (this.formularioEdicion.invalid || !this.suministroSeleccionado) return;
    this.guardandoEdicion = true;
    try {
      const v = this.formularioEdicion.value;
      const payload: Partial<Omit<LbSuministroAlmacen, 'id'>> = {
        codigo: v.codigo || '',
        nombre: v.nombre || '',
        categoria: v.categoria || '',
        undMedida: v.undMedida || '',
        stock: v.stock ?? 0,
      };
      await this.suministroAlmacenService.update(this.suministroSeleccionado.id, payload).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `"${payload.nombre}" actualizado correctamente` });
      this.cerrarModalEdicion();
      await this.cargarSuministros();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el suministro' });
    } finally {
      this.guardandoEdicion = false;
    }
  }

  confirmarEliminar(suministro: LbSuministroAlmacen): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el suministro "${suministro.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(suministro.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.suministroAlmacenService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Suministro eliminado correctamente' });
      await this.cargarSuministros();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el suministro' });
    }
  }

  esInvalido(campo: string): boolean {
    const control = this.formularioEdicion.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formularioEdicion.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es obligatorio';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['min']) return `El valor mínimo es ${e['min'].min}`;
    return 'Campo inválido';
  }
}
