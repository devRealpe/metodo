// tipo-actividad.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { TipoActividad } from '../models/tipo-actividad.model';

@Injectable({
  providedIn: 'root'
})
export class TipoActividadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.internacionalizacionApi}/tipos-actividad`;

  getAll(): Observable<TipoActividad[]> {
    return this.http.get<TipoActividad[]>(this.apiUrl).pipe(
      map(tipos => tipos.map(tipo => ({
        ...tipo,
        display: `${tipo.codigo} - ${tipo.nombre}`
      })))
    );
  }

  getByTipoMovilidad(tipoMovilidadId: string): Observable<TipoActividad[]> {
    return this.http.get<TipoActividad[]>(`${this.apiUrl}/tipo-movilidad/${tipoMovilidadId}`).pipe(
      map(tipos => tipos.map(tipo => ({
        ...tipo,
        display: `${tipo.codigo} - ${tipo.nombre}`
      })))
    );
  }

  getById(id: string): Observable<TipoActividad> {
    return this.http.get<TipoActividad>(`${this.apiUrl}/${id}`);
  }

  create(tipo: TipoActividad): Observable<TipoActividad> {
    return this.http.post<TipoActividad>(this.apiUrl, tipo);
  }

  update(id: string, tipo: TipoActividad): Observable<TipoActividad> {
    return this.http.put<TipoActividad>(`${this.apiUrl}/${id}`, tipo);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}