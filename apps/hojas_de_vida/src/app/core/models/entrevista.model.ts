export type EstadoEntrevista = 'borrador' | 'en_revision' | 'finalizado' | 'aprobado';
export type CargoFirma = 'decano' | 'experto_tecnico' | 'director' | 'psicologo';
export interface EntrevistaDto {
  correo?: string;
  celular1?: string;
  telefono?: string;
  tipoDocumento?: string;
  identificacion?: string;
  
  postulacion?: { id: string };
  id?: string;
  
  estado?: EstadoEntrevista; 
  cargoRequerido?: string;
  nombreAspirante?: string;
  
  fechaEntrevista?: Date | string; 
  calificacionEntrevista?: string;     
  calificacionAssessment?: string;     
  calificacionFinal?: string;        
  formacionAcademica?: string;
  experienciaProfesional?: string;
  aspectoFamiliar?: string;
  aspectoPersonal?: string;
  
  requiereAssessment?: boolean;
  analisisAssessment?: string;
  
  observacionesFinales?: string;
  
  promedioCompetencias?: number;
  competenciasEvaluadas?: number;
  
  completitud?: number;          
  firmasRegistradas?: number;     
  
  competenciasCardinales?: CompetenciaCardinalDTO[];
  firmas?: EntrevistaFirmaDTO[];
  
  fechaCreacion?: Date | string;
  fechaModificacion?: Date | string;
  creadoPor?: string;
  modificadoPor?: string;
}


export interface CompetenciaCardinalDTO {
  id?: string;
  idCompetenciaMaestra?: string;  
  nombre: string;                 
  definicion: string;             
  orden: number;                  
  calificacion?: number;          
  observaciones?: string;         
  fechaEvaluacion?: string;       
  evaluadoPor?: string;           
}

export interface CompetenciaMaestraDto {
  id: string;
  nombre: string;
  definicion: string;
  orden: number;
  activa: boolean;
}

export interface EntrevistaFirmaDTO {
  id?: string;
  cargoFirma: CargoFirma;        
  idUsuario?: string;            
  nombreUsuario: string;          
  fechaFirma?: string;            
  firmaDigital?: string;          
  observaciones?: string;         
  ipFirma?: string;               
  dispositivo?: string;           
}

export type CompetenciaEvaluadaDto = CompetenciaCardinalDTO;
export type FirmaDto = EntrevistaFirmaDTO;

export interface CambioEstadoRequest {
  estado: EstadoEntrevista;
  observaciones?: string;
}


export interface ActualizarCompetenciasRequest {
  nombre: string;                
  calificacion?: number;          
  observaciones?: string;
}

export interface ActualizarCompetenciaRequest {
  calificacion: number;
  observaciones?: string;
}

export interface BatchCompetenciasRequest {
  actualizaciones: Array<{
    idCompetencia: string;
    calificacion: number;
    observaciones?: string;
  }>;
}

export interface ResumenEntrevistaDto {
  id: string;
  nombreAspirante: string;
  cargoRequerido: string;
  fechaEntrevista: Date | string;
  estado: EstadoEntrevista;
  promedioCompetencias: number;
  competenciasEvaluadas: number;
  firmasRegistradas: number;
  completitud: number;
}

export interface EstadisticasEntrevistasDto {
  totalEntrevistas: number;
  porEstado: {
    borrador: number;
    en_revision: number;
    finalizado: number;
    aprobado: number;
  };
  promedioGeneralCompetencias: number;
  entrevistasPorMes?: Record<string, number>;
}

export interface FiltrosEntrevistaDto {
  aspirante?: string;
  cargo?: string;
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  estado?: EstadoEntrevista;
  promedioMin?: number;
  promedioMax?: number;
  page?: number;
  size?: number;
  sort?: string;
}


export interface PaginatedEntrevistasDto {
  content: EntrevistaDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
