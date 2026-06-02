import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, timer } from 'rxjs';
import { catchError, retry, shareReplay, tap, map, finalize, retryWhen, mergeMap } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbListaValoresSuministro, LbListaValoresSuministroCreateDto, LbListaValoresSuministroUpdateDto } from '../models/lb-lista-valores-suministro.model';

interface CacheEntry {
  data: LbListaValoresSuministro[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class LbListaValoresSuministroService {
  private readonly base = `${(environment as any).apilaboratoriosLocal}/lista-valores-suministro`;

  // CACHE: TTL de 10 minutos (600000 ms)
  private readonly CACHE_TTL = 600000;
  private cache = new Map<string, CacheEntry>();

  // Evitar múltiples peticiones simultáneas
  private pendingRequests = new Map<string, Observable<LbListaValoresSuministro[]>>();

  constructor(private http: HttpClient) {}

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  crear(dto: LbListaValoresSuministroCreateDto): Observable<any> {
    return this.http.post<any>(this.base, dto).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError.bind(this))
    );
  }

  actualizar(id: string, dto: LbListaValoresSuministroUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, dto).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError.bind(this))
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => this.clearCache()),
      catchError(this.handleError.bind(this))
    );
  }

  // ─── CONSULTAS ──────────────────────────────────────────────────────────────

  obtenerTodos(): Observable<LbListaValoresSuministro[]> {
    return this.http.get<LbListaValoresSuministro[]>(this.base).pipe(
      map(res => this.toArray(res)),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerPorId(id: string): Observable<LbListaValoresSuministro> {
    return this.http.get<LbListaValoresSuministro>(`${this.base}/${id}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerPorNombre(nombre: string): Observable<LbListaValoresSuministro> {
    return this.http.get<LbListaValoresSuministro>(`${this.base}/nombre/${encodeURIComponent(nombre)}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerPorAbreviatura(abreviatura: string): Observable<LbListaValoresSuministro> {
    return this.http.get<LbListaValoresSuministro>(`${this.base}/abreviatura/${encodeURIComponent(abreviatura)}`).pipe(
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerPorTipo(tipo: string): Observable<LbListaValoresSuministro[]> {
    return this.http.get<LbListaValoresSuministro[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`).pipe(
      map(res => this.toArray(res)),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  // ─── PADRES ─────────────────────────────────────────────────────────────────

  obtenerPadres(): Observable<LbListaValoresSuministro[]> {
    const cacheKey = 'padres';

    const cached = this.getFromCache(cacheKey);
    if (cached) return of(cached);

    const pending = this.pendingRequests.get(cacheKey);
    if (pending) return pending;

    const request$ = this.http.get<LbListaValoresSuministro[]>(`${this.base}/padres`).pipe(
      map(res => this.toArray(res)),
      retryWhen(errors => errors.pipe(
        mergeMap((error, index) => {
          if (index >= 3) return throwError(() => error);
          return timer(Math.pow(2, index) * 500);
        })
      )),
      tap(data => {
        if (data.length > 0) this.saveToCache(cacheKey, data);
      }),
      finalize(() => this.pendingRequests.delete(cacheKey)),
      shareReplay(1),
      catchError(this.handleError.bind(this))
    );

    this.pendingRequests.set(cacheKey, request$);
    return request$;
  }

  // ─── HIJOS ──────────────────────────────────────────────────────────────────

  obtenerHijos(): Observable<LbListaValoresSuministro[]> {
    return this.http.get<LbListaValoresSuministro[]>(`${this.base}/hijos`).pipe(
      map(res => this.toArray(res)),
      retry(1),
      catchError(this.handleError.bind(this))
    );
  }

  obtenerHijosPorPadreId(idPadre: string): Observable<LbListaValoresSuministro[]> {
    const cacheKey = `hijos_id_${idPadre}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return of(cached);

    const pending = this.pendingRequests.get(cacheKey);
    if (pending) return pending;

    const request$ = this.http.get<LbListaValoresSuministro[]>(`${this.base}/hijos/padre/${idPadre}`).pipe(
      map(res => this.toArray(res)),
      retryWhen(errors => errors.pipe(
        mergeMap((error, index) => {
          if (index >= 3) return throwError(() => error);
          return timer(Math.pow(2, index) * 500);
        })
      )),
      tap(data => {
        if (data.length > 0) this.saveToCache(cacheKey, data);
      }),
      finalize(() => this.pendingRequests.delete(cacheKey)),
      shareReplay(1),
      catchError(this.handleError.bind(this))
    );

    this.pendingRequests.set(cacheKey, request$);
    return request$;
  }

  obtenerHijosPorNombrePadre(nombrePadre: string): Observable<LbListaValoresSuministro[]> {
    const cacheKey = `hijos_nombre_${nombrePadre}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) return of(cached);

    const pending = this.pendingRequests.get(cacheKey);
    if (pending) return pending;

    const request$ = this.http.get<LbListaValoresSuministro[]>(
      `${this.base}/hijos/padre/nombre/${encodeURIComponent(nombrePadre)}`
    ).pipe(
      map(res => this.toArray(res)),
      retryWhen(errors => errors.pipe(
        mergeMap((error, index) => {
          if (index >= 3) return throwError(() => error);
          return timer(Math.pow(2, index) * 500);
        })
      )),
      tap(data => {
        if (data.length > 0) this.saveToCache(cacheKey, data);
      }),
      finalize(() => this.pendingRequests.delete(cacheKey)),
      shareReplay(1),
      catchError(this.handleError.bind(this))
    );

    this.pendingRequests.set(cacheKey, request$);
    return request$;
  }

  // ─── UTILIDADES ─────────────────────────────────────────────────────────────

  clearCache(): void {
    this.cache.clear();
  }

  private toArray(response: any): LbListaValoresSuministro[] {
    if (Array.isArray(response)) return response;
    return [];
  }

  private getFromCache(key: string): LbListaValoresSuministro[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private saveToCache(key: string, data: LbListaValoresSuministro[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
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
