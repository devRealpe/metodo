export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  entidad: string;
  entidadId: string;
  fecha: string;
}
