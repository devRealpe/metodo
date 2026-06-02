export interface Seccion {
  id: string;
  formatoVersionId: string;
  nombre: string;
  orden: number;
  createdAt?: string;
}

export interface CreateSectionRequest {
  formatoVersionId: string;
  nombre: string;
  orden: number;
}

export interface UpdateSectionRequest {
  nombre?: string;
  orden?: number;
}
