import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { LbDevolucionEquipo } from '../models/lb-devolucion-equipo.model';

@Injectable({ providedIn: 'root' })
export class LbDevolucionEquipoService {

  private readonly base = `${environment.apilaboratoriosLocal}/devoluciones-equipo`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<LbDevolucionEquipo[]> {
    return this.http.get<LbDevolucionEquipo[]>(this.base).pipe(retry(1));
  }

  getById(id: string): Observable<LbDevolucionEquipo | null> {
    return this.http.get<LbDevolucionEquipo>(`${this.base}/${id}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  getByReservaId(reservaId: string): Observable<LbDevolucionEquipo | null> {
    return this.http.get<LbDevolucionEquipo>(`${this.base}/por-reserva/${reservaId}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  create(devolucion: LbDevolucionEquipo): Observable<LbDevolucionEquipo> {
    return this.http.post<LbDevolucionEquipo>(this.base, devolucion);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
