export interface PlanMejoramiento {
  id: string;
  evaluacionId: string;
  descripcion: string;
  fechaCompromiso?: string;
  createdAt?: string;
}

export interface CreatePlanRequest {
  evaluacionId: string;
  descripcion: string;
  fechaCompromiso?: string;
}

export interface UpdatePlanRequest {
  descripcion?: string;
  fechaCompromiso?: string;
}
