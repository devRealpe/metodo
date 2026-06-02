export interface EvaluacionEstadoHistorial {
  id: string;
  evaluacionId: string;
  estado: string;
  usuarioId: string;
  usuarioNombre: string;
  fecha: string;
}

export interface EvaluationResponse {
  id: string;
  evaluacionId: string;
  itemId: string;
  itemDescripcion: string;
  itemTipo: string;
  escalaId: string;
  escalaEtiqueta: string;
  escalaValor: number;
  valor: number;
  observacion?: string;
  createdAt?: string;
}

export interface Evaluacion {
  id: string;
  asignacionId: string;
  formatoVersionId: string;
  estado: string;
  puntajeTotal: number;
  observacionGeneral?: string;
  fechaFirmaEvaluador?: string;
  fechaFirmaEvaluado?: string;
  nombreEvaluado?: string;
  nombreEvaluador?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveResponsesRequest {
  respuestas: ResponseItem[];
}

export interface ResponseItem {
  itemId: string;
  escalaId?: string;
  valor?: number;
  observacion?: string;
}

export interface SignByEmployeeRequest {
  observacionFirmaEvaluado?: string;
}

export interface ReturnRequest {
  observaciones: string;
}
