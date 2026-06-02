import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { GrupoDeInvestigacion } from '../models/investigaciones.model';

@Injectable({
  providedIn: 'root'
})
export class GrupoInvService {
  private readonly base = `${environment.apiPlanesDeTraba}/grupos-investigacion`;
  
  constructor(private http: HttpClient) {}

  getByFacultad(facultad: string): Observable<GrupoDeInvestigacion> {
    return this.http.get<GrupoDeInvestigacion>(`${this.base}/facultad/${encodeURIComponent(facultad)}`);
  }

  getById(id: string): Observable<GrupoDeInvestigacion> {
    return this.http.get<GrupoDeInvestigacion>(`${this.base}/${encodeURIComponent(id)}`);
  }

  getAll(): Observable<GrupoDeInvestigacion> {
    return this.http.get<GrupoDeInvestigacion>(`${this.base}`);
  }

}