import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, finalize, catchError } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Card } from 'primeng/card';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { ReservasAulaService } from '../../core/services/reservas-aula.service';
import { ReservaAula } from '../../core/models/reserva-aula.model';
import { LbCoordinadorService } from '../../core/services/lb-coordinador.service';
import { LbCoordinador } from '../../core/models/lb-coordinador.model';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';

type VistaReserva = 'todas' | 'aprobadas' | 'pendientes' | 'rechazadas';

@Component({
  selector: 'app-lista-reservas',
  standalone: true,
  imports: [
    CommonModule, HttpClientModule, ReactiveFormsModule,
    TableModule, ButtonModule, ToastModule, TagModule,
    DividerModule, DialogModule, TooltipModule, ConfirmDialogModule,
    ProgressSpinnerModule, Card,
    InputComponent, SelectComponent, DatepickerComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './lista-reservas.component.html',
})
export class ListaReservasComponent implements OnInit, OnDestroy {
  private reservasSvc = inject(ReservasAulaService);
  private coordinadorSvc = inject(LbCoordinadorService);
  private usuariosOracleSvc = inject(UsuariosOracleService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  cargando = false;
  eliminando: Record<string, boolean> = {};
  aprobando: Record<string, boolean> = {};
  todasLasReservas: ReservaAula[] = [];
  vistaActual: VistaReserva = 'todas';
  filtroTexto = this.fb.control('');
  filtroFecha = this.fb.control<Date | null>(null);
  filtroLaboratorio = this.fb.control<string | null>(null);
  filtroEstado = this.fb.control<string | null>(null);
  laboratorioOptions: { label: string; value: string }[] = [];
  estadoOptions = [
    { label: 'Pendiente', value: 'pendientes' },
    { label: 'Aprobada', value: 'aprobadas' },
    { label: 'Rechazada', value: 'rechazadas' },
  ];

  reservaDetalle: ReservaAula | null = null;
  mostrarDetalle = false;

  // Coordinador: aulas asignadas al usuario actual
  esAdmin = false;
  esCoordinador = false;
  misAulasCodigos: string[] = [];

  // Mapa de identificación → datos Oracle (nombre, programa, etc.)
  usuariosOracleMap = new Map<string, UsuarioOracle>();

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const roles = this.authService.getUserRoles();
    this.esAdmin = roles.includes('ADMIN');

    // Sincronizar select de estado con las cards
    this.filtroEstado.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      this.vistaActual = (val as VistaReserva) || 'todas';
    });

    if (user && !this.esAdmin) {
      // Buscar aulas asignadas al usuario como coordinador
      this.coordinadorSvc.getByKeycloakUserId(user.id).pipe(
        takeUntil(this.destroy$),
        catchError(() => of([] as LbCoordinador[]))
      ).subscribe(asignaciones => {
        this.misAulasCodigos = asignaciones.map(a => a.codAula);
        this.esCoordinador = this.misAulasCodigos.length > 0;
        this.cargarReservas();
      });
    } else {
      this.cargarReservas();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarReservas(): void {
    this.cargando = true;
    this.reservasSvc.getAll()
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargando = false))
      .subscribe({
        next: (data) => {
          let reservas = data ?? [];
          // ADMIN ve todo; coordinador solo sus aulas; el resto no ve nada
          if (!this.esAdmin) {
            if (this.esCoordinador && this.misAulasCodigos.length > 0) {
              reservas = reservas.filter(r =>
                this.misAulasCodigos.includes(r.laboratorio?.codAula ?? '')
              );
            } else {
              reservas = [];
            }
          }
          this.todasLasReservas = reservas;
          this.buildLaboratorioOptions();
          this.resolverUsuariosOracle(reservas);
        },
        error: () => this.toast('error', 'Error', 'No se pudieron cargar las reservas')
      });
  }

  get reservasFiltradas(): ReservaAula[] {
    const texto = (this.filtroTexto.value ?? '').toLowerCase().trim();
    const fechaFiltro = this.filtroFecha.value;
    const labFiltro = this.filtroLaboratorio.value;
    const estadoFiltro = this.filtroEstado.value || this.vistaActual;

    return this.todasLasReservas.filter(r => {
      // Filtro por estado (select o cards)
      if (estadoFiltro === 'aprobadas' && r.aprobado !== true) return false;
      if (estadoFiltro === 'pendientes' && !(r.aprobado == null || r.aprobado === undefined)) return false;
      if (estadoFiltro === 'rechazadas' && r.aprobado !== false) return false;

      // Filtro por fecha
      if (fechaFiltro) {
        const y = fechaFiltro.getFullYear();
        const m = String(fechaFiltro.getMonth() + 1).padStart(2, '0');
        const d = String(fechaFiltro.getDate()).padStart(2, '0');
        const fechaStr = `${y}-${m}-${d}`;
        if (r.fecha !== fechaStr) return false;
      }

      // Filtro por laboratorio
      if (labFiltro && r.laboratorio?.codAula !== labFiltro) return false;

      // Filtro por texto (identificación)
      if (texto && !(r.identificacion ?? '').toLowerCase().includes(texto)) return false;

      return true;
    });
  }

  get countTodas(): number { return this.todasLasReservas.length; }
  get countAprobadas(): number { return this.todasLasReservas.filter(r => r.aprobado === true).length; }
  get countPendientes(): number { return this.todasLasReservas.filter(r => r.aprobado == null || r.aprobado === undefined).length; }
  get countRechazadas(): number { return this.todasLasReservas.filter(r => r.aprobado === false).length; }

  cambiarVista(vista: VistaReserva): void {
    this.vistaActual = vista;
    this.filtroEstado.setValue(vista === 'todas' ? null : vista, { emitEvent: false });
    this.filtroTexto.setValue('');
    this.filtroFecha.setValue(null);
    this.filtroLaboratorio.setValue(null);
  }

  limpiarFiltros(): void {
    this.filtroTexto.setValue('');
    this.filtroFecha.setValue(null);
    this.filtroLaboratorio.setValue(null);
    this.filtroEstado.setValue(null);
    this.vistaActual = 'todas';
  }

  private resolverUsuariosOracle(reservas: ReservaAula[]): void {
    const idsUnicos = [...new Set(reservas.map(r => r.identificacion).filter(id => id && !this.usuariosOracleMap.has(id)))];
    if (idsUnicos.length === 0) return;

    const peticiones = idsUnicos.map(id =>
      this.usuariosOracleSvc.getByCodigo(id).pipe(catchError(() => of(null)))
    );

    forkJoin(peticiones).pipe(takeUntil(this.destroy$)).subscribe(resultados => {
      resultados.forEach((usuario, i) => {
        if (usuario) {
          this.usuariosOracleMap.set(idsUnicos[i], usuario);
        }
      });
    });
  }

  getPrograma(identificacion: string): string {
    return this.usuariosOracleMap.get(identificacion)?.programa || '';
  }

  getNombreUsuario(identificacion: string): string {
    return this.usuariosOracleMap.get(identificacion)?.nombre || '';
  }

  private buildLaboratorioOptions(): void {
    const map = new Map<string, string>();
    this.todasLasReservas.forEach(r => {
      const cod = r.laboratorio?.codAula;
      const nom = r.laboratorio?.nomAula;
      if (cod && !map.has(cod)) map.set(cod, nom || cod);
    });
    this.laboratorioOptions = Array.from(map.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  verDetalle(reserva: ReservaAula): void {
    this.reservaDetalle = reserva;
    this.mostrarDetalle = true;
  }

  eliminarReserva(reserva: ReservaAula): void {
    if (!reserva.id) return;
    this.confirmationService.confirm({
      message: `¿Eliminar la reserva del ${reserva.fecha} (${this.formatHora(reserva.horaInicio)} – ${this.formatHora(reserva.horaFin)}) de ${reserva.identificacion}? Se restaurará el inventario reservado.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.eliminando[reserva.id!] = true;
        this.reservasSvc.delete(reserva.id!)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => delete this.eliminando[reserva.id!]),
            catchError(() => {
              this.toast('error', 'Error', 'No se pudo eliminar la reserva');
              return of(null);
            })
          )
          .subscribe(() => {
            this.todasLasReservas = this.todasLasReservas.filter(r => r.id !== reserva.id);
            this.toast('success', 'Reserva eliminada', 'La reserva fue eliminada y el inventario restaurado.');
          });
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

  estadoSeverity(reserva: ReservaAula): 'success' | 'danger' | 'warn' {
    if (reserva.aprobado === true) return 'success';
    if (reserva.aprobado === false) return 'danger';
    return 'warn';
  }

  puedeAprobar(reserva: ReservaAula): boolean {
    return (this.esAdmin || this.esCoordinador) && reserva.aprobado == null;
  }

  puedeRechazar(reserva: ReservaAula): boolean {
    return (this.esAdmin || this.esCoordinador) && reserva.aprobado == null;
  }

  aprobarReserva(reserva: ReservaAula): void {
    if (!reserva.id) return;
    this.confirmationService.confirm({
      message: `¿Aprobar la reserva del ${reserva.fecha} (${this.formatHora(reserva.horaInicio)} – ${this.formatHora(reserva.horaFin)}) de ${reserva.identificacion}?`,
      header: 'Confirmar aprobación',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Aprobar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.aprobando[reserva.id!] = true;
        this.reservasSvc.aprobar(reserva.id!, true).pipe(
          takeUntil(this.destroy$),
          finalize(() => delete this.aprobando[reserva.id!]),
          catchError(() => { this.toast('error', 'Error', 'No se pudo aprobar la reserva'); return of(null); })
        ).subscribe(res => {
          if (res) {
            reserva.aprobado = true;
            this.toast('success', 'Reserva aprobada', 'La reserva fue aprobada correctamente.');
          }
        });
      }
    });
  }

  rechazarReserva(reserva: ReservaAula): void {
    if (!reserva.id) return;
    this.confirmationService.confirm({
      message: `¿Rechazar la reserva del ${reserva.fecha} (${this.formatHora(reserva.horaInicio)} – ${this.formatHora(reserva.horaFin)}) de ${reserva.identificacion}? Se restaurará el inventario reservado.`,
      header: 'Confirmar rechazo',
      icon: 'pi pi-times-circle',
      acceptLabel: 'Rechazar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.aprobando[reserva.id!] = true;
        this.reservasSvc.aprobar(reserva.id!, false).pipe(
          takeUntil(this.destroy$),
          finalize(() => delete this.aprobando[reserva.id!]),
          catchError(() => { this.toast('error', 'Error', 'No se pudo rechazar la reserva'); return of(null); })
        ).subscribe(res => {
          if (res) {
            reserva.aprobado = false;
            this.toast('warn', 'Reserva rechazada', 'La reserva fue rechazada.');
          }
        });
      }
    });
  }

  private toast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'lista-reservas', life: 5000, severity, summary, detail });
  }
}
