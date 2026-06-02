import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { CrearAsesoria } from '../models/actividadesPlanDeTrabajo.model';

@Injectable({
  providedIn: 'root'
})
export class AsesoriaService {
  private readonly base = `${environment.apiPlanesDeTraba}/asesorias`;
  
  constructor(private http: HttpClient) {}

  create(asesoria: CrearAsesoria): Observable<any> {
    return this.http.post(`${this.base}`, asesoria);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${encodeURIComponent(id)}`);
  }
}