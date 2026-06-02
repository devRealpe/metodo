import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MovilidadResultado } from '../models/movilidad-resultado.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class MovilidadResultadoService {

  private readonly apiUrl = `${environment.internacionalizacionApi}/movilidad-resultados`;

  constructor(private http: HttpClient) {}

  getByMovilidad(movilidadId: string): Observable<MovilidadResultado[]> {
    return this.http.get<MovilidadResultado[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(catchError(this.handleError));
  }

  create(movilidadId: string, resultado: MovilidadResultado): Observable<MovilidadResultado> {
    return this.http.post<MovilidadResultado>(`${this.apiUrl}/movilidad/${movilidadId}`, resultado)
      .pipe(catchError(this.handleError));
  }

  update(id: string, resultado: MovilidadResultado): Observable<MovilidadResultado> {
    return this.http.put<MovilidadResultado>(`${this.apiUrl}/${id}`, resultado)
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  deleteByMovilidad(movilidadId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
