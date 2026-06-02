export interface ConceptoLiquidacionCatalogo {
  id: number;
  codigo: string;
  nombre: string;
  abreviatura: string;
  tipo: 'PADRE' | 'HIJO';
  categoria: 'TRANSPORTE' | 'ALIMENTACION' | 'HOSPEDAJE';
  tipoViatico: 'OCASIONAL' | 'PERMANENTE';
  idPadre?: number;
  orden: number;
  requiereDias: boolean;
  tieneTarifaAutomatica: boolean;
  codigoContable: string;
  descripcion?: string;
  activo?: boolean;
}

export interface LiquidacionConcepto {
  marcado: boolean;
  dias: number;
  valorUnitario: number;
  subtotal: number;
  nombreConcepto: string;
  codigoContable: string;
  categoria: string;
}

export interface ResumenContable {
  codigoContable: string;
  categoria: string;
  total: number;
  conceptos: string[];
}

export interface ResumenLiquidacion {
  totalGeneral: number;
  resumenContable: ResumenContable[];
  codigosContables: string[];
}
