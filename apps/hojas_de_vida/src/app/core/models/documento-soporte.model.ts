export interface DocumentoSoporte {
  id?: string;
  tipoSoporte: string;
  idPersona: string; 
  archivos?: { id: string; nombre: string }[];
}