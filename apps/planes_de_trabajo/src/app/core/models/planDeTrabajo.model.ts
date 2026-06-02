export interface PlanDeTrabajoModel {
  id: string;
  idFacultad: string;
  idDecano: string;
  idPrograma: string;
  idDirector: string;
  idProfesor: string;
  esDirector: boolean;
  enviadoProfesor: boolean;
  firmaProfesor: boolean;
  firmaDirector: boolean;
  firmaDecano: boolean;
  rechazado: boolean;
  motivoRechazo?: string;
  estado: string;
  anio: number;
  periodo: number;
  fechaCreacion: string;
  novedadesActivas?: boolean;
  plantilla: PlantillaModel;
}

export interface PlantillaModel {
  id: string;
  nombre: string;
  estado: boolean;
}

export interface CrearPlanDeTrabajo{
  idFacultad: string;
  idDecano: string;
  idPrograma: string;
  idDirector: string;
  idProfesor: string;
  anio: number;
  periodo: number;
  idPlantilla: string;
  esDirector: boolean;
}

export interface UpdateFirmasPlanDeTrabajo{
  enviadoProfesor?: boolean | null;
  firmaProfesor?: boolean | null;
  firmaDirector?: boolean | null;
  firmaDecano?: boolean | null;
  rechazado?: boolean | null;
  estado?: string | null;
  motivoRechazo?: string | null;
  novedadesActivas?: boolean | null;
}