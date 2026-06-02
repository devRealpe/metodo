import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UbicacionGeografica, UbicacionGeograficaCreateDto, UbicacionGeograficaUpdateDto } from '../models/ubicacion-geografica.model';
import { environment } from '@shared/shared-environments';
@Injectable({
  providedIn: 'root'
})
export class UbicacionesGeograficasService {
  
  private readonly baseUrl = `${environment.apiHojasDeVida}/general/ubicaciones-geograficas`;

  constructor(private http: HttpClient) {}

  obtenerTodas(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(this.baseUrl);
  }

  obtenerPorId(id: string): Observable<UbicacionGeografica> {
    return this.http.get<UbicacionGeografica>(`${this.baseUrl}/${id}`);
  }

  obtenerPorTipo(idTipoLv: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/tipo/${idTipoLv}`);
  }

  obtenerPorPadre(idPadre: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/padre/${idPadre}`);
  }

  buscarPorNombre(nombre: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/search`, {
      params: { nombre }
    });
  }

  crear(ubicacion: UbicacionGeograficaCreateDto): Observable<UbicacionGeografica> {
    return this.http.post<UbicacionGeografica>(this.baseUrl, ubicacion);
  }

  actualizar(ubicacion: UbicacionGeograficaUpdateDto): Observable<UbicacionGeografica> {
    return this.http.put<UbicacionGeografica>(this.baseUrl, ubicacion);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  obtenerPaises(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/paises`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      })
    );
  }

  obtenerDepartamentosPorPais(paisId: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/departamentos/${paisId}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      })
    );
  }

  obtenerDepartamentosColombia(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/departamentos-colombia`);
  }

  obtenerMunicipiosPorDepartamento(departamentoId: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/municipios/${departamentoId}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      })
    );
  }

  obtenerCiudadesPrincipales(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/ciudades-principales`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      })
    );
  }

  obtenerParaDropdown(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/dropdown`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      })
    );
  }

  obtenerPorPadreParaDropdown(idPadre: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/dropdown/padre/${idPadre}`).pipe(
      map((response: any) => {
        if (response && typeof response === 'object' && response.error === true) {
          return [];
        }
        if (!Array.isArray(response)) {
          return [];
        }
        return response;
      })
    );
  }

  actualizarOrden(ordenes: { id: string; orden: number }[]): Observable<{ actualizados: number }> {
    return this.http.put<{ actualizados: number }>(`${this.baseUrl}/orden`, ordenes);
  }

  cambiarOrden(id: string, nuevoOrden: number): Observable<{ actualizados: number }> {
    return this.http.put<{ actualizados: number }>(`${this.baseUrl}/${id}/orden/${nuevoOrden}`, {});
  }

  actualizarTipoOrdenMasivo(idTipoLv: string, tipoOrden: string): Observable<{ actualizados: number }> {
    return this.http.put<{ actualizados: number }>(
      `${this.baseUrl}/tipo/${idTipoLv}/tipo-orden/${tipoOrden}`, 
      {}
    );
  }
}
