import { Injectable, signal, computed } from '@angular/core';
import { NotificationManagementService } from '@microfrontends/shared-services';
import { Notification } from '@microfrontends/shared-models';
import { Subscription } from 'rxjs';

export type ViaticoEventType =
  | 'solicitado'
  | 'aprobado'
  | 'rechazado'
  | 'pagado'
  | 'anulado'
  | 'actualizado'
  | 'tarifa_modificada';

@Injectable({ providedIn: 'root' })
export class ViaticosRealtimeService {

  private refreshTriggerSignal = signal<number>(0);

  public solicitudCreada = signal<Notification | null>(null);
  public solicitudAprobada = signal<Notification | null>(null);
  public solicitudRechazada = signal<Notification | null>(null);
  public solicitudPagada = signal<Notification | null>(null);
  public solicitudAnulada = signal<Notification | null>(null);
  public solicitudActualizada = signal<Notification | null>(null);
  public tarifaModificada = signal<Notification | null>(null);
  public ultimaNotificacion = signal<Notification | null>(null);

  readonly refreshTrigger = this.refreshTriggerSignal.asReadonly();

  readonly hayActualizacion = computed(() => this.refreshTriggerSignal() > 0);

  private subscription: Subscription | null = null;

  constructor(private notificationService: NotificationManagementService) {
    this.inicializarSuscripciones();
  }

  triggerRefresh(): void {
    this.refreshTriggerSignal.update(v => v + 1);
  }

  private inicializarSuscripciones(): void {
    this.subscription = this.notificationService.notifications$.subscribe(notifications => {
      const viaticosNotifications = notifications.filter(
        n => n.projectContext === 'viaticos'
      );

      if (viaticosNotifications.length > 0) {
        this.procesarNotificacion(viaticosNotifications[0]);
      }
    });
  }

  private procesarNotificacion(notification: Notification): void {
    this.ultimaNotificacion.set(notification);

    const tipo = notification.type.toString().toLowerCase();

    if (tipo.includes('solicit') || tipo.includes('creada') || tipo.includes('enviado')) {
      this.solicitudCreada.set(notification);
    } else if (tipo.includes('aprobad') || tipo.includes('approved') || tipo.includes('viatico_approved')) {
      this.solicitudAprobada.set(notification);
    } else if (tipo.includes('rechaz') || tipo.includes('reject') || tipo.includes('viatico_rejected')) {
      this.solicitudRechazada.set(notification);
    } else if (tipo.includes('pagad') || tipo.includes('payment') || tipo.includes('pago')) {
      this.solicitudPagada.set(notification);
    } else if (tipo.includes('anulad') || tipo.includes('annul') || tipo.includes('cancel')) {
      this.solicitudAnulada.set(notification);
    } else if (tipo.includes('tarifa') || tipo.includes('rate')) {
      this.tarifaModificada.set(notification);
    } else {
      this.solicitudActualizada.set(notification);
    }

    this.refreshTriggerSignal.update(v => v + 1);
  }

  resetSignal(tipo: ViaticoEventType): void {
    const signalMap: Record<ViaticoEventType, ReturnType<typeof signal<Notification | null>>> = {
      solicitado: this.solicitudCreada,
      aprobado: this.solicitudAprobada,
      rechazado: this.solicitudRechazada,
      pagado: this.solicitudPagada,
      anulado: this.solicitudAnulada,
      actualizado: this.solicitudActualizada,
      tarifa_modificada: this.tarifaModificada,
    };
    signalMap[tipo]?.set(null);
  }

  resetAll(): void {
    this.solicitudCreada.set(null);
    this.solicitudAprobada.set(null);
    this.solicitudRechazada.set(null);
    this.solicitudPagada.set(null);
    this.solicitudAnulada.set(null);
    this.solicitudActualizada.set(null);
    this.tarifaModificada.set(null);
    this.ultimaNotificacion.set(null);
  }

  destroy(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.resetAll();
  }
}
