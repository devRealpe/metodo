import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputComponent, SelectComponent, TextareaComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { LbMantenimientoEquipoService } from '../../core/services/lb-mantenimiento-equipo.service';
import { LbEquipoUnidadService } from '../../core/services/lb-equipo-unidad.service';
import { LbListaValoresEquipoService } from '../../core/services/lb-lista-valores-equipo.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { LbMantenimientoEquipo, LbMantenimientoEquipoPayload } from '../../core/models/lb-mantenimiento-equipo.model';
import { LbEquipoUnidad } from '../../core/models/lb-equipo-unidad.model';

interface OpcionSelect {
  label: string;
  value: string;
}

@Component({
  selector: 'app-lb-mantenimiento-equipo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TableModule,
    DialogModule,
    ConfirmDialogModule,
    TooltipModule,
    ProgressSpinnerModule,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    DatepickerComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './lb-mantenimiento-equipo.component.html',
})
export class LbMantenimientoEquipoComponent implements OnInit {

  private formBuilder           = inject(FormBuilder);
  private mantenimientoService  = inject(LbMantenimientoEquipoService);
  private equipoUnidadService   = inject(LbEquipoUnidadService);
  private listaValoresEquipoService = inject(LbListaValoresEquipoService);
  private usuariosOracleService = inject(UsuariosOracleService);
  private confirmationService   = inject(ConfirmationService);
  private messageService        = inject(MessageService);

  mantenimientos         = signal<LbMantenimientoEquipo[]>([]);
  equiposUnidad          = signal<LbEquipoUnidad[]>([]);
  historialEquipo        = signal<LbMantenimientoEquipo[]>([]);
  tiposMantenimientoOpciones = signal<OpcionSelect[]>([]);
  estadosOpciones        = signal<OpcionSelect[]>([]);
  laboratoristasOpciones = signal<OpcionSelect[]>([]);

  cargandoTabla     = false;
  cargando          = false;
  cargandoHistorial = false;

  mostrarDialogoRegistro  = false;
  mostrarDialogoHistorial = false;
  modoEdicion             = false;
  equipoParaAccion:          LbEquipoUnidad | null = null;
  mantenimientoSeleccionado: LbMantenimientoEquipo | null = null;

  busquedaTexto = signal('');

  equiposUnidadFiltrados = computed<LbEquipoUnidad[]>(() => {
    const q = this.busquedaTexto().toLowerCase().trim();
    if (!q) return this.equiposUnidad();
    return this.equiposUnidad().filter(e =>
      (e.equipoAlmacen?.nombre || '').toLowerCase().includes(q) ||
      (e.equipoAlmacen?.tipo   || '').toLowerCase().includes(q) ||
      (e.serial  || '').toLowerCase().includes(q) ||
      (e.placa   || '').toLowerCase().includes(q) ||
      (e.estado  || '').toLowerCase().includes(q)
    );
  });

  formMantenimiento = this.formBuilder.group({
    fechaProgramada:   [null as unknown as Date | null, [Validators.required]],
    fechaRealizada:    [null as unknown as Date | null],
    tipoMantenimiento: ['', [Validators.required, Validators.maxLength(50)]],
    estado:            ['programado', [Validators.required]],
    responsable:       ['', [Validators.maxLength(150)]],
    observaciones:     [''],
  });

  ngOnInit(): void {
    this.formMantenimiento.get('fechaRealizada')?.disable();
    Promise.allSettled([
      this.cargarMantenimientos(),
      this.cargarEquiposUnidad(),
      this.cargarTiposMantenimiento(),
      this.cargarEstadosMantenimiento(),
      this.cargarLaboratoristas(),
    ]);
  }

  async cargarMantenimientos(): Promise<void> {
    this.cargandoTabla = true;
    try {
      const lista = await this.mantenimientoService.getAll().toPromise();
      this.mantenimientos.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los mantenimientos' });
    } finally {
      this.cargandoTabla = false;
    }
  }

