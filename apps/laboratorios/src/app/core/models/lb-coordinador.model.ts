export interface LbCoordinador {
  id: string;
  keycloakUserId: string;
  identificacion?: string;
  codAula: string;
}

export interface LbCoordinadorCreate {
  keycloakUserId: string;
  identificacion?: string;
  codAula: string;
}
