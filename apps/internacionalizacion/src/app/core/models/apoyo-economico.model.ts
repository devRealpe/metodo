export interface TipoApoyoEconomico {
  id: number;
  nombre: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApoyoEconomico {
  id?: string;
  movilidadId: string;
  tipoApoyoEconomico: TipoApoyoEconomico;
  descripcion?: string;
  presupuestoDisponible?: boolean;
  centroCostos?: string;
  fuenteFuncion?: string;
  concepto?: string;
  revisado?: boolean;
  aprobacionRector?: boolean;
  aprobacionVicerrectoria?: boolean;
  // campos numéricos calculados por el backend (utilizados en reportes y UI)
  montoAsignado?: number;
  montoDisponible?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApoyoEconomicoCreation {
  movilidadId: string;
  tipoApoyoId: number;
  descripcion?: string;
  presupuestoDisponible?: boolean;
  centroCostos?: string;
  fuenteFuncion?: string;
  concepto?: string;
}

export interface ApoyoEconomicoList {
  apoyos: ApoyoEconomico[];
  tiposDisponibles: TipoApoyoEconomico[];
}