import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { CreateAuditoria, Auditoria } from '../models/auditoria.model';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private readonly base = `${environment.apiPlanesDeTraba}/auditoria`;
  
  constructor(private http: HttpClient) {}

  getAuditoriaByPt(idPt: string): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(`${this.base}/pt/${encodeURIComponent(idPt)}`);
  }

  create(asesoria: CreateAuditoria): Observable<any> {
    return this.http.post(`${this.base}`, asesoria);
  }

}