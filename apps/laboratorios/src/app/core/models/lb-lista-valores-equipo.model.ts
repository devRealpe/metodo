export interface LbListaValoresEquipo {
  id: string;
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}

export interface LbListaValoresEquipoCreateDto {
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}

export interface LbListaValoresEquipoUpdateDto {
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}
