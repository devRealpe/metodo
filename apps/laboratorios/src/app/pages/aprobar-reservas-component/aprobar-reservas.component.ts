import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputComponent } from '@microfrontends/shared-ui';
import { ReservasAulaService } from '../../core/services/reservas-aula.service';
import { ReservaAula } from '../../core/models/reserva-aula.model';

@Component({
  selector: 'app-aprobar-reservas',
  standalone: true,
  imports: [
    CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule,
    TableModule, CardModule, ButtonModule, ToastModule,
    TagModule, BadgeModule, DividerModule, ConfirmDialogModule,
    DialogModule, InputComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './aprobar-reservas.component.html',
  styleUrl: './aprobar-reservas.component.scss',
})
export class AprobarReservasComponent implements OnInit, OnDestroy {
  private reservasSvc = inject(ReservasAulaService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);

  cargando = false;
  procesando: Record<string, boolean> = {};

  /** Todas las reservas cargadas del backend */
  todasLasReservas: ReservaAula[] = [];

  /** Vista activa */
  vistaActual: 'pendientes' | 'aprobadas' | 'rechazadas' = 'pendientes';

  filtroTexto = this.fb.control('');

  /** Texto de observación del rechazo */
  observacionRechazoTexto: Record<string, string> = {};
  mostrarDialogoRechazo = false;
  reservaRechazoActual: ReservaAula | null = null;

  ngOnInit(): void {
    this.cargarReservas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private toast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'aprobar-reservas', life: 5000, severity, summary, detail });
  }

  cargarReservas(): void {
    this.cargando = true;
    this.reservasSvc.getAll()
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargando = false))
      .subscribe({
        next: (data) => { this.todasLasReservas = data; },
        error: () => this.toast('error', 'Error', 'No se pudieron cargar las reservas')
      });
  }

  get reservasFiltradas(): ReservaAula[] {
    const filtro = (this.filtroTexto.value ?? '').toLowerCase().trim();
    const base = this.todasLasReservas.filter(r => {
      if (this.vistaActual === 'pendientes') return r.aprobado == null || r.aprobado === undefined;
      if (this.vistaActual === 'aprobadas') return r.aprobado === true;
      return r.aprobado === false;
    });
    if (!filtro) return base;
    return base.filter(r =>
      (r.identificacion ?? '').toLowerCase().includes(filtro) ||
      (r.laboratorio?.nomAula ?? '').toLowerCase().includes(filtro) ||
      (r.laboratorio?.codAula ?? '').toLowerCase().includes(filtro) ||
      (r.motivo ?? '').toLowerCase().includes(filtro)
    );
  }

  get countPendientes(): number { return this.todasLasReservas.filter(r => r.aprobado == null || r.aprobado === undefined).length; }
  get countAprobadas(): number { return this.todasLasReservas.filter(r => r.aprobado === true).length; }
  get countRechazadas(): number { return this.todasLasReservas.filter(r => r.aprobado === false).length; }

  cambiarVista(vista: 'pendientes' | 'aprobadas' | 'rechazadas'): void {
    this.vistaActual = vista;
    this.filtroTexto.setValue('');
  }

  aprobar(reserva: ReservaAula): void {
    if (!reserva.id) return;
    this.confirmationService.confirm({
      message: `¿Aprobar la reserva del ${reserva.fecha} (${this.formatHora(reserva.horaInicio)} – ${this.formatHora(reserva.horaFin)}) para ${reserva.identificacion}?`,
      header: 'Confirmar aprobación',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Aprobar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => this.ejecutarAprobacion(reserva.id!, true)
    });
  }

  rechazar(reserva: ReservaAula): void {
    if (!reserva.id) return;
    this.reservaRechazoActual = reserva;
    this.observacionRechazoTexto[reserva.id] = '';
    this.mostrarDialogoRechazo = true;
  }

  confirmarRechazo(): void {
    if (!this.reservaRechazoActual?.id) return;
    const id = this.reservaRechazoActual.id;
    const obs = (this.observacionRechazoTexto[id] ?? '').trim();
    this.mostrarDialogoRechazo = false;
    this.ejecutarAprobacion(id, false, obs || undefined);
    this.reservaRechazoActual = null;
  }

  cancelarRechazo(): void {
    this.mostrarDialogoRechazo = false;
    this.reservaRechazoActual = null;
  }

  private ejecutarAprobacion(id: string, aprobado: boolean, observacionRechazo?: string): void {
    this.procesando[id] = true;
    this.reservasSvc.aprobar(id, aprobado, observacionRechazo)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => delete this.procesando[id]),
        catchError(() => of(null))
      )
      .subscribe({
        next: (actualizada) => {
          if (!actualizada) {
            this.toast('error', 'Error', `No se pudo ${aprobado ? 'aprobar' : 'rechazar'} la reserva`);
            return;
          }
          const idx = this.todasLasReservas.findIndex(r => r.id === id);
          if (idx >= 0) this.todasLasReservas[idx] = actualizada;
          this.toast('success', aprobado ? 'Reserva aprobada' : 'Reserva rechazada',
            aprobado ? 'La reserva fue aprobada y el usuario podrá ingresar.' : 'La reserva fue rechazada y el inventario fue restaurado.');
        }
      });
  }

  formatHora(hora: string): string {
    if (!hora) return '—';
    return hora.length >= 5 ? hora.slice(0, 5) : hora;
  }

  estadoLabel(reserva: ReservaAula): string {
    if (reserva.aprobado === true) return 'Aprobada';
    if (reserva.aprobado === false) return 'Rechazada';
    return 'Pendiente';
  }

  estadoSeverity(reserva: ReservaAula): 'success' | 'danger' | 'warn' | 'info' | 'secondary' {
    if (reserva.aprobado === true) return 'success';
    if (reserva.aprobado === false) return 'danger';
    return 'warn';
  }
}
