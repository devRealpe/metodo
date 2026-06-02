import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { LbReservaEquipo } from '../models/lb-reserva-equipo.model';

@Injectable({ providedIn: 'root' })
export class LbReservaEquipoService {

  private readonly base = `${environment.apilaboratoriosLocal}/reservas-equipo`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbReservaEquipo[]> {
    return this.http.get<LbReservaEquipo[]>(this.base);
  }

  getById(id: string): Observable<LbReservaEquipo | null> {
    return this.http.get<LbReservaEquipo>(`${this.base}/${id}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  getByIdentificacion(identificacion: string): Observable<LbReservaEquipo[]> {
    return this.http.get<LbReservaEquipo[]>(
      `${this.base}/identificacion/${encodeURIComponent(identificacion)}`
    );
  }

  getByFecha(fecha: string): Observable<LbReservaEquipo[]> {
    return this.http.get<LbReservaEquipo[]>(`${this.base}/fecha/${fecha}`);
  }

  create(data: LbReservaEquipo): Observable<LbReservaEquipo> {
    return this.http.post<LbReservaEquipo>(this.base, data);
  }

  update(id: string, data: LbReservaEquipo): Observable<LbReservaEquipo> {
    return this.http.put<LbReservaEquipo>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
