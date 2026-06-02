// ─── Enums ─────────────────────────────────────────────────────────────────

export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'OBSERVACION'
  | 'RECHAZADO'
  | 'FINALIZADO';

export type EstadoRevision =
  | 'PENDIENTE'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'OBSERVACION';

// ─── Catálogos ─────────────────────────────────────────────────────────────

export interface TipoSolicitudItem {
  id: number;
  nombre: string;
  descripcion?: string;
}

// ─── Oracle ────────────────────────────────────────────────────────────────

export interface UsuarioOracleResponse {
  identificacion: string;
  nombre: string;
  semestre?: string;
  programa: string;
  facultad: string;
  genero?: string;
  correoInstitucional?: string;
  correoPersonal?: string;
  cargo?: string;
  centroCosto?: string;
  fechaFinContrato?: string;
  tipoViatico?: string;
}

// ─── Requests ──────────────────────────────────────────────────────────────

export interface CrearSolicitudManualRequest {
  cedula: number;
  idTipoSolicitud: number;
  anio: number;
  periodo: 1 | 2;
  idPrograma?: string;
  idFacultad?: string;
}

// ─── Responses ─────────────────────────────────────────────────────────────

export interface RevisionDependenciaResponse {
  id: number;
  idDependencia: number;
  nombreDependencia: string;
  estado: EstadoRevision;
  puedeAprobar: boolean;
  motivoBloqueo: string | null;
  ordenFlujo: number;
  flujoParalelo: boolean;
}

export interface SolicitudResponse {
  id: number;
  idTipoSolicitud: number;
  nombreTipoSolicitud: string;
  cedula: number;
  idPrograma: string | null;
  idFacultad: string | null;
  anio: number;
  periodo: number;
  estado: EstadoSolicitud;
  fechaCreacion: string;
  revisiones: RevisionDependenciaResponse[];
}

export interface ItemResultadoMasivo {
  cedula: number;
  estado: 'EXITOSO' | 'FALLIDO';
  error: string | null;
}

export interface ResultadoMasivaResponse {
  totalEnArchivo: number;
  exitosos: number;
  fallidos: number;
  resultados: ItemResultadoMasivo[];
}
