export interface RegistroAsistenciaPublicaPayload {
  identificacion: string;
  laboratorioId: string;
  fechaUso: string;
  horaInicio: string;
  horaFin?: string;
  semestre?: string;
  genero?: string;
  programa?: string;
  facultad?: string;
  materia?: string;
}
