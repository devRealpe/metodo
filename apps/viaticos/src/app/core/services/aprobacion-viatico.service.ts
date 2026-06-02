import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  AprobacionViatico,
  InicializarAprobacionRequest,
  AprobacionResponse,
  ConceptoLiquidacion,
} from '../models/aprobacion-viatico.model';

@Injectable({
  providedIn: 'root',
})
export class AprobacionViaticoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiViaticos}/aprobaciones`;

  // Crear una nueva aprobación
  crearAprobacion(aprobacion: AprobacionViatico): Observable<AprobacionViatico> {
    return this.http.post<AprobacionViatico>(this.apiUrl, aprobacion);
  }

  // Aprobar una solicitud con validación de turno secuencial
  aprobar(id: string, observaciones?: string, identificacionAprobador?: string): Observable<AprobacionResponse> {
    // Si se proporciona identificación, usar el endpoint con validación
    if (identificacionAprobador) {
      return this.http.put<AprobacionResponse>(`${this.apiUrl}/${id}/aprobar-validado`, {
        identificacionAprobador,
        observaciones,
      });
    }
    // Si no, usar el endpoint sin validación (para compatibilidad)
    return this.http.put<AprobacionResponse>(`${this.apiUrl}/${id}/aprobar`, {
      observaciones,
    });
  }

  // Rechazar una solicitud con validación
  rechazar(id: string, observaciones?: string, identificacionAprobador?: string): Observable<AprobacionResponse> {
    // Si se proporciona identificación, usar el endpoint con validación
    if (identificacionAprobador) {
      return this.http.put<AprobacionResponse>(`${this.apiUrl}/${id}/rechazar-validado`, {
        identificacionAprobador,
        observaciones,
      });
    }
    // Si no, usar el endpoint sin validación (para compatibilidad)
    return this.http.put<AprobacionResponse>(`${this.apiUrl}/${id}/rechazar`, {
      observaciones,
    });
  }

  // Obtener todas las aprobaciones de una solicitud
  obtenerPorSolicitud(codigoSolicitud: string): Observable<AprobacionViatico[]> {
    return this.http.get<AprobacionViatico[]>(
      `${this.apiUrl}/solicitud/${codigoSolicitud}`
    );
  }

  // Obtener aprobaciones pendientes de un aprobador
  obtenerPendientesPorAprobador(
    aprobadorIdentificacion: string
  ): Observable<AprobacionViatico[]> {
    return this.http.get<AprobacionViatico[]>(
      `${this.apiUrl}/pendientes/${aprobadorIdentificacion}`
    );
  }

  // Obtener todas las aprobaciones pendientes
  obtenerTodasPendientes(): Observable<AprobacionViatico[]> {
    return this.http.get<AprobacionViatico[]>(`${this.apiUrl}/pendientes`);
  }

  // Obtener todas las aprobaciones
  obtenerTodas(): Observable<AprobacionViatico[]> {
    return this.http.get<AprobacionViatico[]>(this.apiUrl);
  }
  
  // Obtener aprobaciones agrupadas con filtros y estadísticas
  obtenerAprobacionesAgrupadas(
    texto?: string, 
    estado?: string, 
    nivel?: number
  ): Observable<{ solicitudesAgrupadas: any[]; estadisticas: any }> {
    let params: any = {};
    if (texto) params.texto = texto;
    if (estado) params.estado = estado;
    if (nivel) params.nivel = nivel.toString();
    
    return this.http.get<{ solicitudesAgrupadas: any[]; estadisticas: any }>(
      `${this.apiUrl}/agrupadas`, 
      { params }
    );
  }

  // Verificar si una solicitud está completamente aprobada
  verificarAprobacionCompleta(
    codigoSolicitud: string
  ): Observable<{ aprobadaCompletamente: boolean }> {
    return this.http.get<{ aprobadaCompletamente: boolean }>(
      `${this.apiUrl}/solicitud/${codigoSolicitud}/completa`
    );
  }

  // Obtener aprobación por solicitud y nivel
  obtenerPorSolicitudYNivel(
    codigoSolicitud: string,
    nivel: number
  ): Observable<AprobacionViatico> {
    return this.http.get<AprobacionViatico>(
      `${this.apiUrl}/solicitud/${codigoSolicitud}/nivel/${nivel}`
    );
  }

  // Inicializar aprobaciones para una nueva solicitud
  inicializarAprobaciones(
    request: InicializarAprobacionRequest
  ): Observable<AprobacionResponse> {
    return this.http.post<AprobacionResponse>(
      `${this.apiUrl}/inicializar`,
      request
    );
  }

  // Inicializar aprobaciones dinámicas según cargo y facultad
  inicializarAprobacionesDinamicas(
    codigoSolicitud: string,
    cargo: string,
    facultad?: string
  ): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/inicializar-dinamico`, {
      codigoSolicitud,
      cargo,
      facultad,
    });
  }

  // Asignar un aprobador específico a un nivel
  asignarAprobador(
    codigoSolicitud: string,
    nivel: number,
    identificacion: string,
    nombre: string,
    email?: string
  ): Observable<AprobacionViatico> {
    return this.http.post<AprobacionViatico>(`${this.apiUrl}/asignar`, {
      codigoSolicitud,
      nivel,
      identificacion,
      nombre,
      email,
    });
  }

  // Obtener aprobadores requeridos según cargo y facultad
  obtenerAprobadoresRequeridos(
    cargo: string,
    facultad?: string
  ): Observable<AprobadorDTO[]> {
    let params: Record<string, string> = { cargo };
    if (facultad) {
      params = { ...params, facultad };
    }
    return this.http.get<AprobadorDTO[]>(`${this.apiUrl}/aprobadores-requeridos`, {
      params,
    });
  }

  // Obtener total de niveles de una solicitud
  obtenerTotalNiveles(codigoSolicitud: string): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(
      `${this.apiUrl}/solicitud/${codigoSolicitud}/total-niveles`
    );
  }

  // Obtener siguiente nivel pendiente
  obtenerSiguienteNivelPendiente(
    codigoSolicitud: string
  ): Observable<AprobacionViatico | null> {
    return this.http.get<AprobacionViatico | null>(
      `${this.apiUrl}/solicitud/${codigoSolicitud}/siguiente-pendiente`
    );
  }

  // Obtener conceptos de liquidación por código de solicitud
  obtenerConceptosPorSolicitud(
    codigoSolicitud: string
  ): Observable<ConceptoLiquidacion[]> {
    return this.http
      .get<{ success: boolean; data: ConceptoLiquidacion[] }>(
        `${this.apiUrl}/solicitud/${codigoSolicitud}/conceptos`
      )
      .pipe(map((response) => response.data || []));
  }

  // Actualizar conceptos durante el proceso de aprobación
  actualizarConceptos(
    codigoSolicitud: string,
    conceptos: ConceptoLiquidacion[]
  ): Observable<void> {
    return this.http
      .patch<{ success: boolean; message: string }>(
        `${this.apiUrl}/solicitud/${codigoSolicitud}/conceptos`,
        { conceptos }
      )
      .pipe(map(() => void 0));
  }

  // Notificar verificación al último aprobador
  notificarVerificacion(codigoSolicitud: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/solicitud/${codigoSolicitud}/notificar-verificacion`,
      {}
    );
  }
}

// Interface para AprobadorDTO
export interface AprobadorDTO {
  codigo: string;
  nombre: string;
  orden: number;
  campoBase: string;
}
