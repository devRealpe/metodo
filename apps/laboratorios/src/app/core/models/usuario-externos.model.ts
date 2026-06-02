import { RegistroExterno } from './registro-externo.model';

export interface UsuarioExterno {
  id?: string;
  nombre: string;
  identificacion: string;
  cargo?: string | null;
  genero?: string | null;
  tipoUsuario: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  fecha?: string | null;
  registroExterno?: { id: string } | RegistroExterno;
}