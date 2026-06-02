import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  PlanDeTrabajoModel,
  UpdateFirmasPlanDeTrabajo,
} from '../models/planDeTrabajo.model';

@Injectable({
  providedIn: 'root',
})
export class FirmaService {
  private readonly base = `${environment.apiPlanesDeTraba}/plan-de-trabajo`;

  constructor(private http: HttpClient) {}

  /**
   * @param planDeTrabajoId ID del plan de trabajo
   * @param firmaData Datos de las firmas
   */
  actualizarFirmas(
    planDeTrabajoId: string,
    firmaData: UpdateFirmasPlanDeTrabajo
  ): Observable<PlanDeTrabajoModel> {
    return this.http.put<PlanDeTrabajoModel>(
      `${this.base}/${encodeURIComponent(planDeTrabajoId)}/firmas`,
      firmaData
    );
  }

  /**
   * @param planDeTrabajoId ID del plan de trabajo
   */
  firmarComoProfesor(planDeTrabajoId: string): Observable<PlanDeTrabajoModel> {
    const firmaData: UpdateFirmasPlanDeTrabajo = {
      enviadoProfesor: true,
      firmaProfesor: true,
      firmaDirector: false,
      firmaDecano: false,
      rechazado: false,
      estado: 'Activo',
    };
    return this.actualizarFirmas(planDeTrabajoId, firmaData);
  }

  /**
   * @param planDeTrabajoId ID del plan de trabajo
   */
  firmarComoDirector(planDeTrabajoId: string): Observable<PlanDeTrabajoModel> {
    const firmaData: UpdateFirmasPlanDeTrabajo = {
      enviadoProfesor: true,
      firmaProfesor: true,
      firmaDirector: true,
      firmaDecano: false,
      rechazado: false,
      estado: null,
    };
    return this.actualizarFirmas(planDeTrabajoId, firmaData);
  }

  /**
   * @param planDeTrabajoId ID del plan de trabajo
   */
  firmarComoDecano(planDeTrabajoId: string): Observable<PlanDeTrabajoModel> {
    const firmaData: UpdateFirmasPlanDeTrabajo = {
      enviadoProfesor: true,
      firmaProfesor: true,
      firmaDirector: true,
      firmaDecano: true,
      rechazado: false,
      estado: 'Aprobado por Decanatura',
    };
    return this.actualizarFirmas(planDeTrabajoId, firmaData);
  }

  /**
   * @param planDeTrabajoId ID del plan de trabajo
   */
  getEstadoPlanDeTrabajo(
    planDeTrabajoId: string
  ): Observable<PlanDeTrabajoModel> {
    return this.http.get<PlanDeTrabajoModel>(
      `${this.base}/${encodeURIComponent(planDeTrabajoId)}`
    );
  }

  /**
   * @param planDeTrabajoId ID del plan de trabajo
   * @param motivoRechazo Motivo del rechazo
   */
  rechazarPlanDeTrabajo(
    planDeTrabajoId: string,
    motivoRechazo: string
  ): Observable<PlanDeTrabajoModel> {
    const firmaData: UpdateFirmasPlanDeTrabajo = {
      enviadoProfesor: false,
      firmaProfesor: false,
      firmaDirector: false,
      firmaDecano: false,
      rechazado: true,
      estado: 'Rechazado por Decanatura',
      motivoRechazo: motivoRechazo,
    };
    return this.actualizarFirmas(planDeTrabajoId, firmaData);
  }

  /**
   * Rechaza un plan desde Decanatura, preservando observaciones previas
   * @param planDeTrabajoId ID del plan
   * @param motivoRechazo Motivo adicional del decano
   */
  rechazarDesdeDecanaturaConObservaciones(
    planDeTrabajoId: string,
    motivoRechazo?: string
  ): Observable<PlanDeTrabajoModel> {
    const firmaData: UpdateFirmasPlanDeTrabajo = {
      rechazado: true,
      estado: 'Rechazado por Decanatura',
      motivoRechazo: motivoRechazo || '',
    };
    return this.actualizarFirmas(planDeTrabajoId, firmaData);
  }

  /**
 * Rechaza un plan desde Planeación
 * @param planDeTrabajoId ID del plan
 * @param motivoRechazo Motivo del rechazo
 */
rechazarDesdePlaneacion(
  planDeTrabajoId: string,
  motivoRechazo: string
): Observable<PlanDeTrabajoModel> {

  const firmaData: UpdateFirmasPlanDeTrabajo = {
    enviadoProfesor: false,
    firmaProfesor: false,
    firmaDirector: false,
    firmaDecano: false,
    rechazado: true,
    estado: 'Rechazado por Planeacion',
    motivoRechazo: motivoRechazo,
  };

  return this.actualizarFirmas(planDeTrabajoId, firmaData);
}
}
