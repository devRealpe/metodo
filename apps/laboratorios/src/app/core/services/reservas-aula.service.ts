import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { ReservaAula, CierreReservaDTO } from '../models/reserva-aula.model';

@Injectable({ providedIn: 'root' })
export class ReservasAulaService {

  private readonly base = `${environment.apilaboratoriosLocal}/reservas-aula`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ReservaAula[]> {
    return this.http.get<ReservaAula[]>(this.base);
  }

  getById(id: string): Observable<ReservaAula | null> {
    return this.http.get<ReservaAula>(`${this.base}/${id}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  getActivas(): Observable<ReservaAula[]> {
    return this.http.get<ReservaAula[]>(`${this.base}/activas`);
  }

  getByIdentificacion(nit: string): Observable<ReservaAula[]> {
    return this.http.get<ReservaAula[]>(`${this.base}/identificacion/${encodeURIComponent(nit)}`);
  }

  getByIdentificacionYFecha(nit: string, fecha: string): Observable<ReservaAula[]> {
    return this.http.get<ReservaAula[]>(
      `${this.base}/identificacion/${encodeURIComponent(nit)}/fecha/${fecha}`
    );
  }

  /** Obtiene solo reservas APROBADAS para la fecha indicada (usado en ingreso) */
  getByIdentificacionYFechaAprobadas(nit: string, fecha: string): Observable<ReservaAula[]> {
    return this.http.get<ReservaAula[]>(
      `${this.base}/identificacion/${encodeURIComponent(nit)}/fecha/${fecha}/aprobadas`
    );
  }

  /** Obtiene reservas aprobadas que se solapan con el rango horario dado para un laboratorio */
  getReservasSolapadas(laboratorioId: string, fecha: string, horaInicio: string, horaFin: string): Observable<ReservaAula[]> {
    return this.http.get<ReservaAula[]>(
      `${this.base}/laboratorio/${laboratorioId}/fecha/${fecha}/solapadas`,
      { params: { horaInicio, horaFin } }
    );
  }

  create(data: ReservaAula): Observable<ReservaAula> {
    return this.http.post<ReservaAula>(this.base, data);
  }

  update(id: string, data: ReservaAula): Observable<ReservaAula> {
    return this.http.put<ReservaAula>(`${this.base}/${id}`, data);
  }

  /** Cierra la reserva y devuelve inventario. Para consumibles, indica cantidades devueltas. */
  cerrar(id: string, devolucion?: CierreReservaDTO): Observable<ReservaAula> {
    return this.http.put<ReservaAula>(`${this.base}/${id}/cerrar`, devolucion ?? {});
  }

  /** Aprueba o rechaza una reserva */
  aprobar(id: string, aprobado: boolean, observacionRechazo?: string): Observable<ReservaAula> {
    return this.http.put<ReservaAula>(`${this.base}/${id}/aprobar`, { aprobado, observacionRechazo });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
