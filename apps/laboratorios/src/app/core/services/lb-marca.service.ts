import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbMarca, LbMarcaPayload } from '../models/lb-marca.model';

@Injectable({ providedIn: 'root' })
export class LbMarcaService {

  private readonly base = `${environment.apilaboratoriosLocal}/marcas`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbMarca[]> {
    return this.http.get<LbMarca[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbMarca> {
    return this.http.get<LbMarca>(`${this.base}/${id}`).pipe(retry(1));
  }

  create(payload: LbMarcaPayload): Observable<LbMarca> {
    return this.http.post<LbMarca>(this.base, payload);
  }

  update(id: string, payload: LbMarcaPayload): Observable<LbMarca> {
    return this.http.put<LbMarca>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ mensaje: string; success: boolean }> {
    return this.http.delete<{ mensaje: string; success: boolean }>(`${this.base}/${id}`);
  }
}
