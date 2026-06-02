import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { InputComponent } from '@microfrontends/shared-ui';

import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';
import { ReservasAulaService } from '../../core/services/reservas-aula.service';
import { ReservaAula } from '../../core/models/reserva-aula.model';
import { UsosLaboratorioService, EntradaPayload } from '../../core/services/usos-laboratorio.service';

interface ReservaConEstado extends ReservaAula {
  yaRegistrado: boolean;
}

@Component({
  selector: 'app-asistencia-reserva',
  standalone: true,
  imports: [
    CommonModule, HttpClientModule, ReactiveFormsModule,
    ButtonModule, ToastModule, TagModule, DividerModule, Card,
    InputComponent
  ],
  providers: [MessageService],
  templateUrl: './asistencia-reserva.component.html',
})
export class AsistenciaReservaComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosOracleSvc = inject(UsuariosOracleService);
  private readonly usuariosExternosSvc = inject(UsuariosExternosService);
  private readonly reservasSvc = inject(ReservasAulaService);
  private readonly usosSvc = inject(UsosLaboratorioService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  hoy = new Date();
  hoyStr = '';

  formCedula = this.fb.group({
    identificacion: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9]+$/)]]
  });

  cargando = false;
  registrando: Record<string, boolean> = {};
  usuarioActual: { nombre: string; identificacion: string; programa?: string; facultad?: string; genero?: string; rol?: string; semestre?: string } | null = null;
  reservasHoy: ReservaConEstado[] = [];
  sinReservas = false;

  // Historial de registros exitosos de la sesión actual
  registrosExitosos: { identificacion: string; nombre: string; laboratorio: string; hora: string }[] = [];

  ngOnInit(): void {
    const d = this.hoy;
    this.hoyStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscarUsuario(): void {
    const id = this.formCedula.get('identificacion')?.value?.trim();
    if (!id) return;

    this.cargando = true;
    this.usuarioActual = null;
    this.reservasHoy = [];
    this.sinReservas = false;

    this.usuariosOracleSvc.getByCodigo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (usuario) => {
        if (usuario) {
          this.usuarioActual = {
            nombre: usuario.nombre,
            identificacion: id,
            programa: usuario.programa,
            facultad: usuario.facultad,
            genero: usuario.genero,
            rol: usuario.cargo,
            semestre: usuario.semestre
          };
          this.buscarReservasHoy(id);
        } else {
          this.buscarUsuarioExterno(id);
        }
      },
      error: () => this.buscarUsuarioExterno(id)
    });
  }

  private buscarUsuarioExterno(id: string): void {
    this.usuariosExternosSvc.getByCodigo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (ext) => {
        if (ext) {
          this.usuarioActual = {
            nombre: ext.nombre || id,
            identificacion: id,
          };
          this.buscarReservasHoy(id);
        } else {
          this.cargando = false;
          this.messageService.add({
            key: 'asistencia-toast', life: 4000, severity: 'warn',
            summary: 'No encontrado',
            detail: 'Identificación no registrada en el sistema.'
          });
        }
      },
      error: () => {
        this.cargando = false;
        this.messageService.add({
          key: 'asistencia-toast', life: 4000, severity: 'error',
          summary: 'Error', detail: 'No se pudo buscar la identificación.'
        });
      }
    });
  }

  private buscarReservasHoy(identificacion: string): void {
    this.reservasSvc.getByIdentificacionYFechaAprobadas(identificacion, this.hoyStr)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([])),
        finalize(() => this.cargando = false)
      )
      .subscribe(reservas => {
        if (!reservas || reservas.length === 0) {
          // También buscar reservas donde el usuario es participante (asistente)
          this.buscarReservasComoAsistente(identificacion);
          return;
        }
        this.procesarReservas(reservas, identificacion);
      });
  }

  private buscarReservasComoAsistente(identificacion: string): void {
    // Buscar en todas las reservas aprobadas de hoy si aparece como asistente
    this.reservasSvc.getAll()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      )
      .subscribe(todas => {
        const hoy = this.hoyStr;
        const reservasComoAsistente = (todas ?? []).filter(r =>
          r.aprobado === true &&
          r.fecha === hoy &&
          (r.asistentes ?? []).some(a => a.identificacion === identificacion)
        );

        if (reservasComoAsistente.length === 0) {
          this.sinReservas = true;
          this.reservasHoy = [];
          this.messageService.add({
            key: 'asistencia-toast', life: 5000, severity: 'warn',
            summary: 'Sin reservas para hoy',
            detail: 'Este usuario no tiene reservas aprobadas para el día de hoy.'
          });
          return;
        }

        this.procesarReservas(reservasComoAsistente, identificacion);
      });
  }

  private procesarReservas(reservas: ReservaAula[], identificacion: string): void {
    // Verificar cuáles ya tienen registro de uso para hoy
    this.usosSvc.verificarRegistroExistentePorIdentificacion(identificacion, this.hoyStr)
      .pipe(takeUntil(this.destroy$), catchError(() => of([])))
      .subscribe(usos => {
        // Verificar por codAula + horaInicio para cruzar con precisión
        const usosRegistrados = (usos ?? []).map(u => `${u.laboratorioId}_${u.horaInicio?.slice(0, 5)}`);
        const usosSet = new Set(usosRegistrados);

        this.reservasHoy = reservas.map(r => {
          const codAula = r.laboratorio?.codAula ?? r.laboratorio?.id ?? '';
          const horaReserva = r.horaInicio?.slice(0, 5) ?? '';
          return {
            ...r,
            yaRegistrado: usosSet.has(`${codAula}_${horaReserva}`)
          } as ReservaConEstado;
        });

        this.sinReservas = false;

        const pendientes = this.reservasHoy.filter(r => !r.yaRegistrado).length;
        if (pendientes === 0 && this.reservasHoy.length > 0) {
          this.messageService.add({
            key: 'asistencia-toast', life: 4000, severity: 'info',
            summary: 'Asistencia completa',
            detail: 'Todas las reservas de hoy ya tienen asistencia registrada.'
          });
        }
      });
  }

  registrarAsistencia(reserva: ReservaConEstado): void {
    if (!this.usuarioActual || reserva.yaRegistrado) return;

    if (!this.esDentroDeHorario(reserva)) {
      this.messageService.add({
        key: 'asistencia-toast', life: 5000, severity: 'warn',
        summary: 'Fuera del horario de la reserva',
        detail: this.mensajeHorario(reserva)
      });
      return;
    }

    const id = reserva.id!;
    this.registrando[id] = true;

    const codAula = reserva.laboratorio?.codAula ?? reserva.laboratorio?.id ?? '';
    // Usar la hora de la reserva, no la hora actual
    const horaInicio = reserva.horaInicio || `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:00`;

    const payload: EntradaPayload = {
      identificacion: this.usuarioActual.identificacion,
      laboratorioId: codAula,
      fechaUso: this.hoyStr,
      horaInicio,
      semestre: this.usuarioActual.semestre || '',
      genero: this.usuarioActual.genero || '',
      rol: this.usuarioActual.rol || '',
      programa: this.usuarioActual.programa || '',
      facultad: this.usuarioActual.facultad || '',
      motivo: reserva.motivo || 'Reserva de laboratorio',
      observaciones: `Asistencia a reserva ${reserva.horaInicio?.slice(0, 5)} - ${reserva.horaFin?.slice(0, 5)}`,
      reservaId: reserva.id
    };

    this.usosSvc.marcarEntrada(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => delete this.registrando[id])
      )
      .subscribe({
        next: () => {
          reserva.yaRegistrado = true;

          this.registrosExitosos.unshift({
            identificacion: this.usuarioActual!.identificacion,
            nombre: this.usuarioActual!.nombre,
            laboratorio: reserva.laboratorio?.nomAula || codAula,
            hora: horaInicio.slice(0, 5)
          });

          this.messageService.add({
            key: 'asistencia-toast', life: 5000, severity: 'success',
            summary: 'Asistencia registrada',
            detail: `${this.usuarioActual!.nombre} registró asistencia en ${reserva.laboratorio?.nomAula || codAula}`
          });
        },
        error: (err) => {
          const msg = err?.error?.error || err?.error?.mensaje || 'No se pudo registrar la asistencia.';
          this.messageService.add({
            key: 'asistencia-toast', life: 5000, severity: 'error',
            summary: 'Error al registrar', detail: msg
          });
        }
      });
  }

  limpiar(): void {
    this.formCedula.reset();
    this.usuarioActual = null;
    this.reservasHoy = [];
    this.sinReservas = false;
  }

  esDentroDeHorario(reserva: ReservaConEstado): boolean {
    const ahora = new Date();
    const partsIni = (reserva.horaInicio || '00:00').split(':').map(Number);
    const partsFin = (reserva.horaFin || '23:59').split(':').map(Number);
    const minActual = ahora.getHours() * 60 + ahora.getMinutes();
    const minInicio = partsIni[0] * 60 + partsIni[1];
    const minFin = partsFin[0] * 60 + partsFin[1];
    return minActual >= minInicio && minActual <= minFin;
  }

  mensajeHorario(reserva: ReservaConEstado): string {
    const ahora = new Date();
    const partsIni = (reserva.horaInicio || '00:00').split(':').map(Number);
    const partsFin = (reserva.horaFin || '23:59').split(':').map(Number);
    const minActual = ahora.getHours() * 60 + ahora.getMinutes();
    const minInicio = partsIni[0] * 60 + partsIni[1];
    const minFin = partsFin[0] * 60 + partsFin[1];
    if (minActual < minInicio) return `Disponible a partir de las ${this.formatHora(reserva.horaInicio)}`;
    if (minActual > minFin) return `La reserva finalizó a las ${this.formatHora(reserva.horaFin)}`;
    return '';
  }

  formatHora(hora: string): string {
    if (!hora) return '—';
    return hora.length >= 5 ? hora.slice(0, 5) : hora;
  }

  invalidCedula(ctrl: string): boolean {
    const c = this.formCedula.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }
}
