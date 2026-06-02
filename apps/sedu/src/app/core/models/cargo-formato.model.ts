export interface CargoFormato {
  id: string;
  codigoCargo: string;
  idFormato: string;
  activo: boolean;
}

export interface CreateCargoFormatoRequest {
  codigoCargo: string;
  idFormato: string;
}
