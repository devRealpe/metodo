// src/app/core/services/estudiantes-oracle.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { EstudiantesOracle } from '../models/estudiantes-oracle.model';

@Injectable({ providedIn: 'root' })
export class EstudiantesOracleService {
  private readonly base = `${environment.apiOracle}/estudiantes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(this.base);
  }

  getByIdEstudiante(idEstudiante: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/estudiante/${encodeURIComponent(idEstudiante)}`).pipe(
      map(results => {
        if (results && results.length > 0) {
          return [results[0]];
        }
        return [];
      })
    );
  }

  searchByNombre(nombre: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/buscar`, {
      params: { nombre } as any
    });
  }

  getBySemestre(semestre: number): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/semestre/${semestre}`);
  }

  // Buscar múltiples estudiantes por IDs
  getByIdEstudiantes(idEstudiantes: string[]): Observable<EstudiantesOracle[]> {
    const requests = idEstudiantes.map(id => this.getByIdEstudiante(id));
    return forkJoin(requests).pipe(
      map((results: EstudiantesOracle[][]) =>
        results.flat()
      )
    );
  }
}
