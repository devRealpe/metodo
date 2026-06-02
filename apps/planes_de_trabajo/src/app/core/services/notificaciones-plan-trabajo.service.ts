import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';

interface NotificationRequest {
  userId: string;
  projectContext: string;
  type: string;
  title: string;
  message: string;
  metadata?: { [key: string]: any };
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  link?: string;
  sendEmail?: boolean;
}

interface EmailRequest {
  to: string;
  replyTo?: string;
  subject: string;
  templateType: string;
  templateVariables: { [key: string]: string };
  project: string;
}

interface KeycloakUser {
  email: string;
  username: string;
  identificacion: string;
}

interface EmailsDecanoProfesorDirector {
  emailDecano: string;
  emailProfesor: string;
  emailDirector?: string;
}

interface EmailsRechazadorProfesorDirector {
  rechazadoPor: string;
  emailProfesor: string;
  emailDirector?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesPlanTrabajoService {
  private readonly http = inject(HttpClient);
  private readonly notificationUrl = `${environment.generalMongoDBApi}/notifications`;
  private readonly planesTrabajoNotificationUrl = `${environment.generalMongoDBApi}/planes-trabajo`;
  private readonly emailUrl = `${environment.smtpApi}/email/send-email`;
  private readonly authApi = `${environment.authApi}/auth/users`;

  /**
   * Obtiene el email de un usuario desde Keycloak usando su número de identificación
   */
  private getEmailByIdentificacion(identificacion: string): Observable<string> {
    return this.http.get<KeycloakUser>(`${this.authApi}/identificacion/${identificacion}`).pipe(
      map(user => user.email),
      catchError(error => {
        return of(identificacion); // Fallback: devolver la identificación
      })
    );
  }

  notificarAprobacionProfesor(data: {
    emailProfesor: string;
    nombreProfesor: string;
    emailDirector: string;
    nombreDirector: string;
    programa: string;
    periodo: number;
    anio: number;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      docenteIdentificacion: data.emailProfesor,
      docenteNombre: data.nombreProfesor,
      directorNombre: data.nombreDirector,
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString()
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-envio`, notificationRequest);
  }

  /**
   * Notifica al director cuando el profesor aprueba el plan de trabajo
   */
  notificarAprobacionProfesorAlDirector(data: {
    emailProfesor: string;
    nombreProfesor: string;
    emailDirector: string;
    nombreDirector: string;
    programa: string;
    periodo: number;
    anio: number;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      directorIdentificacion: data.emailDirector,
      directorNombre: data.nombreDirector,
      profesorNombre: data.nombreProfesor,
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString()
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-aprobacion-profesor`, notificationRequest);
  }

  notificarAprobacionDirector(data: {
    emailDirector: string;
    nombreDirector: string;
    emailDecano: string;
    nombreDecano: string;
    programa: string;
    periodo: number;
    anio: number;
    cantidadPlanes: number;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      decanoIdentificacion: data.emailDecano,
      decanoNombre: data.nombreDecano,
      directorNombre: data.nombreDirector,
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString()
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-envio-decano`, notificationRequest);
  }

  notificarAprobacionDecano(data: {
    emailDecano: string;
    nombreDecano: string;
    emailProfesor: string;
    nombreProfesor: string;
    emailDirector?: string;
    nombreDirector?: string;
    programa: string;
    periodo: number;
    anio: number;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      profesorIdentificacion: data.emailProfesor,
      profesorNombre: data.nombreProfesor,
      decanoNombre: data.nombreDecano,
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString()
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-aprobacion-decano-profesor`, notificationRequest);
  }

  /**
   * Notifica al DIRECTOR cuando el PROFESOR rechaza el plan
   */
  notificarRechazoProfesor(data: {
    emailProfesor: string;
    nombreProfesor: string;
    emailDirector: string;
    nombreDirector: string;
    programa: string;
    periodo: number;
    anio: number;
    motivo: string;
  }): Observable<any> {
    const notificationRequest = {
      directorIdentificacion: data.emailDirector,  // Notificar al director
      directorNombre: data.nombreDirector,
      profesorNombre: data.nombreProfesor,
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString(),
      motivo: data.motivo
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-rechazo-profesor`, notificationRequest);
  }

  /**
   * Notifica al PROFESOR cuando el DIRECTOR rechaza el plan
   */
  notificarRechazoDirector(data: {
    emailProfesor: string;
    nombreProfesor: string;
    emailDirector: string;
    nombreDirector: string;
    programa: string;
    periodo: number;
    anio: number;
    motivo: string;
  }): Observable<any> {
    const notificationRequest = {
      profesorIdentificacion: data.emailProfesor,  // Notificar al profesor
      profesorNombre: data.nombreProfesor,
      directorNombre: data.nombreDirector,
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString(),
      motivo: data.motivo
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-rechazo-director`, notificationRequest);
  }

  /**
   * Notifica al DIRECTOR Y PROFESOR cuando el DECANO rechaza el plan
   */
  notificarRechazoDecano(data: {
    emailProfesor: string;
    nombreProfesor: string;
    emailDirector: string;
    nombreDirector: string;
    emailDecano: string;
    nombreDecano: string;
    programa: string;
    periodo: number;
    anio: number;
    motivo: string;
  }): Observable<any> {
    const notificationRequest = {
      directorIdentificacion: data.emailDirector,
      profesorIdentificacion: data.emailProfesor,
      directorNombre: data.nombreDirector,
      profesorNombre: data.nombreProfesor,
      decanoNombre: data.nombreDecano,
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString(),
      motivo: data.motivo
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-rechazo-decano`, notificationRequest);
  }

  /**
 * Notifica al DIRECTOR Y PROFESOR cuando PLANEACIÓN rechaza el plan
 */
notificarRechazoPlaneacion(data: {
  emailProfesor: string;
  nombreProfesor: string;
  emailDirector: string;
  nombreDirector: string;
  emailPlaneacion: string;
  nombrePlaneacion: string;
  programa: string;
  periodo: number;
  anio: number;
  motivo: string;
}): Observable<any> {

  const notificationRequest = {
    directorIdentificacion: data.emailDirector,
    profesorIdentificacion: data.emailProfesor,
    directorNombre: data.nombreDirector,
    profesorNombre: data.nombreProfesor,
    planeacionNombre: data.nombrePlaneacion,
    programa: data.programa,
    periodo: data.periodo.toString(),
    anio: data.anio.toString(),
    motivo: data.motivo
  };

  return this.http.post(
    `${this.planesTrabajoNotificationUrl}/notificar-rechazo-planeacion`,
    notificationRequest
  );
}

  /**
   * Notifica a sistemas cuando el decano envía los planes aprobados
   */
  notificarEnvioSistemas(data: {
    emailDecano: string;
    nombreDecano: string;
    programa: string;
    periodo: number;
    anio: number;
    cantidadPlanes: number;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      sistemasIdentificacion: 'sistemas',
      sistemasNombre: 'Sistemas',
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString()
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-aprobacion-decano`, notificationRequest);
  }

    /**
   * Notifica a planeación cuando el decano envía los planes aprobados
   */
  notificarEnvioPlaneacion(data: {
    emailDecano: string;
    nombreDecano: string;
    programa: string;
    periodo: number;
    anio: number;
    cantidadPlanes: number;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      planeacionIdentificacion: 'planeacion',
      planeacionNombre: 'Planeación',
      programa: data.programa,
      periodo: data.periodo.toString(),
      anio: data.anio.toString()
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-aprobacion-decano`, notificationRequest);
  }

  /**
   * Notifica a Vicerrectoría cuando el decano envía planes para aprobación de cambio de horas
   * Busca usuario con identificacion='vice academica'
   */
  notificarEnvioVicerrectoria(data: {
    emailDecano: string;
    nombreDecano: string;
    programa: string;
    periodo: string;
    anio: string;
    cantidadPlanes: number;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      vicerrectoriaIdentificacion: 'vice academica',
      vicerrectoriaNombre: 'Vicerrectoría Académica',
      decanoNombre: data.nombreDecano,
      programa: data.programa,
      periodo: data.periodo,
      anio: data.anio,
      cantidadPlanes: data.cantidadPlanes.toString()
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-envio-vicerrectoria`, notificationRequest);
  }

  /**
   * Notifica al decano cuando Vicerrectoría aprueba el cambio de horas
   */
  notificarAprobacionVicerrectoria(data: {
    emailDecano: string;
    nombreVicerrectoria: string;
    programa: string;
    periodo: string;
    anio: string;
    nombreProfesor: string;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      decanoIdentificacion: data.emailDecano,
      decanoNombre: 'Decano',
      vicerrectoriaNombre: data.nombreVicerrectoria,
      programa: data.programa,
      periodo: data.periodo,
      anio: data.anio,
      nombreProfesor: data.nombreProfesor
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-aprobacion-vicerrectoria`, notificationRequest);
  }

  /**
   * Notifica al decano cuando Vicerrectoría rechaza el cambio de horas
   */
  notificarRechazoVicerrectoria(data: {
    emailDecano: string;
    nombreVicerrectoria: string;
    programa: string;
    periodo: string;
    anio: string;
    nombreProfesor: string;
    motivo: string;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      decanoIdentificacion: data.emailDecano,
      decanoNombre: 'Decano',
      vicerrectoriaNombre: data.nombreVicerrectoria,
      programa: data.programa,
      periodo: data.periodo,
      anio: data.anio,
      nombreProfesor: data.nombreProfesor,
      motivo: data.motivo
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-rechazo-vicerrectoria`, notificationRequest);
  }

  /**
   * Notifica al director cuando Vicerrectoría aprueba el cambio de horas
   * y debe reiniciar el flujo de aprobación (profesor → director → decano → sistemas)
   */
  notificarCambioHorasAprobadoDirector(data: {
    emailDirector: string;
    nombreVicerrectoria: string;
    programa: string;
    periodo: string;
    anio: string;
    nombreProfesor: string;
  }): Observable<any> {
    const notificationRequest = {
      directorIdentificacion: data.emailDirector,
      directorNombre: 'Director',
      vicerrectoriaNombre: data.nombreVicerrectoria,
      programa: data.programa,
      periodo: data.periodo,
      anio: data.anio,
      nombreProfesor: data.nombreProfesor
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-cambio-horas-aprobado-director`, notificationRequest);
  }

  notificarObservacionesVicerrectoria(data: {
    emailDecano: string;
    nombreProfesor: string;
    programa: string;
    periodo: string;
    anio: string;
    conObservaciones: boolean;
    observaciones?: string;
  }): Observable<any> {
    // Usar el endpoint centralizado que resuelve emails automáticamente
    const notificationRequest = {
      decanoIdentificacion: data.emailDecano,
      decanoNombre: 'Decano',
      vicerrectoriaNombre: 'Vicerrectoría Académica',
      programa: data.programa,
      periodo: data.periodo,
      anio: data.anio,
      nombreProfesor: data.nombreProfesor,
      conObservaciones: data.conObservaciones.toString(),
      observaciones: data.observaciones || ''
    };

    return this.http.post(`${this.planesTrabajoNotificationUrl}/notificar-observaciones-vicerrectoria`, notificationRequest);
  }

  
}
