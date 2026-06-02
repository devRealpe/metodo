export interface Afiliacion {
  id?: string;
  tipo: string;
  administradora: string;
  fechaAfiliacion: string;
  persona: string; 
  archivos?: { id: string; nombre: string }[];
}
