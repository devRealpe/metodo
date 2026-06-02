import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { LbEquipoUnidadService } from '../../core/services/lb-equipo-unidad.service';
import { LbEquipoAulaService } from '../../core/services/lb-equipo-aula.service';
import { LbMantenimientoEquipoService } from '../../core/services/lb-mantenimiento-equipo.service';
import { LbEquipoAccesorioService } from '../../core/services/lb-equipo-accesorio.service';
import { LbEquipoAlmacenService } from '../../core/services/lb-equipo-almacen.service';
import { LbReservaEquipoService } from '../../core/services/lb-reserva-equipo.service';
import { LbDevolucionEquipoService } from '../../core/services/lb-devolucion-equipo.service';
import { LbEquipoUnidad } from '../../core/models/lb-equipo-unidad.model';
import { LbEquipoAlmacen } from '../../core/models/lb-equipo-almacen.model';
import { LbEquipoAula } from '../../core/models/lb-equipo-aula.model';
import { LbMantenimientoEquipo } from '../../core/models/lb-mantenimiento-equipo.model';
import { LbEquipoAccesorio } from '../../core/models/lb-equipo-accesorio.model';
import { LbReservaEquipo } from '../../core/models/lb-reserva-equipo.model';
import { LbDevolucionEquipo } from '../../core/models/lb-devolucion-equipo.model';
import { forkJoin } from 'rxjs';

export interface FilaHistorialReserva {
  reserva: LbReservaEquipo;
  devolucion: LbDevolucionEquipo | null;
  estadoDevolucion: string;
  observacionesDevolucion: string;
}

@Component({
  selector: 'app-lb-historial-equipo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    ProgressSpinnerModule,
    TagModule,
    TableModule,
    InputComponent,
    SelectComponent,
  ],
  providers: [MessageService],
  templateUrl: './lb-historial-equipo.component.html',
})
export class LbHistorialEquipoComponent implements OnInit {

  private unidadService        = inject(LbEquipoUnidadService);
  private almacenService       = inject(LbEquipoAlmacenService);
  private aulaService          = inject(LbEquipoAulaService);
  private mantenimientoService = inject(LbMantenimientoEquipoService);
  private accesorioService     = inject(LbEquipoAccesorioService);
  private reservaService       = inject(LbReservaEquipoService);
  private devolucionService    = inject(LbDevolucionEquipoService);
  private messageService       = inject(MessageService);

  // ─── Estado ───────────────────────────────────────────────────────────────
  unidades   = signal<LbEquipoUnidad[]>([]);
  equipos    = signal<LbEquipoAlmacen[]>([]);
  accesorios = signal<LbEquipoAccesorio[]>([]);

  cargando        = false;
  cargandoDetalle = false;
  mostrarDialogo  = false;
  descargandoPdf  = false;

  unidadSeleccionada: LbEquipoUnidad | null = null;
  asignaciones:    LbEquipoAula[]           = [];
  mantenimientos:  LbMantenimientoEquipo[]  = [];
  historialReservas: FilaHistorialReserva[] = [];

  // ─── Filtros ────────────────────────────────────────────────────────────────
  filtroEquipoId = '';
  filtroSerial   = '';
  filtroPlaca    = '';
  filtroEstado   = '';

  // ─── Opciones select ───────────────────────────────────────────────────────
  estadoOpciones = signal([
    { label: 'Todos los estados', value: '' },
    { label: 'Disponible',        value: 'disponible' },
    { label: 'Asignado',          value: 'asignado' },
    { label: 'En mantenimiento',  value: 'en_mantenimiento' },
    { label: 'Dado de baja',      value: 'dado_de_baja' },
  ]);

  equipoOpciones = computed(() => [
    { label: 'Todos los equipos', value: '' },
    ...this.equipos().map(e => ({ label: e.nombre, value: e.id })),
  ]);

