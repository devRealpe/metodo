import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { UsuarioOracleResponse } from '../models/solicitud.models';

@Injectable({ providedIn: 'root' })
export class UsuarioOracleService {
  private readonly http = inject(HttpClient);

  /**
   * Busca un usuario en Oracle por su número de identificación.
   * Retorna null si el usuario no existe (404) o si el servicio falla.
   */
  getByIdentificacion(identificacion: string): Observable<UsuarioOracleResponse | null> {
    return this.http
      .get<UsuarioOracleResponse>(
        `${environment.apiOracle}/usuarios/${encodeURIComponent(identificacion)}`
      )
      .pipe(catchError(() => of(null)));
  }
}
