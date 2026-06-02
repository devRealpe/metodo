import { Persona } from './persona.model';
import { OfertaLaboral } from './oferta-laboral.model';

export interface HistorialPostulacion {
  id: string;
  fechaPostulacion: string | Date;
  estado: string;
  tituloPostulacion: string;
  descripcion: string;
  aceptacionDeclaracion: boolean;
  aprueba: boolean | null;
  puntajeFinal: number;
  
  persona: Persona; 
  ofertaLaboral?: OfertaLaboral;  
  
  nombreCompleto?: string;
  identificacion?: string;
  personaId?: string;
  fotoUrl?: string;
  cargoRequerido?: string;
  aprobacionTexto?: string;
  
  porcentajeAprobacion?: number;  
  totalRequisitos?: number;        
  nombres?: string;                
  apellidos?: string;              
  numeroDocumento?: string;        
  tipoDocumento?: string;        
}

export interface PaginatedHistorialPostulacion {
  content: HistorialPostulacion[];
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
