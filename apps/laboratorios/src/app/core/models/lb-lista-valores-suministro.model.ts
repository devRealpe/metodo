export interface LbListaValoresSuministro {
  id: string;
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}

export interface LbListaValoresSuministroCreateDto {
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}

export interface LbListaValoresSuministroUpdateDto {
  nombre: string;
  abreviatura?: string;
  tipo?: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}
