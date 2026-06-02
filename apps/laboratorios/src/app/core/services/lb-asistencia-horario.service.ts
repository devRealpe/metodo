import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface LbAsistenciaHorario {
  id?: string;
  codAula: string;
  nomAula?: string;
  diaSemana: string;
  fechaClase: string;       // ISO date: "yyyy-MM-dd"
  horaInicio: string;       // "HH:mm"
  horaFin: string;          // "HH:mm"
  materia?: string;
  docente?: string;
  identificacionDocente?: string;
  semanaInicio?: string;    // ISO date: "yyyy-MM-dd"
  asistio?: boolean | null; // null = sin definir, true = asistió, false = no-uso declarado
  observacion?: string;
  confirmadoPor?: string;
  fechaConfirmacion?: string;
}

export interface DeclararNoUsoRequest {
  identificacionDocente: string;
  codAula: string;
  nomAula?: string;         // nombre visible del aula
  materia?: string;         // nombre de la clase/asignatura
  fechaClase: string;       // "yyyy-MM-dd"
  horaInicio: string;       // "HH:mm"
  horaFin: string;          // "HH:mm"
  nombreDocente?: string;
  observacion?: string;
}

export interface ConfirmarAsistenciaRequest {
  asistio: boolean | null;
  observacion?: string;
  confirmadoPor?: string;
}

export interface DisponibilidadResponse {
  ocupada: boolean;
}

export interface ConflictoResponse {
  conflicto: boolean;
  mensaje: string;
}

export interface RangosLibresResponse {
  rangos: { inicio: string; fin: string }[];
  horariosOcupados: { horaInicio: string; horaFin: string; materia?: string }[];
}

export interface SincronizarSemanaResponse {
  insertados: number;
  omitidos: number;
  total: number;
}


@Injectable({ providedIn: 'root' })
export class LbAsistenciaHorarioService {

  private readonly base = `${environment.apilaboratoriosLocal}/asistencia-horario`;

  constructor(private http: HttpClient) {}

  // ─── Consultas ──────────────────────────────────────────────────────────────

  getAll(): Observable<LbAsistenciaHorario[]> {
    return this.http.get<LbAsistenciaHorario[]>(this.base);
  }

  getById(id: string): Observable<LbAsistenciaHorario | null> {
    return this.http.get<LbAsistenciaHorario>(`${this.base}/${id}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  /** Obtiene todos los registros de la semana que contiene la fecha dada */
  getBySemana(fecha: string): Observable<LbAsistenciaHorario[]> {
    return this.http.get<LbAsistenciaHorario[]>(`${this.base}/semana/${fecha}`);
  }

  /** Registros de un aula para una semana */
  getByAulaYSemana(codAula: string, fecha: string): Observable<LbAsistenciaHorario[]> {
    return this.http.get<LbAsistenciaHorario[]>(
      `${this.base}/aula/${encodeURIComponent(codAula)}/semana/${fecha}`
    );
  }

  /** Registros de un aula para una fecha concreta */
  getByAulaYFecha(codAula: string, fecha: string): Observable<LbAsistenciaHorario[]> {
    return this.http.get<LbAsistenciaHorario[]>(
      `${this.base}/aula/${encodeURIComponent(codAula)}/fecha/${fecha}`
    );
  }

  /**
   * Consulta si hay una clase activa (no declarada no-uso) en la franja.
   * Devuelve { ocupada: true } si el aula tiene clase y el docente NO declaró no-uso.
   */
  verificarDisponibilidad(
    codAula: string,
    fecha: string,
    horaInicio: string,
    horaFin: string
  ): Observable<DisponibilidadResponse> {
    return this.http.get<DisponibilidadResponse>(
      `${this.base}/aula/${encodeURIComponent(codAula)}/fecha/${fecha}/disponible`,
      { params: { horaInicio, horaFin } }
    ).pipe(
      catchError(() => of({ ocupada: false }))
    );
  }

  // ─── Creación ────────────────────────────────────────────────────────────────

  /** Inserta un único registro */
  crear(registro: LbAsistenciaHorario): Observable<LbAsistenciaHorario> {
    return this.http.post<LbAsistenciaHorario>(this.base, registro);
  }

  /**
   * Genera toda la semana a partir de una lista de registros.
   * Fallará con 409 si la semana ya existe.
   */
  generarSemana(registros: LbAsistenciaHorario[]): Observable<LbAsistenciaHorario[]> {
    return this.http.post<LbAsistenciaHorario[]>(`${this.base}/generar-semana`, registros);
  }

  // ─── Actualización ──────────────────────────────────────────────────────────

  /** Confirma o desmarca asistencia de un registro por su id */
  confirmarAsistencia(id: string, body: ConfirmarAsistenciaRequest): Observable<LbAsistenciaHorario> {
    return this.http.patch<LbAsistenciaHorario>(`${this.base}/${id}/confirmar`, body);
  }

  /**
   * El docente declara que NO va a usar el laboratorio.
   * Si no existe el registro en la cache, el backend lo crea automáticamente.
   */
  declararNoUso(request: DeclararNoUsoRequest): Observable<LbAsistenciaHorario> {
    return this.http.post<LbAsistenciaHorario>(`${this.base}/declarar-no-uso`, request);
  }

  // ─── Eliminación ────────────────────────────────────────────────────────────

  /** Elimina todos los registros de una semana */
  eliminarSemana(fecha: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/semana/${fecha}`);
  }

  eliminarById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ─── Sincronización desde Oracle ────────────────────────────────────────────

  /**
   * Solicita al backend que sincronice la semana directamente desde Oracle.
   * El backend llama a Oracle, calcula las fechas concretas e inserta de forma idempotente.
   * @param semana lunes de la semana en formato ISO (yyyy-MM-dd)
   */
  sincronizarSemana(semana: string): Observable<SincronizarSemanaResponse> {
    return this.http.post<SincronizarSemanaResponse>(`${this.base}/sincronizar`, null, { params: { semana } });
  }

  // ─── Disponibilidad (Oracle + BD) ───────────────────────────────────────────

  /**
   * Verifica si la franja solicitada entra en conflicto con una clase Oracle activa.
   * El backend combina datos de Oracle con las declaraciones de no-uso almacenadas.
   * @returns { conflicto: boolean, mensaje: string }
   */
  verificarConflicto(
    codAula: string,
    fecha: string,
    horaInicio: string,
    horaFin: string
  ): Observable<ConflictoResponse> {
    return this.http.get<ConflictoResponse>(
      `${this.base}/aula/${encodeURIComponent(codAula)}/fecha/${fecha}/verificar`,
      { params: { horaInicio, horaFin } }
    ).pipe(
      catchError(() => of<ConflictoResponse>({ conflicto: false, mensaje: '' }))
    );
  }

  /**
   * Devuelve los rangos de tiempo libres para reservar en un aula y fecha.
   * El backend combina horarios Oracle con declaraciones de no-uso.
   * @returns { rangos: [{inicio, fin}], horariosOcupados: [{horaInicio, horaFin, materia}] }
   * Fallback: si el endpoint no está disponible, devuelve todo el día libre (06:00–22:00).
   */
  getRangosLibres(codAula: string, fecha: string): Observable<RangosLibresResponse> {
    return this.http.get<RangosLibresResponse>(
      `${this.base}/aula/${encodeURIComponent(codAula)}/fecha/${fecha}/rangos-libres`
    );
    // Sin catchError: el componente maneja el error con fallback local
  }
}
