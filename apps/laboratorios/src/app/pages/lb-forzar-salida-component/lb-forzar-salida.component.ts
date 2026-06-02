import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { UsosLaboratorioService, RegistroUsoDTO } from '../../core/services/usos-laboratorio.service';
import { LbLaboratoriosAulasService } from '../../core/services/lb-laboratorios-aulas.service';
import { UsuariosOracleService } from '../../core/services/usuarios-oracle.service';
import { UsuariosExternosService } from '../../core/services/usuarios-externos.service';

export interface DatosUsuario {
  nombre: string;
  semestre?: string;
  programa?: string;
  facultad?: string;
}

export interface SesionEnriquecida extends RegistroUsoDTO {
  codAula: string;
  labNombre: string;
  nombreUsuario: string;
}

@Component({
  selector: 'app-lb-forzar-salida',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ButtonModule,
    CardModule,
    IconFieldModule,
    InputIconModule,
    TableModule,
    ToastModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './lb-forzar-salida.component.html',
})
export class LbForzarSalidaComponent implements OnInit, OnDestroy {
  private readonly usosSrv = inject(UsosLaboratorioService);
  private readonly aulasSrv = inject(LbLaboratoriosAulasService);
  private readonly oracleSrv = inject(UsuariosOracleService);
  private readonly externosSrv = inject(UsuariosExternosService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();

  sesionesActivas: SesionEnriquecida[] = [];
  cargando = false;
  filtroBusqueda = '';

  get sesionesFiltered(): SesionEnriquecida[] {
    const q = this.filtroBusqueda.trim().toLowerCase();
    if (!q) return this.sesionesActivas;
    return this.sesionesActivas.filter(s =>
      (s.identificacion ?? '').toLowerCase().includes(q) ||
      (s.nombreUsuario ?? '').toLowerCase().includes(q) ||
      (s.labNombre ?? '').toLowerCase().includes(q) ||
      (s.codAula ?? '').toLowerCase().includes(q) ||
      (s.programa ?? '').toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    this.cargarActivos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarActivos(): void {
    this.cargando = true;
    this.sesionesActivas = [];

    forkJoin({
      sesiones: this.usosSrv.getActivos().pipe(catchError(() => of([]))),
      aulas: this.aulasSrv.getAll().pipe(catchError(() => of([])))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ sesiones, aulas }) => {
          // Mapa codAula → nomAula
          const labNombre: Record<string, string> = {};
          (aulas ?? []).forEach(a => {
            if (a.codAula) labNombre[a.codAula] = a.nomAula ?? a.codAula;
          });

          const rawSesiones = sesiones ?? [];
          if (rawSesiones.length === 0) {
            this.sesionesActivas = [];
            this.cargando = false;
            return;
          }

          // Obtener identificaciones únicas para buscar datos de usuario
          const idsUnicos = [...new Set(rawSesiones.map((s: any) => s.identificacion ?? '').filter(Boolean))];

          const oracleObs = idsUnicos.map(id =>
            this.oracleSrv.getByCodigo(id).pipe(catchError(() => of(null)))
          );

          forkJoin(oracleObs.length > 0 ? oracleObs : [of(null)])
            .pipe(takeUntil(this.destroy$))
            .subscribe(resultados => {
              const datosById: Record<string, DatosUsuario> = {};
              idsUnicos.forEach((id, i) => {
                const u = resultados[i] as any;
                if (u?.nombre) {
                  datosById[id] = {
                    nombre: u.nombre,
                    semestre: u.semestre ?? undefined,
                    programa: u.programa ?? undefined,
                    facultad: u.facultad ?? undefined,
                  };
                }
              });

              // Para los que no se encontraron en Oracle, buscar en externos
              const sinDatos = idsUnicos.filter(id => !datosById[id]);
              const externosObs = sinDatos.map(id =>
                this.externosSrv.getByIdentificacion(id).pipe(catchError(() => of([])))
              );

              const resolverExterno = (extResults: any[][]) => {
                sinDatos.forEach((id, i) => {
                  const ext = extResults[i]?.[0];
                  if (ext?.nombre) {
                    datosById[id] = {
                      nombre: ext.nombre,
                      semestre: ext.semestre ?? undefined,
                      programa: ext.programa ?? undefined,
                      facultad: ext.facultad ?? undefined,
                    };
                  }
                });
                this.construirSesiones(rawSesiones, labNombre, datosById);
              };

              if (externosObs.length > 0) {
                forkJoin(externosObs).pipe(takeUntil(this.destroy$)).subscribe({
                  next: (extResults) => resolverExterno(extResults as any[][]),
                  error: () => this.construirSesiones(rawSesiones, labNombre, datosById)
                });
              } else {
                this.construirSesiones(rawSesiones, labNombre, datosById);
              }
            });
        },
        error: () => {
          this.messageService.add({ key: 'forzar-salida', life: 4000, severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las sesiones activas.' });
          this.cargando = false;
        }
      });
  }

  private construirSesiones(
    rawSesiones: any[],
    labNombre: Record<string, string>,
    datosById: Record<string, DatosUsuario>
  ): void {
    this.sesionesActivas = rawSesiones.map(s => {
      const codAula: string = s.codAula ?? s.cod_aula ?? s.laboratorioId ?? '';
      const datos = datosById[s.identificacion ?? ''];
      return {
        ...s,
        codAula,
        labNombre: labNombre[codAula] ?? codAula ?? '—',
        nombreUsuario: datos?.nombre ?? s.identificacion ?? '—',
        semestre: datos?.semestre ?? s.semestre ?? null,
        programa: datos?.programa ?? s.programa ?? null,
        facultad: datos?.facultad ?? s.facultad ?? null,
      } as SesionEnriquecida;
    });
    this.cargando = false;
  }

  confirmarForzarSalida(sesion: SesionEnriquecida): void {
    const id = sesion.identificacion ?? '';
    if (!id) return;

    this.confirmationService.confirm({
      message: `¿Desea forzar la salida de <strong>${sesion.nombreUsuario}</strong> (${id}) del laboratorio <strong>${sesion.labNombre}</strong>?<br/><small>Se registrará la hora actual como hora de salida.</small>`,
      header: 'Forzar salida',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, forzar salida',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.ejecutarForzarSalida(id, sesion.nombreUsuario),
    });
  }

  private ejecutarForzarSalida(identificacion: string, nombre: string): void {
    this.usosSrv.forzarSalida(identificacion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const actualizados = res?.actualizados ?? 0;
          if (actualizados > 0) {
            this.messageService.add({ key: 'forzar-salida', life: 4000, severity: 'success', summary: 'Salida registrada', detail: `Salida forzada para ${nombre}.` });
            this.sesionesActivas = this.sesionesActivas.filter(s => s.identificacion !== identificacion);
          } else {
            this.messageService.add({ key: 'forzar-salida', life: 4000, severity: 'warn', summary: 'Sin cambios', detail: 'No se encontró sesión activa para ese usuario.' });
          }
        },
        error: () => {
          this.messageService.add({ key: 'forzar-salida', life: 4000, severity: 'error', summary: 'Error', detail: 'No se pudo forzar la salida.' });
        }
      });
  }
}
