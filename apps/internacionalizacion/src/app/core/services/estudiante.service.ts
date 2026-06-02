import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { Estudiante } from '../models/estudiante.model';

@Injectable({
  providedIn: 'root',
})
export class EstudianteService {
  private readonly apiUrl = `${environment.internacionalizacionApi}/estudiantes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(this.apiUrl);
  }

  getByMovilidad(movilidadId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.internacionalizacionApi}/movilidad-estudiantes/movilidad/${movilidadId}`);
  }

  createManyForMovilidad(movilidadId: string, estudiantes: Omit<Estudiante, 'id'>[]): Observable<Estudiante[]> {
    return this.http.post<Estudiante[]>(`${this.apiUrl}/movilidad/${movilidadId}`, estudiantes);
  }

  createMany(estudiantes: Omit<Estudiante, 'id'>[]): Observable<Estudiante[]> {
    return this.http.post<Estudiante[]>(this.apiUrl, estudiantes);
  }

  createForMovilidad(movilidadId: string, estudiante: Omit<Estudiante, 'id'>): Observable<Estudiante> {
    return this.http.post<Estudiante>(`${this.apiUrl}/single/movilidad/${movilidadId}`, estudiante);
  }

  create(estudiante: Omit<Estudiante, 'id'>): Observable<Estudiante> {
    return this.http.post<Estudiante>(`${this.apiUrl}/single`, estudiante);
  }

  deleteFromMovilidad(movilidadId: string, estudianteId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}/estudiante/${estudianteId}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateAutorizacionForMovilidad(movilidadId: string, solicitarAutorizacion: boolean): Observable<void> {
    const params = new HttpParams().set('solicitarAutorizacion', solicitarAutorizacion.toString());
    return this.http.put<void>(`${this.apiUrl}/movilidad/${movilidadId}/autorizacion`, {}, { params });
  }

  /** Consulta el valor autoritativo `solicitarAutorizacion` para una movilidad (tabla movilidad_estudiante) */
  getAutorizacionForMovilidad(movilidadId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/movilidad/${movilidadId}/autorizacion`);
  }
}