export interface ParametroCalculo {
  id: string;
  clave: string;
  valor: string;
  descripcion: string;
}

export interface UpdateCalcParameterRequest {
  valor: string;
  descripcion?: string;
}
