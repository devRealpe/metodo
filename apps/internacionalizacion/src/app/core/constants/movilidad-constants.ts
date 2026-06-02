import { Opcion } from '../models/opcion.model';

export const TIPOACTIVIDAD: Opcion[] = [
    { id: 'ESTANCIA', nombre: 'Estancia Académica' },
    { id: 'PASANTIA', nombre: 'Pasantía Profesional' },
    { id: 'INTERCAMBIO', nombre: 'Intercambio Estudiantil' },
    { id: 'MISION', nombre: 'Misión Académica' },
    { id: 'DOBLE_TITULACION', nombre: 'Doble Titulación' },
    { id: 'INVESTIGACION', nombre: 'Investigación Conjunta' },
    { id: 'PRACTICAS', nombre: 'Prácticas Profesionales' },
] as const;

export const MOVILIDADESTADO: Opcion[] = [
  { id: 'ACTIVO', nombre: 'Activo' },
  { id: 'INACTIVO', nombre: 'Inactivo' },
] as const;

export const COBERTURA: Opcion[] = [
  { id: 'NACIONAL', nombre: 'Nacional' },
  { id: 'INTERNACIONAL', nombre: 'Internacional' },
] as const;

export const FACULTAD: Opcion[] = [
  { id: 'EMPRESARIALES', nombre: 'Facultad de Ciencias Empresariales' },
  { id: 'INGENIERIA', nombre: 'Facultad de Ingeniería' },
] as const;

export const FIELD_LABELS = {
  'modalidad': 'Modalidad',
  'nombreMovilidad': 'Código de Movilidad',
  'nombreEvento': 'Nombre del Evento',
  'tipoMovilidad': 'Tipo de Movilidad',
  'fechaInicio': 'Fecha de Inicio',
  'fechaFin': 'Fecha de Fin',
  'lugarDestino': 'Institución Destino',
  'institucionOrigen': 'Institución Origen',
  'paisOrigen': 'País de Origen',
  'tipoActividad': 'Tipo de Actividad'
} as const;

// Campos del formulario de movilidad (excluyendo id y convenio)
export const MOVILIDAD_FORM_FIELDS = [
  'nombreMovilidad',
  'nombreEvento',
  'tipoMovilidad',
  'tipoActividad',
  'modalidad',
  'fechaInicio',
  'fechaFin',
  'facultad',
  'programa',
  'codigoSnies',
  'lugarDestino',
  'institucionOrigen',
  'paisOrigen',
  'departamentoOrigen',
  'ciudadOrigen',
  'periodo',
  'pais',
  'departamento',
  'ciudad',
  'cobertura',
  'valorFinanciacionNacional',
  'valorFinanciacionInternacional',
  'objeto',
  'lineaEstrategica',
  'entidadNacional',
  'entidadInternacional',
  'paisFinanciador',
  'totalFinanciacion',
  'convenioAsociado',
  'solicitarAutorizacion'
] as const;

// Valores por defecto para el formulario de movilidad
export const MOVILIDAD_DEFAULT_FORM_VALUES = {
  nombreMovilidad: '',
  nombreEvento: '',
  tipoMovilidad: '',
  tipoActividad: '',
  modalidad: '',
  fechaInicio: '',
  fechaFin: '',
  facultad: '',
  programa: '',
  codigoSnies: '',
  lugarDestino: '',
  institucionOrigen: '',
  paisOrigen: '',
  departamentoOrigen: '',
  ciudadOrigen: '',
  semestre: '',
  periodo: null,
  pais: '',
  departamento: '',
  ciudad: '',
  cobertura: null,
  valorFinanciacionNacional: 0,
  valorFinanciacionInternacional: 0,
  objeto: '',
  lineaEstrategica: null,
  entidadNacional: '',
  entidadInternacional: '',
  paisFinanciador: '',
  totalFinanciacion: 0,
  convenioAsociado: '',
  solicitarAutorizacion: false
} as const;

// Campos requeridos del formulario
export const MOVILIDAD_REQUIRED_FIELDS = [
  'nombreMovilidad',
  'tipoMovilidad',
  'tipoActividad',
  'modalidad',
  'fechaInicio',
  'fechaFin',
  'lugarDestino'
] as const;

// Campo especial que debe estar deshabilitado
export const MOVILIDAD_DISABLED_FIELDS = [
  'totalFinanciacion'
] as const;

// Función para construir el FormGroup dinámicamente
import { FormBuilder, Validators } from '@angular/forms';

export function createMovilidadFormGroup(formBuilder: FormBuilder) {
  const controls: any = {};

  // Crear controles para todos los campos del formulario
  MOVILIDAD_FORM_FIELDS.forEach(field => {
    const defaultValue = MOVILIDAD_DEFAULT_FORM_VALUES[field as keyof typeof MOVILIDAD_DEFAULT_FORM_VALUES];
    const isRequired = MOVILIDAD_REQUIRED_FIELDS.includes(field as typeof MOVILIDAD_REQUIRED_FIELDS[number]);
    const isDisabled = MOVILIDAD_DISABLED_FIELDS.includes(field as typeof MOVILIDAD_DISABLED_FIELDS[number]);

    if (isDisabled) {
      controls[field] = [{ value: defaultValue, disabled: true }];
    } else if (isRequired) {
      controls[field] = [defaultValue, Validators.required];
    } else {
      controls[field] = [defaultValue];
    }
  });

  return formBuilder.group(controls, { validators: [] }); // Validators se agregarán después
}
