export interface RegistroExterno {
  id?: string;
  nitEmpresa: string;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
}
