export interface DependenciaAvance {
  dependencia: string;
  total: number;
  cerradas: number;
  pendientesFirma: number;
  enBorrador: number;
}

export interface ProgressReport {
  periodoId: string;
  periodoNombre: string;
  totalEvaluaciones: number;
  detalles: DependenciaAvance[];
}

export interface EvaluationResult {
  evaluacionId: string;
  evaluadoNombre: string;
  evaluadorNombre: string;
  dependencia: string;
  cargo: string;
  formato: string;
  notaTotal: number;
  nivel: string;
  estado: string;
  tienePlan: boolean;
}

export interface ResultsReport {
  periodoId: string;
  periodoNombre: string;
  filtros: Record<string, string>;
  resultados: EvaluationResult[];
}
