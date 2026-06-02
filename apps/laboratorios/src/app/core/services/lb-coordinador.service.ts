import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { LbCoordinador, LbCoordinadorCreate } from '../models/lb-coordinador.model';

@Injectable({ providedIn: 'root' })
export class LbCoordinadorService {

  private readonly base = `${environment.apilaboratoriosLocal}/coordinadores`;
  private http = inject(HttpClient);

  getAll(): Observable<LbCoordinador[]> {
    return this.http.get<LbCoordinador[]>(this.base);
  }

  getById(id: string): Observable<LbCoordinador> {
    return this.http.get<LbCoordinador>(`${this.base}/${id}`);
  }

  getByKeycloakUserId(keycloakUserId: string): Observable<LbCoordinador[]> {
    return this.http.get<LbCoordinador[]>(`${this.base}/keycloak/${encodeURIComponent(keycloakUserId)}`);
  }

  getByCodAula(codAula: string): Observable<LbCoordinador[]> {
    return this.http.get<LbCoordinador[]>(`${this.base}/aula/${encodeURIComponent(codAula)}`);
  }

  getByIdentificacion(identificacion: string): Observable<LbCoordinador[]> {
    return this.http.get<LbCoordinador[]>(`${this.base}/identificacion/${encodeURIComponent(identificacion)}`);
  }

  create(payload: LbCoordinadorCreate): Observable<LbCoordinador> {
    return this.http.post<LbCoordinador>(this.base, payload);
  }

  update(id: string, payload: Partial<LbCoordinadorCreate>): Observable<LbCoordinador> {
    return this.http.put<LbCoordinador>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
