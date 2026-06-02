import { Sector } from './sector.model';
import { TipoConvenio } from './tipo-convenio.model';
import { TipoConvenioIntercambio } from './tipo-convenio-intercambio.model';

export interface Convenio {
  id: string;
  codigo: string;
  objeto: string;
  tipoConvenio?: TipoConvenio;
  tipoConvenioIntercambio?: TipoConvenioIntercambio;
  modalidad?: string;
  clasificacion?: string;
 facultad?: string;
  programa?: string;
  programas?: string[];  // seleccion múltiple adicional
  convenioOpcion: string;
  institucionDestino: string;
  pais: string;
  departamento: string;
  ciudad: string;
  contactoConvenio?: string;
  contactoNombre?: string;
  contactoCargo?: string;
  telefono?: string;
  fechaInicio: string; 
  fechaFin?: string;  
  prorroga?: boolean;
  prorrogaDescripcion?: string;
  responsable?: string; 
  vigente?: boolean;
  estado?: string;
  estadoDisplay?: string;
  requiereRenovacion?: boolean;
  alcance?: string;
  observaciones?: string;
  numeroActaAprobacion?: string;
  fechaActaAprobacion?: string;
  organoAprobador?: string;
  firmanteUmariana?: string;
  cargoFirmanteUmariana?: string;
  sector?: Sector;
  tipoDuracion?: string;
  tiempoAnios?: number;
  tipoDuracionEstructurada?: string;
  revisionAnios?: number;
  cobertura?: string;
  programasSolicitantes?: ProgramaSolicitante[];
  areasCooperacion?: AreaCooperacion[];
}

export interface ProgramaSolicitante {
  id?: string;
  programaId: string;
  esLider: boolean;
}

export interface AreaCooperacion {
  id?: string;
  area: string;
}

export interface Alcance {
  codigo: string;
  nombre: string;
}
export interface Clasificacion {
  codigo: string;
  nombre: string;
}
export interface ConvenioOpcion {
  codigo: string;
  nombre: string;
} 
export interface Estado {
  codigo: string;
  nombre: string;
} 
export interface Facultad {
  codigo: string;
  nombre: string;
}
export type ConvenioCreate = Omit<Convenio, 'id'>;
export type ConvenioUpdate = Partial<ConvenioCreate>;

export interface ConvenioFechaProgramada {
  id: string;
  tipo: string;
  fechaProgramada: string;
  numero: number;
  estado: string;
  fechaInicioVigencia?: string;
  fechaFinVigencia?: string;
}
