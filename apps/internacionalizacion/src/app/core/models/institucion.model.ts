export interface Institucion {
  id: string;
  nombre: string;
  codigo?: string;
  tipo?: string;
  pais?: string;
  ciudad?: string;
  activo?: boolean;
}

export interface InstitucionCreateDto {
  nombre: string;
  codigo?: string;
  tipo?: string;
  pais?: string;
  ciudad?: string;
  activo?: boolean;
}

export interface InstitucionUpdateDto {
  id: string;
  nombre: string;
  codigo?: string;
  tipo?: string;
  pais?: string;
  ciudad?: string;
  activo?: boolean;
}