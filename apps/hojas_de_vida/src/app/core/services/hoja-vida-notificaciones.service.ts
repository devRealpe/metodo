import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NotificationManagementService } from '@microfrontends/shared-services';
import { NotificationType, NotificationPriority } from '@microfrontends/shared-models';

@Injectable({
  providedIn: 'root'
})
export class HojaVidaNotificacionesService {

  constructor(
    private http: HttpClient,
    private notificationService: NotificationManagementService
  ) {}

  notificarAprobacionHojaVida(
    userId: string, 
    hojaVidaId: string,
    nombreCompleto: string
  ): void {
    this.notificationService.addNotification({
      title: ' Hoja de Vida Aprobada',
      message: `${nombreCompleto}, tu hoja de vida ha sido revisada y aprobada exitosamente`,
      type: NotificationType.APPROVAL,
      priority: NotificationPriority.HIGH,
      userEmail: userId,
      projectContext: 'hojas_de_vida',
      link: '/app/mis-postulaciones',
      icon: 'pi pi-check-circle',
      metadata: {
        hojaVidaId,
        nombreCompleto,
        fechaAprobacion: new Date().toISOString(),
        approver: localStorage.getItem('email') || 'admin@unimar.edu.co'
      }
    });
  }
  notificarRechazoHojaVida(
    userId: string,
    hojaVidaId: string,
    nombreCompleto: string,
    motivo: string
  ): void {
    this.notificationService.addNotification({
      title: ' Hoja de Vida Requiere Correcciones',
      message: `${nombreCompleto}, tu hoja de vida necesita correcciones. Motivo: ${motivo}`,
      type: NotificationType.REJECTION,
      priority: NotificationPriority.HIGH,
      userEmail: userId,
      projectContext: 'hojas_de_vida',
      link: '/app/informacion-personal',
      icon: 'pi pi-times-circle',
      metadata: {
        hojaVidaId,
        nombreCompleto,
        motivo,
        fechaRechazo: new Date().toISOString(),
        reviewer: localStorage.getItem('email') || 'admin@unimar.edu.co'
      }
    });
  }

  notificarNuevaConvocatoria(
    convocatoriaId: string,
    titulo: string,
    cargo: string,
    fechaCierre: Date,
    userEmail: string = 'all'
  ): Observable<any> {
    return this.notificationService.createNotification({
      title: '🆕 Nueva Convocatoria Disponible',
      message: `${titulo} - ${cargo}. Postúlate antes del ${fechaCierre.toLocaleDateString('es-CO')}`,
      type: NotificationType.NEW_CONVOCATORIA,
      priority: NotificationPriority.MEDIUM,
      userEmail, 
      projectContext: 'hojas_de_vida',
      link: `/app/ofertas-laborales/${convocatoriaId}`,
      icon: 'pi pi-briefcase',
      metadata: {
        convocatoriaId,
        titulo,
        cargo,
        fechaCierre: fechaCierre.toISOString(),
        categoria: 'convocatoria'
      }
    });
  }

  notificarPostulacionRecibida(
    adminEmail: string,
    candidatoNombre: string,
    convocatoriaTitulo: string,
    postulacionId: string
  ): void {
    this.notificationService.addNotification({
      title: ' Nueva Postulación Recibida',
      message: `${candidatoNombre} se ha postulado a: ${convocatoriaTitulo}`,
      type: NotificationType.APPLICATION_RECEIVED,
      priority: NotificationPriority.MEDIUM,
      userEmail: adminEmail,
      projectContext: 'hojas_de_vida',
      link: `/hojas_de_vida/banco-hojas-de-vida?postulacion=${postulacionId}`,
      icon: 'pi pi-inbox',
      metadata: {
        postulacionId,
        candidatoNombre,
        convocatoriaTitulo,
        fechaPostulacion: new Date().toISOString()
      }
    });
  }

  notificarEntrevistaProgramada(
    candidatoEmail: string,
    candidatoNombre: string,
    fecha: Date,
    hora: string,
    lugar: string,
    entrevistador: string
  ): void {
    this.notificationService.addNotification({
      title: ' Entrevista Programada',
      message: `${candidatoNombre}, tienes una entrevista el ${fecha.toLocaleDateString()} a las ${hora}`,
      type: NotificationType.INTERVIEW_SCHEDULED,
      priority: NotificationPriority.HIGH,
      userEmail: candidatoEmail,
      projectContext: 'hojas_de_vida',
      link: '/app/entrevistas',
      icon: 'pi pi-calendar',
      metadata: {
        candidatoNombre,
        fecha: fecha.toISOString(),
        hora,
        lugar,
        entrevistador,
        recordatorio: true
      }
    });
  }

