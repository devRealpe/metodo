import { LbEquipoUnidad } from './lb-equipo-unidad.model';

export interface LbReservaEquipoDetalle {
  id?: string;
  equipoUnidad: { id: string; equipoAlmacen?: { nombre?: string }; serial?: string; placa?: string; categoria?: string };
  cantidad?: number;
}

export interface LbReservaEquipoAsistente {
  id?: string;
  identificacion: string;
}

export interface LbReservaEquipo {
  id?: string;
  identificacion: string;
  horaInicio: string;   // HH:mm:ss
  horaFin: string;      // HH:mm:ss
  fecha: string;        // YYYY-MM-DD
  fechaFin?: string;    // YYYY-MM-DD — solo si es reserva por días
  cantidad?: number;
  estudiantesBeneficiados?: number;
  devuelta?: boolean;
  detalles?: LbReservaEquipoDetalle[];
  asistentes?: LbReservaEquipoAsistente[];
}

