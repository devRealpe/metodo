export interface ConsentimientoMovilidad {
  id?: string;
  postulanteId: string;
  movilidadId: string;
  tipo: string; // 'consentimiento_informado' | 'compromiso_movilidad'
  aceptado: boolean;
  fechaAceptacion?: string;
  ipOrigen?: string;
  textoVersion?: string;
  createdAt?: string;
}
