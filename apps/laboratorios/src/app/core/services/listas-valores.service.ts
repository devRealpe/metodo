import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, timer } from 'rxjs';
import { catchError, retry, shareReplay, tap, map, finalize, retryWhen, mergeMap } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { ListaValor, ListaValorCreateDto, ListaValorUpdateDto } from '../models/lista-valor.model';

interface CacheEntry {
  data: ListaValor[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ListasValoresService {
  private readonly base = `${(environment as any).apilaboratoriosLocal}/listas-valores`;
  
  //CACHE: TTL de 10 minutos (600000 ms)
  private readonly CACHE_TTL = 600000;
  private cache = new Map<string, CacheEntry>();
  
  //Evitar múltiples peticiones simultáneas
  private pendingRequests = new Map<string, Observable<ListaValor[]>>();

  constructor(private http: HttpClient) {}

  crear(dto: ListaValorCreateDto): Observable<any> {
    return this.http.post<any>(this.base, dto).pipe(
      tap(() => this.clearCache(dto.tipo)),
      catchError(this.handleError.bind(this))
    );
  }

  actualizar(id: string, dto: ListaValorUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, dto).pipe(
      tap(() => this.clearCache(dto.tipo)),
      catchError(this.handleError.bind(this))
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerTipos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/tipos`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }


  obtenerTiposConNombres(): Observable<{tipo: string, nombre: string}[]> {
    return this.http.get<{tipo: string, nombre: string}[]>(`${this.base}/tipos-con-nombres`).pipe(
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

    const request$ = this.http.get<ListaValor[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`).pipe(
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

  obtenerRaicesPorTipo(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}/root`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerHijos(idPadre: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.base}/hijos/${idPadre}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerHijosDinamico(idPadre: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.base}/hijos-dinamicos/${idPadre}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerRaicesPorTipoDinamico(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.base}/root-dinamicos/${tipo}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  getDropdownByTipo(tipo: string): Observable<ListaValor[]> {
    const cacheKey = `dropdown_${tipo}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return of(cached);
    }

    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    const request$ = this.http.get<ListaValor[]>(`${this.base}/dropdown/tipo/${encodeURIComponent(tipo)}`).pipe(
      map((response: any) => {
        if (!Array.isArray(response)) {
          
          return [];
        }
        return response;
      }),
      retryWhen(errors => errors.pipe(
        mergeMap((error, index) => {
          if (index >= 3) return throwError(() => error);
          return timer(Math.pow(2, index) * 500);
        })
      )),
      tap(data => {
        if (data && data.length > 0) {
          this.saveToCache(cacheKey, data);
        }
      }),
      finalize(() => {
        this.pendingRequests.delete(cacheKey);
      }),
      shareReplay(1),
      catchError(this.handleError.bind(this))
    );

    this.pendingRequests.set(cacheKey, request$);
    return request$;
  }

  getDropdownByTipoConFiltro(tipo: string, filtro: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(
      `${this.base}/dropdown/tipo/${encodeURIComponent(tipo)}/filtro/${encodeURIComponent(filtro)}`
    ).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  getDropdownSelectableByTipo(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.base}/dropdown/tipo/${encodeURIComponent(tipo)}/selectable`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  getDropdownRootByTipo(tipo: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.base}/dropdown/tipo/${encodeURIComponent(tipo)}/root`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  getDropdownHijos(idPadre: string): Observable<ListaValor[]> {
    return this.http.get<ListaValor[]>(`${this.base}/dropdown/hijos/${idPadre}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  clearCache(tipo?: string): void {
    if (tipo) {
      this.cache.delete(tipo);
      this.cache.delete(`dropdown_${tipo}`);
      
    } else {
      this.cache.clear();
      
    }
  }

  private getFromCache(key: string): ListaValor[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      
      return null;
    }

    return entry.data;
  }

  private saveToCache(key: string, data: ListaValor[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

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

  tieneHijos(id: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.base}/has-children/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

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
