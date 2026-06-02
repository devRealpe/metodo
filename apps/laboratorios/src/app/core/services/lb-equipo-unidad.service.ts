import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbEquipoUnidad, LbEquipoUnidadPayload } from '../models/lb-equipo-unidad.model';

@Injectable({ providedIn: 'root' })
export class LbEquipoUnidadService {

  private readonly base = `${environment.apilaboratoriosLocal}/equipos/unidades`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbEquipoUnidad[]> {
    return this.http.get<LbEquipoUnidad[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbEquipoUnidad> {
    return this.http.get<LbEquipoUnidad>(`${this.base}/${id}`).pipe(retry(1));
  }

  create(idAlmacen: string, payload: LbEquipoUnidadPayload): Observable<LbEquipoUnidad> {
    const params = new HttpParams().set('idAlmacen', idAlmacen);
    return this.http.post<LbEquipoUnidad>(this.base, payload, { params });
  }

  update(id: string, idAlmacen: string, payload: LbEquipoUnidadPayload): Observable<LbEquipoUnidad> {
    const params = new HttpParams().set('idAlmacen', idAlmacen);
    return this.http.put<LbEquipoUnidad>(`${this.base}/${id}`, payload, { params });
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }

  getByAlmacen(idAlmacen: string): Observable<LbEquipoUnidad[]> {
    return this.http.get<LbEquipoUnidad[]>(`${this.base}/almacen/${idAlmacen}`).pipe(retry(1));
  }

  getByEstado(estado: string): Observable<LbEquipoUnidad[]> {
    return this.http.get<LbEquipoUnidad[]>(`${this.base}/estado/${encodeURIComponent(estado)}`).pipe(retry(1));
  }

  descargarHistorialPdf(id: string): Observable<Blob> {
    return this.http.get(`${environment.apilaboratoriosLocal}/equipos/historial/${id}/pdf`, { responseType: 'blob' });
  }
}
