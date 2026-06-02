export interface Suministro {
  id: string;
  codigoProducto: string;
  nombreProducto: string;
  descripcion?: string;
  categoria?: string;
  unidadMedida?: string;
  stockMinimo?: number;
  cantidad?: number;
  estado?: string;
  fechaVencimiento?: string | Date;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}