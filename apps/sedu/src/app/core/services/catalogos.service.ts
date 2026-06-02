import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import {
  ParametroCalculo,
  UpdateCalcParameterRequest,
  CargoFormato,
  CreateCargoFormatoRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiSedu}/catalogos`;

  // Parámetros de configuración
  listParametros(): Observable<ParametroCalculo[]> {
    return this.http.get<ParametroCalculo[]>(`${this.baseUrl}/parametros`);
  }

  updateParametro(clave: string, req: UpdateCalcParameterRequest): Observable<ParametroCalculo> {
    return this.http.put<ParametroCalculo>(`${this.baseUrl}/parametros/${clave}`, req);
  }

  // Cargo → Formato
  listCargoFormatos(): Observable<CargoFormato[]> {
    return this.http.get<CargoFormato[]>(`${this.baseUrl}/cargo-formato`);
  }

  createCargoFormato(req: CreateCargoFormatoRequest): Observable<CargoFormato> {
    return this.http.post<CargoFormato>(`${this.baseUrl}/cargo-formato`, req);
  }

  deleteCargoFormato(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/cargo-formato/${id}`);
  }
}