  private async cargarEquiposUnidad(): Promise<void> {
    try {
      const lista = await this.equipoUnidadService.getAll().toPromise();
      this.equiposUnidad.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'No se pudieron cargar las unidades de equipo' });
    }
  }

  private cargarTiposMantenimiento(): Promise<void> {
    return new Promise((resolve) => {
      this.listaValoresEquipoService.obtenerHijosPorNombrePadre('TIPO_MANTENIMIENTO').subscribe({
        next: (lista) => {
          this.tiposMantenimientoOpciones.set([
            { label: 'Seleccionar tipo...', value: '' },
            ...lista.map(item => ({ label: item.nombre, value: item.nombre.toLowerCase() })),
          ]);
          resolve();
        },
        error: () => {
          this.tiposMantenimientoOpciones.set([
            { label: 'Seleccionar tipo...', value: '' },
            { label: 'Preventivo',  value: 'preventivo'  },
            { label: 'Correctivo',  value: 'correctivo'  },
            { label: 'Solicitud',   value: 'solicitud'   },
            { label: 'Calibracion', value: 'calibracion' },
          ]);
          resolve();
        },
      });
    });
  }

  private cargarEstadosMantenimiento(): Promise<void> {
    return new Promise((resolve) => {
      this.listaValoresEquipoService.obtenerHijosPorNombrePadre('ESTADO_MANTENIMIENTO').subscribe({
        next: (lista) => {
          this.estadosOpciones.set([
            { label: 'Seleccionar estado...', value: '' },
            ...lista.map(item => ({ label: item.nombre, value: item.nombre.toLowerCase() })),
          ]);
          resolve();
        },
        error: () => {
          this.estadosOpciones.set([
            { label: 'Seleccionar estado...', value: '' },
            { label: 'Programado', value: 'programado' },
            { label: 'En proceso', value: 'en_proceso' },
            { label: 'Realizado',  value: 'realizado'  },
            { label: 'Cancelado',  value: 'cancelado'  },
          ]);
          resolve();
        },
      });
    });
  }

  private async cargarLaboratoristas(): Promise<void> {
    try {
      const lista = await this.usuariosOracleService.getByCargo('LABORATORISTA').toPromise();
      const opciones: OpcionSelect[] = [
        { label: 'Seleccionar responsable...', value: '' },
        ...((Array.isArray(lista) ? lista : []) as UsuarioOracle[]).map(u => ({
          label: u.nombre,
          value: u.nombre,
        })),
      ];
      this.laboratoristasOpciones.set(opciones);
    } catch { /* silencioso */ }
  }

  abrirDialogoRegistro(equipo: LbEquipoUnidad): void {
    this.equipoParaAccion = equipo;
    this.modoEdicion = false;
    this.mantenimientoSeleccionado = null;
    this.formMantenimiento.reset({ estado: 'programado', tipoMantenimiento: '', responsable: '', observaciones: '' });
    this.formMantenimiento.markAsUntouched();
    this.mostrarDialogoRegistro = true;
  }

  cerrarDialogoRegistro(): void {
    this.mostrarDialogoRegistro = false;
    this.equipoParaAccion = null;
    this.modoEdicion = false;
    this.mantenimientoSeleccionado = null;
    this.formMantenimiento.reset({ estado: 'programado', tipoMantenimiento: '', responsable: '', observaciones: '' });
    this.formMantenimiento.markAsUntouched();
  }

  async abrirDialogoHistorial(equipo: LbEquipoUnidad): Promise<void> {
    this.equipoParaAccion = equipo;
    this.cargandoHistorial = true;
    this.mostrarDialogoHistorial = true;
    try {
      const lista = await this.mantenimientoService.getByUnidad(equipo.id ?? '').toPromise();
      this.historialEquipo.set(Array.isArray(lista) ? lista : []);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial' });
    } finally {
      this.cargandoHistorial = false;
    }
  }

  cerrarDialogoHistorial(): void {
    this.mostrarDialogoHistorial = false;
    this.equipoParaAccion = null;
    this.historialEquipo.set([]);
  }

  marcarRealizado(equipo: LbEquipoUnidad): void {
    if (!this.tienePendiente(equipo)) {
      this.messageService.add({ severity: 'info', summary: 'Sin pendientes', detail: 'Este equipo no tiene mantenimientos pendientes' });
      return;
    }

    this.confirmationService.confirm({
      message: `Marcar como Realizado el mantenimiento pendiente de ${equipo.equipoAlmacen?.nombre}?`,
      header: 'Confirmar',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Si, marcar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          await this.mantenimientoService.marcarRealizado(equipo.id ?? '').toPromise();
          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Mantenimiento marcado como Realizado' });
          await this.cargarMantenimientos();
        } catch {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el estado' });
        }
      },
    });
  }

  async registrar(): Promise<void> {
    if (!this.equipoParaAccion) return;
    if (this.formMantenimiento.invalid) {
      this.formMantenimiento.markAllAsTouched();
      return;
    }
    this.cargando = true;
    try {
      const v = this.formMantenimiento.value;
      const payload: LbMantenimientoEquipoPayload = {
        fechaProgramada:   this.convertirFechaAISO(v.fechaProgramada as Date),
        fechaRealizada:    v.fechaRealizada ? this.convertirFechaAISO(v.fechaRealizada as Date) : null,
        tipoMantenimiento: v.tipoMantenimiento || '',
        estado:            v.estado || 'programado',
        responsable:       v.responsable || undefined,
        observaciones:     v.observaciones || undefined,
      };
      const idEquipoUnidad = this.equipoParaAccion.id ?? '';
      if (this.modoEdicion && this.mantenimientoSeleccionado) {
        await this.mantenimientoService.update(this.mantenimientoSeleccionado.id, idEquipoUnidad, payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Mantenimiento actualizado correctamente' });
      } else {
        await this.mantenimientoService.create(idEquipoUnidad, payload).toPromise();
        this.messageService.add({ severity: 'success', summary: 'Registrado', detail: 'Mantenimiento programado correctamente' });
      }
      this.cerrarDialogoRegistro();
      await this.cargarMantenimientos();
    } catch (err: unknown) {
      const serverMsg = (err as { error?: { error?: string } })?.error?.error;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: serverMsg || 'No se pudo guardar el mantenimiento' });
    } finally {
      this.cargando = false;
    }
  }

  editar(item: LbMantenimientoEquipo): void {
    this.modoEdicion = true;
    this.mantenimientoSeleccionado = item;
    const match = this.equiposUnidad().find(e => e.id === item.equipoUnidad?.id);
    this.equipoParaAccion = match ?? item.equipoUnidad ?? null;
    this.formMantenimiento.patchValue({
      fechaProgramada:   item.fechaProgramada ? this.parsearFechaLocal(item.fechaProgramada) as Date : null,
      fechaRealizada:    item.fechaRealizada  ? this.parsearFechaLocal(item.fechaRealizada)  as Date : null,
      tipoMantenimiento: item.tipoMantenimiento || '',
      estado:            item.estado || 'programado',
      responsable:       item.responsable || '',
      observaciones:     item.observaciones || '',
    });
    this.mostrarDialogoRegistro = true;
  }

  confirmarEliminar(item: LbMantenimientoEquipo): void {
    this.confirmationService.confirm({
      message: `Eliminar el mantenimiento "${item.tipoMantenimiento}" del equipo "${item.equipoUnidad?.equipoAlmacen?.nombre}"?`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Si, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminar(item.id),
    });
  }

  private async eliminar(id: string): Promise<void> {
    try {
      await this.mantenimientoService.delete(id).toPromise();
      this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Mantenimiento eliminado correctamente' });
      await this.cargarMantenimientos();
      if (this.mostrarDialogoHistorial && this.equipoParaAccion) {
        await this.abrirDialogoHistorial(this.equipoParaAccion);
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el mantenimiento' });
    }
  }

  esInvalido(campo: string): boolean {
    const control = this.formMantenimiento.get(campo);
    return !!(control?.invalid && (control.dirty || control.touched));
  }

  obtenerMensajeError(campo: string): string {
    const control = this.formMantenimiento.get(campo);
    if (!control?.errors) return '';
    const e = control.errors;
    if (e['required'])  return 'Este campo es obligatorio';
    if (e['maxlength']) return `Maximo ${e['maxlength'].requiredLength} caracteres`;
    return 'Campo invalido';
  }

  etiquetaEstado(estado: string): string {
    return this.estadosOpciones().find(e => e.value === estado)?.label ?? estado;
  }

  colorEstadoMant(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'programado': return { bg: '#EFF6FF', text: '#1D4ED8' };
      case 'en_proceso': return { bg: '#FFFBEB', text: '#B45309' };
      case 'realizado':  return { bg: '#F0FDF4', text: '#15803D' };
      case 'cancelado':  return { bg: '#FEF2F2', text: '#DC2626' };
      default:           return { bg: '#F9FAFB', text: '#374151' };
    }
  }

  colorEstadoEquipo(estado: string): { bg: string; text: string } {
    switch ((estado ?? '').toLowerCase()) {
      case 'asignado':      return { bg: '#EFF6FF', text: '#1D4ED8' };
      case 'disponible':    return { bg: '#F0FDF4', text: '#15803D' };
      case 'mantenimiento': return { bg: '#FFFBEB', text: '#B45309' };
      case 'baja':          return { bg: '#FEF2F2', text: '#DC2626' };
      default:              return { bg: '#F9FAFB', text: '#374151' };
    }
  }

  tienePendiente(equipo: LbEquipoUnidad): boolean {
    return this.mantenimientos().some(
      m => m.equipoUnidad?.id === equipo.id && m.estado !== 'realizado' && m.estado !== 'cancelado'
    );
  }

  /** Obtiene la ubicacion desde el campo ya almacenado en los mantenimientos del equipo. */
  obtenerUbicacion(idUnidad: string | undefined): string {
    if (!idUnidad) return 'Sin asignacion de aula';
    const mant = this.mantenimientos()
      .filter(m => m.equipoUnidad?.id === idUnidad && !!m.ubicacion)
      .sort((a, b) => (b.fechaProgramada ?? '').localeCompare(a.fechaProgramada ?? ''))[0];
    return mant?.ubicacion ?? 'Sin asignacion de aula';
  }

  private convertirFechaAISO(fecha: Date): string {
    const d  = new Date(fecha);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  private parsearFechaLocal(fechaStr: string): Date | null {
    if (!fechaStr) return null;
    const [y, m, d] = fechaStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
