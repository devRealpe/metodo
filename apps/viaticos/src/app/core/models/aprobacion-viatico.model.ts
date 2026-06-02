export interface AprobacionViatico {
  id?: string;
  codigoSolicitud: string;
  nivelAprobacion: number;
  aprobadorIdentificacion: string;
  aprobadorNombre: string;
  aprobadorCargo?: string;
  aprobadorEmail?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  observaciones?: string;
  fechaAsignacion?: string;
  fechaAprobacion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InicializarAprobacionRequest {
  codigoSolicitud: string;
  // Nivel 1: Decano o Director de Oficina
  decanoId: string;
  decanoNombre: string;
  // Nivel 2: Director de Programa
  directorProgramaId: string;
  directorProgramaNombre: string;
  // Nivel 3: Director de Talento Humano
  directorTalentoHumanoId: string;
  directorTalentoHumanoNombre: string;
  // Nivel 4: Vicerrector Administrativo
  vicerrectorAdministrativoId: string;
  vicerrectorAdministrativoNombre: string;
}

export interface AprobacionResponse {
  success: boolean;
  message: string;
  data?: AprobacionViatico;
}

export interface ConceptoLiquidacion {
  concepto: string;  // ID del concepto
  conceptoNombre?: string;  // Nombre legible del concepto
  marcado: boolean;
  numeroDiasNoches: number;
  valorUnitario: number;
  subtotal: number;
  valorAprobado?: number;  // Valor aprobado por el aprobador
  observaciones?: string;
  modificadoPorAprobador?: boolean;
  nivelAprobacionModificacion?: number;
  fechaModificacion?: string;
}
