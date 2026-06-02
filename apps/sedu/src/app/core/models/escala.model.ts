export interface Escala {
  id: string;
  codigo: string;
  etiqueta: string;
  valor: number;
  createdAt?: string;
}

export interface CreateScaleRequest {
  codigo: string;
  etiqueta: string;
  valor: number;
}

export interface UpdateScaleRequest {
  etiqueta?: string;
  valor?: number;
}
