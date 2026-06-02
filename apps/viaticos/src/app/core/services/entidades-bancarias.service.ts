import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '@shared/shared-environments';


export interface EntidadBancaria {
  id: string;
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
  nombrePadre?: string;
  codigoSuper?: string;
  nit?: string;
  codigoPse?: string;
  sitioWeb?: string;
  telefonoContacto?: string;
  correoContacto?: string;
}

@Injectable({ providedIn: 'root' })
export class EntidadesBancariasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.generalApi}/entidades-bancarias`;

  // Obtiene todas las entidades bancarias
  getAll(): Observable<EntidadBancaria[]> {
    return this.http.get<EntidadBancaria[]>(this.base);
  }

  /** Obtiene una entidad bancaria por ID */
  getById(id: string): Observable<EntidadBancaria | null> {
    return this.http.get<EntidadBancaria>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      map(res => res ?? null),
      catchError(err => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  /** Crea una nueva entidad bancaria */
  create(entidad: EntidadBancaria): Observable<EntidadBancaria> {
    return this.http.post<EntidadBancaria>(this.base, entidad);
  }

  /** Actualiza una entidad bancaria existente */
  update(id: string, entidad: EntidadBancaria): Observable<EntidadBancaria> {
    return this.http.put<EntidadBancaria>(`${this.base}/${encodeURIComponent(id)}`, entidad);
  }

  /** Elimina una entidad bancaria */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  searchByTexto(texto: string): Observable<EntidadBancaria[]> {
    return this.http.get<EntidadBancaria[]>(`${this.base}/filtro/${encodeURIComponent(texto)}`);
  }

  /** Obtiene entidades por tipo (por defecto "BAN") */
  getByTipo(tipo = 'BAN'): Observable<EntidadBancaria[]> {
    return this.http.get<EntidadBancaria[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`);
  }

  /** Obtiene las entidades raíz de un tipo (sin padre) */
  getRootByTipo(tipo = 'BAN'): Observable<EntidadBancaria[]> {
    return this.http.get<EntidadBancaria[]>(`${this.base}/root/${encodeURIComponent(tipo)}`);
  }

  /** Obtiene los hijos de una entidad padre */
  getHijos(idPadre: string): Observable<EntidadBancaria[]> {
    return this.http.get<EntidadBancaria[]>(`${this.base}/hijos/${encodeURIComponent(idPadre)}`);
  }

  // Obtiene entidad por NIT
  getByNit(nit: string): Observable<EntidadBancaria | null> {
    return this.http.get<EntidadBancaria>(`${this.base}/nit/${encodeURIComponent(nit)}`).pipe(
      map(res => res ?? null),
      catchError(err => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  // Obtiene entidad por abreviatura
  getByAbreviatura(abrev: string): Observable<EntidadBancaria | null> {
    return this.http.get<EntidadBancaria>(`${this.base}/abreviatura/${encodeURIComponent(abrev)}`).pipe(
      map(res => res ?? null),
      catchError(err => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  // Obtiene tipos de entidades
  getTipos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/tipos`);
  }

  // Actualiza orden de descendientes
  actualizarOrdenDescendientes(idPadre: string, tipoOrden: string): Observable<void> {
    return this.http.put<void>(`${this.base}/orden/${encodeURIComponent(idPadre)}`, null, {
      params: { tipoOrden }
    });
  }
}
