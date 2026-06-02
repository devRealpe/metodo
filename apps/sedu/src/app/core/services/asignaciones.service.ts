import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Asignacion, CreateAsignacionRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/asignaciones`;

  create(req: CreateAsignacionRequest): Observable<Asignacion> {
    return this.http.post<Asignacion>(this.baseUrl, req);
  }

  getById(id: string): Observable<Asignacion> {
    return this.http.get<Asignacion>(`${this.baseUrl}/${id}`);
  }

  listByPeriodo(periodoId: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.baseUrl}/por-periodo/${periodoId}`);
  }

  listByEvaluador(evaluadorId: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.baseUrl}/por-evaluador/${evaluadorId}`);
  }

  listByEvaluado(evaluadoId: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${this.baseUrl}/por-evaluado/${evaluadoId}`);
  }

  completar(id: string): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/${id}/completar`, {});
  }
}
