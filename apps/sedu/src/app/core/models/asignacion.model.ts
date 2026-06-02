export interface Asignacion {
  id: string;
  periodoId: string;
  periodoNombre: string;
  evaluadoId: string;
  evaluadoNombre: string;
  evaluadorId: string;
  evaluadorNombre: string;
  estado: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAsignacionRequest {
  periodoId: string;
  evaluadoId: string;
  evaluadorId: string;
}
