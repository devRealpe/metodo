import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mantenimiento } from '../models/mantenimiento.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class MantenimientosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apilaboratoriosLocal}/mantenimientos`;

  getAllMantenimientos(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(this.apiUrl);
  }

  getMantenimientoById(id: string): Observable<Mantenimiento> {
    return this.http.get<Mantenimiento>(`${this.apiUrl}/${id}`);
  }

  createMantenimiento(mantenimiento: Mantenimiento): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(this.apiUrl, mantenimiento);
  }

  updateMantenimiento(id: string, mantenimiento: Mantenimiento): Observable<Mantenimiento> {
    return this.http.put<Mantenimiento>(`${this.apiUrl}/${id}`, mantenimiento);
  }

  deleteMantenimiento(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getMantenimientosBySerial(serialEquipo: string): Observable<Mantenimiento[]> {
    const serialEncoded = encodeURIComponent(serialEquipo);
   
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/serial/${serialEncoded}`);
  }

  getMantenimientosByTipo(tipoMantenimiento: string): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/tipo/${tipoMantenimiento}`);
  }

  getMantenimientosByEstado(estado: string): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/estado/${estado}`);
  }

  getMantenimientosByTecnico(tecnicoId: string): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/tecnico/${tecnicoId}`);
  }

  getMantenimientosByFechas(fechaInicio: string, fechaFin: string): Observable<Mantenimiento[]> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/fechas`, { params });
  }

  getMantenimientosProgramados(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/programados`);
  }

  getMantenimientosVencidos(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/vencidos`);
  }

  getMantenimientosProximos(dias: number): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/proximos/${dias}`);
  }

  getMantenimientosEnGarantia(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/en-garantia`);
  }

  getMantenimientosConProveedor(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/con-proveedor`);
  }

  ejecutarMantenimiento(id: string, datos: Partial<Mantenimiento>): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.apiUrl}/${id}/ejecutar`, datos);
  }

  completarMantenimiento(id: string, datos: Partial<Mantenimiento>): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.apiUrl}/${id}/completar`, datos);
  }

  cancelarMantenimiento(id: string, motivo: string): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.apiUrl}/${id}/cancelar`, { motivo });
  }

  reprogramarMantenimiento(id: string, nuevaFecha: string, motivo: string): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.apiUrl}/${id}/reprogramar`, { nuevaFecha, motivo });
  }

  enviarAProveedor(id: string, datos: Partial<Mantenimiento>): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.apiUrl}/${id}/enviar-proveedor`, datos);
  }

  registrarRetornoProveedor(id: string, datos: Partial<Mantenimiento>): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.apiUrl}/${id}/retorno-proveedor`, datos);
  }

  registrarCertificado(id: string, datos: Partial<Mantenimiento>): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.apiUrl}/${id}/certificado`, datos);
  }
}
