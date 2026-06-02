import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

import { SelectComponent } from '@microfrontends/shared-ui';
import { AuthService } from '@microfrontends/shared-services';
import { environment } from '@shared/shared-environments';

import { LbCoordinadorService } from '../../core/services/lb-coordinador.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';
import { LbCoordinador } from '../../core/models/lb-coordinador.model';
import { LbLaboratoriosAulas } from '../../core/models/lb-laboratorios-aulas.model';

/** Roles de coordinador que se buscan en Keycloak */
const ROLES_COORDINADOR = ['COR_LAB_ING', 'COR_LAB_SALUD'];

interface CoordinadorKeycloak {
  keycloakUserId: string;
  username: string;
  nombre: string;
  email: string;
  identificacion: string;
  rol: string;
}

interface AsignacionView extends LbCoordinador {
  nombre?: string;
  rol?: string;
  nomAula?: string;
}

@Component({
  selector: 'app-asignacion-coordinadores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    MessageModule,
    ProgressSpinnerModule,
    TooltipModule,
    SelectComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './asignacion-coordinadores.component.html',
})
export class AsignacionCoordinadoresComponent implements OnInit {
  private coordinadorSvc = inject(LbCoordinadorService);
  private aulasSvc = inject(LbLaboratoriosAulasService);
  private usuariosOracleSvc = inject(UsuariosOracleService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  asignaciones = signal<AsignacionView[]>([]);
  laboratorios = signal<LbLaboratoriosAulas[]>([]);
  coordinadores = signal<CoordinadorKeycloak[]>([]);
  cargando = signal(false);

  mostrarDialogo = false;
  usuarioSeleccionado: string | null = null;
  aulaSeleccionada: string | null = null;

  usuarioOptions: { label: string; value: string }[] = [];
  aulaOptions: { label: string; value: string }[] = [];

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.cargarLaboratorios();
    this.cargarCoordinadoresKeycloak();
  }

