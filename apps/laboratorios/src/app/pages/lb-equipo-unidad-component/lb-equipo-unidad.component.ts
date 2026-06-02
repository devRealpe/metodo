import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { LbEquipoUnidadService } from '../../core/services/lb-equipo-unidad.service';
import { LbEquipoAlmacenService } from '../../core/services/lb-equipo-almacen.service';
import { LbEquipoAccesorioService } from '../../core/services/lb-equipo-accesorio.service';
import { LbListaValoresEquipoService } from '../../core/services/lb-lista-valores-equipo.service';
import { LbEquipoUnidadPayload } from '../../core/models/lb-equipo-unidad.model';
import { LbEquipoAlmacen } from '../../core/models/lb-equipo-almacen.model';
import { LbEquipoAccesorio } from '../../core/models/lb-equipo-accesorio.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-equipo-unidad',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ToastModule,
    InputComponent,
    SelectComponent,
    DatepickerComponent,
  ],
  providers: [MessageService],
  templateUrl: './lb-equipo-unidad.component.html',
})
export class LbEquipoUnidadComponent implements OnInit {

  private formBuilder      = inject(FormBuilder);
  private unidadService    = inject(LbEquipoUnidadService);
  private almacenService   = inject(LbEquipoAlmacenService);
  private accesorioService = inject(LbEquipoAccesorioService);
  private listaValoresEquipoService = inject(LbListaValoresEquipoService);
  private messageService   = inject(MessageService);

  // ─── Estado ────────────────────────────────────────────────────────────────
  equipos     = signal<LbEquipoAlmacen[]>([]);
  accesorios  = signal<LbEquipoAccesorio[]>([]);

  cargando = false;

  // ─── Opciones select ───────────────────────────────────────────────────────
  estadoOpciones = signal<OpcionSelect[]>([
    { label: 'Seleccionar estado...', value: '' },
    { label: 'Disponible',       value: 'disponible' },
    { label: 'Asignado',         value: 'asignado' },
    { label: 'En mantenimiento', value: 'en_mantenimiento' },
    { label: 'Dado de baja',     value: 'dado_de_baja' },
  ]);

  categoriaOpciones = signal<OpcionSelect[]>([
    { label: 'Seleccionar categoría...', value: '' },
  ]);

  equipoOpcionesForm = computed<OpcionSelect[]>(() => {
    const pendientes = this.equipos().filter(e => {
      const registradas = e.unidadesDisponibles ?? 0;
      return (e.stock - registradas) > 0;
    });
    return [
      { label: 'Seleccionar equipo...', value: '' },
      ...pendientes.map(e => {
        const registradas = e.unidadesDisponibles ?? 0;
        const sinRegistrar = e.stock - registradas;
        const base = `${e.nombre}${e.marca ? ' · ' + e.marca : ''}${e.modelo ? ' · ' + e.modelo : ''}`.trim();
        return {
          label: `${base} — ${registradas} registrada(s), ${sinRegistrar} pendiente(s)`,
          value: e.id,
        };
      }),
    ];
  });

  accesorioOpciones = computed<OpcionSelect[]>(() =>
    this.accesorios()
      .filter(a => a.estado === 'funcional')
      .map(a => ({ label: a.nombre, value: a.id }))
  );

  // ─── Formulario ───────────────────────────────────────────────────────────
  formUnidad = this.formBuilder.group({
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

  // accesorios seleccionados (lista de IDs)
  accesoriosSeleccionados: string[] = [];

  // ─── Ciclo de vida ─────────────────────────────────────────────────────────
  ngOnInit(): void {
    Promise.allSettled([
      this.cargarEquipos(),
      this.cargarAccesorios(),
      this.cargarEstadosHojaVida(),
      this.cargarCategoriasEquipo(),
    ]);
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
          this.estadoOpciones.set([
            { label: 'Seleccionar estado...', value: '' },
            ...lista.map(item => ({ label: item.nombre, value: item.nombre.toLowerCase() })),
          ]);
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
          this.categoriaOpciones.set([
            { label: 'Seleccionar categoría...', value: '' },
            ...lista.map(item => ({ label: item.nombre, value: item.nombre })),
          ]);
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  async registrar(): Promise<void> {
    if (this.formUnidad.invalid) {
      this.formUnidad.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const v = this.formUnidad.value;
      const payload: LbEquipoUnidadPayload = {
        serial:           v.serial   || undefined,
        placa:            v.placa    || undefined,
        fechaAdquisicion: v.fechaAdquisicion || null,
        garantia:         v.garantia || null,
        valor:            v.valor != null ? +v.valor : null,
        estado:           v.estado || 'disponible',
        observaciones:    v.observaciones || undefined,
        accesorios:       this.accesoriosSeleccionados.length ? this.accesoriosSeleccionados : undefined,
        categoria:        v.categoria || null,
      };

      const idAlmacen = v.idEquipoAlmacen || '';

      await this.unidadService.create(idAlmacen, payload).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Registrado', detail: 'Hoja de vida registrada correctamente' });

      this.limpiarFormulario();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo guardar la hoja de vida' });
    } finally {
      this.cargando = false;
    }
  }

  limpiarFormulario(): void {
    this.formUnidad.reset({ estado: 'disponible', idEquipoAlmacen: '', serial: '', placa: '', fechaAdquisicion: null, garantia: null, valor: null, observaciones: '', categoria: null });
    this.formUnidad.markAsUntouched();
    this.accesoriosSeleccionados = [];
  }

  // ─── Accesorios ───────────────────────────────────────────────────────────
  toggleAccesorio(id: string): void {
    const idx = this.accesoriosSeleccionados.indexOf(id);
    if (idx >= 0) {
      this.accesoriosSeleccionados.splice(idx, 1);
    } else {
      this.accesoriosSeleccionados.push(id);
    }
  }

  tieneAccesorio(id: string): boolean {
    return this.accesoriosSeleccionados.includes(id);
  }

  nombreAccesorios(ids: string[] | undefined): string {
    if (!ids?.length) return '-';
    return ids
      .map(id => this.accesorios().find(a => a.id === id)?.nombre ?? id)
      .join(', ');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  esInvalido(campo: string): boolean {
    const control = this.formUnidad.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formUnidad.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required']) return 'Este campo es obligatorio';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['min']) return `El valor mínimo es ${e['min'].min}`;
    return 'Campo inválido';
  }
}
