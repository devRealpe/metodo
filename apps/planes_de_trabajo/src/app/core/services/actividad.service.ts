import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Actividad, CrearActividad } from '../models/actividad.model';

@Injectable({
  providedIn: 'root'
})
export class ActividadService {
  private readonly base = `${environment.apiPlanesDeTraba}/actividades`;
  constructor(private http: HttpClient) { }

  getActividadesBySeccion(seccionId: string): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.base}/seccion/${encodeURIComponent(seccionId)}`);
  }

  getActividadesById(id: string): Observable<Actividad> {
    return this.http.get<Actividad>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(actividad: CrearActividad): Observable<any> {
    return this.http.post(`${this.base}`, actividad);
  }

  updateHorasMaximas(actividadId: string, horasMaximas: number): Observable<any> {
    return this.http.put(`${this.base}/${encodeURIComponent(actividadId)}/horas-maximas/${encodeURIComponent(horasMaximas)}`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${encodeURIComponent(id)}`);
  }
}