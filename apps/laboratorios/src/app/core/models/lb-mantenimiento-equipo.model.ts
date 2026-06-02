import { LbEquipoUnidad } from './lb-equipo-unidad.model';

export interface LbMantenimientoEquipo {
  id: string;
  equipoUnidad: LbEquipoUnidad;
  fechaProgramada: string;
  fechaRealizada?: string | null;
  tipoMantenimiento: string;
  observaciones?: string;
  estado: string;
  responsable?: string;
  ubicacion?: string;
}
export interface LbMantenimientoEquipoPayload {
  fechaProgramada: string;
  fechaRealizada?: string | null;
  tipoMantenimiento: string;
  observaciones?: string;
  estado: string;
  responsable?: string;
}
