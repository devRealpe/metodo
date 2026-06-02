export interface LbMarca {
  id: string;
  nombre: string;
  estado: string; // Activa | Inactiva
}
export interface LbMarcaPayload {
  nombre: string;
  estado: string;
}
