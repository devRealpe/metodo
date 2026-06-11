import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { TipoSolicitudItem } from '../models/solicitud.models';

@Injectable({ providedIn: 'root' })
export class TipoSolicitudService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.pazYSalvo}/solicitudes/tipos`;

  listar(): Observable<TipoSolicitudItem[]> {
    return this.http.get<TipoSolicitudItem[]>(this.base);
  }
}
