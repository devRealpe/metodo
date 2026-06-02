import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbSuministroAlmacen } from '../models/lb-suministro-almacen.model';

@Injectable({ providedIn: 'root' })
export class LbSuministroAlmacenService {

  private readonly base = `${environment.apilaboratoriosLocal}/suministros-almacen`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbSuministroAlmacen[]> {
    return this.http.get<LbSuministroAlmacen[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbSuministroAlmacen> {
    return this.http.get<LbSuministroAlmacen>(`${this.base}/${id}`).pipe(retry(1));
  }

  getByCodigo(codigo: string): Observable<LbSuministroAlmacen> {
    return this.http.get<LbSuministroAlmacen>(`${this.base}/codigo/${encodeURIComponent(codigo)}`);
  }

  create(payload: Omit<LbSuministroAlmacen, 'id'>): Observable<LbSuministroAlmacen> {
    return this.http.post<LbSuministroAlmacen>(this.base, payload);
  }

  update(id: string, payload: Partial<Omit<LbSuministroAlmacen, 'id'>>): Observable<LbSuministroAlmacen> {
    return this.http.put<LbSuministroAlmacen>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }

  getByNombre(nombre: string): Observable<LbSuministroAlmacen[]> {
    return this.http.get<LbSuministroAlmacen[]>(`${this.base}/buscar/nombre`, { params: { nombre } });
  }

  getByCategoria(categoria: string): Observable<LbSuministroAlmacen[]> {
    return this.http.get<LbSuministroAlmacen[]>(`${this.base}/categoria/${encodeURIComponent(categoria)}`);
  }

  getByUndMedida(undMedida: string): Observable<LbSuministroAlmacen[]> {
    return this.http.get<LbSuministroAlmacen[]>(`${this.base}/und-medida/${encodeURIComponent(undMedida)}`);
  }

  getStockCritico(umbral = 5): Observable<LbSuministroAlmacen[]> {
    return this.http.get<LbSuministroAlmacen[]>(`${this.base}/stock-critico`, { params: { umbral } });
  }

  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/categorias`).pipe(retry(1));
  }

  getUndMedidas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/und-medidas`).pipe(retry(1));
  }

  buscar(q: string): Observable<LbSuministroAlmacen[]> {
    return this.http.get<LbSuministroAlmacen[]>(`${this.base}/buscar`, { params: { q } });
  }
}
