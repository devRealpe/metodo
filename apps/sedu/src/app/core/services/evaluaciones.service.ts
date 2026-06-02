import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  Evaluacion,
  EvaluationResponse,
  EvaluacionEstadoHistorial,
  SaveResponsesRequest,
  SignByEmployeeRequest,
  ReturnRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class EvaluacionesService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiSedu;

  create(asignacionId: string): Observable<Evaluacion> {
    return this.http.post<Evaluacion>(
      `${this.baseUrl}/asignaciones/${asignacionId}/evaluacion`,
      {}
    );
  }

  getById(id: string): Observable<Evaluacion> {
    return this.http.get<Evaluacion>(`${this.baseUrl}/evaluaciones/${id}`);
  }

  getByAsignacion(asignacionId: string): Observable<Evaluacion> {
    return this.http.get<Evaluacion>(`${this.baseUrl}/asignaciones/${asignacionId}/evaluacion`);
  }

  saveResponses(id: string, req: SaveResponsesRequest): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/evaluaciones/${id}/respuestas`,
      req
    );
  }

  getResponses(id: string): Observable<EvaluationResponse[]> {
    return this.http.get<EvaluationResponse[]>(`${this.baseUrl}/evaluaciones/${id}/respuestas`);
  }

  getHistorial(id: string): Observable<EvaluacionEstadoHistorial[]> {
    return this.http.get<EvaluacionEstadoHistorial[]>(`${this.baseUrl}/evaluaciones/${id}/historial-estados`);
  }

  /** Firma del evaluador → FIRMADO_EVALUADOR */
  firmarEvaluador(id: string): Observable<Evaluacion> {
    return this.http.post<Evaluacion>(
      `${this.baseUrl}/evaluaciones/${id}/firmar-evaluador`,
      {}
    );
  }

  /** Firma del evaluado → FIRMADO_EVALUADO */
  firmarEvaluado(id: string, req?: SignByEmployeeRequest): Observable<Evaluacion> {
    return this.http.post<Evaluacion>(
      `${this.baseUrl}/evaluaciones/${id}/firmar-evaluado`,
      req || {}
    );
  }

  /** Devolver evaluación al evaluador */
  devolver(id: string, req: ReturnRequest): Observable<Evaluacion> {
    return this.http.post<Evaluacion>(
      `${this.baseUrl}/evaluaciones/${id}/devolver`,
      req
    );
  }
}
