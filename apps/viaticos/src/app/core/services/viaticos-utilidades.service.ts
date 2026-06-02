import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface NitValidacionResponse {
  nit: string;
  dv: string;
  valido?: boolean;
  mensaje?: string;
}

export interface CategoriaResponse {
  cargo: string;
  codigoCategoria: string;
  nombreCategoria: string;
}

export interface ConceptoLiquidacion {
  conceptoId: string;
  conceptoCodigo: string;
  conceptoNombre: string;
  marcado: boolean;
  dias: number;
  valorUnitario: number;
  subtotal: number;
}

export interface LiquidacionResponse {
  conceptos: Record<string, ConceptoLiquidacion>;
  valorTotal: number;
  dias: number;
  conceptosConTarifa: number;
  ubicacion: string;
  categoria: string;
  tipoTransporte: string;
  mensaje?: string;
}

export interface CalculoLiquidacionRequest {
  ubicacion: string;
  categoriaCodigo: string;
  tipoTransporte: string;
  fechaSalida: string;
  fechaLlegada: string;
}

@Injectable({ providedIn: 'root' })
export class ViaticosUtilidadesService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiViaticos}/utilidades`;

  // Calcula dígito de verificación del NIT
  calcularDV(nit: string): Observable<NitValidacionResponse> {
    const params = new HttpParams().set('nit', nit);
    return this.http.get<NitValidacionResponse>(`${this.API_URL}/nit/calcular-dv`, { params });
  }

  // Valida NIT con dígito de verificación
  validarNIT(nit: string, dv: string): Observable<NitValidacionResponse> {
    const params = new HttpParams()
      .set('nit', nit)
      .set('dv', dv);
    return this.http.get<NitValidacionResponse>(`${this.API_URL}/nit/validar`, { params });
  }

  // Determina categoría según cargo
  determinarCategoriaPorCargo(cargo: string): Observable<CategoriaResponse> {
    const params = new HttpParams().set('cargo', cargo);
    return this.http.get<CategoriaResponse>(`${this.API_URL}/categorizar-cargo`, { params });
  }

  // Calcula liquidación de viático
  calcularLiquidacion(request: CalculoLiquidacionRequest): Observable<LiquidacionResponse> {
    return this.http.post<LiquidacionResponse>(`${this.API_URL}/calcular-liquidacion`, request);
  }
}
