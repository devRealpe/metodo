import { LbSuministroAlmacen } from './lb-suministro-almacen.model';
import { LbLaboratoriosAulas } from './lb-laboratorios-aulas.model';

export interface LbSuministroAula {
  id: string;
  suministroAlmacen: LbSuministroAlmacen;
  laboratorio: LbLaboratoriosAulas;
  cantidad: number;
  fechaVencimiento?: string | null;
  tipo?: string;
  estado: string;
  cantidadDisponible: number;
  consumible?: boolean;
}
export interface LbSuministroAulaPayload {
  cantidad: number;
  fechaVencimiento?: string | null;
  tipo?: string;
  estado: string;
  cantidadDisponible: number;
  consumible?: boolean;
}
