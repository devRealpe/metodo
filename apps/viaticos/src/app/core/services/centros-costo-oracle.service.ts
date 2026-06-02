import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';

/**
 * Modelo de centro de costo desde Oracle
 */
export interface CentroCostoOracle {
  centroCosto: string;
  nombreCentroCosto: string;
  centroCostoPredecesor: string;
  tipoCentroCosto: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class CentrosCostoOracleService {
  private readonly http = inject(HttpClient);
  
  /** Endpoint de Oracle para centros de costo */
  private readonly apiUrl = `${environment.apiOracle}/centros-costo`;

  /**
   * Obtiene todos los centros de costo desde Oracle
   */
  getAllCentrosCosto(): Observable<CentroCostoOracle[]> {
    return this.http.get<CentroCostoOracle[]>(this.apiUrl);
  }

  /**
   * Obtiene solo los centros de costo activos que son dependencias principales
   * (excluye proyectos, eventos, contratos, seminarios, etc.)
   */
  getCentrosCostoActivos(): Observable<CentroCostoOracle[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((response: any) => {
        
        // Manejar diferentes estructuras de respuesta
        let centros: CentroCostoOracle[] = [];
        
        if (Array.isArray(response)) {
          centros = response;
        } else if (response && typeof response === 'object') {
          // Intentar extraer el array de diferentes propiedades comunes
          centros = response.data || response.items || response.centrosCosto || response.content || [];
        }
        
        // Validar que sea un array
        if (!Array.isArray(centros)) {
          return [];
        }
        
        
        // Filtrar y limpiar
        const centrosFiltrados = centros
          .filter(c => this.esDependenciaPrincipal(c))
          .filter(c => this.tieneSeisDígitos(c.centroCosto)) // Solo los de 6 dígitos
          .map(c => ({
            ...c,
            nombreCentroCosto: this.limpiarNombreCentroCosto(c.nombreCentroCosto)
          }))
          .sort((a, b) => this.compararPorParteNumerica(a.centroCosto, b.centroCosto)); // Ordenar por la parte numérica
        
        
        return centrosFiltrados;
      })
    );
  }

  /**
   * Limpia el nombre del centro de costo eliminando sufijos innecesarios
   */
  private limpiarNombreCentroCosto(nombre: string): string {
    let nombreLimpio = nombre;

    // Eliminar SNIES y el código que le sigue (ej: "SNIES 105836", "SNIES 4042")
    nombreLimpio = nombreLimpio.replace(/SNIES\s+\d+/gi, '').trim();

    // Limpiar espacios múltiples
    nombreLimpio = nombreLimpio.replace(/\s+/g, ' ').trim();

    return nombreLimpio;
  }

  /**
   * Determina si un centro de costo es una dependencia principal
   * Solo filtra por estado activo
   */
  private esDependenciaPrincipal(centro: CentroCostoOracle): boolean {
    // Solo centros activos
    return centro.estado === 'A';
  }

  /**
   * Verifica si el código del centro de costo tiene exactamente 6 dígitos en la parte numérica
   */
  private tieneSeisDígitos(centroCosto: string): boolean {
    if (!centroCosto) return false;
    
    // Extraer solo los dígitos del código
    const digitos = centroCosto.replace(/\D/g, '');
    
    // Verificar que tenga exactamente 6 dígitos
    return digitos.length === 6;
  }

  /**
   * Compara dos códigos de centros de costo por su parte numérica
   */
  private compararPorParteNumerica(a: string, b: string): number {
    const numeroA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numeroB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    
    return numeroA - numeroB;
  }
}
