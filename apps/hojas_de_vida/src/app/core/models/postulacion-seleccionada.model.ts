
import { HistorialPostulacion } from './historial-postulacion.model';

export interface PostulacionSeleccionada {
  id?: string;
  motivo?: string;
  seleccionadoPor?: string;       
  fechaSeleccion?: Date | string;
  seleccionadoFase3?: boolean;    
  fechaSeleccionFase3?: Date | string;
  creadoEn?: string;
  actualizadoEn?: string;
  postulacion: HistorialPostulacion;
}


export interface CrearSeleccionRequest {
  historialPostulacionId: string;
  ofertaLaboralId: string;
  observaciones?: string; // Opcional
}


export interface CrearSeleccionResponse {
  id: string;
  idPostulacion: string;
  idOferta: string;
  seleccionadoPor: string;
  fechaSeleccion: string;
  motivo?: string;
  nombreAspirante: string;
  documentoAspirante: string;
  emailAspirante?: string;
  telefonoAspirante?: string;
  cargoOferta: string;
  numeroConvocatoria: string;
  puntajeFinal?: number;
}

export interface VerificacionSeleccion {
  estaSeleccionado: boolean;  // Backend usa 'estaSeleccionado'
  seleccionado?: boolean;      // Alias por compatibilidad
  idSeleccion?: string;
  fechaSeleccion?: Date | string;
}
