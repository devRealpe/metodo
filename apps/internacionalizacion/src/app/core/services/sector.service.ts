import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Sector } from '../models/sector.model';

@Injectable({
  providedIn: 'root'
})
export class SectorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.internacionalizacionApi}/sectores`;

  getAllActive(): Observable<Sector[]> {
    return this.http.get<Sector[]>(this.apiUrl);
  }

  getById(id: string): Observable<Sector> {
    return this.http.get<Sector>(`${this.apiUrl}/${id}`);
  }

  create(sector: Sector): Observable<Sector> {
    return this.http.post<Sector>(this.apiUrl, sector);
  }

  update(id: string, sector: Sector): Observable<Sector> {
    return this.http.put<Sector>(`${this.apiUrl}/${id}`, sector);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getByPadre(idPadre: string): Observable<Sector[]> {
    return this.http.get<Sector[]>(`${this.apiUrl}/padre/${idPadre}`);
  }

  getRaiz(): Observable<Sector[]> {
    return this.http.get<Sector[]>(`${this.apiUrl}/raiz`);
  }
}