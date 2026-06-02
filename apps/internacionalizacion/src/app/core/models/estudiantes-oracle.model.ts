export interface EstudiantesOracle {
    periodo?: number;
    idEstudiante: string;
    nombre: string;
    semestre: number;
    fechaInicio: string | null;
    fechaFin: string | null;
}
