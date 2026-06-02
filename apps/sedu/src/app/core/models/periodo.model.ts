export type PeriodStatus = 'BORRADOR' | 'ACTIVO' | 'CERRADO';

export interface Periodo {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: PeriodStatus;
  formatoId: string;
  formatoNombre: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePeriodRequest {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  formatoId: string;
}

export interface UpdatePeriodRequest {
  nombre?: string;
  fechaInicio?: string;
  fechaFin?: string;
}
