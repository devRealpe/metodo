import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConsentimientoMovilidad } from '../models/consentimiento-movilidad.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class ConsentimientoMovilidadService {

  private readonly apiUrl = `${environment.internacionalizacionApi}/consentimientos`;

  constructor(private http: HttpClient) {}

  getByPostulanteAndMovilidad(postulanteId: string, movilidadId: string): Observable<ConsentimientoMovilidad[]> {
    return this.http.get<ConsentimientoMovilidad[]>(
      `${this.apiUrl}/postulante/${postulanteId}/movilidad/${movilidadId}`)
      .pipe(catchError(this.handleError));
  }

  getByMovilidad(movilidadId: string): Observable<ConsentimientoMovilidad[]> {
    return this.http.get<ConsentimientoMovilidad[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(catchError(this.handleError));
  }

  registrar(postulanteId: string, movilidadId: string, tipo: string, textoVersion?: string): Observable<ConsentimientoMovilidad> {
    return this.http.post<ConsentimientoMovilidad>(`${this.apiUrl}/registrar`, {
      postulanteId,
      movilidadId,
      tipo,
      textoVersion: textoVersion || '1.0'
    }).pipe(catchError(this.handleError));
  }

  verificarCompletos(postulanteId: string, movilidadId: string): Observable<{ completos: boolean }> {
    return this.http.get<{ completos: boolean }>(
      `${this.apiUrl}/completos/postulante/${postulanteId}/movilidad/${movilidadId}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
