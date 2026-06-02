import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  PlanDeTrabajoModel,
  CrearPlanDeTrabajo,
  UpdateFirmasPlanDeTrabajo,
} from '../models/planDeTrabajo.model';

interface PlanDeTrabajoReasignarRequest {
  id: string;
  idProfesorNuevo: string;
  estado: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlanDeTrabajoService {
  private readonly base = `${environment.apiPlanesDeTraba}/plan-de-trabajo`;

  constructor(private http: HttpClient) {}

  getById(id: string): Observable<PlanDeTrabajoModel> {
    return this.http.get<PlanDeTrabajoModel>(
      `${this.base}/${encodeURIComponent(id)}`
    );
  }

  getByProfesorId(id: string): Observable<PlanDeTrabajoModel> {
    return this.http.get<PlanDeTrabajoModel>(
      `${this.base}/profesor/${encodeURIComponent(id)}`
    );
  }

  getByProfesorPeriodo(
    profesorId: string,
    anio: number,
    periodo: number
  ): Observable<PlanDeTrabajoModel | null> {
    return this.http.get<PlanDeTrabajoModel | null>(
      `${this.base}/profesor/${encodeURIComponent(
        profesorId
      )}/${anio}/${periodo}`
    );
  }

  create(planDeTrabajo: CrearPlanDeTrabajo): Observable<any> {
    return this.http.post(`${this.base}`, planDeTrabajo);
  }

  updateFirmas(id: string, firmas: UpdateFirmasPlanDeTrabajo): Observable<any> {
    return this.http.put(
      `${this.base}/${encodeURIComponent(id)}/firmas`,
      firmas
    );
  }

  reasignarPlan(planId: string, nuevoProfesorId: string): Observable<any> {
    const requestBody: PlanDeTrabajoReasignarRequest = {
      id: planId,
      idProfesorNuevo: nuevoProfesorId,
      estado: 'Activo',
    };

    return this.http.put(
      `${this.base}/${encodeURIComponent(planId)}/reasignar`,
      requestBody
    );
  }

  activarNovedades(
    idPt: string,
    estado: boolean
  ): Observable<PlanDeTrabajoModel> {
    return this.http.put<PlanDeTrabajoModel>(
      `${this.base}/${encodeURIComponent(idPt)}/${encodeURIComponent(
        estado
      )}/modificar-novedades`,
      {}
    );
  }

  asignarMotivoRechazo(idPt: string, motivoRechazo: string): Observable<any> {
    return this.http.put(
      `${this.base}/${encodeURIComponent(idPt)}/motivo-rechazo`,
      motivoRechazo,
      {
        headers: { 'Content-Type': 'text/plain' },
      }
    );
  }

  borrarMotivoRechazo(idPt: string): Observable<any> {
    return this.http.delete(
      `${this.base}/${encodeURIComponent(idPt)}/motivo-rechazo`
    );
  }

  getMotivoByPtId(idPt: string): Observable<string> {
    return this.http.get(`${this.base}/${encodeURIComponent(idPt)}/motivo`, {
      responseType: 'text',
    });
  }

  getNovedadesByPlanId(idPt: string): Observable<any> {
    return this.http.get(
      `${this.base}/novedades/pt/${encodeURIComponent(idPt)}`
    );
  }

  getByPeriodoAndEstado(
    anio: number,
    periodo: number,
    estado: string
  ): Observable<PlanDeTrabajoModel[]> {
    return this.http.get<PlanDeTrabajoModel[]>(
      `${this.base}/periodo/${anio}/${periodo}/estado/${encodeURIComponent(
        estado
      )}`
    );
  }

  getBatchPlanes(
    profesoresIds: string[],
    anio: number,
    periodo: number
  ): Observable<PlanDeTrabajoModel[]> {
    const body = { profesoresIds, anio, periodo };
    return this.http.post<PlanDeTrabajoModel[]>(`${this.base}/batch`, body);
  }
}