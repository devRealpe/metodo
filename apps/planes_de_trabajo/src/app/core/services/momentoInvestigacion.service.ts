import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { MomentoInvestigacion } from '../models/investigaciones.model';

@Injectable({
  providedIn: 'root'
})
export class MomentoInvService {
  private readonly base = `${environment.apiPlanesDeTraba}/momento-investigacion`;
  
  constructor(private http: HttpClient) {}

  getAll(): Observable<MomentoInvestigacion> {
    return this.http.get<MomentoInvestigacion>(`${this.base}`);
  }

}