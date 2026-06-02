import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Novedad, ActualizarNovedad } from '../models/novedad.model';
import { PlanDeTrabajoModel } from '../models/planDeTrabajo.model';
import { Profesor } from '../models/profesor.model';

export interface NovedadEnriquecida {
  id: string;
  idPt: string;
  motivo: string;
  fechaRegistro: string;
  registradoPor: string;
  estado: string;
  tipoNovedad?: string;
  observaciones?: string;
  fechaResolucion?: string;
  resueltoPor?: string;
  planDeTrabajo?: PlanDeTrabajoModel;
  profesor?: Profesor;
  director?: Profesor;
  severityEstado?: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
}

@Injectable({
  providedIn: 'root'
})
export class GestionHumanaService {
  private readonly baseApi = environment.apiPlanesDeTraba;

  constructor(private http: HttpClient) {}

  getNovedadesPendientesAprobacion(): Observable<Novedad[]> {
    return this.http.get<Novedad[]>(`${this.baseApi}/novedades/pendientes-aprobacion`);
  }

  getAllNovedades(estado?: string, limit?: number): Observable<Novedad[]> {
    let params = '';
    if (estado) params += `?estado=${estado}`;
    if (limit) params += `${params ? '&' : '?'}limit=${limit}`;
    return this.http.get<Novedad[]>(`${this.baseApi}/novedades/todas${params}`);
  }

  aprobarNovedad(novedadId: string, aprobadoPor: string, observaciones?: string): Observable<Novedad> {
    const body = {
      aprobadoPor,
      observaciones: observaciones || undefined
    };

    return this.http.put<Novedad>(
      `${this.baseApi}/novedades/${encodeURIComponent(novedadId)}/aprobar`,
      body
    );
  }

  rechazarNovedad(novedadId: string, rechazadoPor: string, motivoRechazo: string): Observable<Novedad> {
    const body = {
      rechazadoPor,
      motivoRechazo
    };

    return this.http.put<Novedad>(
      `${this.baseApi}/novedades/${encodeURIComponent(novedadId)}/rechazar`,
      body
    );
  }

  getSeverityEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (estado) {
      case 'APROBADA':
        return 'success';
      case 'PENDIENTE':
        return 'warn';
      case 'RECHAZADA':
        return 'danger';
      default:
        return 'info';
    }
  }
}