  private cargarAsignaciones(): void {
    this.coordinadorSvc.getAll().subscribe({
      next: (data) => {
        const labs = this.laboratorios();
        const usuarios = this.coordinadores();
        const views: AsignacionView[] = data.map((c) => {
          const lab = labs.find((l) => l.codAula === c.codAula);
          const user = usuarios.find((u) => u.keycloakUserId === c.keycloakUserId);
          return {
            ...c,
            nombre: user?.nombre ?? c.identificacion ?? c.keycloakUserId,
            rol: user?.rol ?? '—',
            nomAula: lab?.nomAula ?? c.codAula,
          };
        });
        this.asignaciones.set(views);
        this.cargando.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las asignaciones',
        });
        this.cargando.set(false);
      },
    });
  }

  private cargarLaboratorios(): void {
    this.aulasSvc.getAll().subscribe({
      next: (labs) => {
        this.laboratorios.set(labs);
        this.aulaOptions = labs.map((l) => ({
          label: `${l.nomAula} — ${l.nomBloque}`,
          value: l.codAula,
          tooltip: `Código: ${l.codAula} | Bloque: ${l.nomBloque} | Tipo: ${l.tipoAula} | Capacidad: ${l.numCapacidad}`,
        }));
      },
      error: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Aviso',
          detail: 'No se pudieron cargar los laboratorios',
        });
      },
    });
  }

  private cargarCoordinadoresKeycloak(): void {
    const base = `${environment.authApi}/auth/users/by-role`;
    const clientId = 'clients-service';
    const programa = 'Laboratorios';

    const requests = ROLES_COORDINADOR.map((role) =>
      this.http.get<any>(
        `${base}?role=${encodeURIComponent(role)}&clientId=${encodeURIComponent(clientId)}&programa=${encodeURIComponent(programa)}`
      ).pipe(
        catchError(() => of({ users: [] }))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const seen = new Set<string>();
        const todos: CoordinadorKeycloak[] = [];

        results.forEach((response, idx) => {
          const rol = ROLES_COORDINADOR[idx];
          // El endpoint devuelve { users: [...], total, role, clientId, programa }
          const arr: any[] = Array.isArray(response) ? response : (response?.users ?? []);
          arr.forEach((u: any) => {
            const id = u.id ?? u.keycloakUserId ?? '';
            if (!id || seen.has(id)) return;
            seen.add(id);
            todos.push({
              keycloakUserId: id,
              username: u.username
                ?? (u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : null)
                ?? u.email
                ?? id,
              nombre: '',
              email: u.email ?? '',
              identificacion: u.identificacion
                ?? u.attributes?.identificacion?.[0]
                ?? '',
              rol,
            });
          });
        });

        // Enriquecer con nombres de Oracle usando la identificación (username en Keycloak)
        this.enriquecerConOracle(todos);
      },
      error: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Aviso',
          detail: 'No se pudieron cargar los coordinadores desde Keycloak',
        });
        this.cargando.set(false);
      },
    });
  }

  private enriquecerConOracle(coordinadores: CoordinadorKeycloak[]): void {
    if (coordinadores.length === 0) {
      this.coordinadores.set([]);
      this.usuarioOptions = [];
      this.cargarAsignaciones();
      return;
    }

    // El username en Keycloak es la identificación del usuario
    const oracleRequests = coordinadores.map((c) => {
      const idBusqueda = c.username || c.identificacion;
      return idBusqueda
        ? this.usuariosOracleSvc.getByCodigo(idBusqueda).pipe(catchError(() => of(null)))
        : of(null);
    });

    forkJoin(oracleRequests).subscribe({
      next: (oracleUsers) => {
        const enriquecidos = coordinadores.map((c, i) => {
          const oracle = oracleUsers[i];
          return {
            ...c,
            nombre: oracle?.nombre ?? c.username ?? c.email,
            identificacion: c.username || c.identificacion || oracle?.identificacion || '',
          };
        });

        this.coordinadores.set(enriquecidos);
        this.usuarioOptions = enriquecidos.map((u) => ({
          label: u.nombre,
          value: u.keycloakUserId,
        }));

        this.cargarAsignaciones();
      },
      error: () => {
        // Si falla Oracle, usar datos de Keycloak sin nombre
        this.coordinadores.set(coordinadores);
        this.usuarioOptions = coordinadores.map((u) => ({
          label: u.username,
          value: u.keycloakUserId,
        }));
        this.cargarAsignaciones();
      },
    });
  }

  abrirDialogo(): void {
    this.usuarioSeleccionado = null;
    this.aulaSeleccionada = null;
    this.mostrarDialogo = true;
  }

  cerrarDialogo(): void {
    this.mostrarDialogo = false;
  }

  guardarAsignacion(): void {
    if (!this.usuarioSeleccionado || !this.aulaSeleccionada) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Debes seleccionar un coordinador y un laboratorio',
      });
      return;
    }

    const user = this.coordinadores().find(
      (u) => u.keycloakUserId === this.usuarioSeleccionado
    );

    const payload = {
      keycloakUserId: this.usuarioSeleccionado,
      identificacion: user?.identificacion ?? undefined,
      codAula: this.aulaSeleccionada,
    };

    this.coordinadorSvc.create(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Asignación creada correctamente',
        });
        this.cerrarDialogo();
        this.cargarAsignaciones();
      },
      error: (err) => {
        const msg =
          err?.error?.mensaje ?? 'No se pudo crear la asignación';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: msg,
        });
      },
    });
  }

  confirmarEliminar(asignacion: AsignacionView): void {
    this.confirmationService.confirm({
      message: `¿Deseas eliminar la asignación de <b>${asignacion.nombre}</b> del laboratorio <b>${asignacion.nomAula}</b>?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.eliminarAsignacion(asignacion.id),
    });
  }

  private eliminarAsignacion(id: string): void {
    this.coordinadorSvc.delete(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Asignación eliminada correctamente',
        });
        this.cargarAsignaciones();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar la asignación',
        });
      },
    });
  }

  getNombreCoordinador(): string {
    return this.usuarioOptions.find((o) => o.value === this.usuarioSeleccionado)?.label ?? '';
  }

  getNombreAula(): string {
    return this.aulaOptions.find((o) => o.value === this.aulaSeleccionada)?.label ?? '';
  }
}
