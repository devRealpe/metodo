import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { LbEquipoUnidadService } from '../../core/services/lb-equipo-unidad.service';
import { LbEquipoAlmacenService } from '../../core/services/lb-equipo-almacen.service';
import { LbEquipoAccesorioService } from '../../core/services/lb-equipo-accesorio.service';
import { LbListaValoresEquipoService } from '../../core/services/lb-lista-valores-equipo.service';
import { LbEquipoUnidad, LbEquipoUnidadPayload } from '../../core/models/lb-equipo-unidad.model';
import { LbEquipoAlmacen } from '../../core/models/lb-equipo-almacen.model';
import { LbEquipoAccesorio } from '../../core/models/lb-equipo-accesorio.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-lista-equipos-unidad',
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
  templateUrl: './lb-lista-equipos-unidad.component.html',
})
export class LbListaEquiposUnidadComponent implements OnInit {

  private formBuilder         = inject(FormBuilder);
  private unidadService       = inject(LbEquipoUnidadService);
  private almacenService      = inject(LbEquipoAlmacenService);
  private accesorioService    = inject(LbEquipoAccesorioService);
  private listaValoresEquipoService = inject(LbListaValoresEquipoService);
  private confirmationService = inject(ConfirmationService);
  private messageService      = inject(MessageService);

  // ─── Estado ────────────────────────────────────────────────────────────────
  unidades   = signal<LbEquipoUnidad[]>([]);
  equipos    = signal<LbEquipoAlmacen[]>([]);
  accesorios = signal<LbEquipoAccesorio[]>([]);

  cargando         = false;
  guardandoEdicion = false;
  mostrarModal     = false;
  unidadSeleccionada: LbEquipoUnidad | null = null;
  filter = true;

  // ─── Filtros ───────────────────────────────────────────────────────────────
  filtroEquipoId = '';
  filtroSerial   = '';
  filtroPlaca    = '';
  filtroEstado   = '';

  // ─── Opciones select ───────────────────────────────────────────────────────
  estadoOpciones = signal<OpcionSelect[]>([
    { label: 'Todos los estados', value: '' },
    { label: 'Disponible',        value: 'disponible' },
    { label: 'Asignado',          value: 'asignado' },
    { label: 'En mantenimiento',  value: 'en_mantenimiento' },
    { label: 'Dado de baja',      value: 'dado_de_baja' },
  ]);

  estadoOpcionesForm = signal<OpcionSelect[]>([
    { label: 'Seleccionar estado...', value: '' },
    { label: 'Disponible',        value: 'disponible' },
    { label: 'Asignado',          value: 'asignado' },
    { label: 'En mantenimiento',  value: 'en_mantenimiento' },
    { label: 'Dado de baja',      value: 'dado_de_baja' },
  ]);

  categoriaOpcionesForm = signal<OpcionSelect[]>([
    { label: 'Seleccionar categoría...', value: '' },
  ]);

  equipoOpciones = computed<OpcionSelect[]>(() => [
    { label: 'Todos los equipos', value: '' },
    ...this.equipos().map(e => ({
      label: `${e.nombre}${e.marca ? ' · ' + e.marca : ''}${e.modelo ? ' · ' + e.modelo : ''}`.trim(),
      value: e.id,
    })),
  ]);

  equipoOpcionesForm = computed<OpcionSelect[]>(() => [
    { label: 'Seleccionar equipo...', value: '' },
    ...this.equipos().map(e => ({
      label: `${e.nombre}${e.marca ? ' · ' + e.marca : ''}${e.modelo ? ' · ' + e.modelo : ''}`.trim(),
      value: e.id,
    })),
  ]);

  accesorioOpciones = computed<OpcionSelect[]>(() =>
    this.accesorios()
      .filter(a => a.estado === 'funcional')
      .map(a => ({ label: a.nombre, value: a.id }))
  );

