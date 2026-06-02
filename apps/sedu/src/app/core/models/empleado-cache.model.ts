export interface EmpleadoCache {
  id: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  correo: string;
  codigoDependencia: string;
  nombreDependencia: string;
  codigoCargo: string;
  nombreCargo: string;
  activo: boolean;
}

export function getNombreCompleto(e: EmpleadoCache): string {
  return [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido]
    .filter(Boolean)
    .join(' ');
}
