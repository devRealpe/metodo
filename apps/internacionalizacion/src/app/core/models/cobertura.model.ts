// cobertura.model.ts
export interface Cobertura {
  id: string;
  nombre: string;
  codigo?: string;
  orden?: number;
  activo?: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  display?: string;
}