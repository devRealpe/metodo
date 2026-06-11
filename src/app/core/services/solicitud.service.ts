import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  AprobarRevisionRequest,
  CrearSolicitudManualRequest,
  PagedSolicitudResponse,
  RevisionDependenciaResponse,
  SolicitudResponse,
  ResultadoMasivaResponse,
  SolicitudFilter,
} from '../models/solicitud.models';

@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.pazYSalvo}/solicitudes`;

  registrarIndividual(
    request: CrearSolicitudManualRequest
  ): Observable<SolicitudResponse> {
    return this.http.post<SolicitudResponse>(
      `${this.base}/registro-individual`,
      request
    );
  }

  registrarMasivo(
    archivo: File,
    uuidTipoSolicitud: string,
    anio: number,
    periodo: number,
    idPrograma?: string,
    idFacultad?: string
  ): Observable<ResultadoMasivaResponse> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);

    let params = new HttpParams()
      .set('uuidTipoSolicitud', uuidTipoSolicitud)
      .set('anio', anio.toString())
      .set('periodo', periodo.toString());

    if (idPrograma) {
      params = params.set('idPrograma', idPrograma);
    }
    if (idFacultad) {
      params = params.set('idFacultad', idFacultad);
    }

    return this.http.post<ResultadoMasivaResponse>(
      `${this.base}/registro-masivo`,
      formData,
      { params }
    );
  }

  listarPorPrograma(
    idPrograma: string,
    filtros?: SolicitudFilter,
    page = 0,
    size = 10
  ): Observable<PagedSolicitudResponse> {
    let params = new HttpParams()
      .set('idPrograma', idPrograma)
      .set('page', page.toString())
      .set('size', size.toString());

    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.anio) {
      params = params.set('anio', filtros.anio.toString());
    }
    if (filtros?.periodo) {
      params = params.set('periodo', filtros.periodo.toString());
    }

    return this.http.get<PagedSolicitudResponse>(
      `${this.base}/por-programa`,
      { params }
    );
  }

  /**
   * Lista solicitudes asignadas a la dependencia del usuario autenticado.
   */
  listarPorRevisor(
    identificacion: string,
    filtros?: SolicitudFilter,
    page = 0,
    size = 10
  ): Observable<PagedSolicitudResponse> {
    let params = new HttpParams()
      .set('identificacion', identificacion)
      .set('page', page.toString())
      .set('size', size.toString());

    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.anio) {
      params = params.set('anio', filtros.anio.toString());
    }
    if (filtros?.periodo) {
      params = params.set('periodo', filtros.periodo.toString());
    }

    return this.http.get<PagedSolicitudResponse>(
      `${this.base}/por-revisor`,
      { params }
    );
  }

  /**
   * Aprueba la revisión de una dependencia (otorga el sello).
   */
  aprobarRevision(
    uuidRevision: string,
    request?: AprobarRevisionRequest
  ): Observable<RevisionDependenciaResponse> {
    return this.http.patch<RevisionDependenciaResponse>(
      `${this.base}/revisiones/${uuidRevision}/aprobar`,
      request ?? {}
    );
  }

  eliminar(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${uuid}`);
  }
}
