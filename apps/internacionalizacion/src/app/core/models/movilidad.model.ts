// movilidad.model.ts
import { Modalidad } from './modalidad.model';
import { LineaEstrategica } from './linea-estrategica.model';
import { Cobertura } from './cobertura.model';
import { Periodo } from './periodo.model';
import { TipoMovilidad } from './tipo-movilidad.model';

export interface Movilidad {
  id: string;
  nombreMovilidad: string;
  nombreEvento?: string;
  tipoMovilidad: TipoMovilidad; 
  tipoActividad: string;
  modalidad: Modalidad; 
  fechaInicio: string;
  fechaFin: string;
  facultad: string;
  programa: string;
  codigoSnies?: string;  
  lugarDestino: string;
  institucionOrigen?: string;
  paisOrigen?: string;
  departamentoOrigen?: string;
  ciudadOrigen?: string;
  periodo: Periodo; 
  periodoNombre?: string; 
  pais: string;
  departamento: string;
  ciudad: string;
  cobertura: Cobertura; 
  coberturaNombre?: string; 
  valorFinanciacionNacional: number;
  valorFinanciacionInternacional: number;
  objeto: string;
  lineaEstrategica: LineaEstrategica; 
  // financing sources were removed from backend; calculations now handled server-side
  entidadNacional: string;
  entidadInternacional: string;
  paisFinanciador: string;
  totalFinanciacion: number;
  codigoConvenio?: string;
  convenioAsociado?: string;
  convenio?: {
    id: string;
  };
  estado: string; 
  estadoAprobacion?: string; 
  solicitarAutorizacion?: boolean;
  movilidadPostulanteId?: string; // identificador alternativo usado por la tabla movilidad_postulante
  movilidadEstudianteId?: string; // identificador alternativo usado por movilidades-estudiante
  autorizacionesAprobadas?: boolean; 
  aprobado?: string; 
  fechasProgramadas?: MovilidadFechaProgramada[];
  duracionConfig?: MovilidadDuracionConfig;
}

export interface MovilidadFechaProgramada {
  id: string;
  tipo: string; // 'RENOVACION' o 'REVISION'
  fechaProgramada: string;
  numero: number;
}

export interface MovilidadDuracionConfig {
  id: string;
  tiempoAnios?: number;
  tipoDuracionEstructurada?: string;
  revisionAnios?: number;
  renovacionAnios?: number;
}


export interface MovilidadExcelParams {
  nombre?: string;
  modalidad?: string;
  tipoMovilidad?: string;
  estado?: string;
  viewMode?: 'normal' | 'cerradas';
  cobertura?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

