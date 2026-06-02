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
import { LbEquipoAlmacenService } from '../../core/services/lb-equipo-almacen.service';
import { LbEquipoAlmacen } from '../../core/models/lb-equipo-almacen.model';
import { LbMarcaService } from '../../core/services/lb-marca.service';
import { LbListaValoresEquipoService } from '../../core/services/lb-lista-valores-equipo.service';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-lista-equipos-almacen',
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
  templateUrl: './lb-lista-equipos-almacen.component.html',
})
export class LbListaEquiposAlmacenComponent implements OnInit {

  private formBuilder = inject(FormBuilder);
  private equipoAlmacenService = inject(LbEquipoAlmacenService);
  private marcaService = inject(LbMarcaService);
  private listaValoresEquipoService = inject(LbListaValoresEquipoService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  equipos = signal<LbEquipoAlmacen[]>([]);
  tiposOpciones = signal<OpcionSelect[]>([]);
  marcasOpciones = signal<OpcionSelect[]>([]);
  modelosOpciones = signal<OpcionSelect[]>([]);
  marcaEdicionOpciones = signal<OpcionSelect[]>([{ label: 'Seleccionar marca...', value: '' }]);
  tipoEdicionOpciones = signal<OpcionSelect[]>([{ label: 'Seleccionar tipo...', value: '' }]);

  cargando = false;
  guardandoEdicion = false;
  mostrarModalEdicion = false;
  equipoSeleccionado: LbEquipoAlmacen | null = null;
  filter = true;

  // Filtros
  filtroNombre = '';
  filtroTipo = '';
  filtroMarca = '';
  filtroModelo = '';

  get equiposFiltrados(): LbEquipoAlmacen[] {
    let lista = this.equipos();
    const nombre = this.filtroNombre.toLowerCase().trim();
    if (nombre) lista = lista.filter(e => e.nombre.toLowerCase().includes(nombre));
    if (this.filtroTipo) lista = lista.filter(e => e.tipo === this.filtroTipo);
    if (this.filtroMarca) lista = lista.filter(e => (e.marca ?? '') === this.filtroMarca);
    if (this.filtroModelo) lista = lista.filter(e => (e.modelo ?? '') === this.filtroModelo);
    return lista;
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroNombre || this.filtroTipo || this.filtroMarca || this.filtroModelo);
  }

  formularioEdicion = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    tipo: ['', [Validators.required, Validators.maxLength(80)]],
    marca: ['', [Validators.maxLength(80)]],
    modelo: ['', [Validators.maxLength(120)]],
    stock: [0 as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.cargarEquipos();
    this.marcaService.getAll().subscribe({
      next: (marcas) => {
        const activas = marcas
          .filter(m => m.estado === 'Activa')
          .map(m => ({ label: m.nombre, value: m.nombre }));
        this.marcaEdicionOpciones.set([{ label: 'Seleccionar marca...', value: '' }, ...activas]);
      },
    });
    this.listaValoresEquipoService.obtenerHijosPorNombrePadre('TIPO_EQUIPO').subscribe({
      next: (valores) => {
        const opciones = [
          { label: 'Seleccionar tipo...', value: '' },
          ...valores.map(v => ({ label: v.nombre, value: v.nombre })),
        ];
        this.tipoEdicionOpciones.set(opciones);
        this.tiposOpciones.set([
          { label: 'Todos los tipos', value: '' },
          ...valores.map(v => ({ label: v.nombre, value: v.nombre })),
        ]);
      },
    });
  }

  async cargarEquipos(): Promise<void> {
    this.cargando = true;
    try {
      const lista = await this.equipoAlmacenService.getAll().toPromise();
      const arr = Array.isArray(lista) ? lista : [];
      this.equipos.set(arr);
      this.actualizarOpciones(arr);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos' });
    } finally {
      this.cargando = false;
    }
  }

  private actualizarOpciones(lista: LbEquipoAlmacen[]): void {
    const tipos = [...new Set(lista.map(e => e.tipo).filter(Boolean))].sort();
    const marcas = [...new Set(lista.map(e => e.marca).filter((m): m is string => !!m))].sort();
    const modelos = [...new Set(lista.map(e => e.modelo).filter((m): m is string => !!m))].sort();
    this.tiposOpciones.set([
      { label: 'Todos los tipos', value: '' },
      ...tipos.map(t => ({ label: t, value: t })),
    ]);
    this.marcasOpciones.set([
      { label: 'Todas las marcas', value: '' },
      ...marcas.map(m => ({ label: m, value: m })),
    ]);
    this.modelosOpciones.set([
      { label: 'Todos los modelos', value: '' },
      ...modelos.map(m => ({ label: m, value: m })),
    ]);
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroTipo = '';
    this.filtroMarca = '';
    this.filtroModelo = '';
  }

  editarEquipo(equipo: LbEquipoAlmacen): void {
    this.equipoSeleccionado = equipo;
    this.formularioEdicion.patchValue({
      nombre: equipo.nombre,
      tipo: equipo.tipo,
      marca: equipo.marca || '',
      modelo: equipo.modelo || '',
      stock: equipo.stock,
    });
    this.mostrarModalEdicion = true;
  }

  cerrarModalEdicion(): void {
    this.mostrarModalEdicion = false;
    this.equipoSeleccionado = null;
    this.formularioEdicion.reset({ nombre: '', tipo: '', marca: '', modelo: '', stock: 0 });
  }

  async guardarEdicion(): Promise<void> {
    if (this.formularioEdicion.invalid || !this.equipoSeleccionado) return;
    this.guardandoEdicion = true;
    try {
      const v = this.formularioEdicion.value;
      const payload: Partial<Omit<LbEquipoAlmacen, 'id'>> = {
        nombre: v.nombre || '',
        tipo: v.tipo || '',
        marca: v.marca || undefined,
        modelo: v.modelo || undefined,
        stock: v.stock ?? 0,
      };
      await this.equipoAlmacenService.update(this.equipoSeleccionado.id, payload).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `"${payload.nombre}" actualizado correctamente` });
      this.cerrarModalEdicion();
      await this.cargarEquipos();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el equipo' });
    } finally {
      this.guardandoEdicion = false;
    }
  }

  confirmarEliminar(equipo: LbEquipoAlmacen): void {
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar el equipo "${equipo.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(equipo.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.equipoAlmacenService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Equipo eliminado correctamente' });
      await this.cargarEquipos();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el equipo' });
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
