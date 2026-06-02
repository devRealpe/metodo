export interface Estudiante {
  id?: string;
  idEstudiante: string;
  nombre: string;
  semestre: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  solicitarAutorizacion?: boolean;
}