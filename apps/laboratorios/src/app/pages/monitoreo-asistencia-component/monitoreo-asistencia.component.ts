import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { InputComponent, SelectComponent } from '@microfrontends/shared-ui';
import { NotificationManagementService } from '@microfrontends/shared-services';
import {
  LbAsistenciaHorarioService,
  LbAsistenciaHorario,
  SincronizarSemanaResponse
} from '../../core/services/lb-asistencia-horario.service';

import { Subject } from 'rxjs';
import { catchError, takeUntil, pairwise, filter, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-monitoreo-asistencia',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    ToastModule,
    TagModule,
    TooltipModule,
    DatePickerModule,
    MessageModule,
    ProgressSpinnerModule,
    PanelModule,
    ConfirmDialogModule,
    InputComponent,
    SelectComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './monitoreo-asistencia.component.html'
})
export class MonitoreoAsistenciaComponent implements OnInit, OnDestroy {
  private readonly toast = inject(MessageService);
  private readonly confirmSrv = inject(ConfirmationService);
  private readonly asistenciaSrv = inject(LbAsistenciaHorarioService);
  private readonly notificationSrv = inject(NotificationManagementService);
  private readonly destroy$ = new Subject<void>();

  // ── Estado ──────────────────────────────────────────────────────────────────
  fechaSeleccionada: Date = new Date();
  registros: LbAsistenciaHorario[] = [];
  cargandoTabla = false;
  sincronizando = false;
  eliminando = false;

  ultimaSincronizacion: SincronizarSemanaResponse | null = null;

  readonly dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

  // ── Filtros ──────────────────────────────────────────────────────────────────
  filtroCodAula = '';
  filtroAulaSelect: string | null = null;
  filtroMateria: string | null = null;
  filtroEstado: string | null = null;

  readonly estadoOpciones = [
    { label: 'Pendiente',            value: 'null'  },
    { label: 'Asistió',              value: 'true'  },
    { label: 'No-uso declarado',     value: 'false' }
  ];

