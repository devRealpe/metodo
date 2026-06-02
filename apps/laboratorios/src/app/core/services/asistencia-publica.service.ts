import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { RegistroAsistenciaPublicaPayload } from '../models/registro-asistencia-publica.model';

/**
 * Error lanzado cuando el Circuit Breaker del API Gateway está OPEN.
 * El Gateway devuelve HTTP 200 con { error: true, service: "...", message: "..." }
 * en lugar de los datos esperados, lo que produce fallos silenciosos en el cliente.
 */
export class CircuitBreakerAbiertaError extends Error {
  constructor(public readonly servicio: string) {
    super(`CIRCUIT_BREAKER_OPEN: ${servicio}`);
    this.name = 'CircuitBreakerAbiertaError';
  }
}

/**
 * Interface para usuario Oracle (respuesta del endpoint público)
 */
export interface UsuarioOraclePublico {
  identificacion: string;
  nombre: string;
  semestre: string;
  programa: string;
  facultad: string;
  genero: string;
  rol: string | null;
  cargo?: string;
}

/**
 * Interface para asignación de estudiante (respuesta del endpoint público)
 */
export interface AsignacionEstudiante {
  periodo: number;
  idEstudiante: string;
  nombre: string;
  numIdProfesor: string;
  codAsignatura: string;
  nomAsignatura: string;
  grupo: number;
  semestre: number;
  fechaInicio: string;
  fechaFin: string;
  codAula: string;
  nomAula: string;
}

/**
 * Interface para horario de aula (respuesta del endpoint público)
 */
export interface HorarioAulaPublico {
  codAula: string;
  nomAula: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  materia: string;
  docente: string;
}

/**
 * Servicio para consultas públicas de asistencia QR
 * 
 * Este servicio consume los endpoints PÚBLICOS del backend de laboratorios
 * que no requieren autenticación JWT del usuario.
 * 
 * El backend maneja internamente la autenticación usando credenciales de servicio
 * (client_credentials) para consultar los servicios Oracle protegidos.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaPublicaService {
  private readonly base = `${(environment as any).apilaboratoriosLocal || '/api/laboratorios'}/public/asistencia`;

  private readonly TIMEOUT_MS = 12000;

  constructor(private http: HttpClient) {}

  /**
   * Detecta si la respuesta HTTP 200 es el fallback del Circuit Breaker del Gateway.
   * Cuando el circuito está OPEN, el Gateway retorna { error: true, service: "...", ... }
   * con status 200, silenciando el problema para el cliente si no se intercepta.
   */
  private detectarFallback(res: any): void {
    if (
      res && typeof res === 'object' && !Array.isArray(res) &&
      res['error'] === true && typeof res['service'] === 'string'
    ) {
      throw new CircuitBreakerAbiertaError(res['service'] as string);
    }
}

  getUsuarioPorIdentificacion(identificacion: string): Observable<UsuarioOraclePublico | null> {
    const url = `${this.base}/usuarios/${encodeURIComponent(identificacion)}`;
    return this.http.get<any>(url).pipe(
      timeout(this.TIMEOUT_MS),
      map(res => {
        this.detectarFallback(res);
        if (!res) return null;
        if (!res.rol && res.cargo) res.rol = res.cargo;
        return res as UsuarioOraclePublico;
      }),
      catchError(error => {
        if (error.status === 404) return of(null);
        // Propagar CircuitBreakerAbiertaError y TimeoutError al componente
        throw error;
      })
    );
  }

  getAsignacionesPorEstudiante(identificacion: string): Observable<AsignacionEstudiante[]> {
    const url = `${this.base}/estudiantes/${encodeURIComponent(identificacion)}/asignaciones`;
    return this.http.get<any>(url).pipe(
      timeout(this.TIMEOUT_MS),
      map(res => {
        this.detectarFallback(res);
        return (res as AsignacionEstudiante[]) ?? [];
      }),
      catchError(error => {
        // No silenciar errores de circuit breaker/timeout: deben llegar al componente
        if (error instanceof CircuitBreakerAbiertaError || error?.name === 'TimeoutError') {
          throw error;
        }
        return of([]);
      })
    );
  }

  buscarAsignacionesPorNombre(nombre: string): Observable<AsignacionEstudiante[]> {
    const url = `${this.base}/estudiantes/buscar`;
    return this.http.get<any>(url, { params: { nombre } }).pipe(
      timeout(this.TIMEOUT_MS),
      map(res => {
        this.detectarFallback(res);
        return (res as AsignacionEstudiante[]) ?? [];
      }),
      catchError(error => {
        if (error instanceof CircuitBreakerAbiertaError || error?.name === 'TimeoutError') {
          throw error;
        }
        return of([]);
      })
    );
  }

  getHorariosPorDia(dia?: string): Observable<HorarioAulaPublico[]> {
    const url = `${this.base}/horarios`;
    const params: Record<string, string> = dia ? { dia } : {};
    return this.http.get<any>(url, { params }).pipe(
      timeout(this.TIMEOUT_MS),
      map(res => {
        this.detectarFallback(res);
        return (res as HorarioAulaPublico[]) ?? [];
      }),
      catchError(error => {
        if (error instanceof CircuitBreakerAbiertaError || error?.name === 'TimeoutError') {
          throw error;
        }
        return of([]);
      })
    );
  }


  verificarDuplicado(identificacion: string, laboratorioId: string, fechaUso: string): Observable<boolean> {
    const url = `${this.base}/verificar-duplicado`;
    return this.http.get<any>(url, {
      params: { identificacion, laboratorioId, fechaUso }
    }).pipe(
      timeout(this.TIMEOUT_MS),
      map(res => {
        this.detectarFallback(res);
        return !!(res as { yaRegistrado: boolean })?.yaRegistrado;
      }),
      catchError(() => of(false))
    );
  }

  healthCheck(): Observable<boolean> {
    const url = `${this.base}/health`;
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  registrarAsistencia(payload: RegistroAsistenciaPublicaPayload): Observable<any> {
    const url = `${this.base}/registrar`;
    
    
    return this.http.post<any>(url, payload).pipe(
      map(res => {
        
        return res;
      }),
      catchError(error => {
        
        throw error;
      })
    );
  }
}


