import { Actividad } from '../models/actividad.model';

export interface SeccionHijo {
  id: string;
  nombre: string;
  esPadre: boolean;
  seccionCursos: boolean;
  seccionInvestigativa: boolean;
  actividades: Actividad[];
  concepto: string;
}

export interface SeccionPadre {
  id: string;
  nombre: string;
  esPadre: boolean;
  seccionCursos: boolean;
  seccionInvestigativa: boolean;
  hijos: SeccionHijo[];
}

export interface CreateSeccion {
  nombre: string;
  esPadre: boolean;
  idSeccionPadre?: string | null;
  seccionCursos: boolean;
  seccionInvestigativa: boolean;
  concepto?: string | null;
  idPlantilla?: string | null;
}