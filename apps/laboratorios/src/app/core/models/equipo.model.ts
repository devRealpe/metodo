export interface Equipo {
  id: string;
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
  serial?: string;
  placa?: string;
  codigoInterno?: string;
  ubicacion?: string;
  fechaAdq: string | Date | null;
  otrosAccesorios?: string;
  observaciones?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}