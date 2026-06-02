import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { 
  ConceptoLiquidacionCatalogo, 
  LiquidacionConcepto, 
  ResumenLiquidacion 
} from '../models/concepto-liquidacion.model';

@Injectable({
  providedIn: 'root'
})
export class ConceptosLiquidacionCatalogoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiViaticos}/conceptos-liquidacion`;

  /**
   * Obtener todos los conceptos por tipo de viático (OCASIONAL o PERMANENTE)
   */
  getConceptosPorTipo(tipoViatico: string): Observable<ConceptoLiquidacionCatalogo[]> {
    return this.http.get<ConceptoLiquidacionCatalogo[]>(`${this.apiUrl}/tipo/${tipoViatico}`);
  }

  /**
   * Obtener solo conceptos PADRE por tipo de viático
   */
  getConceptosPadre(tipoViatico: string): Observable<ConceptoLiquidacionCatalogo[]> {
    return this.http.get<ConceptoLiquidacionCatalogo[]>(`${this.apiUrl}/padres/${tipoViatico}`);
  }

  /**
   * Obtener conceptos HIJO de un padre específico
   */
  getConceptosHijos(idPadre: number): Observable<ConceptoLiquidacionCatalogo[]> {
    return this.http.get<ConceptoLiquidacionCatalogo[]>(`${this.apiUrl}/hijos/${idPadre}`);
  }

  /**
   * Obtener un concepto específico por ID
   */
  getConceptoPorId(id: number): Observable<ConceptoLiquidacionCatalogo> {
    return this.http.get<ConceptoLiquidacionCatalogo>(`${this.apiUrl}/${id}`);
  }

  /**
   * Calcular totales por código contable
   */
  calcularTotales(liquidacion: Record<string, LiquidacionConcepto>): Observable<Record<string, number>> {
    return this.http.post<Record<string, number>>(`${this.apiUrl}/calcular-totales`, liquidacion);
  }

  /**
   * Generar códigos contables únicos para archivo plano
   */
  generarCodigosArchivoPlano(liquidacion: Record<string, LiquidacionConcepto>): Observable<string[]> {
    return this.http.post<string[]>(`${this.apiUrl}/codigos-archivo-plano`, liquidacion);
  }

  /**
   * Obtener resumen detallado de la liquidación
   */
  obtenerResumenDetallado(liquidacion: Record<string, LiquidacionConcepto>): Observable<ResumenLiquidacion> {
    return this.http.post<ResumenLiquidacion>(`${this.apiUrl}/resumen-detallado`, liquidacion);
  }

  /**
   * Crear o actualizar concepto
   */
  guardarConcepto(concepto: ConceptoLiquidacionCatalogo): Observable<ConceptoLiquidacionCatalogo> {
    return this.http.post<ConceptoLiquidacionCatalogo>(this.apiUrl, concepto);
  }

  /**
   * Eliminar concepto (soft delete)
   */
  eliminarConcepto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener mapeo de códigos de concepto a códigos de tarifa
   */
  obtenerMapeoTarifas(tipoViatico: string): Observable<{ [key: string]: string }> {
    return this.http.get<{ [key: string]: string }>(
      `${this.apiUrl}/mapeo-tarifas/${tipoViatico}`
    );
  }

  /**
   * Obtener información de qué conceptos son de transporte
   */
  obtenerConceptosTransporte(tipoViatico: string): Observable<{ [key: string]: boolean }> {
    return this.http.get<{ [key: string]: boolean }>(
      `${this.apiUrl}/conceptos-transporte/${tipoViatico}`
    );
  }
}
