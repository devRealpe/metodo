/**
 * Utilidad centralizada para manejo de notificaciones
 * Simplifica el uso de MessageService en componentes
 */

import { MessageService } from 'primeng/api';

export class NotificationUtil {
  
  /**
   * Muestra una notificación de éxito
   * @param messageService - Servicio de mensajes de PrimeNG
   * @param message - Mensaje a mostrar
   * @param summary - Título (default: 'Éxito')
   * @param life - Duración en ms (default: 3000)
   */
  static success(
    messageService: MessageService, 
    message: string, 
    summary = 'Éxito',
    life = 3000
  ): void {
    messageService.add({
      severity: 'success',
      summary,
      detail: message,
      life
    });
  }

  /**
   * Muestra una notificación de error
   * @param messageService - Servicio de mensajes de PrimeNG
   * @param message - Mensaje a mostrar
   * @param summary - Título (default: 'Error')
   * @param life - Duración en ms (default: 5000)
   */
  static error(
    messageService: MessageService, 
    message: string, 
    summary = 'Error',
    life = 5000
  ): void {
    messageService.add({
      severity: 'error',
      summary,
      detail: message,
      life
    });
  }

  /**
   * Muestra una notificación de advertencia
   * @param messageService - Servicio de mensajes de PrimeNG
   * @param message - Mensaje a mostrar
   * @param summary - Título (default: 'Advertencia')
   * @param life - Duración en ms (default: 4000)
   */
  static warn(
    messageService: MessageService, 
    message: string, 
    summary = 'Advertencia',
    life = 4000
  ): void {
    messageService.add({
      severity: 'warn',
      summary,
      detail: message,
      life
    });
  }

  /**
   * Muestra una notificación informativa
   * @param messageService - Servicio de mensajes de PrimeNG
   * @param message - Mensaje a mostrar
   * @param summary - Título (default: 'Información')
   * @param life - Duración en ms (default: 3000)
   */
  static info(
    messageService: MessageService, 
    message: string, 
    summary = 'Información',
    life = 3000
  ): void {
    messageService.add({
      severity: 'info',
      summary,
      detail: message,
      life
    });
  }

  /**
   * Muestra error genérico de carga
   */
  static errorCargar(messageService: MessageService, recurso: string): void {
    NotificationUtil.error(
      messageService,
      `No se pudieron cargar ${recurso}`
    );
  }

  /**
   * Muestra error genérico de guardado
   */
  static errorGuardar(messageService: MessageService, recurso: string): void {
    NotificationUtil.error(
      messageService,
      `No se pudo guardar ${recurso}`
    );
  }

  /**
   * Muestra error genérico de eliminación
   */
  static errorEliminar(messageService: MessageService, recurso: string): void {
    NotificationUtil.error(
      messageService,
      `No se pudo eliminar ${recurso}`
    );
  }

  /**
   * Muestra éxito de guardado
   */
  static successGuardar(messageService: MessageService, recurso: string): void {
    NotificationUtil.success(
      messageService,
      `${recurso} guardado correctamente`
    );
  }

  /**
   * Muestra éxito de eliminación
   */
  static successEliminar(messageService: MessageService, recurso: string): void {
    NotificationUtil.success(
      messageService,
      `${recurso} eliminado correctamente`
    );
  }

  /**
   * Muestra éxito de actualización
   */
  static successActualizar(messageService: MessageService, recurso: string): void {
    NotificationUtil.success(
      messageService,
      `${recurso} actualizado correctamente`
    );
  }
}
