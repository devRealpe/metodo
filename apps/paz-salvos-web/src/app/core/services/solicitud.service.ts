import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  CrearSolicitudManualRequest,
  SolicitudResponse,
  ResultadoMasivaResponse,
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
    idTipoSolicitud: number,
    anio: number,
    periodo: number,
    idPrograma?: string,
    idFacultad?: string
  ): Observable<ResultadoMasivaResponse> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);

    let params = new HttpParams()
      .set('idTipoSolicitud', idTipoSolicitud.toString())
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
}
