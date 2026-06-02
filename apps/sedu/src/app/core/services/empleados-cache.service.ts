import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { EmpleadoCache } from '../models';

@Injectable({ providedIn: 'root' })
export class EmpleadosCacheService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/empleados`;

  listActivos(): Observable<EmpleadoCache[]> {
    return this.http.get<EmpleadoCache[]>(this.baseUrl);
  }

  getById(id: string): Observable<EmpleadoCache> {
    return this.http.get<EmpleadoCache>(`${this.baseUrl}/${id}`);
  }

  getByDocumento(numeroDocumento: string): Observable<EmpleadoCache> {
    return this.http.get<EmpleadoCache>(
      `${this.baseUrl}/por-documento/${numeroDocumento}`
    );
  }

  listByDependencia(codigoDependencia: string): Observable<EmpleadoCache[]> {
    return this.http.get<EmpleadoCache[]>(
      `${this.baseUrl}/por-dependencia/${codigoDependencia}`
    );
  }
}
