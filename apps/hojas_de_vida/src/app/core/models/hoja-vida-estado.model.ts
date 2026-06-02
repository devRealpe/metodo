export interface HojaVidaSeccionEstadoDTO {
  id?: number;
  usuarioId: string;
  seccion: string;
  seccionDescripcion?: string;
  completada: boolean;
  cantidadRegistros: number;
  tieneDatosRequeridos: boolean;
  porcentajeCompletitud: number;
  fechaActualizacion?: Date | string;
  fechaCreacion?: Date | string;
  esRequerida?: boolean;
}

export interface HojaVidaResumenDTO {
  usuarioId: string;
  totalSecciones: number;
  seccionesCompletadas: number;
  seccionesIncompletas: number;
  seccionesRequeridas: number;
  seccionesRequeridasCompletadas: number;
  porcentajeCompletitudTotal: number;
  porcentajeCompletitudRequeridas: number;
  hojaVidaCompleta: boolean;
  secciones: HojaVidaSeccionEstadoDTO[];
  seccionesIncompletasCodigos: string[];
}

export enum SeccionHojaVida {
  INFORMACION_PERSONAL = 'informacion_personal',
  INFORMACION_ACADEMICA = 'informacion_academica',
  INFORMACION_LABORAL = 'informacion_laboral',
  INFORMACION_FAMILIAR = 'informacion_familiar',
  REFERENCIAS_PERSONALES = 'referencias_personales',
  COMPETENCIAS = 'competencias',
  AFILIACIONES = 'afiliaciones',
  DOCUMENTOS_SOPORTE = 'documentos_soporte'
}

export const ROUTE_TO_SECCION_MAP: Record<string, string> = {
  'informacion-personal': SeccionHojaVida.INFORMACION_PERSONAL,
  'informacion-academica': SeccionHojaVida.INFORMACION_ACADEMICA,
  'informacion-laboral': SeccionHojaVida.INFORMACION_LABORAL,
  'informacion-familiar': SeccionHojaVida.INFORMACION_FAMILIAR,
  'referencias-personales': SeccionHojaVida.REFERENCIAS_PERSONALES,
  'competencias': SeccionHojaVida.COMPETENCIAS,
  'afiliaciones': SeccionHojaVida.AFILIACIONES,
  'documentos-soporte': SeccionHojaVida.DOCUMENTOS_SOPORTE
};

export const SECCION_TO_ROUTE_MAP: Record<string, string> = {
  [SeccionHojaVida.INFORMACION_PERSONAL]: 'informacion-personal',
  [SeccionHojaVida.INFORMACION_ACADEMICA]: 'informacion-academica',
  [SeccionHojaVida.INFORMACION_LABORAL]: 'informacion-laboral',
  [SeccionHojaVida.INFORMACION_FAMILIAR]: 'informacion-familiar',
  [SeccionHojaVida.REFERENCIAS_PERSONALES]: 'referencias-personales',
  [SeccionHojaVida.COMPETENCIAS]: 'competencias',
  [SeccionHojaVida.AFILIACIONES]: 'afiliaciones',
  [SeccionHojaVida.DOCUMENTOS_SOPORTE]: 'documentos-soporte'
};
