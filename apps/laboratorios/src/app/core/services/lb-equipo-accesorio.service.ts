import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbEquipoAccesorio, LbEquipoAccesorioPayload } from '../models/lb-equipo-accesorio.model';

@Injectable({ providedIn: 'root' })
export class LbEquipoAccesorioService {

  private readonly base = `${environment.apilaboratoriosLocal}/equipos/accesorios`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbEquipoAccesorio[]> {
    return this.http.get<LbEquipoAccesorio[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbEquipoAccesorio> {
    return this.http.get<LbEquipoAccesorio>(`${this.base}/${id}`).pipe(retry(1));
  }

  create(payload: LbEquipoAccesorioPayload): Observable<LbEquipoAccesorio> {
    return this.http.post<LbEquipoAccesorio>(this.base, payload);
  }

  update(id: string, payload: LbEquipoAccesorioPayload): Observable<LbEquipoAccesorio> {
    return this.http.put<LbEquipoAccesorio>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }

  getByNombre(nombre: string): Observable<LbEquipoAccesorio> {
    return this.http.get<LbEquipoAccesorio>(`${this.base}/nombre/${encodeURIComponent(nombre)}`).pipe(retry(1));
  }
}
