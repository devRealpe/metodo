import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputComponent } from '@microfrontends/shared-ui';
import { ReservasAulaService } from '../../core/services/reservas-aula.service';
import { RegistroExternoService } from '../../core/services/registro-externo.service';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';
import { ReservaAula } from '../../core/models/reserva-aula.model';
import { RegistroExterno } from '../../core/models/registro-externo.model';
import { UsuarioExterno } from '../../core/models/usuario-externos.model';

export interface ReservaConDetalles extends ReservaAula {
  empresaNombre?: string;
  asistentesDetalle?: UsuarioExterno[];
}

@Component({
  selector: 'app-monitor-reservas-externos',
  standalone: true,
  imports: [
    CommonModule, HttpClientModule, ReactiveFormsModule,
    TableModule, CardModule, ButtonModule, ToastModule,
    DividerModule, TagModule, BadgeModule, ConfirmDialogModule,
    InputComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './monitor-reservas-externos.component.html',
  styleUrl: './monitor-reservas-externos.component.scss',
})
export class MonitorReservasExternosComponent implements OnInit, OnDestroy {
  private reservasSvc = inject(ReservasAulaService);
  private registroSvc = inject(RegistroExternoService);
  private usuariosSvc = inject(UsuariosExternosService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);

  cargando = false;
  reservasHoy: ReservaConDetalles[] = [];
  reservasHistorial: ReservaConDetalles[] = [];

  reservaExpandida: ReservaConDetalles | null = null;
  cargandoAsistentes = false;

  vistaActual: 'hoy' | 'historial' = 'hoy';

  filtroNit = this.fb.control('');

  ngOnInit(): void {
    this.cargarReservasHoy();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private toast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'monitor-reservas', life: 5000, severity, summary, detail });
  }

  private formatearHora(hora: string): string {
    if (!hora) return '—';
    return hora.length >= 5 ? hora.slice(0, 5) : hora;
  }

  obtenerHoraFormateada(hora: string): string {
    return this.formatearHora(hora);
  }

  // ─── CARGA DE DATOS ───────────────────────────────────────────────────────────

  cargarReservasHoy(): void {
    this.cargando = true;
    this.reservaExpandida = null;
    this.reservasSvc.getActivas().pipe(
      takeUntil(this.destroy$),
      finalize(() => this.cargando = false)
    ).subscribe({
      next: (reservas) => {
        this.reservasHoy = reservas ?? [];
        this.enriquecerConNombreEmpresa(this.reservasHoy);
      },
      error: () => this.toast('error', 'Error', 'No se pudieron cargar las reservas de hoy')
    });
  }

  cargarHistorial(): void {
    this.cargando = true;
    this.reservaExpandida = null;
    this.reservasSvc.getAll().pipe(
      takeUntil(this.destroy$),
      finalize(() => this.cargando = false)
    ).subscribe({
      next: (reservas) => {
        this.reservasHistorial = reservas ?? [];
        this.enriquecerConNombreEmpresa(this.reservasHistorial);
      },
      error: () => this.toast('error', 'Error', 'No se pudo cargar el historial')
    });
  }

  cambiarVista(v: 'hoy' | 'historial'): void {
    this.vistaActual = v;
    this.reservaExpandida = null;
    if (v === 'hoy') this.cargarReservasHoy();
    else this.cargarHistorial();
  }

  private enriquecerConNombreEmpresa(reservas: ReservaConDetalles[]): void {
    reservas.forEach(r => {
      if (r.identificacion) {
        this.registroSvc.getByNit(r.identificacion).subscribe({
          next: (e) => { if (e) r.empresaNombre = e.nombre; },
          error: () => {}
        });
      }
    });
  }

  // ─── DETALLE RESERVA ──────────────────────────────────────────────────────────

  seleccionarReserva(reserva: ReservaConDetalles): void {
    if (this.reservaExpandida?.id === reserva.id) {
      this.reservaExpandida = null;
      return;
    }
    this.reservaExpandida = reserva;
    this.cargarAsistentesReserva(reserva);
  }

  private cargarAsistentesReserva(reserva: ReservaConDetalles): void {
    if (!reserva.identificacion) return;
    this.cargandoAsistentes = true;
    // Obtener el id del registro externo por NIT para buscar usuarios
    this.registroSvc.getByNit(reserva.identificacion).subscribe({
      next: (empresa) => {
        if (!empresa?.id) { this.cargandoAsistentes = false; return; }
        this.usuariosSvc.getByRegistroId(empresa.id).pipe(
          finalize(() => this.cargandoAsistentes = false)
        ).subscribe({
          next: (usuarios) => {
            if (this.reservaExpandida) {
              this.reservaExpandida.asistentesDetalle = usuarios ?? [];
            }
          },
          error: () => this.cargandoAsistentes = false
        });
      },
      error: () => this.cargandoAsistentes = false
    });
  }

  // ─── ACCIONES ─────────────────────────────────────────────────────────────────

  marcarSalida(reserva: ReservaConDetalles): void {
    if (!reserva.id) return;
    this.confirmationService.confirm({
      message: `¿Confirma marcar la salida de la reserva de "${reserva.empresaNombre ?? reserva.identificacion}"?`,
      header: 'Confirmar salida',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Sí, marcar salida',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.reservasSvc.cerrar(reserva.id!).subscribe({
          next: (r) => {
            reserva.horaFin = r.horaFin;
            this.toast('success', 'Salida marcada', `Salida registrada a las ${this.formatearHora(r.horaFin)}`);
          },
          error: (e) => this.toast('error', 'Error', e?.error?.mensaje ?? 'No se pudo marcar la salida')
        });
      }
    });
  }

  eliminarReserva(reserva: ReservaConDetalles): void {
    if (!reserva.id) return;
    this.confirmationService.confirm({
      message: `¿Eliminar la reserva de "${reserva.empresaNombre ?? reserva.identificacion}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.reservasSvc.delete(reserva.id!).subscribe({
          next: () => {
            if (this.vistaActual === 'hoy') {
              this.reservasHoy = this.reservasHoy.filter(r => r.id !== reserva.id);
            } else {
              this.reservasHistorial = this.reservasHistorial.filter(r => r.id !== reserva.id);
            }
            if (this.reservaExpandida?.id === reserva.id) this.reservaExpandida = null;
            this.toast('info', 'Eliminada', 'Reserva eliminada');
          },
          error: (e) => this.toast('error', 'Error', e?.error?.error ?? 'No se pudo eliminar')
        });
      }
    });
  }

  // ─── GETTERS UI ───────────────────────────────────────────────────────────────

  get reservasActuales(): ReservaConDetalles[] {
    return this.vistaActual === 'hoy' ? this.reservasHoy : this.reservasHistorial;
  }

  get reservasFiltradas(): ReservaConDetalles[] {
    const nit = (this.filtroNit.value ?? '').trim().toLowerCase();
    if (!nit) return this.reservasActuales;
    return this.reservasActuales.filter(r =>
      r.identificacion?.toLowerCase().includes(nit) ||
      r.empresaNombre?.toLowerCase().includes(nit)
    );
  }

  estaActiva(r: ReservaAula): boolean {
    if (!r.horaInicio || !r.horaFin) return false;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const toMin = (h: string) => { const [hh, mm] = h.split(':').map(Number); return (isNaN(hh) ? 0 : hh) * 60 + (isNaN(mm) ? 0 : mm); };
    return toMin(r.horaInicio) <= nowMin && nowMin <= toMin(r.horaFin);
  }
}
