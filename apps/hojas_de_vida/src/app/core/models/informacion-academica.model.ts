export interface InformacionAcademica {
  id?: string; 
  tipoTitulo: string;
  titulo?: string;
  enCurso?: boolean;
  pais: string;
  ciudad: string; 
  fechaInicio: string; 
  fechaGrado: string; 
  institucion: string;
  modalidad?: string | null;
  tarjetaProfesional?: boolean; 
  bachillerato?: boolean;
  areaEducacion?: string | null;
  numeroActa?: string | null;
  horasDuracion?: number; 
  anosCursados: number; 
  distinciones?: string | null;
  persona: { id: string }; 
  archivos?: ArchivoSubido[];  
  creadoEn?: string; 
  actualizadoEn?: string; 
}

export interface Titulo {
  label: string;
  value: string;
}

export interface Modalidad {
  label: string;
  value: string;
}

export interface Bachillerato {
  label: string;
  value: boolean;
}

export interface AreaEducacion {
  label: string;
  value: string;
}

export interface DepartamentoData {
  id: number;
  departamento: string;
  ciudades: string[];
}

export interface PaisOption {
  id: string;
  nombre: string;
}

export interface DepartamentoOption {
  id: number;
  nombre: string;
}

export interface CiudadOption {
  id: number;
  nombre: string;
}

export interface ArchivoSubido {
  id: string;
  nombre: string;
  rutaArchivo: string;
  tipoDocumento?: 'diploma' | 'acta' | 'apostilla'; 
}