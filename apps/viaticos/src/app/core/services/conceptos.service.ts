import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface Concepto {
  id: number;
  codigo: string;
  nombre: string;
  abreviatura: string;
  tipo: string;
  categoria: string;
  tipoViatico: string;
}

@Injectable({ providedIn: 'root' })
export class ConceptosService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiViaticos}/conceptos-liquidacion`;

  /**
   * Obtiene todos los conceptos de liquidación por tipo de viático
   * Por defecto trae conceptos OCASIONALES que incluyen TRANSPORTE, ALIMENTACIÓN, HOSPEDAJE, etc.
   */
  getAllConceptos(): Observable<Concepto[]> {
    const tipoViatico = 'OCASIONAL';
    
    return this.http.get<Concepto[]>(`${this.API_URL}/tipo/${tipoViatico}`).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Obtiene un concepto por ID
   */
  getConceptoById(id: string): Observable<Concepto | null> {
    return this.http.get<Concepto>(`${this.API_URL}/${id}`).pipe(
      catchError((error) => {
        return of(null);
      })
    );
  }

  /**
   * Busca conceptos por nombre (búsqueda parcial)
   */
  searchConceptos(nombre: string): Observable<Concepto[]> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http.get<Concepto[]>(`${this.API_URL}/buscar`, { params }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Crea un nuevo concepto
   */
  createConcepto(concepto: Concepto): Observable<Concepto | null> {
    return this.http.post<Concepto>(this.API_URL, concepto).pipe(
      catchError((error) => {
        return of(null);
      })
    );
  }

  /**
   * Actualiza un concepto existente
   */
  updateConcepto(id: string, concepto: Concepto): Observable<Concepto | null> {
    return this.http.put<Concepto>(`${this.API_URL}/${id}`, concepto).pipe(
      catchError((error) => {
        return of(null);
      })
    );
  }

  /**
   * Elimina un concepto
   */
  deleteConcepto(id: string): Observable<boolean> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        return of(false);
      })
    );
  }
}
