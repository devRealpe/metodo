export interface TipoMovilidad {
  id: string;
  nombre: string;
  orden?: number;
  idPadre?: string;
  nombreTipoPadre?: string;
  tiposHijos?: TipoMovilidad[];
  fechaCreacion?: string;
  fechaActualizacion?: string;
}