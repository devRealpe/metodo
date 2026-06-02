import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { ProgressReport, ResultsReport } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/reportes`;

  getAvance(periodoId: string): Observable<ProgressReport> {
    const params = new HttpParams().set('periodoId', periodoId);
    return this.http.get<ProgressReport>(`${this.baseUrl}/avance`, { params });
  }

  getResultados(periodoId: string, dependencia?: string): Observable<ResultsReport> {
    let params = new HttpParams().set('periodoId', periodoId);
    if (dependencia) params = params.set('dependencia', dependencia);
    return this.http.get<ResultsReport>(`${this.baseUrl}/resultados`, { params });
  }
}
