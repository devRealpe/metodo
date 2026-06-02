export interface FilterCriteria {
    identificacion?: string;
    nombreCompleto?: string;
    facultad?: string;
    programa?: string;
    novedades?: boolean;
}

export interface PeriodoAcademico {
    label: string;
    value: string;
    anio: number;
    periodo: number;
}