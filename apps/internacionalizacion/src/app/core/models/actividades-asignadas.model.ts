export interface ActividadAsignada {
  id?: string;
  nombre: string;
  compromiso: string;
  verificacion: string;
  observaciones: string;
  estado: string; 
  revisado?: boolean; // marca manual del revisor
  movilidad?: { id: string };
}