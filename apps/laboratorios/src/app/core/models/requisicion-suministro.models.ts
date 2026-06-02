export interface RequisicionSuministro {
  solicitanteNombre: string;
  solicitanteCedula: string;
  solicitanteCentroCosto: string;
  solicitanteDependencia: string;
  fechaSolicitud: string;
  tipoActivoFijo: boolean;
  tipoSuministro: boolean;
  tipoServicio: boolean;
  relacionPmi: boolean;
  relacionBn: boolean;
  relacionPdi: boolean;
  relacionGasto: boolean;
  relacionInversion: boolean;
  codigoPmi?: string;
  codigoBn?: string;
  proyectoEstrategico?: string;
  items: ItemSuministro[];
}

export interface ItemSuministro {
  descripcion: string;
  cantidad: number;
  unidad: string;
}

export interface RequisicionValidation {
  valida: boolean;
  mensaje: string;
}

export interface RequisicionResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface FormErrors {
  solicitanteNombre?: string;
  solicitanteCedula?: string;
  solicitanteCentroCosto?: string;
  solicitanteDependencia?: string;
  fechaSolicitud?: string;
  tipoSolicitud?: string;
  items?: string;
  general?: string;
}
