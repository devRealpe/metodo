// ─── Modelos para Gestión de Tipos de Paz y Salvo ──────────────────────────────────

export interface TipoDependenciaItem {
  uuid: string;
  uuidDependencia: string;
  nombreDependencia: string;
  ordenFlujo: number;
  flujoParalelo: boolean;
  createdAt: string;
}

export interface TipoSolicitudAdmin {
  uuid: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  dependencias: TipoDependenciaItem[];
}

export interface PagedTipoSolicitudResponse {
  content: TipoSolicitudAdmin[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CrearTipoSolicitudRequest {
  nombre: string;
  descripcion?: string;
}

export interface ActualizarTipoSolicitudRequest {
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface AgregarDependenciaTipoRequest {
  uuidDependencia: string;
  ordenFlujo: number;
  flujoParalelo?: boolean;
}

export interface ReordenarDependenciaItem {
  uuidTipoDependencia: string;
  nuevoOrden: number;
}
