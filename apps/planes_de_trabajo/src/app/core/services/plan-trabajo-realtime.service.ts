import { Injectable, signal, effect } from '@angular/core';
import { NotificationManagementService } from '@microfrontends/shared-services';
import { Notification } from '@microfrontends/shared-models';

/**
 * Servicio de tiempo real para Planes de Trabajo.
 * 
 * Se suscribe a las notificaciones SSE y emite signals cuando:
 * - Se envía un plan de trabajo
 * - Se aprueba/rechaza un plan
 * - Se actualiza el estado de un plan
 * - Cualquier cambio relacionado con planes de trabajo
 * 
 * Los componentes pueden suscribirse a estos signals con effect() para
 * reaccionar automáticamente sin necesidad de refrescar manualmente.
 */
@Injectable({
  providedIn: 'root'
})
export class PlanTrabajoRealtimeService {
  
  // Signal que se incrementa cada vez que hay un cambio en planes de trabajo
  // Los componentes pueden usar effect() para detectar cambios
  private refreshTriggerSignal = signal<number>(0);
  
  // Signal específico para cada tipo de evento
  public planEnviado = signal<Notification | null>(null);
  public planAprobado = signal<Notification | null>(null);
  public planRechazado = signal<Notification | null>(null);
  public planActualizado = signal<Notification | null>(null);
  
  // Última notificación recibida relacionada con planes de trabajo
  public ultimaNotificacion = signal<Notification | null>(null);
  
  constructor(
    private notificationService: NotificationManagementService
  ) {
    this.inicializarSuscripciones();
  }

  /**
   * Obtiene el signal de refresh para que los componentes lo observen
   */
  get refreshTrigger() {
    return this.refreshTriggerSignal.asReadonly();
  }

  /**
   * Fuerza un refresh manual (útil después de operaciones que modifican datos)
   */
  triggerRefresh(): void {
    this.refreshTriggerSignal.update(v => v + 1);
  }

  /**
   * Inicializa las suscripciones a las notificaciones SSE
   */
  private inicializarSuscripciones(): void {
    // Suscribirse al observable de notificaciones del servicio global
    this.notificationService.notifications$.subscribe(notifications => {
      // Filtrar solo notificaciones de planes_de_trabajo
      const planesNotifications = notifications.filter(n => 
        n.projectContext === 'planes_de_trabajo'
      );
      
      // Si hay notificaciones nuevas, procesar
      if (planesNotifications.length > 0) {
        const ultimaNotif = planesNotifications[0]; // La más reciente
        this.procesarNotificacion(ultimaNotif);
      }
    });

  }

  /**
   * Procesa una notificación recibida y actualiza los signals correspondientes
   */
  private procesarNotificacion(notification: Notification): void {
    
    this.ultimaNotificacion.set(notification);
    
    // Identificar el tipo de evento y actualizar signals específicos
    const tipoEvento = notification.type.toString().toLowerCase();
    
    if (tipoEvento.includes('enviado') || tipoEvento.includes('plan_enviado')) {
      this.planEnviado.set(notification);
    } 
    else if (tipoEvento.includes('aprobad') || tipoEvento.includes('approved')) {
      this.planAprobado.set(notification);
    } 
    else if (tipoEvento.includes('rechaz') || tipoEvento.includes('reject')) {
      this.planRechazado.set(notification);
    }
    else if (tipoEvento.includes('actualiz') || tipoEvento.includes('update')) {
      this.planActualizado.set(notification);
    }
    
    // Disparar refresh general para todos los componentes que lo escuchen
    this.refreshTriggerSignal.update(v => v + 1);
  }

  /**
   * Resetea un signal específico después de que ha sido procesado
   */
  resetSignal(tipo: 'enviado' | 'aprobado' | 'rechazado' | 'actualizado'): void {
    switch(tipo) {
      case 'enviado':
        this.planEnviado.set(null);
        break;
      case 'aprobado':
        this.planAprobado.set(null);
        break;
      case 'rechazado':
        this.planRechazado.set(null);
        break;
      case 'actualizado':
        this.planActualizado.set(null);
        break;
    }
  }

  /**
   * Resetea todos los signals
   */
  resetAll(): void {
    this.planEnviado.set(null);
    this.planAprobado.set(null);
    this.planRechazado.set(null);
    this.planActualizado.set(null);
    this.ultimaNotificacion.set(null);
  }
}
