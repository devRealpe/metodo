export interface Convocatoria {
  id: string;
  titulo: string;
  descripcion: string;
  tipoMovilidad: { id: string; nombre: string } | null;
  modalidad: { id: string; nombre: string } | null;
  institucion: string;
  pais: string;
  cobertura: string;
  fechaInicio: string;
  fechaCierre: string;
  requisitos: string;
  enlace: string;
  estado: string;
  creadoPor: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}
