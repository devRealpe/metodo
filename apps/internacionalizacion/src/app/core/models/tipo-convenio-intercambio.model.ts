export interface TipoConvenioIntercambio {
  id: string;
  titulo: string;
  codigo?: string;
  idPadre?: string;
  tipoPadre?: TipoConvenioIntercambio;
  tiposHijos?: TipoConvenioIntercambio[];
  // nuevo campo para enlazar con TipoConvenio
  tipoConvenioId?: string;
}