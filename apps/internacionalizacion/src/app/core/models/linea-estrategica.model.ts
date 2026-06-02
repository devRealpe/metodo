export interface LineaEstrategica {
  id: string;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  orden?: number;
  idPadre?: string;
  lineaPadre?: LineaEstrategica;
  lineasHijas?: LineaEstrategica[];
  activo?: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}