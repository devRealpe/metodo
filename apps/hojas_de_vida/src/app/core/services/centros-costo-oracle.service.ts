import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';

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
  
  private readonly apiUrl = `${environment.apiOracle}/centros-costo`;

  getAllCentrosCosto(): Observable<CentroCostoOracle[]> {
    return this.http.get<CentroCostoOracle[]>(this.apiUrl);
  }

  getCentrosCostoActivos(): Observable<CentroCostoOracle[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((response: any) => {
        let centros: CentroCostoOracle[] = [];
        
        if (Array.isArray(response)) {
          centros = response;
        } else if (response && typeof response === 'object') {
          centros = response.data || response.items || response.centrosCosto || response.content || [];
        }
        
        if (!Array.isArray(centros)) {
          return [];
        }
        
        // Filtrar y limpiar
        const centrosFiltrados = centros
          .filter(c => this.esDependenciaPrincipal(c))
          .map(c => ({
            ...c,
            nombreCentroCosto: this.limpiarNombreCentroCosto(c.nombreCentroCosto)
          }));
        
        return centrosFiltrados;
      })
    );
  }

  private limpiarNombreCentroCosto(nombre: string): string {
    let nombreLimpio = nombre;

    nombreLimpio = nombreLimpio.replace(/SNIES\s+\d+/gi, '').trim();

    nombreLimpio = nombreLimpio.replace(/\s+/g, ' ').trim();

    return nombreLimpio;
  }

  private esDependenciaPrincipal(centro: CentroCostoOracle): boolean {
    if (centro.estado !== 'A') {
      return false;
    }

    if (centro.centroCosto.includes('-')) {
      return false;
    }

    if (centro.centroCosto.length > 7) {
      return false;
    }

    const nombreLower = centro.nombreCentroCosto.toLowerCase();

    if (nombreLower.includes('recursos')) {
      return true;
    }

    const palabrasExcluir = [
      'congreso',
      'encuentro',
      'seminario',
      'diplomado',
      'cohorte',
      'contrato',
      'convenio',
      'proyecto',
      'evento',
      'capacitacion',
      'jornada',
      'simposio',
      'foro',
      'taller',
      'coloquio',
      'curso'
    ];

    const contieneExcluida = palabrasExcluir.some(palabra => 
      nombreLower.includes(palabra)
    );

    if (contieneExcluida) {
      return false;
    }

    if (/^P\d+-BN\d+$/.test(centro.nombreCentroCosto.trim())) {
      return false;
    }

    return true;
  }
}
