export interface Usuario {
  id: string;
  keycloakId: string;
  codigoEmpleado: string;
  nombreSnapshot: string;
  cargoSnapshot: string;
  dependenciaSnapshot: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}
