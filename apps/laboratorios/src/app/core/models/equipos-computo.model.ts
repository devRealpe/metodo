export interface EquiposComputo {
  id: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  serial: string;
  ubicacion?: string;
  fechaAdq: string | Date | null; 
  creadoEn: string; 
  actualizadoEn: string; 
}


export type EquiposComputoCreate = Omit<EquiposComputo, 'id' | 'creadoEn' | 'actualizadoEn'>;
export type EquiposComputoUpdate = Partial<Omit<EquiposComputo, 'id' | 'creadoEn' | 'actualizadoEn'>>;


export enum TipoEquipo {
  COMPUTADOR = 'computador',
  SWITCH = 'switch',
  ACCESS_POINT = 'ap',
  TELEFONO = 'telefono',
  CAMARA = 'camara',
  CCTV = 'cctv',
  UPS = 'ups'
}