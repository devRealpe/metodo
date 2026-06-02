export type EstadoAprobacion =
  | 'pendiente'
  | 'aprobado'
  | 'rechazado'
  | 'parcial'
  | 'cancelado';

// opciones reutilizables para selects
export const ESTADOS_APROBACION: { label: string; value: EstadoAprobacion }[] = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Aprobado', value: 'aprobado' },
  { label: 'Negado', value: 'rechazado' },
  { label: 'Parcial', value: 'parcial' },
  { label: 'Cancelado', value: 'cancelado' }
];

export const TIPOS_MOVILIDAD: { label: string; value: string }[] = [
  { label: 'Estudiantil', value: 'ESTUDIANTIL' },
  { label: 'Profesoral', value: 'PROFESORAL' }
];


export interface AprobadorDTO {
  rolKeycloak: string;
  nombreCargo: string;
  orden: number;
  campoNivel: string;
}

export interface Autorizacion {
  id?: string;
  movilidadPostulanteId?: string; 
  movilidadEstudianteId?: string; 
  estado: EstadoAprobacion; 
  apoyosEconomicos?: string; 
  apoyosEconomicosAprobadosNivel6?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface AprobacionNivel {
  id?: string;
  movilidadPostulanteId?: string; 
  movilidadEstudianteId?: string; 
  autorizacionId?: string; 
  nivel: number; // 1-7
  rolRequerido: string; 
  rolKeycloak?: string; 
  estado: EstadoAprobacion;
  aprobadorNombre?: string; // Nombre de quien aprueba
  aprobadorCargo?: string; // Cargo/rol del aprobador (viene de Autorizacion.nivelX.rol)
  aprobadorIdentificacion?: string;
  aprobadorEmail?: string;
  aprobadorRoles?: string[]; // Roles del aprobador (desde token/auth)
  comentario?: string;
  fechaAsignacion?: string;
  fechaAprobacion?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}
