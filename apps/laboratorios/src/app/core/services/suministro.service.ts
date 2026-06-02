import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@shared/shared-environments';
import { Suministro } from '../models/suministro.models';

@Injectable({ providedIn: 'root' })
export class SuministroService {
  private readonly base = `${environment.apilaboratoriosLocal}/suministros`;
  private readonly http = inject(HttpClient);

  getAll() {
    return this.http.get<Suministro[]>(this.base);
  }

  getById(id: string) {
    return this.http.get<Suministro>(`${this.base}/${id}`);
  }

  create(payload: Omit<Suministro, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) {
    return this.http.post<Suministro>(this.base, payload);
  }

  update(id: string, payload: Partial<Suministro>) {
    return this.http.put<Suministro>(`${this.base}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  searchByNombre(nombre: string) {
    return this.http.get<Suministro[]>(`${this.base}/buscar/nombre`, { params: { q: nombre } });
  }

  searchByCodigo(codigo: string) {
    return this.http.get<Suministro[]>(`${this.base}/buscar/codigo`, { params: { q: codigo } });
  }

  searchByCategoria(categoria: string) {
    return this.http.get<Suministro[]>(`${this.base}/buscar/categoria`, { params: { categoria } });
  }

  searchByEstado(estado: string) {
    return this.http.get<Suministro[]>(`${this.base}/buscar/estado`, { params: { estado } });
  }
}