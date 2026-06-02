import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import type { MovilidadAgrupada } from './movilidad-estado.service';
import { environment } from '@shared/shared-environments';
import { UsuarioOracle } from '../models/usuarios-oracle.model';

@Injectable({ providedIn: 'root' })
export class UsuariosOracleService {
  private readonly base = `${environment.apiOracle}/profesores-oracle`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(this.base);
  }

  getById(id: string): Observable<UsuarioOracle | null> {
    return this.getByCodigo(id);
  }

  getByCodigo(codigo: string): Observable<UsuarioOracle | null> {
    return this.http
      .get<UsuarioOracle>(`${this.base}/${encodeURIComponent(codigo)}`)
      .pipe(
        map(res => res ?? null),
        catchError(error => {
          if (error.status === 404) {
            return of(null);
          }
          throw error;
        })
      );
  }

  searchByNombre(nombres: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/buscar`, {
      params: { nombres } as any
    });
  }

  getByApellido(apellidos: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/apellido/${encodeURIComponent(apellidos)}`);
  }

  getByPrograma(programa: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/programa/${encodeURIComponent(programa)}`);
  }

  getByVinculacion(vinculacion: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/vinculacion/${encodeURIComponent(vinculacion)}`);
  }

  getByTipoIdentificacion(tipo: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/tipoIdentificacion/${encodeURIComponent(tipo)}`);
  }

  getByIdentificaciones(identificaciones: string[]): Observable<UsuarioOracle[]> {
    const requests = identificaciones.map(id => this.getByCodigo(id));
    return forkJoin(requests).pipe(
      map((results: (UsuarioOracle | null)[]) => results.filter(user => user !== null) as UsuarioOracle[])
    );
  }

  /**
   * Dado un array de MovilidadAgrupada, resuelve identificaciones numéricas encontradas
   * en campos `aprobadorIdentificacion/aprobadorNombre` y devuelve las movilidades con
   * `aprobadorNombre` poblado cuando se encuentra en Oracle.
   */
  populateAprobadorNamesForMovilidades(movilidades: MovilidadAgrupada[]): Observable<MovilidadAgrupada[]> {
    const idents = Array.from(new Set(
      movilidades
        .flatMap(m => m.aprobaciones.map(a => String(a.aprobadorIdentificacion || a.aprobadorNombre || '').trim()))
        .filter(id => id && /^\d{5,}$/.test(id))
    ));

    if (idents.length === 0) return of(movilidades);

    return this.getByIdentificaciones(idents).pipe(
      map(users => {
        if (!users || users.length === 0) return movilidades;
        const map = new Map(users.map(u => [u.numIdentificacion, `${u.nombres} ${u.apellidos}`]));
        if (map.size === 0) return movilidades;

        return movilidades.map(m => ({
          ...m,
          aprobaciones: m.aprobaciones.map(a => {
            const id = String(a.aprobadorIdentificacion || a.aprobadorNombre || '').trim();
            return id && map.has(id) ? { ...a, aprobadorNombre: map.get(id) } : a;
          })
        }));
      }),
      catchError(() => of(movilidades))
    );
  }
}
