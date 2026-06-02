import { Movilidad } from './movilidad.model';

export interface TipoRubro {
  id: string;
  nombre: string;
}

export interface RubroPresupuestal {
  id?: string; // UUID
  movilidad?: Movilidad;
  tipoRubro?: TipoRubro;
  numero?: number;
}

export interface RubroPresupuestalCreation {
  movilidadId: string;
  tipoRubroId: string;
  numero: number;
}

export interface RubroPresupuestalList {
  rubros: RubroPresupuestal[];
  tiposDisponibles: TipoRubro[];
}