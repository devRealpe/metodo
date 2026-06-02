import { environment } from '@shared/shared-environments';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipo } from '../models/equipo.model';

@Injectable({ providedIn: 'root' })
export class EquipoService {

  private readonly base = `${environment.apilaboratoriosLocal}/equipos`;
  private http = inject(HttpClient);

  getAll(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(this.base);
  }

  getById(id: string): Observable<Equipo> {
    return this.http.get<Equipo>(`${this.base}/${id}`);
  }

  create(payload: Omit<Equipo, 'id' | 'creadoEn' | 'actualizadoEn'>): Observable<Equipo> {
    return this.http.post<Equipo>(this.base, payload);
  }

  update(id: string, payload: Partial<Omit<Equipo, 'id' | 'creadoEn' | 'actualizadoEn'>>): Observable<Equipo> {
    return this.http.put<Equipo>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}