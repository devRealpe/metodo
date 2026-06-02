export interface DistribucionViaticos {
  id?: string;
  codigoSolicitud: string;
  codigoCentroCosto: string;
  nombreCentroCosto: string;
  fuenteFuncion: string;
  porcentaje: number;
  valorCalculado: number;
  fechaCreacion?: string;
}

export interface DistribucionViaticosCreateDto {
  codigoSolicitud: string;
  codigoCentroCosto: string;
  nombreCentroCosto: string;
  fuenteFuncion: string;
  porcentaje: number;
  valorCalculado: number;
}
