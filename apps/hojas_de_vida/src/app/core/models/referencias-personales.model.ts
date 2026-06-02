export interface Referencia {
  id?: string;
  tipo_referencia: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  celular: string;
  direccion: string;
  ocupacion: string;
  empresa: string;
  cargo: string;
  persona: { id: string };
}
