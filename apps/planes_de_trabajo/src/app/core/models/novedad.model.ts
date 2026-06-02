export interface Novedad {
  id: string;
  idPt?: string;
  planDeTrabajoId?: string;
  motivo: string;
  fechaRegistro: string;
  registradoPor: string;
  estado: string;
  tipoNovedad?: string;
  observaciones?: string;
  fechaResolucion?: string;
  resueltoPor?: string;
}

export interface CrearNovedad {
  idPt: string;
  motivo: string;
  registradoPor: string;
  tipoNovedad?: string;
  observaciones?: string;
}

export interface ActualizarNovedad {
  estado?: 'PENDIENTE' | 'RESUELTA' | 'CANCELADA';
  observaciones?: string;
  fechaResolucion?: string;
  resueltoPor?: string;
}

