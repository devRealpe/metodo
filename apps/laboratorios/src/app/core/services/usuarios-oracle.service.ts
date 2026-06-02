import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface UsuarioOracle {
  identificacion: string;
  nombre: string;
  genero: string;
  facultad: string;
  programa: string;
  cargo: string;
  semestre: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosOracleService {
  private readonly base = `${environment.apiOracle}/usuarios`;

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

  searchByNombre(nombre: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/buscar`, {
      params: { nombre } as any
    });
  }

  getByCargo(cargo: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/cargo/${encodeURIComponent(cargo)}`);
  }

  getByGenero(genero: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/genero/${encodeURIComponent(genero)}`);
  }

  getBySemestre(semestre: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/semestre/${encodeURIComponent(semestre)}`);
  }

  getByFacultad(facultad: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/facultad/${encodeURIComponent(facultad)}`);
  }

  getByPrograma(programa: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/programa/${encodeURIComponent(programa)}`);
  }
}
