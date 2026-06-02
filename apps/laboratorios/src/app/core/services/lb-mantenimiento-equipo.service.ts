import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbMantenimientoEquipo, LbMantenimientoEquipoPayload } from '../models/lb-mantenimiento-equipo.model';

@Injectable({ providedIn: 'root' })
export class LbMantenimientoEquipoService {

  private readonly base = `${environment.apilaboratoriosLocal}/equipos/mantenimiento`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbMantenimientoEquipo[]> {
    return this.http.get<LbMantenimientoEquipo[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbMantenimientoEquipo> {
    return this.http.get<LbMantenimientoEquipo>(`${this.base}/${id}`).pipe(retry(1));
  }

  create(idEquipoUnidad: string, payload: LbMantenimientoEquipoPayload): Observable<LbMantenimientoEquipo> {
    const params = new HttpParams().set('idEquipoUnidad', idEquipoUnidad);
    return this.http.post<LbMantenimientoEquipo>(this.base, payload, { params });
  }

  update(id: string, idEquipoUnidad: string, payload: LbMantenimientoEquipoPayload): Observable<LbMantenimientoEquipo> {
    const params = new HttpParams().set('idEquipoUnidad', idEquipoUnidad);
    return this.http.put<LbMantenimientoEquipo>(`${this.base}/${id}`, payload, { params });
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }

  getByUnidad(idEquipoUnidad: string): Observable<LbMantenimientoEquipo[]> {
    return this.http.get<LbMantenimientoEquipo[]>(`${this.base}/unidad/${idEquipoUnidad}`).pipe(retry(1));
  }

  getByEstado(estado: string): Observable<LbMantenimientoEquipo[]> {
    return this.http.get<LbMantenimientoEquipo[]>(`${this.base}/estado/${encodeURIComponent(estado)}`).pipe(retry(1));
  }

  /** Marca como "realizado" el último mantenimiento pendiente de la unidad. */
  marcarRealizado(idEquipoUnidad: string): Observable<LbMantenimientoEquipo> {
    return this.http.patch<LbMantenimientoEquipo>(`${this.base}/unidad/${idEquipoUnidad}/marcar-realizado`, {});
  }
}
