// tipo-actividad.model.ts
export interface TipoActividad {
  id: string;
  codigo?: string;
  nombre: string;
  orden?: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  display?: string;
}