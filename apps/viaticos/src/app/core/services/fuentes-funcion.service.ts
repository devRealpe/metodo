import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface FuenteFuncion {
  fuenteFuncion: string;
  nombreFuenteFuncion: string;
  fuenteFuncionPredecesor: string;
  nivel: number;
}

@Injectable({ providedIn: 'root' })
export class FuentesFuncionService {
  private readonly http = inject(HttpClient);
  // ✅ Corregido: Fuentes función no está en Oracle, está en el servicio laboratorios
  private readonly base = `${environment.apiOracle}/fuentes-funcion-oracle`;

  // Obtiene todas las fuentes función
  getAll(): Observable<FuenteFuncion[]> {
    return this.http.get<FuenteFuncion[]>(this.base).pipe(
      catchError(() => of([]))
    );
  }

  // Obtiene fuente función por ID
  getById(fuenteFuncion: string): Observable<FuenteFuncion | null> {
    const url = `${this.base}/${encodeURIComponent(fuenteFuncion)}`;
    return this.http.get<FuenteFuncion>(url).pipe(
      catchError(() => of(null))
    );
  }

  // Obtiene fuentes función por nivel
  getByNivel(nivel: number): Observable<FuenteFuncion[]> {
    const params = new HttpParams().set('nivel', String(nivel));
    return this.http.get<FuenteFuncion[]>(this.base, { params }).pipe(
      catchError(() => of([]))
    );
  }

  // Obtiene fuentes función por predecesor
  getByPredecesor(predecesor: string): Observable<FuenteFuncion[]> {
    const params = new HttpParams().set('predecesor', predecesor);
    return this.http.get<FuenteFuncion[]>(this.base, { params }).pipe(
      catchError(() => of([]))
    );
  }

  // Obtiene fuentes función únicas (sin duplicados)
  getAllUnique(): Observable<FuenteFuncion[]> {
    return this.http.get<FuenteFuncion[]>(`${this.base}/unicas`).pipe(
      catchError(() => of([]))
    );
  }

  // Busca fuentes función por término
  search(term: string): Observable<FuenteFuncion[]> {
    const params = new HttpParams().set('q', term);
    return this.http.get<FuenteFuncion[]>(this.base, { params }).pipe(
      catchError(() => of([]))
    );
  }

  // Obtiene árbol de fuentes función
  getTree(root?: string): Observable<FuenteFuncion[]> {
    const url = `${this.base}/tree`;
    const params = root ? new HttpParams().set('root', root) : undefined;
    return this.http.get<FuenteFuncion[]>(url, { params }).pipe(
      catchError(() => of([]))
    );
  }
}
