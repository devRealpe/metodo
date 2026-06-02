import { LbEquipoAlmacen } from './lb-equipo-almacen.model';
import { LbLaboratoriosAulas } from './lb-laboratorios-aulas.model';
import { LbEquipoUnidad } from './lb-equipo-unidad.model';

export interface LbEquipoAula {
  
  id: string;
  equipoAlmacen: LbEquipoAlmacen;
  cantidadDisponible: number;
  laboratorio: LbLaboratoriosAulas;
  equipoUnidad?: LbEquipoUnidad;
  responsable?: string;
}

export interface LbEquipoAulaPayload {
  responsable?: string; 
}
