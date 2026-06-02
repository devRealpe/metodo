import { LbEquipoAlmacen } from './lb-equipo-almacen.model';

export interface LbEquipoUnidad {
  id: string;
  equipoAlmacen: LbEquipoAlmacen;
  serial?: string;
  placa?: string;
  fechaAdquisicion?: string | null;
  garantia?: string | null;
  valor?: number | null;
  estado: string; // disponible | asignado | en_mantenimiento | dado_de_baja
  observaciones?: string;
  accesorios?: string[];
  categoria?: string | null;
}


export interface LbEquipoUnidadPayload {
  serial?: string;
  placa?: string;
  fechaAdquisicion?: string | null;
  garantia?: string | null;
  valor?: number | null;
  estado: string;
  observaciones?: string;
  accesorios?: string[];
  categoria?: string | null;
}
