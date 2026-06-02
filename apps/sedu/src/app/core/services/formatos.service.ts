import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Formato, FormatoVersion, CreateFormatRequest, UpdateFormatRequest, CreateFormatoVersionRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class FormatosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/formatos`;

  list(): Observable<Formato[]> {
    return this.http.get<Formato[]>(this.baseUrl);
  }

  listActivos(): Observable<Formato[]> {
    return this.http.get<Formato[]>(`${this.baseUrl}/activos`);
  }

  getById(id: string): Observable<Formato> {
    return this.http.get<Formato>(`${this.baseUrl}/${id}`);
  }

  create(req: CreateFormatRequest): Observable<Formato> {
    return this.http.post<Formato>(this.baseUrl, req);
  }

  update(id: string, req: UpdateFormatRequest): Observable<Formato> {
    return this.http.put<Formato>(`${this.baseUrl}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ── Versiones ──

  listVersiones(formatoId: string): Observable<FormatoVersion[]> {
    return this.http.get<FormatoVersion[]>(`${this.baseUrl}/${formatoId}/versiones`);
  }

  getVersion(versionId: string): Observable<FormatoVersion> {
    return this.http.get<FormatoVersion>(`${this.baseUrl}/versiones/${versionId}`);
  }

  crearVersion(req: CreateFormatoVersionRequest): Observable<FormatoVersion> {
    return this.http.post<FormatoVersion>(`${this.baseUrl}/versiones`, req);
  }

  activarVersion(versionId: string): Observable<FormatoVersion> {
    return this.http.post<FormatoVersion>(`${this.baseUrl}/versiones/${versionId}/activar`, {});
  }
}
