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

  getAll(): Observable<CentroCostoOracle[]> {
    return this.http.get<CentroCostoOracle[]>(this.apiUrl);
  }

  buscar(nombre: string): Observable<CentroCostoOracle[]> {
    return this.http.get<CentroCostoOracle[]>(`${this.apiUrl}/buscar`, {
      params: { nombre }
    });
  }

  getActivos(): Observable<CentroCostoOracle[]> {
    return this.http.get<CentroCostoOracle[]>(`${this.apiUrl}/estado/A`);
  }

  getById(id: string): Observable<CentroCostoOracle> {
    return this.http.get<CentroCostoOracle>(`${this.apiUrl}/${id}`);
  }
}
