export interface UbicacionGeografica {
  id: string;
  nombre: string;
  idTipoLv: string;
  idPadre: string | null;
  codigoPais?: string | null;
  orden?: number | null;
  tipoOrden?: string;
  nombreTipo?: string;
  nombrePadre?: string;
}

export interface UbicacionGeograficaNode extends UbicacionGeografica {
  hijos?: UbicacionGeograficaNode[];
  expandido?: boolean;
  nivel?: number;
}

export interface UbicacionGeograficaCreateDto {
  nombre: string;
  idTipoLv: string;
  idPadre: string | null;
  codigoPais?: string | null;
  orden?: number | null;
  tipoOrden?: string;
}

export interface UbicacionGeograficaUpdateDto {
  id: string;
  nombre: string;
  idTipoLv: string;
  idPadre: string | null;
  codigoPais?: string | null;
  orden?: number | null;
  tipoOrden?: string;
}

export enum TipoUbicacion {
  PAIS = 'País',
  DEPARTAMENTO = 'Departamento',
  CIUDAD = 'Ciudad',
  MUNICIPIO = 'Municipio'
}

export enum TipoOrdenUbicacion {
  ALFABETICO_ASC = 'AA',
  ALFABETICO_DESC = 'AD',
  PERSONALIZADO_ASC = 'PA',
  PERSONALIZADO_DESC = 'PD'
}

export const TIPOS_ORDEN_LABELS: Record<TipoOrdenUbicacion, string> = {
  [TipoOrdenUbicacion.ALFABETICO_ASC]: 'Alfabético A-Z',
  [TipoOrdenUbicacion.ALFABETICO_DESC]: 'Alfabético Z-A',
  [TipoOrdenUbicacion.PERSONALIZADO_ASC]: 'Personalizado Ascendente',
  [TipoOrdenUbicacion.PERSONALIZADO_DESC]: 'Personalizado Descendente'
};

export const TIPOS_UBICACION_LABELS: Record<TipoUbicacion, string> = {
  [TipoUbicacion.PAIS]: 'País',
  [TipoUbicacion.DEPARTAMENTO]: 'Departamento',
  [TipoUbicacion.CIUDAD]: 'Ciudad',
  [TipoUbicacion.MUNICIPIO]: 'Municipio'
};
