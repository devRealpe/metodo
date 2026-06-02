import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbEquipoAula, LbEquipoAulaPayload } from '../models/lb-equipo-aula.model';

@Injectable({ providedIn: 'root' })
export class LbEquipoAulaService {

  private readonly base = `${environment.apilaboratoriosLocal}/equipos-aula`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbEquipoAula[]> {
    return this.http.get<LbEquipoAula[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbEquipoAula> {
    return this.http.get<LbEquipoAula>(`${this.base}/${id}`).pipe(retry(1));
  }

  create(idEquipoAlmacen: string, idLaboratorio: string, idEquipoUnidad: string, payload: LbEquipoAulaPayload): Observable<LbEquipoAula> {
    const params = new HttpParams()
      .set('idEquipoAlmacen', idEquipoAlmacen)
      .set('idLaboratorio', idLaboratorio)
      .set('idEquipoUnidad', idEquipoUnidad);
    return this.http.post<LbEquipoAula>(this.base, payload, { params });
  }

  update(id: string, idLaboratorio: string, idEquipoUnidad: string, payload: LbEquipoAulaPayload): Observable<LbEquipoAula> {
    const params = new HttpParams()
      .set('idLaboratorio', idLaboratorio)
      .set('idEquipoUnidad', idEquipoUnidad);
    return this.http.put<LbEquipoAula>(`${this.base}/${id}`, payload, { params });
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }

  devolver(id: string, delta: number): Observable<LbEquipoAula | null> {
    return this.http.put<LbEquipoAula>(`${this.base}/${id}/devolver`, { delta });
  }

  getByLaboratorio(idLaboratorio: string): Observable<LbEquipoAula[]> {
    return this.http.get<LbEquipoAula[]>(`${this.base}/laboratorio/${idLaboratorio}`).pipe(retry(1));
  }

  getByEquipoAlmacen(idEquipoAlmacen: string): Observable<LbEquipoAula[]> {
    return this.http.get<LbEquipoAula[]>(`${this.base}/equipo-almacen/${idEquipoAlmacen}`).pipe(retry(1));
  }

  getByResponsable(responsable: string): Observable<LbEquipoAula[]> {
    return this.http.get<LbEquipoAula[]>(`${this.base}/responsable`, { params: { responsable } });
  }
}
