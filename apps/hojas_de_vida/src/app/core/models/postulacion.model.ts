export interface PostulacionRequisitoDto {
  id?: string;
  idRequisito: string;
  puntaje: number;
  nombreRequisito?: string;
  descripcionRequisito?: string;
}

export interface PostulacionDto {
  id?: string;
  tituloPostulacion: string;
  descripcion: string;
  persona: { id: string };
  convocatoria: { id: string };
  aceptacionDeclaracion: boolean;
  estado?: string;
  fechaPostulacion?: Date | string;
  puntajeSistema?: number;
  puntajeFinal?: number;
  aprueba?: boolean;
  requisitos?: PostulacionRequisitoDto[];
  numeroConvocatoria?: string;
  cargoRequerido?: string;
  departamentoSolicitante?: string;
}