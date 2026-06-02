import { Injectable } from '@angular/core';
import { environment } from '@shared/shared-environments';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResumenPtVista {
  id: string;
  programa: string;
  seccionPadre: string;
  seccion: string;
  horasTotales: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResumenPtService {
  private apiUrl = '/planes-de-trabajo/api/exportacion';
  private readonly base = `${environment.apiPlanesDeTraba}/exportacion`;

  constructor(private http: HttpClient) { }

  getResumenPorId(id: string): Observable<ResumenPtVista[]> {
    return this.http.get<ResumenPtVista[]>(`${this.apiUrl}/resumen/${id}`);
  }


  getResumenPorIds(ids: string[]): Observable<ResumenPtVista[]> {
    return this.http.post<ResumenPtVista[]>(`${this.base}/resumen-por-ids`, ids);
  }
}