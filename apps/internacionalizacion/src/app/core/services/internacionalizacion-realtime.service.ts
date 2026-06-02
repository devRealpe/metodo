import { Injectable, signal } from '@angular/core';
import { NotificationManagementService } from '@microfrontends/shared-services';
import { Notification } from '@microfrontends/shared-models';

/**
 * Servicio de tiempo real para Internacionalización.
 *
 * Se suscribe a las notificaciones SSE (vía NotificationManagementService)
 * y emite signals cuando ocurren cambios en:
 *  - Convenios (creación, actualización, eliminación, renovación)
 *  - Movilidades (creación, actualización, eliminación, cierre)
 *  - Autorizaciones (aprobación, rechazo de niveles)
 *  - Proceso de movilidad (seguimiento, cambio de estado)
 *  - Datos generales (líneas estratégicas, reportes, etc.)
 *
 * Los componentes usan effect() sobre refreshTrigger para reaccionar
 * automáticamente sin polling manual.
 */
@Injectable({
  providedIn: 'root'
})
export class InternacionalizacionRealtimeService {

  // ── Signal global de refresh ──────────────────────────────────────────
  private refreshTriggerSignal = signal<number>(0);

  // ── Signals por dominio ───────────────────────────────────────────────
  public convenioActualizado     = signal<Notification | null>(null);
  public movilidadActualizada    = signal<Notification | null>(null);
  public autorizacionActualizada = signal<Notification | null>(null);
  public procesoActualizado      = signal<Notification | null>(null);
  public datosGeneralesActualizados = signal<Notification | null>(null);

  /** Última notificación recibida (cualquier tipo) */
  public ultimaNotificacion = signal<Notification | null>(null);

  constructor(private notificationService: NotificationManagementService) {
    this.inicializarSuscripciones();
  }

  // ── API pública ───────────────────────────────────────────────────────

  /** Signal de solo lectura que los componentes observan con effect() */
  get refreshTrigger() {
    return this.refreshTriggerSignal.asReadonly();
  }

  /** Fuerza un refresh manual (útil tras operaciones CRUD locales) */
  triggerRefresh(): void {
    this.refreshTriggerSignal.update(v => v + 1);
  }

  /** Resetea un signal específico después de procesarlo */
  resetSignal(tipo: 'convenio' | 'movilidad' | 'autorizacion' | 'proceso' | 'general'): void {
    switch (tipo) {
      case 'convenio':
        this.convenioActualizado.set(null);
        break;
      case 'movilidad':
        this.movilidadActualizada.set(null);
        break;
      case 'autorizacion':
        this.autorizacionActualizada.set(null);
        break;
      case 'proceso':
        this.procesoActualizado.set(null);
        break;
      case 'general':
        this.datosGeneralesActualizados.set(null);
        break;
    }
  }

  /** Resetea todos los signals de dominio */
  resetAll(): void {
    this.convenioActualizado.set(null);
    this.movilidadActualizada.set(null);
    this.autorizacionActualizada.set(null);
    this.procesoActualizado.set(null);
    this.datosGeneralesActualizados.set(null);
    this.ultimaNotificacion.set(null);
  }

  // ── Suscripciones internas ────────────────────────────────────────────

  private inicializarSuscripciones(): void {
    this.notificationService.notifications$.subscribe(notifications => {
      const internNotifications = notifications.filter(
        n => n.projectContext === 'internacionalizacion'
      );

      if (internNotifications.length > 0) {
        this.procesarNotificacion(internNotifications[0]);
      }
    });
  }

  private procesarNotificacion(notification: Notification): void {
    this.ultimaNotificacion.set(notification);

    const tipo = (notification.type?.toString() ?? '').toLowerCase();
    const mensaje = (notification.message ?? '').toLowerCase();
    const titulo = (notification.title ?? '').toLowerCase();
    const contexto = `${tipo} ${mensaje} ${titulo}`;

    if (this.esConvenio(contexto)) {
      this.convenioActualizado.set(notification);
    } else if (this.esAutorizacion(contexto)) {
      this.autorizacionActualizada.set(notification);
    } else if (this.esProceso(contexto)) {
      this.procesoActualizado.set(notification);
    } else if (this.esMovilidad(contexto)) {
      this.movilidadActualizada.set(notification);
    } else {
      this.datosGeneralesActualizados.set(notification);
    }

    // Siempre dispara el refresh global
    this.refreshTriggerSignal.update(v => v + 1);
  }

  // ── Clasificadores ────────────────────────────────────────────────────

  private esConvenio(ctx: string): boolean {
    return /convenio|renovaci[oó]n|vigencia/.test(ctx);
  }

  private esMovilidad(ctx: string): boolean {
    return /movilidad|postulante|estudiante/.test(ctx);
  }

  private esAutorizacion(ctx: string): boolean {
    return /autorizaci[oó]n|aprobaci[oó]n|rechaz|nivel|approve|reject/.test(ctx);
  }

  private esProceso(ctx: string): boolean {
    return /proceso|seguimiento|tracking/.test(ctx);
  }
}
