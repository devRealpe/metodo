import { LbReservaEquipo } from './lb-reserva-equipo.model';

export interface LbDevolucionEquipoDetalle {
  id?: string;
  equipoUnidad: {
    id: string;
    equipoAlmacen?: { nombre?: string };
    serial?: string;
    placa?: string;
  };
  // bueno | con_daños | incompleto | dado_de_baja
  estadoDevuelto: string;
  observaciones?: string;
}

export interface LbDevolucionEquipo {
  id?: string;
  reserva: { id: string } | LbReservaEquipo;
  fechaDevolucion: string;   // YYYY-MM-DD
  horaDevolucion: string;    // HH:mm:ss
  identificacionRecibe: string;
  observacionesGenerales?: string;
  detalles?: LbDevolucionEquipoDetalle[];
}
