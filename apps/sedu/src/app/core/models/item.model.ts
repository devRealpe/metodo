export interface Item {
  id: string;
  seccionId: string;
  descripcion: string;
  tipo: string;
  peso: number;
  orden: number;
  createdAt?: string;
}

export interface CreateItemRequest {
  seccionId: string;
  descripcion: string;
}

export interface UpdateItemRequest {
  descripcion?: string;
}
