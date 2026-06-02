import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, timer } from 'rxjs';
import { catchError, retry, shareReplay, tap, map, finalize, retryWhen, mergeMap, take } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { ListaValor, ListaValorCreateDto, ListaValorUpdateDto } from '../models/lista-valor.model';

interface CacheEntry {
  data: ListaValor[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class ListasValoresService {
  private readonly apiUrl = `${environment.generalApi}/listas-valores`;
  
  //  CACHE: TTL de 10 minutos (600000 ms)
  private readonly CACHE_TTL = 600000;
  private cache = new Map<string, CacheEntry>();
  
  //  PENDING REQUESTS: Evitar múltiples peticiones simultáneas
  private pendingRequests = new Map<string, Observable<ListaValor[]>>();

  constructor(private http: HttpClient) {}

  obtenerTodas(): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(this.apiUrl).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerPorId(id: string): Observable<ListaValor> {
    return this.http.get<ListaValor>(`${this.apiUrl}/dto/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  crear(dto: ListaValorCreateDto): Observable<ListaValor> {
    return this.http.post<ListaValor>(this.apiUrl, dto).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  actualizar(id: string, dto: ListaValorUpdateDto): Observable<ListaValor> {
    return this.http.put<ListaValor>(`${this.apiUrl}/${id}`, dto).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  obtenerTipos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tipos`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }


  obtenerPorTipo(tipo: string): Observable<ListaValor[]> {
    const cached = this.getFromCache(tipo);
    if (cached) {
      return of(cached);
    }

    const pending = this.pendingRequests.get(tipo);
    if (pending) {
      return pending;
    }

    const request$ = this.http.get<ListaValor[]>(`${this.apiUrl}/dropdown/tipo/${tipo}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      }),
      retryWhen(errors => errors.pipe(
        mergeMap((error, index) => {
          if (index >= 3) {
            return throwError(() => error);
          }
          // Delay exponencial: 500ms, 1000ms, 2000ms
          const delay = Math.pow(2, index) * 500;
          return timer(delay);
        })
      )),
      tap(data => {
        if (data && data.length > 0) {
          this.saveToCache(tipo, data);
        }
      }),
      finalize(() => {
        this.pendingRequests.delete(tipo);
      }),
      shareReplay(1),
      catchError(this.handleError.bind(this))
    );

    this.pendingRequests.set(tipo, request$);
    return request$;
  }


  clearCache(tipo?: string): void {
    if (tipo) {
      this.cache.delete(tipo);
    } else {
      this.cache.clear();
    }
  }


  private getFromCache(tipo: string): ListaValor[] | null {
    const entry = this.cache.get(tipo);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Verificar si el cache expiró
    if (age > this.CACHE_TTL) {
      this.cache.delete(tipo);
      return null;
    }

    return entry.data;
  }


  private saveToCache(tipo: string, data: ListaValor[]): void {
    this.cache.set(tipo, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Obtiene los valores raíz de un tipo (sin padre)
   */
  obtenerRaicesPorTipo(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/tipo/${tipo}/root`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtiene los valores raíz de un tipo con ordenamiento dinámico
   */
  obtenerRaicesPorTipoDinamico(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/root-dinamicos/${tipo}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtiene los hijos de un valor específico
   */
  obtenerHijos(idPadre: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/hijos/${idPadre}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtiene los hijos de un valor específico con ordenamiento dinámico
   */
  obtenerHijosDinamico(idPadre: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/hijos-dinamicos/${idPadre}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Verifica si una lista tiene hijos
   */
  tieneHijos(id: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/has-children/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Actualiza el orden de múltiples listas de valores
   */
  actualizarOrden(ordenes: { id: string; orden: number }[]): Observable<{ actualizados: number }> {
    return this.http.put<{ actualizados: number }>(`${this.apiUrl}/orden`, ordenes).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtiene valores filtrados por nombre (para autocompletado)
   */
  obtenerPorTipoConFiltro(tipo: string, filtro: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.apiUrl}/dropdown/tipo/${tipo}/filtro/${filtro}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }


  /**
   * Construye una estructura jerárquica a partir de una lista plana
   */
  construirJerarquia(valores: ListaValor[]): ListaValor[] {
    const map = new Map<string, ListaValor & { hijos?: ListaValor[] }>();
    const raices: (ListaValor & { hijos?: ListaValor[] })[] = [];

    // Primero, crear un mapa de todos los valores
    valores.forEach((valor) => {
      map.set(valor.id, { ...valor, hijos: [] });
    });

    // Luego, construir la jerarquía
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

  /**
   * Manejo de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Código: ${error.status}\nMensaje: ${error.message}`;
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
