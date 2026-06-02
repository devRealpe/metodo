import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { OraAulas } from '../models/ora-aulas.model';

@Injectable({ providedIn: 'root' })
export class OraAulasService {
  private readonly base = `${environment.apiOracle}/aulas-oracle`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las aulas desde Oracle
   */
  getAll(): Observable<OraAulas[]> {
    return this.http.get<OraAulas[]>(this.base).pipe(
      retry(1)
    );
  }

  /**
   * Obtiene un aula por código
   */
  getByCodAula(codAula: string): Observable<OraAulas> {
    return this.http.get<OraAulas>(`${this.base}/${encodeURIComponent(codAula)}`).pipe(
      retry(1)
    );
  }

  /**
   * Obtiene los tipos de aula disponibles
   */
  getTipos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/tipos`).pipe(
      retry(1)
    );
  }

  /**
   * Obtiene los nombres de las aulas
   */
  getNombres(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/nombres`).pipe(
      retry(1)
    );
  }

  /**
   * Busca aulas por nombre
   */
  searchByNombre(nombre: string): Observable<OraAulas[]> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http.get<OraAulas[]>(`${this.base}/buscar`, { params }).pipe(
      retry(1)
    );
  }

  /**
   * Obtiene los bloques disponibles
   */
  getBloques(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/bloques`).pipe(
      retry(1)
    );
  }
}
