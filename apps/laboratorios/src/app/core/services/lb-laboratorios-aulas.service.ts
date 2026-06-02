import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbLaboratoriosAulas } from '../models/lb-laboratorios-aulas.model';
import { OraAulas } from '../models/ora-aulas.model';

@Injectable({ providedIn: 'root' })
export class LbLaboratoriosAulasService {

  private readonly base = `${environment.apilaboratoriosLocal}/aulas`;
  private http = inject(HttpClient);

  getAll(): Observable<LbLaboratoriosAulas[]> {
    return this.http.get<LbLaboratoriosAulas[]>(this.base).pipe(
      retry(1)
    );
  }

  getById(id: string): Observable<LbLaboratoriosAulas> {
    return this.http.get<LbLaboratoriosAulas>(`${this.base}/${id}`).pipe(
      retry(1)
    );
  }

  create(payload: Omit<LbLaboratoriosAulas, 'id'>): Observable<LbLaboratoriosAulas> {
    return this.http.post<LbLaboratoriosAulas>(this.base, payload);
  }

  update(id: string, payload: Partial<LbLaboratoriosAulas>): Observable<LbLaboratoriosAulas> {
    return this.http.put<LbLaboratoriosAulas>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  count(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/count`).pipe(
      retry(1)
    );
  }

  getAulasRaiz(): Observable<LbLaboratoriosAulas[]> {
    return this.http.get<LbLaboratoriosAulas[]>(`${this.base}/raiz`).pipe(
      retry(1)
    );
  }

  getAulasHijas(idPadre: string): Observable<LbLaboratoriosAulas[]> {
    return this.http.get<LbLaboratoriosAulas[]>(`${this.base}/hijas/${idPadre}`).pipe(
      retry(1)
    );
  }

  searchByCodigo(codigo: string): Observable<LbLaboratoriosAulas[]> {
    return this.http.get<LbLaboratoriosAulas[]>(`${this.base}/buscar-codigo`, {
      params: { codigo }
    }).pipe(
      retry(1)
    );
  }

  searchByNombre(nombre: string): Observable<LbLaboratoriosAulas[]> {
    return this.http.get<LbLaboratoriosAulas[]>(`${this.base}/buscar-nombre`, {
      params: { nombre }
    }).pipe(
      retry(1)
    );
  }

  /** Busca por codAula; si no existe lo crea. Evita duplicados de forma atómica en el backend. */
  findOrCreate(payload: Omit<LbLaboratoriosAulas, 'id'>): Observable<LbLaboratoriosAulas> {
    return this.http.post<LbLaboratoriosAulas>(`${this.base}/find-or-create`, payload);
  }

  sincronizarDesdeOracle(aulas: OraAulas[]): Observable<{ success: boolean; mensaje: string; estadisticas: any }> {
    const payload = { aulas };
    return this.http.post<{ success: boolean; mensaje: string; estadisticas: any }>(
      `${this.base}/sincronizar-oracle`,
      payload
    );
  }
}
