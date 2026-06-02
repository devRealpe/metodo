export interface ListaValor {
  id: string;
  nombre: string;
  abreviatura?: string;
  tipo: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
  nombrePadre?: string;
}

export interface ListaValorCreateDto {
  nombre: string;
  abreviatura?: string;
  tipo: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}

export interface ListaValorUpdateDto {
  nombre: string;
  abreviatura?: string;
  tipo: string;
  tipoOrden?: string;
  orden?: number;
  idPadre?: string;
}

export enum TipoOrden {
  ALFABETICO_ASC = 'AA',
  ALFABETICO_DESC = 'AD',
  PERSONALIZADO_ASC = 'PA',
  PERSONALIZADO_DESC = 'PD'
}

export const TIPOS_ORDEN_LABELS: { [key in TipoOrden]: string } = {
  [TipoOrden.ALFABETICO_ASC]: 'Alfabético Ascendente (A-Z)',
  [TipoOrden.ALFABETICO_DESC]: 'Alfabético Descendente (Z-A)',
  [TipoOrden.PERSONALIZADO_ASC]: 'Personalizado Ascendente',
  [TipoOrden.PERSONALIZADO_DESC]: 'Personalizado Descendente'
};
