export interface Formato {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  createdAt?: string;
}

export interface FormatoVersion {
  id: string;
  formatoId: string;
  formatoCodigo: string;
  formatoNombre: string;
  version: number;
  activo: boolean;
  createdAt?: string;
}

export interface CreateFormatRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface UpdateFormatRequest {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

export interface CreateFormatoVersionRequest {
  formatoId: string;
}
