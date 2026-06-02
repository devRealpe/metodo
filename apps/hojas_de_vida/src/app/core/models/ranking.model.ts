export interface PostulacionRanking {
  id: string;
  personaId: string;
  nombres: string;
  apellidos: string;
  identificacion?: string;  
  fotoUrl: string;
  puntajeFinal: number;
  diferenciaPuntajes: number;
  totalRequisitos: number;
  aprueba: boolean;
  fechaPostulacion: string;
  estado: string;
  tituloPostulacion: string;
  descripcion: string;
  nombreCompleto: string;
  aprobacionTexto: string;
  emailPostulante?: string;
  telefonoPostulante?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
}

export interface EstadisticasOferta {
  totalPostulaciones: number;
  totalAprobados: number;
  totalNoAprobados: number;
  puntajePromedio: number;
  puntajeMaximo: number;
  puntajeMinimo: number;
  porcentajeAprobacion: number;
}


export interface PaginatedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
  };
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface DetallePostulacion {
  id: string;
  personaId: string;
  nombres: string;
  apellidos: string;
  fotoUrl: string;
  puntajeFinal: number;
  diferenciaPuntajes: number;
  totalRequisitos: number;
  aprueba: boolean;
  fechaPostulacion: string;
  estado: string;
  tituloPostulacion: string;
  descripcion: string;
  nombreCompleto: string;
  aprobacionTexto: string;
  emailPostulante?: string;
  telefonoPostulante?: string;
  requisitos?: PostulacionRequisito[];
}

export interface PostulacionRequisito {
  id: string;
  nombreRequisito: string;
  puntajeRespuesta: number;
  puntajeRequisito: number;
  puntajeNormalizado: number;
  respuesta: string;
}

export interface EvaluacionDetalleDTO {
  postulacionId: string;
  nombrePostulante: string;
  tituloOferta: string;
  puntajeFinal: number;
  totalRequisitos: number;
  aprueba: boolean;
  evaluacionesRequisitos: EvaluacionRequisitoDetalle[];
}

export interface EvaluacionRequisitoDetalle {
  nombreRequisito: string;
  descripcionRequisito: string;
  valorRequisito: number;
  puntajeSistema: number;
  puntajeNormalizado: number;
  titulosCoincidentes: string;
  /** Todos los títulos académicos configurados para el requisito (evaluados), separados por "; ". */
  titulosConfigurados?: string;
  detalleCalculo: string;
}

export interface RankingParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
  aprueba?: boolean;
}