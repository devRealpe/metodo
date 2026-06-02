import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { TipoMovilidad } from '../models/tipo-movilidad.model';

@Injectable({
  providedIn: 'root'
})
export class TipoMovilidadService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.internacionalizacionApi}/tipos-movilidad`;

  getAllActive(): Observable<TipoMovilidad[]> {
    return this.http.get<TipoMovilidad[]>(this.apiUrl);
  }

  getById(id: string): Observable<TipoMovilidad> {
    return this.http.get<TipoMovilidad>(`${this.apiUrl}/${id}`);
  }

  create(tipo: TipoMovilidad): Observable<TipoMovilidad> {
    return this.http.post<TipoMovilidad>(this.apiUrl, tipo);
  }

  update(id: string, tipo: TipoMovilidad): Observable<TipoMovilidad> {
    return this.http.put<TipoMovilidad>(`${this.apiUrl}/${id}`, tipo);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}