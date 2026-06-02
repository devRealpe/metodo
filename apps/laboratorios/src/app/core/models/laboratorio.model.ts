export interface Laboratorio {
  id: string; 
  nombre: string;
  capacidad: number; 
  descripcion?: string | null;
  estado: 'Disponible' | 'Ocupado' | 'Mantenimiento' | string;
  ubicacion?: string | null;
  tipo?: string | null;
  bloque?: string | null;
  ocupados?: number;
  horarioDetalle?: string | undefined;
}

export interface OcupacionLaboratorio {
  ocupados: number;
  capacidad: number;
  disponibles: number;
}
