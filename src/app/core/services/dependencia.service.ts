import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  ActualizarDependenciaRequest,
  CrearDependenciaRequest,
  DependenciaResponse,
  PagedDependenciaResponse,
} from '../models/dependencia.models';

@Injectable({ providedIn: 'root' })
export class DependenciaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.pazYSalvo}/dependencias`;

  /**
   * Lista dependencias con paginación y filtro opcional de activo.
   */
  listar(
    page = 0,
    size = 20,
    soloActivas?: boolean | null
  ): Observable<PagedDependenciaResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (soloActivas !== null && soloActivas !== undefined) {
      params = params.set('soloActivas', soloActivas.toString());
    }

    return this.http.get<PagedDependenciaResponse>(this.base, { params });
  }

  /**
   * Obtiene una dependencia por UUID.
   */
  obtener(uuid: string): Observable<DependenciaResponse> {
    return this.http.get<DependenciaResponse>(`${this.base}/${uuid}`);
  }

  /**
   * Crea una nueva dependencia.
   */
  crear(request: CrearDependenciaRequest): Observable<DependenciaResponse> {
    return this.http.post<DependenciaResponse>(this.base, request);
  }

  /**
   * Actualiza una dependencia existente.
   */
  actualizar(
    uuid: string,
    request: ActualizarDependenciaRequest
  ): Observable<DependenciaResponse> {
    return this.http.put<DependenciaResponse>(`${this.base}/${uuid}`, request);
  }

  /**
   * Elimina una dependencia.
   */
  eliminar(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${uuid}`);
  }

  /**
   * Agrega un usuario con acceso a la dependencia.
   */
  agregarUsuario(
    uuid: string,
    identificacion: string
  ): Observable<DependenciaResponse> {
    return this.http.post<DependenciaResponse>(
      `${this.base}/${uuid}/usuarios/${identificacion}`,
      {}
    );
  }

  /**
   * Elimina un usuario del acceso de la dependencia.
   */
  eliminarUsuario(
    uuid: string,
    identificacion: string
  ): Observable<DependenciaResponse> {
    return this.http.delete<DependenciaResponse>(
      `${this.base}/${uuid}/usuarios/${identificacion}`
    );
  }

  /**
   * Agrega un cargo con acceso a la dependencia.
   */
  agregarCargo(
    uuid: string,
    nombreCargo: string
  ): Observable<DependenciaResponse> {
    return this.http.post<DependenciaResponse>(
      `${this.base}/${uuid}/cargos/${nombreCargo}`,
      {}
    );
  }

  /**
   * Elimina un cargo del acceso de la dependencia.
   */
  eliminarCargo(
    uuid: string,
    nombreCargo: string
  ): Observable<DependenciaResponse> {
    return this.http.delete<DependenciaResponse>(
      `${this.base}/${uuid}/cargos/${nombreCargo}`
    );
  }
}
