import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { Postulante } from '../models/postulante.model';

@Injectable({
  providedIn: 'root',
})
export class PostulanteService {
  private readonly apiUrl = `${environment.internacionalizacionApi}/postulantes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Postulante[]> {
    return this.http.get<Postulante[]>(this.apiUrl);
  }

  getByMovilidad(movilidadId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/movilidad/${movilidadId}`);
  }

  getByUsuarioOracleId(numIdentificacion: string): Observable<Postulante> {
    return this.http.get<Postulante>(`${this.apiUrl}/usuario-oracle/${numIdentificacion}`);
  }

  createManyForMovilidad(movilidadId: string, postulantes: Omit<Postulante, 'id'>[]): Observable<Postulante[]> {
    return this.http.post<Postulante[]>(`${this.apiUrl}/movilidad/${movilidadId}`, postulantes);
  }

  createMany(postulantes: Omit<Postulante, 'id'>[]): Observable<Postulante[]> {
    return this.http.post<Postulante[]>(this.apiUrl, postulantes);
  }

  createForMovilidad(movilidadId: string, postulante: Omit<Postulante, 'id'>): Observable<Postulante> {
    return this.http.post<Postulante>(`${this.apiUrl}/single/movilidad/${movilidadId}`, postulante);
  }

  create(postulante: Omit<Postulante, 'id'>): Observable<Postulante> {
    return this.http.post<Postulante>(`${this.apiUrl}/single`, postulante);
  }

  deleteFromMovilidad(movilidadId: string, postulanteId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}/postulante/${postulanteId}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }

  deleteSafe(id: string): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        map(() => {
          return true;
        }),
        catchError(error => {
          console.warn(`Error al eliminar postulante ${id}:`, error.status);
          // Retornar false para cualquier error, no lanzar excepción
          return of(false);
        })
      );
  }

  updateAutorizacionForMovilidad(movilidadId: string, solicitarAutorizacion: boolean): Observable<void> {
    const params = new HttpParams().set('solicitarAutorizacion', solicitarAutorizacion.toString());
    return this.http.put<void>(`${this.apiUrl}/movilidad/${movilidadId}/autorizacion`, {}, { params });
  }

  getAutorizacionForMovilidad(movilidadId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/movilidad/${movilidadId}/autorizacion`);
  }
}