import { DropdownItem } from '@microfrontends/shared-models';

export const TIPOCONVENIO: DropdownItem[] = [];
export const CONVENIOOPCION: DropdownItem[] = [];

export const ESTADO_CONVENIO: DropdownItem[] = [
  { id: 'borrador', nombre: 'Borrador' },
  { id: 'activo', nombre: 'Activo' },
  { id: 'en_renovacion', nombre: 'En renovación' },
  { id: 'suspendido', nombre: 'Suspendido' },
  { id: 'terminado', nombre: 'Terminado' },
  { id: 'vencido', nombre: 'Vencido' }
];

export const ORGANO_APROBADOR: DropdownItem[] = [
  { id: 'Consejo Directivo', nombre: 'Consejo Directivo' },
  { id: 'Consejo Académico', nombre: 'Consejo Académico' },
  { id: 'Rectoría', nombre: 'Rectoría' }
];

export const TIPO_DURACION_ESTRUCTURADA: DropdownItem[] = [  { id: 'INDEFINIDO', nombre: 'Indefinido' },
  { id: 'RENOVACION_AUTOMATICA', nombre: 'Renovación Automática' }
];

export const HISTORIAL_TIPO_OPCIONES: DropdownItem[] = [
  { id: 'RENOVACION', nombre: 'Renovación' },
  { id: 'REVISION', nombre: 'Revisión' },
  { id: 'PRORROGA', nombre: 'Prórroga' }
];

export const HISTORIAL_ESTADO_OPCIONES: DropdownItem[] = [
  { id: 'PENDIENTE', nombre: 'Pendiente' },
  { id: 'EJECUTADO', nombre: 'Ejecutado' },
  { id: 'CANCELADO', nombre: 'Cancelado' }
];

export const AREAS_COOPERACION = [
  { id: 'intercambio_estudiantil', nombre: 'Intercambio estudiantil' },
  { id: 'doble_titulacion', nombre: 'Doble titulación' },
  { id: 'pasantia_practica', nombre: 'Pasantía / Práctica' },
  { id: 'mision_academica', nombre: 'Misión académica' },
  { id: 'estancia_investigacion', nombre: 'Estancia de investigación' },
  { id: 'movilidad_docente', nombre: 'Movilidad docente' },
  { id: 'curso_corto', nombre: 'Curso corto' },
  { id: 'cooperacion_general', nombre: 'Cooperación general' }
];

