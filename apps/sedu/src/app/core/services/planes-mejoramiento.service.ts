import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  PlanMejoramiento,
  CreatePlanRequest,
  UpdatePlanRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class PlanesMejoramientoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/planes-mejora`;

  create(req: CreatePlanRequest): Observable<PlanMejoramiento> {
    return this.http.post<PlanMejoramiento>(this.baseUrl, req);
  }

  getById(id: string): Observable<PlanMejoramiento> {
    return this.http.get<PlanMejoramiento>(`${this.baseUrl}/${id}`);
  }

  getByEvaluacion(evaluacionId: string): Observable<PlanMejoramiento[]> {
    return this.http.get<PlanMejoramiento[]>(`${this.baseUrl}/por-evaluacion/${evaluacionId}`);
  }

  update(id: string, req: UpdatePlanRequest): Observable<PlanMejoramiento> {
    return this.http.put<PlanMejoramiento>(`${this.baseUrl}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
