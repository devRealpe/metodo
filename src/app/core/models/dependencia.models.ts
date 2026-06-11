// ─── Modelos para Gestión de Dependencias ──────────────────────────────────

// ─── Response ──────────────────────────────────────────────────────────────

export interface DependenciaResponse {
  uuid: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  tipoAcceso: 'IDENTIFICACION' | 'CARGO';
  usuariosAcceso: string[];
  cargosAcceso: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Requests ──────────────────────────────────────────────────────────────

export interface CrearDependenciaRequest {
  nombre: string;
  descripcion?: string;
  tipoAcceso?: 'IDENTIFICACION' | 'CARGO';
}

export interface ActualizarDependenciaRequest {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  tipoAcceso?: 'IDENTIFICACION' | 'CARGO';
}

// ─── Paginación ─────────────────────────────────────────────────────────────

export interface PagedDependenciaResponse {
  content: DependenciaResponse[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
