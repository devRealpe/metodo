import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { LineaEstrategica } from '../models/linea-estrategica.model';

@Injectable({
  providedIn: 'root'
})
export class LineaEstrategicaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.internacionalizacionApi}/lineas-estrategicas`;

  getAllActive(): Observable<LineaEstrategica[]> {
    return this.http.get<LineaEstrategica[]>(this.apiUrl);
  }

  getById(id: string): Observable<LineaEstrategica> {
    return this.http.get<LineaEstrategica>(`${this.apiUrl}/${id}`);
  }

  create(linea: LineaEstrategica): Observable<LineaEstrategica> {
    return this.http.post<LineaEstrategica>(this.apiUrl, linea);
  }

  update(id: string, linea: LineaEstrategica): Observable<LineaEstrategica> {
    return this.http.put<LineaEstrategica>(`${this.apiUrl}/${id}`, linea);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getByPadre(idPadre: string): Observable<LineaEstrategica[]> {
    return this.http.get<LineaEstrategica[]>(`${this.apiUrl}/padre/${idPadre}`);
  }

  getRaiz(): Observable<LineaEstrategica[]> {
    return this.http.get<LineaEstrategica[]>(`${this.apiUrl}/raiz`);
  }
}