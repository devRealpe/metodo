import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, catchError, throwError } from 'rxjs';
import { environment } from '@shared/shared-environments';


export interface RegistroUsoDTO {
  id?: string;
  identificacion?: string;
  semestre: string;
  genero: string;
  rol: string;
  programa: string;
  facultad: string;
  motivo: string;
  observaciones: string | null;
  fechaUso: string;
  horaInicio: string;
  horaFin: string | null;
  laboratorioId: string;
}

export interface UsoLaboratorioDTO extends RegistroUsoDTO { 
  id: string; 
}

export interface EntradaPayload {
  identificacion: string;
  laboratorioId: string;
  fechaUso: string;
  horaInicio: string;
  semestre?: string;
  genero?: string;
  rol?: string;
  programa?: string;
  facultad?: string;
  motivo?: string;
  observaciones?: string | null;
  reservaId?: string;
}

export interface SalidaPayload {
  identificacion: string;
  horaFin: string;
  semestre: string;
  genero: string;
  rol: string;
  programa: string;
  facultad: string;
  motivo: string;
  observaciones: string | null;
}

export interface EstadoResponse {
  activo: boolean;
  laboratorioId: string | null;
  fechaUso: string | null;
  horaInicio: string | null;
  motivo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsosLaboratorioService {
  private readonly base = `${environment.apilaboratoriosLocal}/usos-laboratorio`;

  constructor(private http: HttpClient) {}

  marcarEntrada(payload: EntradaPayload): Observable<UsoLaboratorioDTO> {
    return this.http.post<UsoLaboratorioDTO>(`${this.base}/entrada`, payload);
  }

  estado(identificacion: string): Observable<EstadoResponse> {
    return this.http.get<EstadoResponse>(`${this.base}/estado`, {
      params: { identificacion } as any
    });
  }

  estadoPorPath(identificacion: string): Observable<EstadoResponse> {
    return this.http.get<EstadoResponse>(`${this.base}/estado/${encodeURIComponent(identificacion)}`);
  }

  marcarSalida(payload: SalidaPayload): Observable<UsoLaboratorioDTO> {
    return this.http.post<UsoLaboratorioDTO>(`${this.base}/salida`, payload);
  }

  crear(dto: RegistroUsoDTO): Observable<UsoLaboratorioDTO> {
    return this.http.post<UsoLaboratorioDTO>(this.base, dto);
  }

  forzarSalida(identificacion: string): Observable<{ actualizados: number }> {
    return this.http.post<{ actualizados: number }>(
      `${this.base}/forzar-salida/${encodeURIComponent(identificacion)}`,
      {}
    );
  }

  cerrarHuerfanos(): Observable<{ cerrados: number }> {
    return this.http.post<{ cerrados: number }>(`${this.base}/admin/cerrar-huerfanos`, {});
  }

  
  eliminarHuerfanos(): Observable<{ eliminados: number }> {
    return this.http.delete<{ eliminados: number }>(`${this.base}/admin/eliminar-huerfanos`);
  }

  getAll(): Observable<RegistroUsoDTO[]> {
    return this.http.get<(RegistroUsoDTO | UsoLaboratorioDTO)[]>(this.base).pipe(
      map(arr => (arr ?? []).map(u => {
        const { /* id, */ ...rest } = u as any;
        return rest as RegistroUsoDTO;
      }))
    );
  }

  listar(): Observable<RegistroUsoDTO[]> { return this.getAll(); }
  findAll(): Observable<RegistroUsoDTO[]> { return this.getAll(); }
  
  verificarRegistroExistentePorIdentificacion(identificacion: string, fechaUso: string): Observable<RegistroUsoDTO[]> {
    return this.http.get<RegistroUsoDTO[]>(`${this.base}/buscar`, {
      params: { identificacion, fecha: fechaUso }
    }).pipe(
      catchError((error) => {
        if (error?.status === 401 || error?.status === 403) return throwError(() => error);
        return of([]);
      })
    );
  }

  private extraerIdentificacionDeRegistro(registro: any): string {
    if (registro.identificacion !== undefined && registro.identificacion !== null && String(registro.identificacion).trim() !== '') {
      return String(registro.identificacion).trim();
    }
  
    const posiblesCampos = [
      'estudianteId', 
      'usuarioId',
      'codigo',
      'cedula',
      'documento',
      'numeroDocumento',
      'id_estudiante',
      'student_id',
      'user_id'
    ];
    
    for (const campo of posiblesCampos) {
      const valor = registro[campo];
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
        return String(valor).trim();
      }
    }
    
    return '';
  }

  /**
   * Obtener registros activos (sin hora_fin)
   */
  getActivos(): Observable<RegistroUsoDTO[]> {
    return this.http.get<RegistroUsoDTO[]>(`${this.base}/activos`);
  }
}
