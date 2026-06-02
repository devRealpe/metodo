// modalidad.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Modalidad } from '../models/modalidad.model';

@Injectable({
  providedIn: 'root'
})
export class ModalidadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.internacionalizacionApi}/modalidades`;

  getAll(): Observable<Modalidad[]> {
    return this.http.get<Modalidad[]>(`${this.apiUrl}/all`);
  }

  getAllActive(): Observable<Modalidad[]> {
    return this.http.get<Modalidad[]>(`${this.apiUrl}/all`);
  }

  getById(id: string): Observable<Modalidad> {
    return this.http.get<Modalidad>(`${this.apiUrl}/${id}`);
  }

  create(modalidad: Modalidad): Observable<Modalidad> {
    return this.http.post<Modalidad>(this.apiUrl, modalidad);
  }

  update(id: string, modalidad: Modalidad): Observable<Modalidad> {
    return this.http.put<Modalidad>(`${this.apiUrl}/${id}`, modalidad);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getByPadre(idPadre: string): Observable<Modalidad[]> {
    return this.http.get<Modalidad[]>(`${this.apiUrl}/padre/${idPadre}`);
  }

  getRaiz(): Observable<Modalidad[]> {
    return this.http.get<Modalidad[]>(`${this.apiUrl}/raiz`);
  }

  getTiposActividad(tipoMovilidadId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.internacionalizacionApi}/tipos-actividad/tipo-movilidad/${tipoMovilidadId}`);
  }

  // Filtrar tipos de movilidad de estudiantes basados en movilidades
  getTiposMovilidadEstudiante(movilidades: any[]): string[] {
    const estudianteKeywords = ['estudiante', 'student', 'alumno', 'learner'];
    return [...new Set(movilidades
      .filter(m => {
        const nombre = m.tipoMovilidad?.nombre?.toLowerCase();
        return nombre && estudianteKeywords.some(keyword => nombre.includes(keyword));
      })
      .map(m => m.tipoMovilidad?.nombre)
      .filter(Boolean) as string[]
    )];
  }

  // Filtrar modalidades directamente por keywords de estudiantes (ahora opera sobre tipoMovilidad)
  filterTiposMovilidadEstudiante(tiposMovilidad: any[]): any[] {
    const estudianteKeywords = ['estudiante', 'student', 'alumno', 'learner'];
    return tiposMovilidad.filter(m => {
      const nombre = m.nombre?.toLowerCase();
      return nombre && estudianteKeywords.some(keyword => nombre.includes(keyword));
    });
  }}