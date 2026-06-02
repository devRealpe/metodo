import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProductosCompromisos } from '../models/productos-compromisos.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class ProductosCompromisosService {

  private readonly apiUrl = `${environment.internacionalizacionApi}/productos-compromisos`;

  constructor(private http: HttpClient) {}

  getProductosByMovilidad(movilidadId: string): Observable<ProductosCompromisos[]> {
    return this.http.get<ProductosCompromisos[]>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(
        catchError(error => {
          console.warn(`No se encontraron productos para movilidad ${movilidadId}:`, error.status);
          // Retornar array vacío si no hay productos
          return of([]);
        })
      );
  }

  createDefaultProductos(movilidadId: string): Observable<ProductosCompromisos[]> {
    return this.http.post<ProductosCompromisos[]>(`${this.apiUrl}/movilidad/${movilidadId}/default`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  saveProductos(movilidadId: string, productos: ProductosCompromisos[]): Observable<ProductosCompromisos[]> {
    return this.http.put<ProductosCompromisos[]>(`${this.apiUrl}/movilidad/${movilidadId}`, productos)
      .pipe(
        catchError(this.handleError)
      );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteSafe(id: string): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        map(() => true),
        catchError(error => {
          // Retornar false para cualquier error, no lanzar excepción
          return of(false);
        })
      );
  }

  deleteByMovilidadId(movilidadId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/movilidad/${movilidadId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error en ProductosCompromisosService:', error);
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('URL:', error.url);
    return throwError(() => new Error(`Error al procesar la solicitud: ${error.status} - ${error.message}`));
  }
}