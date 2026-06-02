import { Injectable, inject } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, map, timeout, catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { UsosLaboratorioService, SalidaPayload } from './usos-laboratorio.service';
import { LaboratoriosService } from './laboratorios.service';
import { of } from 'rxjs';

export interface AsistenciaTimerConfig {
  identificacion: string;
  laboratorioId: string;
  horaFin: string;
  fechaUso: string;
  estudianteData: {
    semestre: string;
    genero: string;
    rol: string;
    programa: string;
    facultad: string;
  };
}

export interface TimerStatus {
  activo: boolean;
  tiempoRestante: number; // en minutos
  horaFin: string;
  autoMarcadoRealizado: boolean;
}

@Injectable({ providedIn: 'root' })
export class AsistenciaTimerService {
  private readonly toast = inject(MessageService);
  private readonly usosService = inject(UsosLaboratorioService);
  private readonly labsService = inject(LaboratoriosService);

  private readonly destroy$ = new Subject<void>();
  private readonly timerStatus$ = new BehaviorSubject<TimerStatus>({
    activo: false,
    tiempoRestante: 0,
    horaFin: '',
    autoMarcadoRealizado: false
  });

  private timerConfig: AsistenciaTimerConfig | null = null;
  private checkInterval: any = null;
  private maxReintentos = 3;
  private intentosRealizados = 0;

  getTimerStatus(): Observable<TimerStatus> {
    return this.timerStatus$.asObservable();
  }

  iniciarTimer(config: AsistenciaTimerConfig): void {
    this.detenerTimer();
    this.timerConfig = config;
    this.intentosRealizados = 0;

    const tiempoRestante = this.calcularTiempoRestante(config.horaFin, config.fechaUso);

    if (tiempoRestante <= 0) {
      return;
    }

    this.timerStatus$.next({
      activo: true,
      tiempoRestante,
      horaFin: config.horaFin,
      autoMarcadoRealizado: false
    });

    this.checkInterval = setInterval(() => {
      this.revisarTiempo();
    }, 30000);
  }

  detenerTimer(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.timerStatus$.next({
      activo: false,
      tiempoRestante: 0,
      horaFin: '',
      autoMarcadoRealizado: false
    });

    this.timerConfig = null;
    this.intentosRealizados = 0;
  }

  private verificarConectividad(): Observable<boolean> {
    return this.usosService.getAll().pipe(
      map(() => true),
      timeout(5000),
      catchError(() => of(false))
    );
  }

  private revisarTiempo(): void {
    if (!this.timerConfig) return;

    const tiempoRestante = this.calcularTiempoRestante(
      this.timerConfig.horaFin,
      this.timerConfig.fechaUso
    );

    const status = this.timerStatus$.value;

    this.timerStatus$.next({
      ...status,
      tiempoRestante
    });

    if (tiempoRestante === 5 && !status.autoMarcadoRealizado) {
      this.toast.add({
        severity: 'warn',
        summary: 'Clase terminando',
        detail: 'Tu clase termina en 5 minutos'
      });
    } else if (tiempoRestante === 1 && !status.autoMarcadoRealizado) {
      this.toast.add({
        severity: 'warn',
        summary: 'Clase terminando',
        detail: 'Tu clase termina en 1 minuto'
      });
    }

    if (tiempoRestante <= 0 && !status.autoMarcadoRealizado) {
      this.marcarAsistenciaAutomatica();
    }
  }

  private marcarAsistenciaAutomatica(): void {
    if (!this.timerConfig) return;

    this.verificarConectividad().subscribe({
      next: (conectado) => {
        if (!conectado) {
          this.toast.add({
            severity: 'warn',
            summary: 'Sin conexión',
            detail: 'Sin conexión a internet. El marcado automático se intentará nuevamente.'
          });

          setTimeout(() => {
            if (this.timerConfig && !this.timerStatus$.value.autoMarcadoRealizado) {
              this.marcarAsistenciaAutomatica();
            }
          }, 30000);
          return;
        }

        this.procederConMarcadoAutomatico();
      },
      error: () => {
        this.procederConMarcadoAutomatico();
      }
    });
  }

  private procederConMarcadoAutomatico(): void {
    if (!this.timerConfig) return;

    const payload: SalidaPayload = {
      identificacion: this.timerConfig.identificacion,
      horaFin: this.timerConfig.horaFin,
      semestre: this.timerConfig.estudianteData.semestre,
      genero: this.timerConfig.estudianteData.genero,
      rol: this.timerConfig.estudianteData.rol,
      programa: this.timerConfig.estudianteData.programa,
      facultad: this.timerConfig.estudianteData.facultad,
      motivo: 'ASISTENCIA_AUTO',
      observaciones: 'Marcado automático al finalizar horario de clase'
    };

    this.usosService.marcarSalida(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const status = this.timerStatus$.value;
          this.timerStatus$.next({
            ...status,
            autoMarcadoRealizado: true
          });

          this.liberarCupoLaboratorio();

          this.toast.add({
            severity: 'success',
            summary: 'Asistencia completada',
            detail: 'Tu asistencia se ha marcado automáticamente al finalizar la clase'
          });

          setTimeout(() => {
            this.detenerTimer();
          }, 5000);
        },
        error: () => {
          this.intentosRealizados++;

          if (this.intentosRealizados < this.maxReintentos) {
            setTimeout(() => {
              if (this.timerConfig && !this.timerStatus$.value.autoMarcadoRealizado) {
                this.marcarAsistenciaAutomatica();
              }
            }, 10000);

            this.toast.add({
              severity: 'warn',
              summary: 'Reintentando...',
              detail: `Error marcando asistencia automáticamente. Reintentando... (${this.intentosRealizados}/${this.maxReintentos})`
            });
          } else {
            this.toast.add({
              severity: 'error',
              summary: 'Error automático',
              detail: 'No se pudo marcar la asistencia automáticamente después de varios intentos. Por favor, marca tu salida manualmente.'
            });

            const status = this.timerStatus$.value;
            this.timerStatus$.next({
              ...status,
              autoMarcadoRealizado: true
            });
          }
        }
      });
  }

  private liberarCupoLaboratorio(): void {
    if (!this.timerConfig) return;

    this.labsService.liberarCupo(this.timerConfig.laboratorioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (laboratorioActualizado) => {
          this.toast.add({
            severity: 'info',
            summary: 'Cupo liberado',
            detail: `Cupo del laboratorio ${laboratorioActualizado.nombre} liberado automáticamente`
          });
        },
        error: () => {
        }
      });
  }

  private calcularTiempoRestante(horaFin: string, fechaUso: string): number {
    try {
      const fechaCompleta = new Date(`${fechaUso}T${horaFin}`);
      const ahora = new Date();
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaObjetivo = new Date(fechaUso);
      fechaObjetivo.setHours(0, 0, 0, 0);

      if (fechaObjetivo.getTime() !== hoy.getTime()) {
        return -1;
      }

      const diferenciaMilisegundos = fechaCompleta.getTime() - ahora.getTime();
      const minutos = Math.floor(diferenciaMilisegundos / (1000 * 60));

      return Math.max(0, minutos);
    } catch {
      return -1;
    }
  }

  ngOnDestroy(): void {
    this.detenerTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }
}