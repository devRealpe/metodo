import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbSuministroAula, LbSuministroAulaPayload } from '../models/lb-suministro-aula.model';

@Injectable({ providedIn: 'root' })
export class LbSuministroAulaService {

  private readonly base = `${environment.apilaboratoriosLocal}/suministros-aula`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbSuministroAula[]> {
    return this.http.get<LbSuministroAula[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbSuministroAula> {
    return this.http.get<LbSuministroAula>(`${this.base}/${id}`).pipe(retry(1));
  }

  create(idSuministroAlmacen: string, idLaboratorio: string, payload: LbSuministroAulaPayload): Observable<LbSuministroAula> {
    const params = new HttpParams()
      .set('idSuministroAlmacen', idSuministroAlmacen)
      .set('idLaboratorio', idLaboratorio);
    return this.http.post<LbSuministroAula>(this.base, payload, { params });
  }

  update(id: string, idSuministroAlmacen: string, idLaboratorio: string, payload: LbSuministroAulaPayload): Observable<LbSuministroAula> {
    const params = new HttpParams()
      .set('idSuministroAlmacen', idSuministroAlmacen)
      .set('idLaboratorio', idLaboratorio);
    return this.http.put<LbSuministroAula>(`${this.base}/${id}`, payload, { params });
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }

  getByLaboratorio(idLaboratorio: string): Observable<LbSuministroAula[]> {
    return this.http.get<LbSuministroAula[]>(`${this.base}/laboratorio/${idLaboratorio}`).pipe(retry(1));
  }

  getBySuministroAlmacen(idSuministroAlmacen: string): Observable<LbSuministroAula[]> {
    return this.http.get<LbSuministroAula[]>(`${this.base}/suministro-almacen/${idSuministroAlmacen}`).pipe(retry(1));
  }

  getByEstado(estado: string): Observable<LbSuministroAula[]> {
    return this.http.get<LbSuministroAula[]>(`${this.base}/estado/${encodeURIComponent(estado)}`);
  }

  getByTipo(tipo: string): Observable<LbSuministroAula[]> {
    return this.http.get<LbSuministroAula[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`);
  }

  getByLaboratorioAndEstado(idLaboratorio: string, estado: string): Observable<LbSuministroAula[]> {
    return this.http.get<LbSuministroAula[]>(`${this.base}/laboratorio/${idLaboratorio}/estado/${encodeURIComponent(estado)}`);
  }

  devolver(id: string, delta = 1): Observable<{ mensaje: string; success: boolean; cantidadRestante?: number }> {
    const params = new HttpParams().set('delta', delta);
    return this.http.post<{ mensaje: string; success: boolean; cantidadRestante?: number }>(`${this.base}/${id}/devolver`, null, { params });
  }

  getProximosAVencer(fecha: string): Observable<LbSuministroAula[]> {
    return this.http.get<LbSuministroAula[]>(`${this.base}/proximos-a-vencer`, { params: { fecha } });
  }

  getCantidadDisponibleByLaboratorio(idLaboratorio: string): Observable<{ cantidadDisponible: number }> {
    return this.http.get<{ cantidadDisponible: number }>(`${this.base}/laboratorio/${idLaboratorio}/cantidad-disponible`).pipe(retry(1));
  }
}
