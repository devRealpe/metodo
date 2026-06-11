import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  ActualizarTipoSolicitudRequest,
  AgregarDependenciaTipoRequest,
  CrearTipoSolicitudRequest,
  PagedTipoSolicitudResponse,
  ReordenarDependenciaItem,
  TipoDependenciaItem,
  TipoSolicitudAdmin,
} from '../models/tipo-solicitud-admin.models';

@Injectable({ providedIn: 'root' })
export class TipoSolicitudAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.pazYSalvo}/tipos-solicitud`;

  listar(
    page = 0,
    size = 20,
    soloActivas?: boolean | null
  ): Observable<PagedTipoSolicitudResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (soloActivas !== null && soloActivas !== undefined) {
      params = params.set('soloActivas', soloActivas.toString());
    }

    return this.http.get<PagedTipoSolicitudResponse>(this.base, { params });
  }

  obtener(uuid: string): Observable<TipoSolicitudAdmin> {
    return this.http.get<TipoSolicitudAdmin>(`${this.base}/${uuid}`);
  }

  crear(request: CrearTipoSolicitudRequest): Observable<TipoSolicitudAdmin> {
    return this.http.post<TipoSolicitudAdmin>(this.base, request);
  }

  actualizar(
    uuid: string,
    request: ActualizarTipoSolicitudRequest
  ): Observable<TipoSolicitudAdmin> {
    return this.http.put<TipoSolicitudAdmin>(`${this.base}/${uuid}`, request);
  }

  eliminar(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${uuid}`);
  }

  agregarDependencia(
    uuidTipo: string,
    request: AgregarDependenciaTipoRequest
  ): Observable<TipoDependenciaItem> {
    return this.http.post<TipoDependenciaItem>(
      `${this.base}/${uuidTipo}/dependencias`,
      request
    );
  }

  eliminarDependencia(uuidTipo: string, uuidTipoDependencia: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${uuidTipo}/dependencias/${uuidTipoDependencia}`
    );
  }

  reordenarDependencias(
    uuidTipo: string,
    items: ReordenarDependenciaItem[]
  ): Observable<TipoDependenciaItem[]> {
    return this.http.patch<TipoDependenciaItem[]>(
      `${this.base}/${uuidTipo}/dependencias/reordenar`,
      items
    );
  }
}
