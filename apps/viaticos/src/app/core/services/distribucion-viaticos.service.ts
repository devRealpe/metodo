import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { DistribucionViaticos } from '../models/distribucion-viaticos.model';

@Injectable({
  providedIn: 'root'
})
export class DistribucionViaticosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiViaticos}/distribucion-viaticos`;

  /** Guarda la distribución de una solicitud */
  guardarDistribucion(distribucion: DistribucionViaticos[]): Observable<DistribucionViaticos[]> {
    return this.http.post<DistribucionViaticos[]>(`${this.apiUrl}/batch`, distribucion);
  }

  /** Obtiene la distribución de una solicitud específica */
  obtenerPorSolicitud(codigoSolicitud: string): Observable<DistribucionViaticos[]> {
    return this.http.get<DistribucionViaticos[]>(`${this.apiUrl}/solicitud/${codigoSolicitud}`);
  }

  /** Actualiza la distribución de una solicitud */
  actualizarDistribucion(codigoSolicitud: string, distribucion: DistribucionViaticos[]): Observable<DistribucionViaticos[]> {
    return this.http.put<DistribucionViaticos[]>(`${this.apiUrl}/solicitud/${codigoSolicitud}`, distribucion);
  }

  /** Elimina la distribución de una solicitud */
  eliminarPorSolicitud(codigoSolicitud: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/solicitud/${codigoSolicitud}`);
  }

  /** Obtiene todas las distribuciones */
  obtenerTodas(): Observable<DistribucionViaticos[]> {
    return this.http.get<DistribucionViaticos[]>(this.apiUrl);
  }

  /** Verifica si existe distribución para una solicitud */
  existeDistribucion(codigoSolicitud: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/exists/${codigoSolicitud}`);
  }

  /** Obtiene distribuciones por centro de costo */
  obtenerPorCentroCosto(codigoCentroCosto: string): Observable<DistribucionViaticos[]> {
    return this.http.get<DistribucionViaticos[]>(`${this.apiUrl}/centro-costo/${codigoCentroCosto}`);
  }
  
  /** Valida que los porcentajes de distribución sumen 100% */
  validarPorcentajes(distribuciones: DistribucionViaticos[]): Observable<{ valido: boolean; mensaje: string; totalPorcentaje: number }> {
    return this.http.post<{ valido: boolean; mensaje: string; totalPorcentaje: number }>(
      `${this.apiUrl}/validar-porcentajes`, 
      distribuciones
    );
  }
  
  /** Calcula el valor monetario basado en porcentaje y valor total */
  calcularValorPorcentaje(porcentaje: number, valorTotal: number): Observable<{ porcentaje: number; valorTotal: number; valorCalculado: number }> {
    return this.http.post<{ porcentaje: number; valorTotal: number; valorCalculado: number }>(
      `${this.apiUrl}/calcular-valor`,
      { porcentaje, valorTotal }
    );
  }
}
