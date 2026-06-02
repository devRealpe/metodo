export type CategoriaFormacion = 'TECNICA_TECNOLOGICA' | 'PREGRADO' | 'POSGRADO';

/**
 * Opción devuelta por el catálogo externo de títulos académicos.
 * Se convierte a RequisitoAcademicoTituloRequest al guardar.
 */
export interface TituloCatalogoOption {
  id: string;
  codigo?: string;
  nombre: string;
  nivelFormacion: string;
  areaConocimiento?: string;
  nucleoBasicoConocimiento?: string;
  campoAmplio?: string;
  campoEspecifico?: string;
  fuenteCatalogo?: string;
  metadata?: Record<string, unknown>;
}

export interface RequisitoAcademicoTituloRequest {
  id?: string;
  /** ID del título en el catálogo externo; permite coincidencia CATALOGO_EXTERNO en evaluación. */
  idTituloCatalogoExterno?: string;
  codigoTituloExterno?: string;
  fuenteCatalogo?: string;
  nivelFormacion: string;
  tituloAcademico: string;
  tituloNormalizado?: string;
  areaConocimiento?: string;
  nucleoBasicoConocimiento?: string;
  campoAmplio?: string;
  campoEspecifico?: string;
  campoDetallado?: string;
  metadataCatalogo?: Record<string, unknown> | null;
  permiteAreasAfines?: boolean;
  obligatorio?: boolean;
  puntajeBase?: number;
  orden?: number;
  activo?: boolean;
}

export interface RequisitoAcademicoGrupoRequest {
  id?: string;
  nombre: string;
  descripcion?: string;
  operadorLogico: 'OR' | 'AND';
  obligatorio?: boolean;
  orden?: number;
  activo?: boolean;
  titulos: RequisitoAcademicoTituloRequest[];
}

export interface RequisitoOferta {
  id?: string;
  nombre: string;
  descripcion: string;
  titulo?: string;
  valor: number;
  aplica?: boolean;
  evaluarExperiencia?: boolean;
  anosExperienciaMinimos?: number;
  tipoRequisito?: string;
  usaEstructuraAcademica?: boolean;
  /** TECNICA_TECNOLOGICA | PREGRADO | POSGRADO – valida niveles de formación permitidos. */
  categoriaFormacion?: CategoriaFormacion;
  gruposAcademicos?: RequisitoAcademicoGrupoRequest[];
}

export interface OfertaLaboral {
  id?: string;
  numeroConvocatoria: string;
  tipoConvocatoria: string;
  departamentoSolicitante: string;
  periodo: string; 
  fechaCierre: string | Date;
  fechaPublicacion: string | Date;
  cargoRequerido: string;
  funciones: string;
  experiencia: string;
  cargosDisponibles: string;
  dedicacion: string;
  tipoContrato: string;
  activo: boolean;
  permitirAreasAfines?: boolean;
  totalRequisitos?: number;
  requisitos?: RequisitoOferta[];
  eliminado?: boolean; 
  fechaEliminacion?: string | Date; 
}
export interface OfertaLaboralRequest {
  id?: string | null;
  numeroConvocatoria: string;
  tipoConvocatoria: string;
  departamentoSolicitante: string;
  periodo: string; 
  fechaCierre: Date | string | null;
  fechaPublicacion: Date | string | null;
  cargoRequerido: string;
  funciones: string;
  experiencia: string;
  cargosDisponibles: string;
  dedicacion: string;
  tipoContrato: string;
  activo: boolean;
  permitirAreasAfines?: boolean;
  requisitos?: RequisitoOferta[];
  eliminado?: boolean; 
}
