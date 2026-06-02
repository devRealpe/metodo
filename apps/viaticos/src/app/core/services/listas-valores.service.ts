import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { ListaValor, ListaValorCreateDto, ListaValorUpdateDto } from '../models/lista-valor.model';

@Injectable({
  providedIn: 'root',
})
export class ListasValoresService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.generalApi}/listas-valores`;

  // Obtiene todas las listas de valores
  obtenerTodas(): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(this.apiUrl).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene lista de valores por ID
  obtenerPorId(id: string): Observable<ListaValor> {
    return this.http.get<ListaValor>(`${this.apiUrl}/dto/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Crea nueva lista de valores
  crear(dto: ListaValorCreateDto): Observable<ListaValor> {
    return this.http.post<ListaValor>(this.apiUrl, dto).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Actualiza lista de valores existente
  actualizar(id: string, dto: ListaValorUpdateDto): Observable<ListaValor> {
    return this.http.put<ListaValor>(`${this.apiUrl}/${id}`, dto).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Elimina lista de valores
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene tipos de listas
  obtenerTipos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tipos`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene listas por tipo
  obtenerPorTipo(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/dropdown/tipo/${tipo}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene raíces por tipo
  obtenerRaicesPorTipo(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/tipo/${tipo}/root`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene raíces dinámicas por tipo
  obtenerRaicesPorTipoDinamico(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/root-dinamicos/${tipo}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene hijos de lista padre
  obtenerHijos(idPadre: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/hijos/${idPadre}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene hijos dinámicos
  obtenerHijosDinamico(idPadre: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/hijos-dinamicos/${idPadre}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Verifica si tiene hijos
  tieneHijos(id: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/has-children/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Actualiza orden de listas
  actualizarOrden(ordenes: { id: string; orden: number }[]): Observable<{ actualizados: number }> {
    return this.http.put<{ actualizados: number }>(`${this.apiUrl}/orden`, ordenes).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Obtiene por tipo con filtro
  obtenerPorTipoConFiltro(tipo: string, filtro: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/dropdown/tipo/${tipo}/filtro/${filtro}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // Construye jerarquía de listas
  construirJerarquia(valores: ListaValor[]): ListaValor[] {
    const map = new Map<string, ListaValor & { hijos?: ListaValor[] }>();
    const raices: (ListaValor & { hijos?: ListaValor[] })[] = [];

    valores.forEach((valor) => {
      map.set(valor.id, { ...valor, hijos: [] });
    });

    valores.forEach((valor) => {
      const nodo = map.get(valor.id);
      if (nodo) {
        if (valor.idPadre) {
          const padre = map.get(valor.idPadre);
          if (padre && padre.hijos) {
            padre.hijos.push(nodo);
          }
        } else {
          raices.push(nodo);
        }
      }
    });

    return raices;
  }

  // Maneja errores HTTP
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error desconocido';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Código: ${error.status}\nMensaje: ${error.message}`;
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
