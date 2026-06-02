import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { CreateSeccion, SeccionHijo, SeccionPadre } from '../models/seccion.model';

export type Seccion = SeccionPadre | SeccionHijo;

@Injectable({
  providedIn: 'root'
})
export class SeccionService {
  private readonly base = `${environment.apiPlanesDeTraba}/secciones`;
  constructor(private http: HttpClient) { }

  getByPlantilla(plantillaId: string): Observable<SeccionPadre[]> {
    return this.http.get<SeccionPadre[]>(`${this.base}/plantilla/${encodeURIComponent(plantillaId)}`);
  }

  getSeccionesByActividades(actividadId: string): Observable<Seccion[]> {
    return this.http.get<Seccion[]>(`${this.base}/actividad/${encodeURIComponent(actividadId)}`);
  }

  updateConcepto(seccionId: string, concepto: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${encodeURIComponent(seccionId)}/concepto/${encodeURIComponent(concepto)}`, {});
  }

  createSeccion(seccion: CreateSeccion): Observable<Seccion> {
    return this.http.post<Seccion>(this.base, seccion);
  }

  deleteSeccion(seccionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(seccionId)}`);
  }
}