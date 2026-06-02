import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { UbicacionGeografica, UbicacionGeograficaCreateDto, UbicacionGeograficaUpdateDto } from '../models/ubicacion-geografica.model';
import { environment } from '@shared/shared-environments';

// Definir tipos locales para evitar dependencias externas
export interface DropdownItem {
  id: string;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class UbicacionesGeograficasService {
  private readonly baseUrl = `${environment.generalApi}/ubicaciones-geograficas`;

  constructor(private http: HttpClient) {}

  /**
   * Convierte ubicaciones geográficas a formato DropdownItem
   */
  private convertUbicacionesToDropdownItem(ubicaciones: UbicacionGeografica[]): DropdownItem[] {
    return ubicaciones.map(ubicacion => ({
      id: ubicacion.id,
      nombre: ubicacion.nombre
    }));
  }

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
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/paises`);
  }

  obtenerDepartamentosPorPais(paisId: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/departamentos/${paisId}`);
  }

  obtenerDepartamentosColombia(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/departamentos-colombia`);
  }

  obtenerMunicipiosPorDepartamento(departamentoId: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/municipios/${departamentoId}`);
  }

  obtenerCiudadesPrincipales(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/ciudades-principales`);
  }

  obtenerParaDropdown(): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/dropdown`);
  }

  obtenerPorPadreParaDropdown(idPadre: string): Observable<UbicacionGeografica[]> {
    return this.http.get<UbicacionGeografica[]>(`${this.baseUrl}/dropdown/padre/${idPadre}`);
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

  /**
   * Configura cascada geográfica: País → Departamento → Municipio
   * Retorna observables para configurar reactividad en formularios
   */
  setupGeographicCascade(): {
    loadCountries: () => Observable<DropdownItem[]>;
    loadDepartments: (countryId: string) => Observable<DropdownItem[]>;
    loadCities: (departmentId: string) => Observable<DropdownItem[]>;
  } {
    return {
      loadCountries: () => this.obtenerPaises().pipe(
        map(paises => this.convertUbicacionesToDropdownItem(paises))
      ),
      loadDepartments: (countryId: string) => this.obtenerDepartamentosPorPais(countryId).pipe(
        map(departamentos => this.convertUbicacionesToDropdownItem(departamentos))
      ),
      loadCities: (departmentId: string) => this.obtenerMunicipiosPorDepartamento(departmentId).pipe(
        map(municipios => this.convertUbicacionesToDropdownItem(municipios))
      )
    };
  }

  /**
   * Carga cascada completa para un país específico
   * Útil para edición de formularios
   */
  loadGeographicCascadeForCountry(countryId: string): Observable<{
    departments: DropdownItem[];
    cities: DropdownItem[];
  }> {
    return forkJoin({
      departments: this.obtenerDepartamentosPorPais(countryId).pipe(
        map(depts => this.convertUbicacionesToDropdownItem(depts))
      ),
      cities: this.obtenerDepartamentosPorPais(countryId).pipe(
        map(() => []) // Ciudades se cargan cuando se selecciona departamento
      )
    });
  }

  /**
   * Carga cascada completa para edición (país + departamento + municipios)
   */
  loadFullGeographicCascade(countryId: string, departmentId: string): Observable<{
    departments: DropdownItem[];
    cities: DropdownItem[];
  }> {
    return forkJoin({
      departments: this.obtenerDepartamentosPorPais(countryId).pipe(
        map(depts => this.convertUbicacionesToDropdownItem(depts))
      ),
      cities: this.obtenerMunicipiosPorDepartamento(departmentId).pipe(
        map(cities => this.convertUbicacionesToDropdownItem(cities))
      )
    });
  }
}
