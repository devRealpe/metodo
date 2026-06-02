import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Investigaciones, CrearInvestigaciones, UpdateInvestigaciones } from '../models/investigaciones.model';

@Injectable({
  providedIn: 'root'
})
export class InvestigacioneService {
  private readonly base = `${environment.apiPlanesDeTraba}/investigacion-extension`;
  
  constructor(private http: HttpClient) {}

  getByPt(idPt: string, idSeccion: string): Observable<Investigaciones> {
    return this.http.get<Investigaciones>(`${this.base}/pt/${encodeURIComponent(idPt)}/${encodeURIComponent(idSeccion)}`);
  }

  getById(id: string): Observable<Investigaciones> {
    return this.http.get<Investigaciones>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(investigacionExtension: CrearInvestigaciones): Observable<any> {
    return this.http.post(`${this.base}`, investigacionExtension);
  }

  update(id: string, actividad: UpdateInvestigaciones): Observable<any> {
    return this.http.put<Investigaciones>(`${this.base}/${encodeURIComponent(id)}`, actividad)
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${encodeURIComponent(id)}`);
  }
}