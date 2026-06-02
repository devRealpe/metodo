export interface Actividad {
  id: string;
  nombre: string;
  tieneAsesorias: boolean;
  tieneDescripcion: boolean;
  horasMaximas: number;
  secciones?: {
    id: string;
    nombre: string;
    concepto: string;
  };
}

export interface CrearActividad {
  nombre: string;
  tieneDescripcion: boolean;
  tieneAsesorias: boolean;
  seccionId: string;
  horasMaximas: number;
}