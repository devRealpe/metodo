import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Periodo, CreatePeriodRequest, UpdatePeriodRequest } from '../models';
import { Asignacion, CreateAsignacionRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class PeriodosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/periodos`;

  list(): Observable<Periodo[]> {
    return this.http.get<Periodo[]>(this.baseUrl);
  }

  getById(id: string): Observable<Periodo> {
    return this.http.get<Periodo>(`${this.baseUrl}/${id}`);
  }

  create(req: CreatePeriodRequest): Observable<Periodo> {
    return this.http.post<Periodo>(this.baseUrl, req);
  }

  update(id: string, req: UpdatePeriodRequest): Observable<Periodo> {
    return this.http.put<Periodo>(`${this.baseUrl}/${id}`, req);
  }

  activar(id: string): Observable<Periodo> {
    return this.http.post<Periodo>(`${this.baseUrl}/${id}/activar`, {});
  }

  cerrar(id: string): Observable<Periodo> {
    return this.http.post<Periodo>(`${this.baseUrl}/${id}/cerrar`, {});
  }

  listAsignaciones(id: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${environment.apiSedu}/asignaciones/por-periodo/${id}`);
  }
}
