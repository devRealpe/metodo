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
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Card } from 'primeng/card';
import { InputComponent, SelectComponent, DatepickerComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { ReservasAulaService } from '../../core/services/reservas-aula.service';
import { ReservaAula } from '../../core/models/reserva-aula.model';
import { UsosLaboratorioService, RegistroUsoDTO } from '../../core/services/usos-laboratorio.service';
import { UsuariosOracleService, UsuarioOracle } from '../../core/services/usuarios-oracle.service';
import { LbCoordinadorService } from '../../core/services/lb-coordinador.service';

type EstadoAsistencia = 'asistio' | 'no_asistio' | 'pendiente' | 'parcial';

interface ReservaMonitoreo extends ReservaAula {
  estadoAsistencia: EstadoAsistencia;
  asistentesQueAsistieron: string[];
  totalAsistentesRegistrados: number;
  registrosUso: RegistroUsoDTO[];
  programaSolicitante?: string;
  nombreSolicitante?: string;
}

@Component({
  selector: 'app-monitoreo-reservas',
  standalone: true,
  imports: [
    CommonModule, HttpClientModule, ReactiveFormsModule,
    TableModule, ButtonModule, ToastModule, TagModule,
    DividerModule, DialogModule, TooltipModule,
    ProgressSpinnerModule, Card,
    InputComponent, SelectComponent, DatepickerComponent
  ],
  providers: [MessageService],
  templateUrl: './monitoreo-reservas.component.html',
})
export class MonitoreoReservasComponent implements OnInit, OnDestroy {
  private reservasSvc = inject(ReservasAulaService);
  private usosSvc = inject(UsosLaboratorioService);
  private usuariosOracleSvc = inject(UsuariosOracleService);
  private coordinadorSvc = inject(LbCoordinadorService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  cargando = false;
  reservasMonitoreo: ReservaMonitoreo[] = [];
  usuariosOracleMap = new Map<string, UsuarioOracle>();

  filtroTexto = this.fb.control('');
  filtroFecha = this.fb.control<Date | null>(null);
  filtroLaboratorio = this.fb.control<string | null>(null);
  filtroAsistencia = this.fb.control<string | null>(null);
  laboratorioOptions: { label: string; value: string }[] = [];
  asistenciaOptions = [
    { label: 'Asistió', value: 'asistio' },
    { label: 'No asistió', value: 'no_asistio' },
    { label: 'Parcial', value: 'parcial' },
    { label: 'Pendiente', value: 'pendiente' },
  ];

  reservaDetalle: ReservaMonitoreo | null = null;
  mostrarDetalle = false;

  esAdmin = false;
  esCoordinador = false;
  misAulasCodigos: string[] = [];

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const roles = this.authService.getUserRoles();
    this.esAdmin = roles.includes('ADMIN');

    if (user && !this.esAdmin) {
      this.coordinadorSvc.getByKeycloakUserId(user.id).pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      ).subscribe((asignaciones: any[]) => {
        this.misAulasCodigos = asignaciones.map(a => a.codAula);
        this.esCoordinador = this.misAulasCodigos.length > 0;
        this.cargarDatos();
      });
    } else {
      this.cargarDatos();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos(): void {
    this.cargando = true;
    forkJoin({
      reservas: this.reservasSvc.getAll().pipe(catchError(() => of([]))),
      usos: this.usosSvc.getAll().pipe(catchError(() => of([])))
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.cargando = false)
    ).subscribe(({ reservas, usos }) => {
      // Solo reservas aprobadas
      let aprobadas = (reservas ?? []).filter(r => r.aprobado === true);

      // Filtrar por aulas del coordinador
      if (!this.esAdmin && this.esCoordinador && this.misAulasCodigos.length > 0) {
        aprobadas = aprobadas.filter(r =>
          this.misAulasCodigos.includes(r.laboratorio?.codAula ?? '')
        );
      } else if (!this.esAdmin && !this.esCoordinador) {
        aprobadas = [];
      }

      const hoy = new Date();
      const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

      this.reservasMonitoreo = aprobadas.map(r => {
        const asistentesIds = (r.asistentes ?? []).map(a => a.identificacion);
        const idsABuscar = asistentesIds.length > 0 ? asistentesIds : [r.identificacion];

        // Buscar registros de uso coincidentes por identificación y fecha
        const registrosCoincidentes = (usos ?? []).filter(u =>
          idsABuscar.includes(u.identificacion ?? '') && u.fechaUso === r.fecha
        );

        const asistentesQueAsistieron = [...new Set(
          registrosCoincidentes.map(u => u.identificacion!).filter(Boolean)
        )];

        const totalEsperados = idsABuscar.length;
        const totalAsistieron = asistentesQueAsistieron.length;

        let estadoAsistencia: EstadoAsistencia;
        if (r.fecha > hoyStr) {
          estadoAsistencia = 'pendiente';
        } else if (totalAsistieron === 0) {
          estadoAsistencia = 'no_asistio';
        } else if (totalAsistieron >= totalEsperados) {
          estadoAsistencia = 'asistio';
        } else {
          estadoAsistencia = 'parcial';
        }

        return {
          ...r,
          estadoAsistencia,
          asistentesQueAsistieron,
          totalAsistentesRegistrados: totalAsistieron,
          registrosUso: registrosCoincidentes
        } as ReservaMonitoreo;
      });

      this.buildLaboratorioOptions();
      this.resolverUsuariosOracle();
    });
  }

  private resolverUsuariosOracle(): void {
    const idsUnicos = [...new Set(
      this.reservasMonitoreo.map(r => r.identificacion).filter(id => id && !this.usuariosOracleMap.has(id))
    )];
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
      // Enriquecer con programa y nombre
      this.reservasMonitoreo.forEach(r => {
        const u = this.usuariosOracleMap.get(r.identificacion);
        if (u) {
          r.programaSolicitante = u.programa;
          r.nombreSolicitante = u.nombre;
        }
      });
    });
  }

  get reservasFiltradas(): ReservaMonitoreo[] {
    const texto = (this.filtroTexto.value ?? '').toLowerCase().trim();
    const fechaFiltro = this.filtroFecha.value;
    const labFiltro = this.filtroLaboratorio.value;
    const asistFiltro = this.filtroAsistencia.value;

    return this.reservasMonitoreo.filter(r => {
      if (asistFiltro && r.estadoAsistencia !== asistFiltro) return false;

      if (fechaFiltro) {
        const y = fechaFiltro.getFullYear();
        const m = String(fechaFiltro.getMonth() + 1).padStart(2, '0');
        const d = String(fechaFiltro.getDate()).padStart(2, '0');
        if (r.fecha !== `${y}-${m}-${d}`) return false;
      }

      if (labFiltro && r.laboratorio?.codAula !== labFiltro) return false;

      if (texto) {
        const matchId = (r.identificacion ?? '').toLowerCase().includes(texto);
        const matchNombre = (r.nombreSolicitante ?? '').toLowerCase().includes(texto);
        const matchPrograma = (r.programaSolicitante ?? '').toLowerCase().includes(texto);
        if (!matchId && !matchNombre && !matchPrograma) return false;
      }

      return true;
    });
  }

  // Contadores
  get countTotal(): number { return this.reservasMonitoreo.length; }
  get countAsistio(): number { return this.reservasMonitoreo.filter(r => r.estadoAsistencia === 'asistio').length; }
  get countNoAsistio(): number { return this.reservasMonitoreo.filter(r => r.estadoAsistencia === 'no_asistio').length; }
  get countParcial(): number { return this.reservasMonitoreo.filter(r => r.estadoAsistencia === 'parcial').length; }
  get countPendiente(): number { return this.reservasMonitoreo.filter(r => r.estadoAsistencia === 'pendiente').length; }

  get tasaAsistencia(): number {
    const evaluables = this.reservasMonitoreo.filter(r => r.estadoAsistencia !== 'pendiente');
    if (evaluables.length === 0) return 0;
    const asistieron = evaluables.filter(r => r.estadoAsistencia === 'asistio' || r.estadoAsistencia === 'parcial').length;
    return Math.round((asistieron / evaluables.length) * 100);
  }

  private buildLaboratorioOptions(): void {
    const map = new Map<string, string>();
    this.reservasMonitoreo.forEach(r => {
      const cod = r.laboratorio?.codAula;
      const nom = r.laboratorio?.nomAula;
      if (cod && !map.has(cod)) map.set(cod, nom || cod);
    });
    this.laboratorioOptions = Array.from(map.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  limpiarFiltros(): void {
    this.filtroTexto.setValue('');
    this.filtroFecha.setValue(null);
    this.filtroLaboratorio.setValue(null);
    this.filtroAsistencia.setValue(null);
  }

  verDetalle(reserva: ReservaMonitoreo): void {
    this.reservaDetalle = reserva;
    this.mostrarDetalle = true;
  }

  formatHora(hora: string): string {
    if (!hora) return '—';
    return hora.length >= 5 ? hora.slice(0, 5) : hora;
  }

  asistenciaLabel(estado: EstadoAsistencia): string {
    switch (estado) {
      case 'asistio': return 'Asistió';
      case 'no_asistio': return 'No asistió';
      case 'parcial': return 'Parcial';
      case 'pendiente': return 'Pendiente';
    }
  }

  asistenciaSeverity(estado: EstadoAsistencia): 'success' | 'danger' | 'warn' | 'info' {
    switch (estado) {
      case 'asistio': return 'success';
      case 'no_asistio': return 'danger';
      case 'parcial': return 'warn';
      case 'pendiente': return 'info';
    }
  }

  asistenciaIcon(estado: EstadoAsistencia): string {
    switch (estado) {
      case 'asistio': return 'pi pi-check-circle';
      case 'no_asistio': return 'pi pi-times-circle';
      case 'parcial': return 'pi pi-exclamation-circle';
      case 'pendiente': return 'pi pi-clock';
    }
  }

  asistenteAsistio(identificacion: string, reserva: ReservaMonitoreo): boolean {
    return reserva.asistentesQueAsistieron.includes(identificacion);
  }

  getPrograma(identificacion: string): string {
    return this.usuariosOracleMap.get(identificacion)?.programa || '';
  }

  getNombre(identificacion: string): string {
    return this.usuariosOracleMap.get(identificacion)?.nombre || '';
  }

  private toast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({ key: 'monitoreo-toast', life: 5000, severity, summary, detail });
  }
}