  notificarResultadoSeleccion(
    candidatoEmail: string,
    candidatoNombre: string,
    convocatoriaTitulo: string,
    seleccionado: boolean,
    mensaje?: string
  ): void {
    this.notificationService.addNotification({
      title: seleccionado ? ' ¡Felicitaciones!' : '📋 Resultado del Proceso',
      message: mensaje || (seleccionado 
        ? `${candidatoNombre}, has sido seleccionado para: ${convocatoriaTitulo}` 
        : `${candidatoNombre}, gracias por participar en: ${convocatoriaTitulo}`),
      type: seleccionado ? NotificationType.SELECTION_RESULT : NotificationType.INFO,
      priority: seleccionado ? NotificationPriority.CRITICAL : NotificationPriority.MEDIUM,
      userEmail: candidatoEmail,
      projectContext: 'hojas_de_vida',
      link: '/app/mis-postulaciones',
      icon: seleccionado ? 'pi pi-star-fill' : 'pi pi-info-circle',
      metadata: {
        candidatoNombre,
        convocatoriaTitulo,
        seleccionado,
        fechaResultado: new Date().toISOString()
      }
    });
  }

  notificarDocumentosFaltantes(
    userId: string,
    nombreCompleto: string,
    documentosFaltantes: string[]
  ): void {
    this.notificationService.addNotification({
      title: ' Documentos Pendientes',
      message: `${nombreCompleto}, completa tu hoja de vida. Faltan: ${documentosFaltantes.join(', ')}`,
      type: NotificationType.WARNING,
      priority: NotificationPriority.MEDIUM,
      userEmail: userId,
      projectContext: 'hojas_de_vida',
      link: '/app/informacion-personal',
      icon: 'pi pi-exclamation-triangle',
      metadata: {
        nombreCompleto,
        documentosFaltantes,
        fechaRecordatorio: new Date().toISOString()
      }
    });
  }

  notificarConvocatoriaPorCerrar(
    convocatoriaId: string,
    titulo: string,
    horasRestantes: number
  ): void {
    this.notificationService.addNotification({
      title: ' Convocatoria Próxima a Cerrar',
      message: `¡Última oportunidad! ${titulo} cierra en ${horasRestantes} horas`,
      type: NotificationType.REMINDER,
      priority: NotificationPriority.HIGH,
      projectContext: 'hojas_de_vida',
      link: `/app/ofertas-laborales/${convocatoriaId}`,
      icon: 'pi pi-clock',
      metadata: {
        convocatoriaId,
        titulo,
        horasRestantes,
        urgente: horasRestantes < 24
      }
    });
  }

  notificarErrorPostulacion(
    userId: string,
    nombreCompleto: string,
    errorMensaje: string
  ): void {
    this.notificationService.addNotification({
      title: 'Error en Postulación',
      message: `${nombreCompleto}, hubo un problema: ${errorMensaje}. Por favor intenta nuevamente.`,
      type: NotificationType.ERROR,
      priority: NotificationPriority.HIGH,
      userEmail: userId,
      projectContext: 'hojas_de_vida',
      link: '/app/mis-postulaciones',
      icon: 'pi pi-times-circle',
      metadata: {
        nombreCompleto,
        error: errorMensaje,
        timestamp: new Date().toISOString()
      }
    });
  }

  notificarActualizacionConvocatoria(
    convocatoriaId: string,
    titulo: string,
    cambios: string
  ): void {
    this.notificationService.addNotification({
      title: ' Convocatoria Actualizada',
      message: `${titulo} ha sido actualizada. Cambios: ${cambios}`,
      type: NotificationType.CONVOCATORIA_UPDATED,
      priority: NotificationPriority.MEDIUM,
      projectContext: 'hojas_de_vida',
      link: `/app/ofertas-laborales/${convocatoriaId}`,
      icon: 'pi pi-pencil',
      metadata: {
        convocatoriaId,
        titulo,
        cambios,
        fechaActualizacion: new Date().toISOString()
      }
    });
  }

  aprobarHojaVidaConNotificacion(
    hojaVidaId: string, 
    userId: string,
    nombreCompleto: string
  ): Observable<any> {
    return this.http.put(`/api/hojas-vida/${hojaVidaId}/aprobar`, {}).pipe(
      tap(() => {
        this.notificarAprobacionHojaVida(userId, hojaVidaId, nombreCompleto);
      })
    );
  }

  notificarConEmail(
    userId: string,
    titulo: string,
    mensaje: string
  ): void {
    this.notificationService.addNotification({
      title: titulo,
      message: mensaje,
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      userEmail: userId,
      projectContext: 'hojas_de_vida'
    });

    this.notificationService.sendEmailNotification({
      to: userId,
      subject: titulo,
      body: mensaje,
      priority: NotificationPriority.HIGH
    }).subscribe({
      next: (response) => {},
      error: (error) => {}
    });
  }
}
