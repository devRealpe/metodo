export interface LbEquipoAccesorio {
  id: string;
  nombre: string;
  estado: string; // funcional | dañado | extraviado | dado_de_baja
}

export interface LbEquipoAccesorioPayload {
  
  nombre: string;
  estado: string;
}
