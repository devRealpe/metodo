import { UsuarioOracle } from './usuarios-oracle.model';

export interface Postulante {
  id?: string;
  numIdentificacion: string;
  tipoDocumento?: string;
  nombres: string;
  apellidos: string;
  programa: string;
  vinculacion: string;
  correo?: string;
  telefono?: string;
  promedioAcumulado?: number;
  creditosCursados?: number;
  porcentajePlanEstudios?: number;
  usuarioOracle?: UsuarioOracle;
  fechaPostulacion?: string;
  estado?: string;
  solicitarAutorizacion?: boolean;
}