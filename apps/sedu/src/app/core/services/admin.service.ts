import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { AuditLog } from '../models';
import { Evaluacion } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/admin`;

  // ── Auditoría ──

  listarAuditoria(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.baseUrl}/auditoria`);
  }

  listarAuditoriaPorUsuario(usuarioId: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.baseUrl}/auditoria/usuario/${usuarioId}`);
  }

  listarAuditoriaPorEntidad(entidad: string, entidadId: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.baseUrl}/auditoria/${entidad}/${entidadId}`);
  }

  // ── Evaluaciones (Super Admin) ──

  forzarEstado(evaluacionId: string, estado: string): Observable<Evaluacion> {
    const params = new HttpParams().set('estado', estado);
    return this.http.post<Evaluacion>(`${this.baseUrl}/evaluaciones/${evaluacionId}/forzar-estado`, null, { params });
  }

  anularEvaluacion(evaluacionId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/evaluaciones/${evaluacionId}/anular`, null);
  }
}
