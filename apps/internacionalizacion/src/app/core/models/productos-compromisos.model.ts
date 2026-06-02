export interface ProductosCompromisos {
  id?: string;
  compromiso: string;
  fechaEntrega?: string; // Mantener como string pero en formato ISO (YYYY-MM-DD)
  estado: string; // Cambiar de union type a string para flexibilidad
  observaciones: string;
  revisado?: boolean; // marca manual del revisor
  movilidad?: { id: string };
}