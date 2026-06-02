import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbEquipoAlmacen } from '../models/lb-equipo-almacen.model';

@Injectable({ providedIn: 'root' })
export class LbEquipoAlmacenService {

  private readonly base = `${environment.apilaboratoriosLocal}/equipos-almacen`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbEquipoAlmacen[]> {
    return this.http.get<LbEquipoAlmacen[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbEquipoAlmacen> {
    return this.http.get<LbEquipoAlmacen>(`${this.base}/${id}`).pipe(retry(1));
  }

  create(payload: Omit<LbEquipoAlmacen, 'id'>): Observable<LbEquipoAlmacen> {
    return this.http.post<LbEquipoAlmacen>(this.base, payload);
  }

  update(id: string, payload: Partial<Omit<LbEquipoAlmacen, 'id'>>): Observable<LbEquipoAlmacen> {
    return this.http.put<LbEquipoAlmacen>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }

  getByNombre(nombre: string): Observable<LbEquipoAlmacen[]> {
    return this.http.get<LbEquipoAlmacen[]>(`${this.base}/buscar/nombre`, { params: { nombre } });
  }

  getByTipo(tipo: string): Observable<LbEquipoAlmacen[]> {
    return this.http.get<LbEquipoAlmacen[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`);
  }

  getByMarca(marca: string): Observable<LbEquipoAlmacen[]> {
    return this.http.get<LbEquipoAlmacen[]>(`${this.base}/marca/${encodeURIComponent(marca)}`);
  }

  getByTipoAndMarca(tipo: string, marca: string): Observable<LbEquipoAlmacen[]> {
    const params = new HttpParams().set('tipo', tipo).set('marca', marca);
    return this.http.get<LbEquipoAlmacen[]>(`${this.base}/filtro`, { params });
  }

  getTipos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/tipos`).pipe(retry(1));
  }

  getMarcas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/marcas`).pipe(retry(1));
  }

  buscar(q: string): Observable<LbEquipoAlmacen[]> {
    return this.http.get<LbEquipoAlmacen[]>(`${this.base}/buscar`, { params: { q } });
  }
}
