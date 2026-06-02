import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { ActividadPlanDeTrabajo, CreateActividadPlanDeTrabajo, UpdateActividadPlanDeTrabajo } from '../models/actividadesPlanDeTrabajo.model';

@Injectable({
  providedIn: 'root'
})

export class ActividadesPlanDeTrabajoService {
  private readonly base = `${environment.apiPlanesDeTraba}/actividades-pt`;
  constructor(private http: HttpClient) {}

  getByPtId(ptId: string): Observable<ActividadPlanDeTrabajo[]> {
    return this.http.get<ActividadPlanDeTrabajo[]>(`${this.base}/pt/${encodeURIComponent(ptId)}`);
  }

  getByActividadId(actividadId: string): Observable<ActividadPlanDeTrabajo[]>{
    return this.http.get<ActividadPlanDeTrabajo[]>(`${this.base}/actividad/${encodeURIComponent(actividadId)}`);
  }

  create(actividad: CreateActividadPlanDeTrabajo): Observable<any> {
    return this.http.post(`${this.base}`, actividad);
  }

  update(id: string, actividad: UpdateActividadPlanDeTrabajo): Observable<any> {
    return this.http.put<ActividadPlanDeTrabajo>(`${this.base}/${encodeURIComponent(id)}`, actividad)
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${encodeURIComponent(id)}`);
  }
}
