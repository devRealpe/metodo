export interface HojaDeVidaProducto {
  id?: string;
  equipoId?: string;
  equipoComputoId?: string;
  
  dependencia?: string;
  responsable?: string;
  fechaElaboracion?: string;
  marca?: string;
  modelo?: string;
  referencia?: string;
  numeroSerie?: string;
  accesorios?: string;
  
  proveedorNombre?: string;
  proveedorTelefono?: string;
  costoAdquisicion?: number;
  
  caracteristicas?: string;
  requisitosFabricante?: string;
  mantIndicadoFab?: string;
  
  calibTipo?: string;
  calibPeriodicidad?: string;
  
  codigoInventario?: string;
  
  garantiaMeses?: number;
  garantiaInicio?: string;
  garantiaFin?: string;
  
  anio?: number;
  valorEquipo?: number;
  depreciacion?: number;
  valorActual?: number;
  vidaUtilAnios?: number;
  valorResidual?: number;
  valorDepreciacionAnual?: number;
  valorDepreciacionMensual?: number;
  
  fechaMantenimiento?: string;
  mantenimiento?: string;
  contratista?: string;
  costo?: number;
  
  usuarioResponsable?: string;
  laboratorioUbicacion?: string;
  proyectoAsociado?: string;
  
  estadoActual?: string;
  observacionesGenerales?: string;
  
  creadoEn?: string;
  actualizadoEn?: string;
}

export const opcionesEstadoActual = [
  { label: 'Operativo', value: 'Operativo' },
  { label: 'En Mantenimiento', value: 'En Mantenimiento' },
  { label: 'Fuera de Servicio', value: 'Fuera de Servicio' },
  { label: 'En Calibración', value: 'En Calibración' },
  { label: 'Dado de Baja', value: 'Dado de Baja' }
];

export const opcionesCalibTipo = [
  { label: 'Interna', value: 'Interna' },
  { label: 'Externa', value: 'Externa' },
  { label: 'No Aplica', value: 'No Aplica' }
];

export const opcionesCalibPeriodicidad = [
  { label: 'Mensual', value: 'Mensual' },
  { label: 'Trimestral', value: 'Trimestral' },
  { label: 'Semestral', value: 'Semestral' },
  { label: 'Anual', value: 'Anual' },
  { label: 'No Aplica', value: 'No Aplica' }
];
