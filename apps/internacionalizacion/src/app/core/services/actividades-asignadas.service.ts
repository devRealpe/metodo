import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActividadAsignada } from '../models/actividades-asignadas.model';
import { environment } from '@shared/shared-environments';
import { ACTIVIDADES_ASIGNADAS_CONSTANTS } from '../constants/actividades-asignadas.constants';

@Injectable({
  providedIn: 'root'
})
export class ActividadesAsignadasService {

  private readonly apiUrl = `${environment.internacionalizacionApi}/actividades-asignadas`;

  constructor(private http: HttpClient) {}

  getActividadesByMovilidad(movilidadId: string): Observable<ActividadAsignada[]> {
    return this.http.get<ActividadAsignada[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(catchError(this.handleError));
  }

  createForPostulante(movilidadPostulanteId: string, actividad: ActividadAsignada): Observable<ActividadAsignada> {
    const { movilidad, movilidadPostulante, id, ...actividadLimpia } = actividad as any;
    return this.http.post<ActividadAsignada>(`${this.apiUrl}/movilidad-postulante/${movilidadPostulanteId}`, actividadLimpia)
      .pipe(
        catchError(this.handleError)
      );
  }

  createForEstudiante(movilidadEstudianteId: string, actividad: ActividadAsignada): Observable<ActividadAsignada> {
    const { movilidad, movilidadEstudiante, id, ...actividadLimpia } = actividad as any;
    return this.http.post<ActividadAsignada>(`${this.apiUrl}/movilidad-estudiante/${movilidadEstudianteId}`, actividadLimpia)
      .pipe(
        catchError(this.handleError)
      );
  }

  update(id: string, actividad: ActividadAsignada): Observable<ActividadAsignada> {
    const { movilidad, movilidadPostulante, movilidadEstudiante, id: _, ...actividadLimpia } = actividad as any;
    return this.http.put<ActividadAsignada>(`${this.apiUrl}/${id}`, actividadLimpia)
      .pipe(
        catchError(this.handleError)
      );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteByMovilidadId(movilidadId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}