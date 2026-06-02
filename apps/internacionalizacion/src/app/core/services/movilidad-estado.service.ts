import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Movilidad } from '../models/movilidad.model';
import { AprobacionNivel, EstadoAprobacion, ESTADOS_APROBACION } from '../models/autorizacion.model';

export interface MovilidadAgrupada {
  movilidadId: string;
  movilidad: Movilidad;
  nombreMovilidad: string;
  aprobaciones: AprobacionNivel[];
  totalNiveles: number;
  nivelesAprobados: number;
  nivelesRechazados: number;
  nivelesPendientes: number;
  estadoGeneral: EstadoAprobacion; // utiliza el mismo tipo central
  fechaUltimaAccion: string | null;
  autorizacionCancelada?: boolean;
}

// valores extraídos de la lista central para evitar literales
const [PENDIENTE, APROBADO, RECHAZADO, PARCIAL, CANCELADO]: EstadoAprobacion[] =
  ESTADOS_APROBACION.map(o => o.value);

@Injectable({
  providedIn: 'root'
})
export class MovilidadEstadoService {

  private movilidadActualizadaSubject = new BehaviorSubject<string | null>(null);
  public movilidadActualizada$ = this.movilidadActualizadaSubject.asObservable();

  private movilidadesAprobadasSubject = new BehaviorSubject<MovilidadAgrupada[]>([]);
  public movilidadesAprobadas$ = this.movilidadesAprobadasSubject.asObservable();

  private _lastEmittedMovilidadId: string | null = null;
  private _lastEmittedAt = 0; // timestamp ms

  // Conteo de aprobaciones por estado, evita repetir literales
  private countByEstado(aprobaciones: AprobacionNivel[], estado: EstadoAprobacion): number {
    return aprobaciones.filter(a => a.estado === estado).length;
  }

 
  notificarMovilidadActualizada(movilidadId: string): void {
    const now = Date.now();
    if (this._lastEmittedMovilidadId === movilidadId && (now - this._lastEmittedAt) < 700) {
      return;
    }

    this._lastEmittedMovilidadId = movilidadId;
    this._lastEmittedAt = now;
    this.movilidadActualizadaSubject.next(movilidadId);
  }

  actualizarMovilidadesAprobadas(movilidadesAprobadas: MovilidadAgrupada[]): void {
    this.movilidadesAprobadasSubject.next(movilidadesAprobadas);
  }

  removerMovilidadAprobada(movilidadId: string): void {
    const movilidadesActuales = this.movilidadesAprobadasSubject.value;
    const movilidadesFiltradas = movilidadesActuales.filter(m => m.movilidadId !== movilidadId);
    this.movilidadesAprobadasSubject.next(movilidadesFiltradas);
  }
  calcularEstadoGeneral(aprobaciones: AprobacionNivel[]): EstadoAprobacion {
    const totalNiveles = aprobaciones.length;
    const aprobadas = this.countByEstado(aprobaciones, APROBADO);
    const rechazadas = this.countByEstado(aprobaciones, RECHAZADO);

    if (aprobadas === totalNiveles) return APROBADO;
    if (rechazadas > 0) return RECHAZADO;
    if (aprobadas > 0) return PARCIAL;
    return PENDIENTE;
  }
  crearMovilidadAgrupada(movilidad: Movilidad, aprobaciones: AprobacionNivel[], estadoGeneral?: 'aprobado' | 'rechazado' | 'pendiente' | 'parcial' | 'cancelado'): MovilidadAgrupada {
    const totalNiveles = aprobaciones.length;
    const nivelesAprobados = this.countByEstado(aprobaciones, APROBADO);
    const nivelesRechazados = this.countByEstado(aprobaciones, RECHAZADO);
    const nivelesPendientes = this.countByEstado(aprobaciones, PENDIENTE);

    const estadoFinal = estadoGeneral || this.calcularEstadoGeneral(aprobaciones);

    const fechasAprobacion = aprobaciones
      .filter(a => a.fechaAprobacion)
      .map(a => a.fechaAprobacion!)
      .sort()
      .reverse();
    const fechaUltimaAccion = fechasAprobacion.length > 0 ? fechasAprobacion[0] : null;

    return {
      movilidadId: movilidad.id,
      movilidad,
      nombreMovilidad: movilidad.nombreMovilidad,
      aprobaciones: aprobaciones.sort((a, b) => a.nivel - b.nivel),
      totalNiveles,
      nivelesAprobados,
      nivelesRechazados,
      nivelesPendientes,
      estadoGeneral: estadoFinal,
      fechaUltimaAccion,
      autorizacionCancelada: estadoFinal === CANCELADO
    };
  }

  /**
   * Obtiene el texto descriptivo del estado
   */
  obtenerTextoEstado(estado: string): string {
    const estados: Record<EstadoAprobacion, string> = {
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      parcial: 'Parcial',
      cancelado: 'Cancelado'
    };
    return estados[estado as EstadoAprobacion] || estado;
  }

  /**
   * Obtiene la severidad para el badge de estado
   */
  // mapa reutilizable de severidades para cada estado
  private readonly _severidades: Record<EstadoAprobacion, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
    pendiente: 'warn',
    aprobado: 'success',
    rechazado: 'danger',
    parcial: 'info',
    cancelado: 'secondary'
  };

  obtenerSeveridadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return this._severidades[estado as EstadoAprobacion] || 'secondary';
  }
}