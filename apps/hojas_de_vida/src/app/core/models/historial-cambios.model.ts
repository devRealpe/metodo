
export interface HistorialCambios {
  id: string;
  tablaAfectada: string;
  idRegistro: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  datosAnteriores?: any;
  datosNuevos?: any;
  motivoCambio?: string;
  usuarioKeycloakId: string;
  usuarioNombre: string;
  usuarioEmail?: string;
  fechaCambio: string;
  ipCliente?: string;
  userAgent?: string;
}

export interface HistorialCambiosDto {
  id: string;
  tablaAfectada: string;
  idRegistro: string;
  accion: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  motivoCambio?: string;
  usuarioKeycloakId: string;
  usuarioNombre: string;
  usuarioEmail?: string;
  fechaCambio: string;
  ipCliente?: string;
  userAgent?: string;
}


export interface HistorialCambiosPage {
  content: HistorialCambiosDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface EstadisticaAuditoria {
  tabla?: string;
  usuario?: string;
  totalCambios: number;
  ultimoCambio?: string;
}
