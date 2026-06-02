import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Novedad, CrearNovedad, ActualizarNovedad } from '../models/novedad.model';

@Injectable({
  providedIn: 'root'
})
export class NovedadService {
  private readonly base = `${environment.apiPlanesDeTraba}/novedades`
  constructor(private http: HttpClient) { }

  /**
   * Obtener todas las novedades de un plan de trabajo
   */
  getByPlanDeTrabajo(idPt: string): Observable<Novedad[]> {
    return this.http.get<Novedad[]>(`${this.base}/pt/${encodeURIComponent(idPt)}`);
  }

  /**
   * Obtener una novedad por ID
   */
  getById(id: string): Observable<Novedad> {
    return this.http.get<Novedad>(`${this.base}/${encodeURIComponent(id)}`);
  }

  /**
   * Crear una nueva novedad
   */
  create(novedad: CrearNovedad): Observable<Novedad> {
    return this.http.post<Novedad>(`${this.base}`, novedad);
  }

  /**
   * Actualizar una novedad existente
   */
  update(id: string, novedad: ActualizarNovedad): Observable<Novedad> {
    return this.http.put<Novedad>(`${this.base}/${encodeURIComponent(id)}`, novedad);
  }

  /**
   * Eliminar una novedad
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  getNovedadesPendientesByPlanId(idPt: string): Observable<Novedad> {
    return this.http.get<Novedad>(`${this.base}/pt/${encodeURIComponent(idPt)}/pendientes`);
  }

  /**
   * Obtener novedades de un plan de trabajo filtradas por estado
   */
  getByPlanDeTrabajoAndEstado(idPt: string, estado: string): Observable<Novedad[]> {
    return this.http.get<Novedad[]>(`${this.base}/${encodeURIComponent(idPt)}/${encodeURIComponent(estado)}`);
  }
}

