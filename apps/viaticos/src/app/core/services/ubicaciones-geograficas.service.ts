import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface UbicacionGeografica {
  id: string;
  nombre: string;
  idripolv: string;
  idPadre?: string;
  nombreTipo?: string;
  nombrePadre?: string;
  tipoOrden?: string;
}

@Injectable({ providedIn: 'root' })
export class UbicacionesGeograficasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.generalApi}/ubicaciones-geograficas`;

  // Obtiene todas las ubicaciones geográficas
  getAll(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(this.base);
  }

  // Obtiene ubicación por ID
  getById(id: string): Observable<UbicacionGeografica | null> {
    return this.http.get<UbicacionGeografica>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      map(res => res ?? null),
      catchError(() => {
        // Capturar TODOS los errores (400, 404, 500, etc.) y retornar null silenciosamente
        // Esto previene que errores de backend (como typos en URLs) se muestren en consola
        return of(null);
      })
    );
  }

  // Crea nueva ubicación geográfica
  create(ubicacion: UbicacionGeografica): Observable<UbicacionGeografica> {
    return this.http.post<UbicacionGeografica>(this.base, ubicacion);
  }

  // Actualiza ubicación geográfica existente
  update(id: string, ubicacion: UbicacionGeografica): Observable<UbicacionGeografica> {
    return this.http.put<UbicacionGeografica>(`${this.base}/${encodeURIComponent(id)}`, ubicacion);
  }

  // Elimina ubicación geográfica
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  // Obtiene lista de países
  getPaises(): Observable<UbicacionGeografica[]> {
    return this.http.get<any>(`${this.base}/paises`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        if (response && Array.isArray(response.paises)) return response.paises;
        return [];
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }

  // Obtiene departamentos de Colombia
  getDepartamentosColombia(): Observable<UbicacionGeografica[]> {
    return this.http.get<any>(`${this.base}/departamentos-colombia`).pipe(
      map((response: any) => {
        // Validación defensiva de la respuesta
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        
        // Si la respuesta es un array, devolverlo directamente
        if (Array.isArray(response)) {
          return response;
        }
        
        // Si la respuesta tiene una propiedad 'data' que es un array
        if (response && Array.isArray(response.data)) {
          return response.data;
        }
        
        // Si la respuesta tiene una propiedad 'departamentos' que es un array
        if (response && Array.isArray(response.departamentos)) {
          return response.departamentos;
        }
        
        return [];
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }

  // Obtiene departamentos por país
  getDepartamentosPorPais(idPais: string): Observable<UbicacionGeografica[]> {
    return this.http.get<any>(`${this.base}/departamentos/${encodeURIComponent(idPais)}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        if (response && Array.isArray(response.departamentos)) return response.departamentos;
        return [];
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }

  // Obtiene municipios de Colombia
  getMunicipiosColombia(): Observable<UbicacionGeografica[]> {
    return this.http.get<any>(`${this.base}/municipios-colombia`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        if (response && Array.isArray(response.municipios)) return response.municipios;
        return [];
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }

  // Obtiene municipios por departamento
  getMunicipiosByDepartamento(idDepartamento: string): Observable<UbicacionGeografica[]> {
    return this.http.get<any>(
      `${this.base}/municipios/${encodeURIComponent(idDepartamento)}`
    ).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        if (response && Array.isArray(response.municipios)) return response.municipios;
        return [];
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }

  // Obtiene ubicaciones por tipo de orden
  getByTipoOrden(tipoOrden: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.base}/tipo-orden/${encodeURIComponent(tipoOrden)}`);
  }

  // Obtiene ubicaciones hijas de un padre
  getHijos(idPadre: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.base}/hijos/${encodeURIComponent(idPadre)}`);
  }

  // Obtiene ubicaciones raíz por tipo
  getRootByTipo(tipo: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.base}/root/${encodeURIComponent(tipo)}`);
  }

  // Busca ubicaciones por texto
  searchByTexto(texto: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.base}/filtro/${encodeURIComponent(texto)}`);
  }

  // Obtiene ubicación por código IDRIPOLV
  getByIdripolv(idripolv: string): Observable<UbicacionGeografica | null> {
    return this.http.get<UbicacionGeografica>(`${this.base}/idripolv/${encodeURIComponent(idripolv)}`).pipe(
      map(res => res ?? null),
      catchError(err => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  // Actualiza orden de ubicaciones descendientes
  actualizarOrdenDescendientes(idPadre: string, tipoOrden: string): Observable<void> {
    return this.http.put<void>(`${this.base}/orden/${encodeURIComponent(idPadre)}`, null, {
      params: { tipoOrden }
    });
  }

  /**
   * Obtiene ciudades de un país específico
   */
  getCiudadesByPais(idPais: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(
      `${this.base}/ciudades/${encodeURIComponent(idPais)}`
    ).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }
}