export interface TipoPractica {
  id: string;
  nombre: string;
  tipo: string;
}

export interface TipoPracticaCreateDto {
  nombre: string;
  tipo: string;
}

export interface TipoPracticaUpdateDto {
  nombre?: string;
  tipo?: string;
}
