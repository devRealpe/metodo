export interface ArchivosUsuarios {
  id?: number;
  identificacionUsuario: string;
  nombreArchivo: string;
  rutaArchivo: string;
  tipoArchivo?: string;
  tamanio?: number;
  fechaSubida?: Date | string;
  codigoSolicitud?: string;
}