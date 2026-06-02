import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  HistorialCambiosDto,
  HistorialCambiosPage,
  EstadisticaAuditoria
} from '../models/historial-cambios.model';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private readonly API_URL = `${environment.apiHojasDeVida}/api/auditoria`;

  constructor(private http: HttpClient) {}

  obtenerHistorialPorRegistro(idRegistro: string): Observable<HistorialCambiosDto[]> {
    return this.http.get<HistorialCambiosDto[]>(`${this.API_URL}/registro/${idRegistro}`);
  }

  obtenerHistorialPorTabla(tablaAfectada: string): Observable<HistorialCambiosDto[]> {
    return this.http.get<HistorialCambiosDto[]>(`${this.API_URL}/tabla/${tablaAfectada}`);
  }

  obtenerHistorialPorUsuario(keycloakId: string): Observable<HistorialCambiosDto[]> {
    return this.http.get<HistorialCambiosDto[]>(`${this.API_URL}/usuario/${keycloakId}`);
  }

  obtenerHistorialPorFechas(
    fechaInicio: string,
    fechaFin: string
  ): Observable<HistorialCambiosDto[]> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    return this.http.get<HistorialCambiosDto[]>(`${this.API_URL}/fechas`, { params });
  }

  obtenerHistorialPorPersona(
    identificacion: string,
    page: number = 0,
    size: number = 20
  ): Observable<HistorialCambiosPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<HistorialCambiosPage>(
      `${this.API_URL}/persona/${identificacion}`,
      { params }
    );
  }

  obtenerUltimoCambio(idRegistro: string): Observable<HistorialCambiosDto> {
    return this.http.get<HistorialCambiosDto>(`${this.API_URL}/ultimo/${idRegistro}`);
  }

  obtenerEstadisticasPorTabla(): Observable<EstadisticaAuditoria[]> {
    return this.http.get<EstadisticaAuditoria[]>(`${this.API_URL}/estadisticas/tablas`);
  }

  obtenerEstadisticasPorUsuario(): Observable<EstadisticaAuditoria[]> {
    return this.http.get<EstadisticaAuditoria[]>(`${this.API_URL}/estadisticas/usuarios`);
  }

  formatearFecha(fechaCambio: string): string {
    const fecha = new Date(fechaCambio);
    return fecha.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  obtenerColorAccion(accion: string): string {
    switch (accion) {
      case 'INSERT':
        return 'success';
      case 'UPDATE':
        return 'info';
      case 'DELETE':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  obtenerIconoAccion(accion: string): string {
    switch (accion) {
      case 'INSERT':
        return 'pi pi-plus';
      case 'UPDATE':
        return 'pi pi-pencil';
      case 'DELETE':
        return 'pi pi-trash';
      default:
        return 'pi pi-info-circle';
    }
  }

  obtenerCamposModificados(datosAnteriores: any, datosNuevos: any): string[] {
    if (!datosAnteriores || !datosNuevos) {
      return [];
    }

    const camposModificados: string[] = [];
    const todasLasClaves = new Set([
      ...Object.keys(datosAnteriores),
      ...Object.keys(datosNuevos)
    ]);

    todasLasClaves.forEach(clave => {
      const valorAnterior = datosAnteriores[clave];
      const valorNuevo = datosNuevos[clave];

      if (JSON.stringify(valorAnterior) !== JSON.stringify(valorNuevo)) {
        camposModificados.push(clave);
      }
    });

    return camposModificados;
  }
}
