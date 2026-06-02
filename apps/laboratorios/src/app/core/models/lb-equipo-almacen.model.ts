export interface LbEquipoAlmacen {
  
  id: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  stock: number;
  unidadesDisponibles?: number;
}
