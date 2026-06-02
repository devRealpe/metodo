import { Injectable } from '@angular/core';
import { Profesor } from '../models/profesor.model';
import { environment } from '@shared/shared-environments';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, map, Observable, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfesorService {
  private readonly base = `${environment.apiOracle}/profesores-oracle`;

  private readonly ALLOWED_CARGOS = ['PROFESOR', 'DIRECTOR DE PROGRAMA'];

  constructor(private http: HttpClient) {}

  getAll(): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(this.base);
  }

  getByFacultad(facultad: string): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(
      `${this.base}/facultad/${encodeURIComponent(facultad)}`
    );
  }

  getByPrograma(programa: string): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(
      `${this.base}/programa/${encodeURIComponent(programa)}`
    );
  }

  getByCargo(cargo: string): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(
      `${this.base}/cargo/${encodeURIComponent(cargo)}`
    );
  }

  getById(id: string): Observable<Profesor | null> {
    return this.getByCodigo(id);
  }

getDecanoByFacultad(facultad: string): Observable<Profesor | null> {
  return this.getByCargo('DECANO (A)').pipe(
    map(decanos => {
      const decano = decanos.find(d => d.facultad === facultad);
      return decano ?? null;
    }),
    catchError((error) => {
      return of(null);
    })
  );
}

  getByCodigo(codigo: string): Observable<Profesor | null> {
    return this.http
      .get<Profesor>(`${this.base}/${encodeURIComponent(codigo)}`)
      .pipe(
        map((res) => res ?? null),
        catchError((error) => {
          if (error.status === 404) {
            return of(null);
          }

          throw error;
        })
      );
  }

  searchByIdentificacion(identificacion: string): Observable<Profesor[]> {
  return this.getAll().pipe( map(profesores => profesores.filter(p => 
    p.numIdentificacion?.toLowerCase().includes(identificacion.toLowerCase())
    )
    )
  );
  }
  trackById = (_: number, u: Profesor) =>
    u.numIdentificacion ?? `${u.nombres}-${u.programa}`;

  filterByCargo(profesores: Profesor[]): Profesor[] {
        return profesores.filter((p) => this.ALLOWED_CARGOS.includes(p.cargo));
    }
}
