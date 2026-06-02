import { Injectable, inject } from '@angular/core';
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
  centroCosto: string;
  fechaFinContrato?: string; // Fecha límite para solicitar viáticos
  tipoViatico?: string; // Calculado automáticamente por el backend basado en el cargo
}

@Injectable({ providedIn: 'root' })
export class UsuariosOracleService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiOracle}/usuarios`;

  // Obtiene todos los usuarios
  getAll(): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(this.base);
  }

  // Obtiene usuario por ID
  getById(id: string): Observable<UsuarioOracle | null> {
    return this.getByCodigo(id);
  }

  // Obtiene usuario por código
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

  // Busca usuarios por nombre
  searchByNombre(nombre: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/buscar`, {
      params: { nombre }
    });
  }

  // Obtiene usuarios por cargo
  getByCargo(cargo: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/cargo/${encodeURIComponent(cargo)}`);
  }

  // Obtiene usuarios por género
  getByGenero(genero: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/genero/${encodeURIComponent(genero)}`);
  }

  // Obtiene usuarios por semestre
  getBySemestre(semestre: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/semestre/${encodeURIComponent(semestre)}`);
  }

  // Obtiene usuarios por facultad
  getByFacultad(facultad: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/facultad/${encodeURIComponent(facultad)}`);
  }

  // Obtiene usuarios por programa
  getByPrograma(programa: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/programa/${encodeURIComponent(programa)}`);
  }

  // Obtiene usuarios por centro de costo
  getByCentroCosto(centroCosto: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/centroCosto/${encodeURIComponent(centroCosto)}`);
  }

  /**
   * ✅ NUEVO: Obtiene todos los usuarios excluyendo un cargo específico (ej: "ESTUDIANTE")
   */
  getAllExcluyendoCargo(cargo: string): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/excluir-cargo`, {
      params: { cargo }
    });
  }

  /**
   * ✅ Obtiene todos los usuarios excluyendo estudiantes automáticamente
   * Sin hardcoding de 'ESTUDIANTE' en el frontend - la lógica está en el backend
   */
  getAllSinEstudiantes(): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/sin-estudiantes`);
  }

  /**
   * ✅ NUEVO: Obtiene usuarios con múltiples cargos (ej: ["DECANO (A)", "DIRECTOR DE OFICINA"])
   */
  getByMultiplesCargos(cargos: string[]): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/por-cargos`, {
      params: { cargos: cargos }
    });
  }

  /**
   * ✅ NUEVO: Obtiene vicerrectores administrativos (sin datos quemados en frontend)
   * Filtrado en backend por: programa + cargo
   */
  getVicerrectoresAdministrativos(): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/vicerrectores-administrativos`);
  }

  /**
   * ✅ NUEVO: Obtiene directores de talento humano (sin datos quemados en frontend)
   * Filtrado en backend por: facultad contiene "RECURSOS HUMANOS" + cargo contiene "DIRECTOR"
   */
  getDirectoresTalentoHumano(): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/directores-talento-humano`);
  }

  /**
   * ✅ NUEVO: Obtiene directores de programa académico (sin datos quemados en frontend)
   * Filtrado en backend por: cargo = "DIRECTOR DE PROGRAMA"
   */
  getDirectoresPrograma(): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/directores-programa`);
  }

  /**
   * ✅ Obtiene decanos y directores de oficina
   * Sin hardcoding de cargos en frontend - lógica en el backend
   */
  getDecanosYDirectoresOficina(): Observable<UsuarioOracle[]> {
    return this.http.get<UsuarioOracle[]>(`${this.base}/decanos-directores-oficina`);
  }
}