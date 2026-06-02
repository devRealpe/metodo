export interface Modalidad {
  id: string;
  nombre: string;
  orden?: number;
  idPadre?: string;
  modalidadPadre?: Modalidad;
  modalidadesHijas?: Modalidad[];
}