import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { 
  HojaVidaSeccionEstadoDTO, 
  HojaVidaResumenDTO,
  ROUTE_TO_SECCION_MAP 
} from '../models/hoja-vida-estado.model';

@Injectable({
  providedIn: 'root'
})
export class HojaVidaEstadoApiService {
  
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiHojasDeVida}/hojas-de-vida/hoja-vida/estados/me`;

  constructor() {
  }
  obtenerTodosLosEstados(): Observable<HojaVidaSeccionEstadoDTO[]> {
    return this.http.get<HojaVidaSeccionEstadoDTO[]>(this.baseUrl)
    ;
  }
  obtenerEstadoSeccion(route: string): Observable<HojaVidaSeccionEstadoDTO | null> {
    const seccionCodigo = ROUTE_TO_SECCION_MAP[route];
    
    if (!seccionCodigo) {
      return throwError(() => new Error(`Ruta no válida: ${route}`));
    }

    return this.http.get<HojaVidaSeccionEstadoDTO>(`${this.baseUrl}/${seccionCodigo}`)
      .pipe();
  }
  obtenerResumen(): Observable<HojaVidaResumenDTO> {
    return this.http.get<HojaVidaResumenDTO>(`${this.baseUrl}/resumen`);
  }

  isHojaVidaCompleta(): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/completa`);
  }

  obtenerSeccionesIncompletas(): Observable<HojaVidaSeccionEstadoDTO[]> {
    return this.http.get<HojaVidaSeccionEstadoDTO[]>(`${this.baseUrl}/incompletas`);
  }

  guardarEstado(dto: HojaVidaSeccionEstadoDTO): Observable<HojaVidaSeccionEstadoDTO> {
    return this.http.post<HojaVidaSeccionEstadoDTO>(this.baseUrl, dto);
  }

  actualizarEstado(
    route: string, 
    completada: boolean, 
    cantidadRegistros: number, 
    porcentaje: number
  ): Observable<HojaVidaSeccionEstadoDTO> {
    const seccionCodigo = ROUTE_TO_SECCION_MAP[route];
    
    if (!seccionCodigo) {
      return throwError(() => new Error(`Ruta no válida: ${route}`));
    }

    const params = {
      completada: completada.toString(),
      cantidadRegistros: cantidadRegistros.toString(),
      porcentaje: porcentaje.toString()
    };

    return this.http.put<HojaVidaSeccionEstadoDTO>(
      `${this.baseUrl}/${seccionCodigo}`, 
      null,
      { params }
    );
  }

  inicializarEstados(): Observable<HojaVidaSeccionEstadoDTO[]> {
    return this.http.post<HojaVidaSeccionEstadoDTO[]>(
      `${this.baseUrl}/inicializar`, 
      {}
    );
  }
  eliminarEstado(route: string): Observable<void> {
    const seccionCodigo = ROUTE_TO_SECCION_MAP[route];
    
    if (!seccionCodigo) {
      return throwError(() => new Error(`Ruta no válida: ${route}`));
    }

    return this.http.delete<void>(`${this.baseUrl}/${seccionCodigo}`);
  }

  reiniciarTodosLosEstados(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reiniciar`, {});
  }

  crearDTO(
    route: string,
    completada: boolean,
    cantidadRegistros: number,
    porcentaje: number
  ): HojaVidaSeccionEstadoDTO {
    const seccionCodigo = ROUTE_TO_SECCION_MAP[route];
    
    if (!seccionCodigo) {
      throw new Error(`Ruta no válida: ${route}`);
    }

    return {
      usuarioId: '', 
      seccion: seccionCodigo,
      completada,
      cantidadRegistros,
      tieneDatosRequeridos: cantidadRegistros > 0 || completada,
      porcentajeCompletitud: porcentaje
    };
  }

  healthCheck(): Observable<string> {
    return this.http.get(`${this.baseUrl}/health`, { responseType: 'text' });
  }

  
}
