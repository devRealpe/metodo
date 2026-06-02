export interface Sector {
  id: string;
  nombre: string;
  orden?: number;
  idPadre?: string;
  sectorPadre?: Sector;
  sectoresHijos?: Sector[];
  fechaCreacion?: string;
  fechaActualizacion?: string;
}