  get aulaOpciones(): { label: string; value: string }[] {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const r of this.registros) {
      if (r.codAula && !seen.has(r.codAula)) {
        seen.add(r.codAula);
        opts.push({ label: r.nomAula ? `${r.codAula} – ${r.nomAula}` : r.codAula, value: r.codAula });
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }

  get materiaOpciones(): { label: string; value: string }[] {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const r of this.registros) {
      if (r.materia && !seen.has(r.materia)) {
        seen.add(r.materia);
        opts.push({ label: r.materia, value: r.materia });
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }

  get registrosFiltrados(): LbAsistenciaHorario[] {
    return this.registros.filter(r => {
      if (this.filtroCodAula.trim() &&
          !r.codAula?.toLowerCase().includes(this.filtroCodAula.trim().toLowerCase())) return false;
      if (this.filtroAulaSelect && r.codAula !== this.filtroAulaSelect) return false;
      if (this.filtroMateria   && r.materia !== this.filtroMateria)     return false;
      if (this.filtroEstado) {
        if (this.filtroEstado === 'true'  && r.asistio !== true)                          return false;
        if (this.filtroEstado === 'false' && r.asistio !== false)                         return false;
        if (this.filtroEstado === 'null'  && r.asistio !== null && r.asistio !== undefined) return false;
      }
      return true;
    });
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.filtroCodAula.trim() || this.filtroAulaSelect || this.filtroMateria || this.filtroEstado);
  }

  limpiarFiltros(): void {
    this.filtroCodAula   = '';
    this.filtroAulaSelect = null;
    this.filtroMateria   = null;
    this.filtroEstado    = null;
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarRegistros();
    this.escucharSincronizacionAutomatica();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Escucha notificaciones SSE del hub generalMongoDB.
   * Cuando llega un evento HORARIOS_SINCRONIZADOS para el proyecto "laboratorios",
   * recarga la tabla automáticamente sin que el usuario pulse ningún botón.
   */
  private escucharSincronizacionAutomatica(): void {
    this.notificationSrv.notifications$
      .pipe(
        // Comparar emisión anterior vs actual para detectar notificaciones nuevas
        pairwise(),
        map(([prev, curr]) => curr.filter(n => !prev.some(p => p.id === n.id))),
        // Solo actuar si alguna de las nuevas es la señal de sincronización de laboratorios
        filter(nuevas => nuevas.some(n =>
          n.projectContext === 'laboratorios' &&
          n.metadata?.['action'] === 'HORARIOS_SINCRONIZADOS'
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(nuevas => {
        const notif = nuevas.find(n => n.metadata?.['action'] === 'HORARIOS_SINCRONIZADOS');
        if (!notif) return;
        const semana  = notif.metadata?.['semana']     ?? '';
        const insertados = notif.metadata?.['insertados'] ?? 0;
        const omitidos   = notif.metadata?.['omitidos']   ?? 0;

        this.toast.add({
          severity: 'info',
          summary: 'Sincronización automática',
          detail: `Semana ${semana} actualizada — Nuevos: ${insertados} | Ya existían: ${omitidos}`,
          life: 7000
        });

        // Recargar solo si la semana sincronizada coincide con la semana visible
        if (!semana || semana === this.lunesSemana) {
          this.cargarRegistros();
        }
      });
  }

  // ── Semana ───────────────────────────────────────────────────────────────────

  get lunesSemana(): string {
    return this.toIso(this.getLunes(this.fechaSeleccionada));
  }

  private getLunes(d: Date): Date {
    const ref = new Date(d);
    ref.setHours(0, 0, 0, 0);
    const dow = ref.getDay() === 0 ? 7 : ref.getDay();
    ref.setDate(ref.getDate() - (dow - 1));
    return ref;
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onFechaChange(): void {
    this.cargarRegistros();
  }

  // ── Carga de registros ───────────────────────────────────────────────────────

  cargarRegistros(): void {
    this.cargandoTabla = true;
    this.registros = [];
    this.asistenciaSrv.getBySemana(this.lunesSemana)
      .pipe(takeUntil(this.destroy$), catchError(() => of([])))
      .subscribe((data: LbAsistenciaHorario[]) => {
        this.registros = data.sort((a, b) => {
          const fa = (a.fechaClase ?? '') + (a.horaInicio ?? '');
          const fb = (b.fechaClase ?? '') + (b.horaInicio ?? '');
          return fa.localeCompare(fb);
        });
        this.cargandoTabla = false;
      });
  }

  // ── Sincronización ───────────────────────────────────────────────────────────

  sincronizarSemana(): void {
    this.sincronizando = true;
    this.ultimaSincronizacion = null;

    this.asistenciaSrv.sincronizarSemana(this.lunesSemana)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.ultimaSincronizacion = resp;
          this.sincronizando = false;
          this.toast.add({
            severity: 'success',
            summary: 'Sincronización completada',
            detail: `Insertados: ${resp.insertados} | Omitidos (ya existían): ${resp.omitidos} | Total Oracle: ${resp.total}`
          });
          this.cargarRegistros();
        },
        error: (err) => {
          this.sincronizando = false;
          const msg = err?.error?.error ?? err?.message ?? JSON.stringify(err?.error ?? err);
          console.error('[sync] Error backend:', err);
          this.toast.add({ severity: 'error', summary: `Error ${err?.status ?? ''}`, detail: msg, life: 10000 });
        }
      });
  }

  // ── Eliminar semana ──────────────────────────────────────────────────────────

  confirmarEliminarSemana(): void {
    this.confirmSrv.confirm({
      message: `¿Eliminar TODOS los registros de la semana del ${this.lunesSemana}? Las declaraciones de no-uso también se eliminarán.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarSemana()
    });
  }

  private eliminarSemana(): void {
    this.eliminando = true;
    this.asistenciaSrv.eliminarSemana(this.lunesSemana)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.eliminando = false;
          this.registros = [];
          this.ultimaSincronizacion = null;
          this.toast.add({ severity: 'success', summary: 'Semana eliminada', detail: `Registros de la semana del ${this.lunesSemana} eliminados.` });
        },
        error: () => {
          this.eliminando = false;
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la semana.' });
        }
      });
  }

  // ── Confirmación individual ──────────────────────────────────────────────────

  marcarAsistio(reg: LbAsistenciaHorario): void {
    if (!reg.id) return;
    this.asistenciaSrv.confirmarAsistencia(reg.id, { asistio: true, confirmadoPor: 'admin' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.registros.findIndex(r => r.id === updated.id);
          if (idx >= 0) this.registros[idx] = updated;
          this.toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Marcado como asistió.' });
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar.' })
      });
  }

  // ── Utilidades vista ─────────────────────────────────────────────────────────

  estadoTag(asistio: boolean | null | undefined): 'success' | 'danger' | 'warn' | 'secondary' {
    if (asistio === true) return 'success';
    if (asistio === false) return 'danger';
    return 'secondary';
  }

  estadoLabel(asistio: boolean | null | undefined): string {
    if (asistio === true) return 'Asistió';
    if (asistio === false) return 'No-uso declarado';
    return 'Pendiente';
  }
}
