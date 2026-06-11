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
  uuid: string;
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

// ─── Consultas-App: datos académicos del estudiante ────────────────────────

export interface EstudianteConsultaResponse {
  numeroIdentificacion: string;
  nombre: string;
  fechaNacimiento: string;
  edad: number;
  codPrograma: string;
  nomPrograma: string;
  estado: string;
  creditosPrograma: number;
  creditosAprobados: number;
  porcentajePorCreditos: number;
  materiasPrograma: number;
  materiasAprobadas: number;
  porcentajePorMaterias: number;
  /** Nivel de inglés certificado del estudiante (ej. "B1", "B2", "C1") */
  nivelIngles: string;
  /** Estado de la solicitud de grado: "Aprobado" | "Rechazado" | "Solicitado" */
  estadoSolicitudGrado: string;
  tipoGrado: string;
  /** Código del estado de la solicitud de grado */
  codEstadoSolicitud: string;
  requisitosGrado: string;
}

// ─── Validación de requisitos (calculado en el frontend) ────────────────────

export interface ValidacionRequisitos {
  tieneSolicitudGrado: boolean;
  pensumCompleto: boolean;
  nivelInglesOk: boolean;
  todosCumplidos: boolean;
}

// ─── Requests ──────────────────────────────────────────────────────────────

export interface CrearSolicitudManualRequest {
  cedula: number;
  uuidTipoSolicitud: string;
  anio: number;
  periodo: 1 | 2;
  idPrograma?: string;
  idFacultad?: string;
}

export interface AprobarRevisionRequest {
  observacion?: string;
}

// ─── Responses ─────────────────────────────────────────────────────────────

export interface RevisionDependenciaResponse {
  uuid: string;
  uuidDependencia: string;
  nombreDependencia: string;
  estado: EstadoRevision;
  puedeAprobar: boolean;
  motivoBloqueo: string | null;
  ordenFlujo: number;
  flujoParalelo: boolean;
}

export interface SolicitudResponse {
  uuid: string;
  uuidTipoSolicitud: string;
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

// ─── Paginación ─────────────────────────────────────────────────────────────

export interface PagedSolicitudResponse {
  content: SolicitudResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export interface SolicitudFilter {
  estado?: EstadoSolicitud | null;
  anio?: number | null;
  periodo?: 1 | 2 | null;
}
