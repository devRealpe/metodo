export interface TipoConvenio {
  id: string;
  titulo: string;
  codigo?: string;
  idPadre?: string;
  tipoPadre?: TipoConvenio;
  tiposHijos?: TipoConvenio[];
}