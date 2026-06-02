// Interfaces y constantes relacionadas con autorizaciones de movilidad

export interface MovilidadPostulante {
  id: string;
  movilidadId: string;
  postulanteId: string;
  solicitarAutorizacion: boolean;
}

// Constantes para estados de autorización
export const ESTADOS_AUTORIZACION = {
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  PARCIAL: 'parcial'
} as const;

export type EstadoAutorizacion = typeof ESTADOS_AUTORIZACION[keyof typeof ESTADOS_AUTORIZACION];

// Constantes para niveles de aprobación
export const NIVELES_APROBACION = {
  NIVEL_1: 1,
  NIVEL_2: 2,
  NIVEL_3: 3,
  NIVEL_4: 4,
  NIVEL_5: 5,
  NIVEL_6: 6
} as const;