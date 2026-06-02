import { Actividad } from "./actividad.model";
import { MomentoInvestigacion } from "./investigaciones.model";

export interface ActividadPlanDeTrabajo {
  id: string;
  descripcion: string;
  horas: number;
  numeroProyectosJurado: number;
  planDeTrabajo: PlanDeTrabajoActividadPT;
  actividades: Actividad;
  asesorias: Asesoria[];
}

export interface CreateActividadPlanDeTrabajo {
  descripcion: string | null;
  numeroProyectosJurado: number | null;
  horas: number;
  planDeTrabajoId: string;
  actividadId: string;
}

export interface UpdateActividadPlanDeTrabajo {
  descripcion: string | null;
  numeroProyectosJurado: number | null;
  horas: number;
}

export interface Asesoria {
  id: string;
  titulo: string;
  momento_asesoria: MomentoInvestigacion;
}

export interface CrearAsesoria {
  titulo: string;
  idActividadPT: string;
  idMomento: string;
}

export interface PlanDeTrabajoActividadPT {
  id: string;
}