  // ─── Ciclo de vida ──────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    forkJoin({
      unidades:   this.unidadService.getAll(),
      equipos:    this.almacenService.getAll(),
      accesorios: this.accesorioService.getAll(),
    }).subscribe({
      next: ({ unidades, equipos, accesorios }) => {
        const toArray = (r: unknown): unknown[] => Array.isArray(r) ? r as unknown[] : ((r as { content?: unknown[] })?.content ?? []);
        this.unidades.set(toArray(unidades) as LbEquipoUnidad[]);
        this.equipos.set(toArray(equipos) as LbEquipoAlmacen[]);
        this.accesorios.set(toArray(accesorios) as LbEquipoAccesorio[]);
        this.cargando = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de equipos.' });
        this.cargando = false;
      },
    });
  }

  // ─── Filtrado ───────────────────────────────────────────────────────────────
  get unidadesFiltradas(): LbEquipoUnidad[] {
    return this.unidades().filter(u => {
      const porEquipo = !this.filtroEquipoId || u.equipoAlmacen?.id === this.filtroEquipoId;
      const porSerial = !this.filtroSerial   || (u.serial ?? '').toLowerCase().includes(this.filtroSerial.toLowerCase());
      const porPlaca  = !this.filtroPlaca    || (u.placa  ?? '').toLowerCase().includes(this.filtroPlaca.toLowerCase());
      const porEstado = !this.filtroEstado   || u.estado === this.filtroEstado;
      return porEquipo && porSerial && porPlaca && porEstado;
    });
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroEquipoId || this.filtroSerial || this.filtroPlaca || this.filtroEstado);
  }

  limpiarFiltros(): void {
    this.filtroEquipoId = '';
    this.filtroSerial   = '';
    this.filtroPlaca    = '';
    this.filtroEstado   = '';
  }

  // ─── Ver historial ──────────────────────────────────────────────────────────
  verHistorial(unidad: LbEquipoUnidad): void {
    this.unidadSeleccionada = unidad;
    this.asignaciones       = [];
    this.mantenimientos     = [];
    this.historialReservas  = [];
    this.mostrarDialogo     = true;
    this.cargandoDetalle    = true;

    forkJoin({
      asignaciones:   this.aulaService.getAll(),
      mantenimientos: this.mantenimientoService.getByUnidad(unidad.id ?? ''),
      reservas:       this.reservaService.getAll(),
      devoluciones:   this.devolucionService.getAll(),
    }).subscribe({
      next: ({ asignaciones, mantenimientos, reservas, devoluciones }) => {
        const toArray = (r: unknown): unknown[] => Array.isArray(r) ? r as unknown[] : ((r as { content?: unknown[] })?.content ?? []);

        this.asignaciones  = (toArray(asignaciones) as LbEquipoAula[])
          .filter((a: LbEquipoAula) => a.equipoUnidad?.id === unidad.id);
        this.mantenimientos = mantenimientos;

        const reservasFiltradas: LbReservaEquipo[] = (toArray(reservas) as LbReservaEquipo[])
          .filter((r: LbReservaEquipo) =>
            r.detalles?.some(d => d.equipoUnidad?.id === unidad.id)
          );

        const devolucionesAll: LbDevolucionEquipo[] = toArray(devoluciones) as LbDevolucionEquipo[];

        this.historialReservas = reservasFiltradas.map(r => {
          const dev = devolucionesAll.find(d =>
            (d.reserva as LbReservaEquipo).id === r.id
          ) ?? null;

          const detalleDev = dev?.detalles?.find(d => d.equipoUnidad?.id === unidad.id) ?? null;
          const estadoDev  = detalleDev
            ? this.etiquetaEstadoDev(detalleDev.estadoDevuelto)
            : (dev ? 'Sí' : (r.devuelta ? 'Sí' : 'Pendiente'));
          const obsDev = detalleDev?.observaciones
            || dev?.observacionesGenerales
            || '—';

          return { reserva: r, devolucion: dev, estadoDevolucion: estadoDev, observacionesDevolucion: obsDev };
        });

        this.cargandoDetalle = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial.' });
        this.cargandoDetalle = false;
      },
    });
  }

  cerrarDialogo(): void {
    this.mostrarDialogo     = false;
    this.unidadSeleccionada = null;
    this.asignaciones       = [];
    this.mantenimientos     = [];
    this.historialReservas  = [];
  }

  // ─── PDF ────────────────────────────────────────────────────────────────────
  descargarPdf(): void {
    if (!this.unidadSeleccionada) return;
    this.descargandoPdf = true;
    this.unidadService.descargarHistorialPdf(this.unidadSeleccionada.id ?? '').subscribe({
      next: (blob: Blob) => {
        const url      = URL.createObjectURL(blob);
        const link     = document.createElement('a');
        const serial   = this.unidadSeleccionada?.serial ?? this.unidadSeleccionada?.id;
        link.href      = url;
        link.download  = `historial-equipo-${serial}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.descargandoPdf = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF.' });
        this.descargandoPdf = false;
      },
    });
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────────────
  nombreAccesorios(ids: string[] | undefined): string {
    if (!ids || ids.length === 0) return 'Ninguno';
    const mapa = new Map(this.accesorios().map(a => [a.id, a.nombre]));
    return ids.map(id => mapa.get(id) ?? id).join(', ');
  }

  etiquetaEstado(estado: string): string {
    const map: Record<string, string> = {
      disponible:       'Disponible',
      asignado:         'Asignado',
      en_mantenimiento: 'En mantenimiento',
      dado_de_baja:     'Dado de baja',
      programado:       'Programado',
      en_proceso:       'En proceso',
      completado:       'Completado',
      cancelado:        'Cancelado',
    };
    return map[estado] ?? estado;
  }

  etiquetaEstadoDev(estado: string): string {
    const map: Record<string, string> = {
      bueno:        'Bueno',
      con_daños:    'Con daños',
      incompleto:   'Incompleto',
      dado_de_baja: 'Dado de baja',
    };
    return map[estado] ?? estado;
  }

  colorEstadoDev(estado: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      'Bueno':        { bg: 'var(--p-green-100)',   text: 'var(--p-green-700)'   },
      'Con daños':    { bg: 'var(--p-orange-100)',  text: 'var(--p-orange-700)'  },
      'Incompleto':   { bg: 'var(--p-yellow-100)',  text: 'var(--p-yellow-700)'  },
      'Dado de baja': { bg: 'var(--p-red-100)',     text: 'var(--p-red-700)'     },
      'Pendiente':    { bg: 'var(--p-surface-200)', text: 'var(--p-surface-600)' },
      'Sí':           { bg: 'var(--p-teal-100)',    text: 'var(--p-teal-700)'    },
    };
    return map[estado] ?? { bg: 'var(--p-surface-200)', text: 'var(--p-surface-700)' };
  }

  colorEstado(estado: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      disponible:       { bg: 'var(--p-green-100)',  text: 'var(--p-green-700)'  },
      asignado:         { bg: 'var(--p-blue-100)',   text: 'var(--p-blue-700)'   },
      en_mantenimiento: { bg: 'var(--p-orange-100)', text: 'var(--p-orange-700)' },
      dado_de_baja:     { bg: 'var(--p-red-100)',    text: 'var(--p-red-700)'    },
      programado:       { bg: 'var(--p-yellow-100)', text: 'var(--p-yellow-700)' },
      en_proceso:       { bg: 'var(--p-orange-100)', text: 'var(--p-orange-700)' },
      completado:       { bg: 'var(--p-green-100)',  text: 'var(--p-green-700)'  },
      cancelado:        { bg: 'var(--p-red-100)',    text: 'var(--p-red-700)'    },
    };
    return map[estado] ?? { bg: 'var(--p-surface-200)', text: 'var(--p-surface-700)' };
  }

  get totalMantenimientos(): number   { return this.mantenimientos.length; }
  get completados(): number           { return this.mantenimientos.filter(m => m.estado === 'realizado').length; }
  get pendientes(): number            { return this.mantenimientos.filter(m => m.estado !== 'realizado' && m.estado !== 'cancelado').length; }

  get totalReservas(): number         { return this.historialReservas.length; }
  get reservasDevueltas(): number     { return this.historialReservas.filter(f => f.reserva.devuelta).length; }
  get reservasConObs(): number        { return this.historialReservas.filter(f => f.observacionesDevolucion !== '—').length; }

  get asignacionActual(): LbEquipoAula | null {
    return this.asignaciones[0] ?? null;
  }
}
