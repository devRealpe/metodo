import { Profesor } from "./profesor.model";
import { PlanDeTrabajoModel } from "./planDeTrabajo.model";
import { ActividadPlanDeTrabajo } from "./actividadesPlanDeTrabajo.model";
import { Curso } from "./curso.model";
import { Concepto } from "./concepto.model";

export interface ProfesorDataExcel {
    profesor: Profesor;
    plan: PlanDeTrabajoModel;
    actividades: ActividadPlanDeTrabajo[];
    investigaciones: any[];
    cursos: Curso[];
    conceptos: Concepto[];
}