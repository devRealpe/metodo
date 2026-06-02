import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OfertaLaboral, OfertaLaboralRequest } from '../models/oferta-laboral.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class OfertaLaboralService {
  private apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/ofertas`; 

  constructor(private http: HttpClient) {}

  getAll(): Observable<OfertaLaboral[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(data => Array.isArray(data) ? data : (data?.content ?? data?.data ?? []))
    );
  }

  getById(id: string): Observable<OfertaLaboral> {
    return this.http.get<OfertaLaboral>(`${this.apiUrl}/${id}`);
  }

  create(oferta: OfertaLaboralRequest): Observable<OfertaLaboral> {
    return this.http.post<OfertaLaboral>(this.apiUrl, oferta);
  }

  update(oferta: OfertaLaboralRequest): Observable<OfertaLaboral> {
    if (!oferta.id) {
      throw new Error('ID es requerido para actualizar la oferta');
    }
    return this.http.put<OfertaLaboral>(`${this.apiUrl}/${oferta.id}`, oferta);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  softDelete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  restaurar(id: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/restaurar`, {});
  }

  getEliminadas(): Observable<OfertaLaboral[]> {
    return this.http.get<any>(`${this.apiUrl}/eliminadas`).pipe(
      map(data => Array.isArray(data) ? data : (data?.content ?? data?.data ?? []))
    );
  }

  cambiarEstado(id: string, activo: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/estado?activo=${activo}`, {});
  }


  updateById(id: string, oferta: OfertaLaboral): Observable<OfertaLaboral> {
    return this.http.put<OfertaLaboral>(`${this.apiUrl}/${id}`, oferta);
  }

getActivas(): Observable<OfertaLaboral[]> {
  return this.http.get<any>(`${this.apiUrl}/activas`).pipe(
    map(data => Array.isArray(data) ? data : (data?.content ?? data?.data ?? []))
  );
}

getInactivas(): Observable<OfertaLaboral[]> {
  return this.http.get<any>(`${this.apiUrl}/inactivas`).pipe(
    map(data => Array.isArray(data) ? data : (data?.content ?? data?.data ?? []))
  );
}

getConvocatoriasCerradas(): Observable<OfertaLaboral[]> {
  return this.http.get<any>(`${this.apiUrl}/cerradas`).pipe(
    map(data => Array.isArray(data) ? data : (data?.content ?? data?.data ?? []))
  );
}

verificarPostulaciones(id: string): Observable<{ tienePostulaciones: boolean, cantidadPostulaciones: number }> {
  return this.http.get<{ tienePostulaciones: boolean, cantidadPostulaciones: number }>(`${this.apiUrl}/${id}/postulaciones/verificar`);
}

verificarNumeroConvocatoria(numeroConvocatoria: string, idActual?: string): Observable<{ existe: boolean }> {
  let url = `${this.apiUrl}/verificar-numero?numeroConvocatoria=${encodeURIComponent(numeroConvocatoria)}`;
  if (idActual) {
    url += `&id=${idActual}`;
  }
  return this.http.get<{ existe: boolean }>(url);
}
}