export interface ReservaAula {
  id?: string;
  laboratorio: { id: string; codAula?: string; nomAula?: string };
  subLaboratorio?: { id: string; codAula?: string; nomAula?: string } | null;
  identificacion: string;        // NIT de la empresa
  fecha: string;                 // YYYY-MM-DD
  horaInicio: string;            // HH:mm:ss
  horaFin: string;               // HH:mm:ss
  cantidadAsistentes: number;
  cantidadEquipos?: number;
  cantidadSuministros?: number;
  aprobado?: boolean;
  motivo?: string;
  observacion?: string;
  observacionRechazo?: string;
  tipoPractica?: string;
  asistentes?: ReservaAsistente[];
  equipos?: ReservaEquipo[];
  suministros?: ReservaSuministro[];
  // Datos enriquecidos del backend (cuando retorna la reserva completa)
  laboratorioNombre?: string;
}

export interface ReservaAsistente {
  id?: string;
  identificacion: string;
}

export interface ReservaEquipo {
  id?: string;
  equipoAula: { id: string; equipoAlmacen?: { nombre?: string } };
  cantidad: number;
}

export interface ReservaSuministro {
  id?: string;
  suministroAula: { id: string; suministroAlmacen?: { nombre?: string }; consumible?: boolean };
  cantidad: number;
}

/** Payload enviado al endpoint cerrar con cantidades devueltas de consumibles */
export interface CierreReservaDTO {
  suministros?: Record<string, number>; // suministroAulaId -> cantidadDevuelta
}
