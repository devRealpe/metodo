export interface Periodo {
  id: string;
  nombre: string;
  codigo?: string;
  orden?: number;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  display?: string;
}