export interface InfoLaboral {
  id?: string;
  tipo_experiencia: string;
  nombreEmpresa: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  pais: string;
  ciudad: string;
  direccion: string;
  celular: string;
  correo: string;
  jefeInmediato: string;
  cargoDesempenado: string;
  vigente: boolean;
  motivoRetiro?: string | null;
  persona: string; 
  archivos?: { id: string; nombre: string; rutaArchivo?: string }[]; 
}