import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { EstudiantesOracle } from '../models/estudiantes-oracle.model';

@Injectable({ providedIn: 'root' })
export class EstudiantesOracleService {
  private readonly base = `${environment.apiOracle}/estudiantes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(this.base);
  }

  getByPeriodo(periodo: number): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/periodo/${periodo}`);
  }

  getByIdEstudiante(idEstudiante: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/estudiante/${encodeURIComponent(idEstudiante)}`);
  }

  getByCodAsignatura(codAsignatura: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/asignatura/${encodeURIComponent(codAsignatura)}`);
  }

  getByCodAula(codAula: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/aula/${encodeURIComponent(codAula)}`);
  }

  getByProfesor(numIdProfesor: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/profesor/${encodeURIComponent(numIdProfesor)}`);
  }

  searchByNombre(nombre: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/buscar`, {
      params: { nombre } as any
    });
  }

  searchByNomAsignatura(nombre: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/buscar-asignatura`, {
      params: { nombre } as any
    });
  }

  getByGrupo(grupo: number): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/grupo/${grupo}`);
  }

  getBySemestre(semestre: number): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/semestre/${semestre}`);
  }

  getByPeriodoAndCodAula(periodo: number, codAula: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/periodo/${periodo}/aula/${encodeURIComponent(codAula)}`);
  }

  getByPeriodoAndCodAsignatura(periodo: number, codAsignatura: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/periodo/${periodo}/asignatura/${encodeURIComponent(codAsignatura)}`);
  }

  getByPeriodoAndIdEstudiante(periodo: number, idEstudiante: string): Observable<EstudiantesOracle[]> {
    return this.http.get<EstudiantesOracle[]>(`${this.base}/periodo/${periodo}/estudiante/${encodeURIComponent(idEstudiante)}`);
  }


}
