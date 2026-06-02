export interface Mantenimiento {
  id?: string;
  hojaDeVidaId: string;

  tipoServicio: string;

  tecnicoIdentificacion?: string;
  contratistaNombre?: string;
  contratistaEmpresa?: string;

  tipoMantenimiento: string;
  estado: string;

  periodo?: string;
  numeroCalibracion?: number;

  fechaProgramada: string;
  fechaEjecucion?: string;
  fechaProximoMant?: string;

  descripcion?: string;
  trabajoRealizado?: string;
  observaciones?: string;

  enGarantia?: boolean;
  enviadoProveedor?: boolean;
  proveedorDestino?: string;
  fechaEnvioProveedor?: string;
  fechaRetornoProveedor?: string;
  numeroRma?: string;

  piezasReemplazadas?: string;
  repuestosInternos?: boolean;

  tiempoEjecucionMin?: number;

  requiereCertificado?: boolean;
  certificadoUrl?: string;
  certificadoNumero?: string;
  certificadoVigencia?: string;
  entidadCertificadora?: string;
  normaAplicada?: string;

  estadoFinal?: string;

  creadoPor?: string;
  creadoEn?: string;
  actualizadoPor?: string;
  actualizadoEn?: string;
}
