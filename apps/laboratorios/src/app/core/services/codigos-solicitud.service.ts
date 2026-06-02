import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface CodigoSolicitud {
  id: string;
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
  nombrePadre?: string;
}

@Injectable({ providedIn: 'root' })
export class CodigosSolicitudService {
  private readonly base = `${environment.generalApi}/codigos-solicitud`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CodigoSolicitud[]> {
    return this.http.get<CodigoSolicitud[]>(this.base);
  }

  getById(id: string): Observable<CodigoSolicitud | null> {
    return this.http.get<CodigoSolicitud>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      map(res => res ?? null),
      catchError(err => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  create(codigo: CodigoSolicitud): Observable<CodigoSolicitud> {
    return this.http.post<CodigoSolicitud>(this.base, codigo);
  }

  update(id: string, codigo: CodigoSolicitud): Observable<CodigoSolicitud> {
    return this.http.put<CodigoSolicitud>(`${this.base}/${encodeURIComponent(id)}`, codigo);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  searchByTexto(texto: string): Observable<CodigoSolicitud[]> {
    return this.http.get<CodigoSolicitud[]>(`${this.base}/filtro/${encodeURIComponent(texto)}`);
  }

  getByTipo(tipo: string): Observable<CodigoSolicitud[]> {
    return this.http.get<CodigoSolicitud[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`);
  }

  getRootByTipo(tipo: string): Observable<CodigoSolicitud[]> {
    return this.http.get<CodigoSolicitud[]>(`${this.base}/root/${encodeURIComponent(tipo)}`);
  }

  getHijos(idPadre: string): Observable<CodigoSolicitud[]> {
    return this.http.get<CodigoSolicitud[]>(`${this.base}/hijos/${encodeURIComponent(idPadre)}`);
  }

  getTipos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/tipos`);
  }

  actualizarOrdenDescendientes(idPadre: string, tipoOrden: string): Observable<any> {
    return this.http.put(`${this.base}/orden/${encodeURIComponent(idPadre)}`, null, {
      params: { tipoOrden }
    });
  }

  getCentrosCostos(): Observable<CodigoSolicitud[]> {
    return this.http.get<CodigoSolicitud[]>(`${this.base}/centros-costos`);
  }

  getCentroCostoByCodigo(codigo: string): Observable<CodigoSolicitud | null> {
    return this.http.get<CodigoSolicitud>(`${this.base}/centros-costos/codigo/${encodeURIComponent(codigo)}`).pipe(
      map(res => res ?? null),
      catchError(err => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  buscarCentroCostoPorNombre(texto: string): Observable<CodigoSolicitud[]> {
    return this.http.get<CodigoSolicitud[]>(`${this.base}/centros-costos/filtro/${encodeURIComponent(texto)}`);
  }
}
