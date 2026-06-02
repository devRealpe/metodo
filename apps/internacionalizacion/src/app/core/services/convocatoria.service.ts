import { environment } from '@shared/shared-environments';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Convocatoria } from '../models/convocatoria.model';

@Injectable({ providedIn: 'root' })
export class ConvocatoriaService {
  private apiUrl = `${environment.internacionalizacionApi}/convocatorias`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Convocatoria[]>(this.apiUrl);
  }

  getById(id: string) {
    return this.http.get<Convocatoria>(`${this.apiUrl}/${id}`);
  }

  getByEstado(estado: string) {
    return this.http.get<Convocatoria[]>(`${this.apiUrl}/estado/${estado}`);
  }

  create(convocatoria: Partial<Convocatoria>) {
    return this.http.post<Convocatoria>(this.apiUrl, convocatoria);
  }

  update(id: string, convocatoria: Partial<Convocatoria>) {
    return this.http.put<Convocatoria>(`${this.apiUrl}/${id}`, convocatoria);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
