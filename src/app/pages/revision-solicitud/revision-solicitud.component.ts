import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

import { AuthService } from '@microfrontends/shared-services';
import { UsuarioOracleService } from '../../core/services/usuario-oracle.service';
import { DependenciaService } from '../../core/services/dependencia.service';
import { DependenciaResponse } from '../../core/models/dependencia.models';

import { DireccionComponent } from './components/direccion/direccion.component';

@Component({
  selector: 'app-revision-solicitud',
  standalone: true,
  imports: [
    CommonModule,
    ToastModule,
    SkeletonModule,
    DireccionComponent,
  ],
  // MessageService se provee aquí para que el <p-toast> del orquestador
  // capture también los mensajes generados por los subcomponentes hijos.
  providers: [MessageService],
  templateUrl: './revision-solicitud.component.html',
  styleUrl: './revision-solicitud.component.scss',
})
export class RevisionSolicitudComponent implements OnInit, OnDestroy {
  private readonly dependenciaService = inject(DependenciaService);
  private readonly usuarioOracleService = inject(UsuarioOracleService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  // ── Estado del usuario autenticado ──────────────────────────────────────
  identificacionUsuario = signal<string>('');
  usuarioNombre = signal<string>('');
  usuarioCargo = signal<string>('');
  usuarioPrograma = signal<string>('');
  cargando = signal(true);

  // ── Dependencias ─────────────────────────────────────────────────────────
  dependenciasAccesibles = signal<DependenciaResponse[]>([]);
  dependenciaSeleccionada = signal<DependenciaResponse | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────
  /** Verdadero si el usuario tiene acceso a al menos una dependencia. */
  readonly tieneAcceso = computed(() => this.dependenciasAccesibles().length > 0);

  /**
   * Verdadero cuando hay más de una dependencia accesible y el usuario
   * aún no ha elegido con cuál trabajar.
   */
  readonly debeSeleccionar = computed(
    () =>
      this.dependenciasAccesibles().length > 1 &&
      !this.dependenciaSeleccionada()
  );

  ngOnInit(): void {
    this._inicializar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Inicialización ────────────────────────────────────────────────────────

  private _inicializar(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (!user) return;

        const identificacion = user.identificacion || user.username;
        if (!identificacion) {
          this.cargando.set(false);
          return;
        }

        const esDirector = user.roles?.includes('PLANES_DIRECTOR');

        // Cargamos en paralelo: datos Oracle del usuario + todas las dependencias activas.
        // Si Oracle falla, se trata como usuario sin cargo (catchError ya está en el servicio,
        // pero lo dejamos de forma defensiva aquí también).
        forkJoin({
          oracle: this.usuarioOracleService
            .getByIdentificacion(identificacion)
            .pipe(catchError(() => of(null))),
          dependencias: this.dependenciaService
            .listar(0, 100, true)
            .pipe(catchError(() => of(null))),
        })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({ oracle, dependencias }) => {
              this.cargando.set(false);

              // Determinar cargo y nombre del usuario
              const cargo = esDirector
                ? 'DIRECTOR DE PROGRAMA'
                : oracle?.cargo ?? '';
              const nombre =
                oracle?.nombre ?? (esDirector ? 'Director de Programa' : '');
              const programa = oracle?.programa ?? '';

              this.identificacionUsuario.set(identificacion);
              this.usuarioNombre.set(nombre);
              this.usuarioCargo.set(cargo);
              this.usuarioPrograma.set(programa);

              // Filtrar las dependencias a las que tiene acceso este usuario
              const lista = dependencias?.content ?? [];
              const accesibles = lista.filter((dep) =>
                this._tieneAccesoADependencia(dep, identificacion, cargo)
              );

              this.dependenciasAccesibles.set(accesibles);

              // Si solo tiene acceso a una, seleccionarla automáticamente
              if (accesibles.length === 1) {
                this.dependenciaSeleccionada.set(accesibles[0]);
              }
            },
            error: () => {
              this.cargando.set(false);
              this.messageService.add({
                severity: 'error',
                summary: 'Error de inicialización',
                detail: 'No se pudo obtener la información del usuario.',
                life: 6000,
              });
            },
          });
      });
  }

  /**
   * Verifica si el usuario tiene acceso a una dependencia según su
   * tipo de acceso configurado en el backend:
   *  - CARGO: el cargo del usuario debe estar en `cargosAcceso[]`.
   *  - IDENTIFICACION: la identificación del usuario debe estar en `usuariosAcceso[]`.
   */
  private _tieneAccesoADependencia(
    dep: DependenciaResponse,
    identificacion: string,
    cargo: string
  ): boolean {
    if (!dep.activo) return false;

    if (dep.tipoAcceso === 'CARGO') {
      return (dep.cargosAcceso ?? []).some(
        (c) => c.trim().toLowerCase() === cargo.trim().toLowerCase()
      );
    }

    // tipoAcceso === 'IDENTIFICACION'
    return (dep.usuariosAcceso ?? []).includes(identificacion);
  }

  // ── Acciones del usuario ──────────────────────────────────────────────────

  seleccionarDependencia(dep: DependenciaResponse): void {
    this.dependenciaSeleccionada.set(dep);
  }

  volver(): void {
    this.dependenciaSeleccionada.set(null);
  }

  formatearCargo(cargo: string): string {
    return cargo
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