  // ─── Lista filtrada ────────────────────────────────────────────────────────
  get unidadesFiltradas(): LbEquipoUnidad[] {
    let lista = this.unidades();
    if (this.filtroEquipoId) lista = lista.filter(u => u.equipoAlmacen?.id === this.filtroEquipoId);
    if (this.filtroSerial)   lista = lista.filter(u => (u.serial ?? '').toLowerCase().includes(this.filtroSerial.toLowerCase()));
    if (this.filtroPlaca)    lista = lista.filter(u => (u.placa  ?? '').toLowerCase().includes(this.filtroPlaca.toLowerCase()));
    if (this.filtroEstado)   lista = lista.filter(u => u.estado === this.filtroEstado);
    return lista;
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroEquipoId || this.filtroSerial || this.filtroPlaca || this.filtroEstado);
  }

  // ─── Formulario edición ────────────────────────────────────────────────────
  formularioEdicion = this.formBuilder.group({
    idEquipoAlmacen:  ['', [Validators.required]],
    serial:           ['', [Validators.maxLength(100)]],
    placa:            ['', [Validators.maxLength(80)]],
    fechaAdquisicion: ['' as string | null],
    garantia:         ['' as string | null],
    valor:            [null as number | null, [Validators.min(0)]],
    estado:           ['disponible', [Validators.required]],
    observaciones:    ['', [Validators.maxLength(255)]],
    categoria:        ['' as string | null],
  });

  accesoriosSeleccionados: string[] = [];

  // ─── Ciclo de vida ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    Promise.allSettled([
      this.cargarUnidades(),
      this.cargarEquipos(),
      this.cargarAccesorios(),
      this.cargarEstadosHojaVida(),
      this.cargarCategoriasEquipo(),
    ]);
  }

  async cargarUnidades(): Promise<void> {
    this.cargando = true;
    try {
      const lista = await this.unidadService.getAll().toPromise();
      this.unidades.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las hojas de vida' });
    } finally {
      this.cargando = false;
    }
  }

  private async cargarEquipos(): Promise<void> {
    try {
      const lista = await this.almacenService.getAll().toPromise();
      this.equipos.set(Array.isArray(lista) ? lista : []);
    } catch { /* silencioso */ }
  }

  private async cargarAccesorios(): Promise<void> {
    try {
      const lista = await this.accesorioService.getAll().toPromise();
      this.accesorios.set(Array.isArray(lista) ? lista : []);
    } catch { /* silencioso */ }
  }

  private cargarEstadosHojaVida(): Promise<void> {
    return new Promise((resolve) => {
      this.listaValoresEquipoService.obtenerHijosPorNombrePadre('ESTADOS_HOJA_VIDA').subscribe({
        next: (lista) => {
          const opciones = lista.map(item => ({ label: item.nombre, value: item.nombre.toLowerCase() }));
          this.estadoOpciones.set([{ label: 'Todos los estados', value: '' }, ...opciones]);
          this.estadoOpcionesForm.set([{ label: 'Seleccionar estado...', value: '' }, ...opciones]);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  private cargarCategoriasEquipo(): Promise<void> {
    return new Promise((resolve) => {
      this.listaValoresEquipoService.obtenerHijosPorNombrePadre('CATEGORIA_EQUIPO').subscribe({
        next: (lista) => {
          this.categoriaOpcionesForm.set([
            { label: 'Seleccionar categoría...', value: '' },
            ...lista.map(item => ({ label: item.nombre, value: item.nombre })),
          ]);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  // ─── Filtros ───────────────────────────────────────────────────────────────
  limpiarFiltros(): void {
    this.filtroEquipoId = '';
    this.filtroSerial   = '';
    this.filtroPlaca    = '';
    this.filtroEstado   = '';
  }

  // ─── Edición (modal) ───────────────────────────────────────────────────────
  abrirEdicion(unidad: LbEquipoUnidad): void {
    this.unidadSeleccionada = unidad;
    this.accesoriosSeleccionados = unidad.accesorios ? [...unidad.accesorios] : [];
    this.formularioEdicion.patchValue({
      idEquipoAlmacen:  unidad.equipoAlmacen?.id ?? '',
      serial:           unidad.serial           ?? '',
      placa:            unidad.placa            ?? '',
      fechaAdquisicion: unidad.fechaAdquisicion ?? null,
      garantia:         unidad.garantia         ?? null,
      valor:            unidad.valor            ?? null,
      estado:           unidad.estado,
      observaciones:    unidad.observaciones    ?? '',
      categoria:        unidad.categoria        ?? '',
    });
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.unidadSeleccionada = null;
    this.formularioEdicion.reset({ estado: 'disponible', idEquipoAlmacen: '', serial: '', placa: '', fechaAdquisicion: null, garantia: null, valor: null, observaciones: '', categoria: null });
    this.accesoriosSeleccionados = [];
  }

  async guardarEdicion(): Promise<void> {
    if (this.formularioEdicion.invalid || !this.unidadSeleccionada) return;
    this.guardandoEdicion = true;
    try {
      const v = this.formularioEdicion.value;
      const payload: LbEquipoUnidadPayload = {
        serial:           v.serial           || undefined,
        placa:            v.placa            || undefined,
        fechaAdquisicion: v.fechaAdquisicion || null,
        garantia:         v.garantia         || null,
        valor:            v.valor != null ? +v.valor : null,
        estado:           v.estado || 'disponible',
        observaciones:    v.observaciones    || undefined,
        accesorios:       this.accesoriosSeleccionados.length ? this.accesoriosSeleccionados : undefined,
        categoria:        v.categoria || null,
      };
      await this.unidadService.update(this.unidadSeleccionada.id, v.idEquipoAlmacen || '', payload).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Hoja de vida actualizada correctamente' });
      this.cerrarModal();
      await this.cargarUnidades();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo actualizar la hoja de vida' });
    } finally {
      this.guardandoEdicion = false;
    }
  }

  // ─── Eliminar ──────────────────────────────────────────────────────────────
  confirmarEliminar(unidad: LbEquipoUnidad): void {
    const nombre = unidad.equipoAlmacen?.nombre ?? 'esta unidad';
    this.confirmationService.confirm({
      message: `¿Está seguro de eliminar la hoja de vida de "${nombre}"${unidad.serial ? ' (Serial: ' + unidad.serial + ')' : ''}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(unidad.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.unidadService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Hoja de vida eliminada correctamente' });
      await this.cargarUnidades();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo eliminar la hoja de vida' });
    }
  }

  // ─── Accesorios ───────────────────────────────────────────────────────────
  toggleAccesorio(id: string): void {
    const idx = this.accesoriosSeleccionados.indexOf(id);
    if (idx >= 0) this.accesoriosSeleccionados.splice(idx, 1);
    else this.accesoriosSeleccionados.push(id);
  }

  tieneAccesorio(id: string): boolean {
    return this.accesoriosSeleccionados.includes(id);
  }

  nombreAccesorios(ids: string[] | undefined): string {
    if (!ids?.length) return '-';
    return ids.map(id => this.accesorios().find(a => a.id === id)?.nombre ?? id).join(', ');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  etiquetaEstado(estado: string): string {
    const map: Record<string, string> = {
      disponible:       'Disponible',
      asignado:         'Asignado',
      en_mantenimiento: 'En mantenimiento',
      dado_de_baja:     'Dado de baja',
    };
    return map[estado] ?? estado;
  }

  colorEstado(estado: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      disponible:       { bg: 'var(--p-green-100)',  text: 'var(--p-green-800)' },
      asignado:         { bg: 'var(--p-blue-100)',   text: 'var(--p-blue-800)'  },
      en_mantenimiento: { bg: 'var(--p-orange-100)', text: 'var(--p-orange-800)'},
      dado_de_baja:     { bg: 'var(--p-surface-200)',text: 'var(--p-surface-600)'},
    };
    return map[estado] ?? { bg: 'var(--p-surface-100)', text: 'var(--p-text-color)' };
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
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['min']) return `El valor mínimo es ${e['min'].min}`;
    return 'Campo inválido';
  }
}
