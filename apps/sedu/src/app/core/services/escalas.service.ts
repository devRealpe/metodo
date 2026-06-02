import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Escala, CreateScaleRequest, UpdateScaleRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class EscalasService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/escalas`;

  list(): Observable<Escala[]> {
    return this.http.get<Escala[]>(this.baseUrl);
  }

  getById(id: string): Observable<Escala> {
    return this.http.get<Escala>(`${this.baseUrl}/${id}`);
  }

  create(req: CreateScaleRequest): Observable<Escala> {
    return this.http.post<Escala>(this.baseUrl, req);
  }

  update(id: string, req: UpdateScaleRequest): Observable<Escala> {
    return this.http.put<Escala>(`${this.baseUrl}/${id}`, req);
  }
}
