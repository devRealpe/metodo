export interface LbLaboratoriosAulas {
  id: string;
  codAula: string;
  nomAula: string;
  codBloque: string;
  nomBloque: string;
  tipoAula: string;
  numCapacidad: number;
  idPadre?: string | null;
}
