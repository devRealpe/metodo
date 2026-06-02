import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { TipoPractica, TipoPracticaCreateDto, TipoPracticaUpdateDto } from '../models/tipo-practica.model';

@Injectable({ providedIn: 'root' })
export class TipoPracticaService {
  private readonly base = `${(environment as any).apilaboratoriosLocal}/tipos-practica`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los tipos de práctica
   */
  getAll(): Observable<TipoPractica[]> {
    return this.http.get<TipoPractica[]>(this.base);
  }

  /**
   * Obtener tipo de práctica por ID
   */
  getById(id: string): Observable<TipoPractica> {
    return this.http.get<TipoPractica>(`${this.base}/${id}`);
  }

  /**
   * Obtener tipos de práctica por tipo
   */
  getByTipo(tipo: string): Observable<TipoPractica[]> {
    return this.http.get<TipoPractica[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`);
  }

  /**
   * Buscar tipos de práctica por nombre (búsqueda parcial)
   */
  buscarPorNombre(nombre: string): Observable<TipoPractica[]> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http.get<TipoPractica[]>(`${this.base}/buscar`, { params });
  }

  /**
   * Crear un nuevo tipo de práctica
   */
  crear(tipoPractica: TipoPracticaCreateDto): Observable<TipoPractica> {
    return this.http.post<TipoPractica>(this.base, tipoPractica);
  }

  /**
   * Actualizar un tipo de práctica existente
   */
  actualizar(id: string, tipoPractica: TipoPracticaUpdateDto): Observable<TipoPractica> {
    return this.http.put<TipoPractica>(`${this.base}/${id}`, tipoPractica);
  }

  /**
   * Eliminar un tipo de práctica
   */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * Verificar si existe un tipo de práctica
   */
  existe(nombre: string, tipo: string): Observable<{ existe: boolean }> {
    const params = new HttpParams()
      .set('nombre', nombre)
      .set('tipo', tipo);
    return this.http.get<{ existe: boolean }>(`${this.base}/existe`, { params });
  }
}
