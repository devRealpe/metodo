import { Movilidad } from './movilidad.model';

export interface MovilidadProceso {
  id: string;
  movilidad: Movilidad;
  proceso: string;
  objeto?: string;
  estadoAprobacion: string;
  fechaProceso: string;
  progreso?: number;
  archivos?: any[];
}

export interface MovilidadConArchivos extends Movilidad {
  archivos?: any[];
  procesoId?: string;
  estadoGlobal?: string;
}