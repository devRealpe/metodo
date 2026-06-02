import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface InstitucionOption {
  id: string;
  nombre: string;
  codigoPais?: number | null;
  codigoDepartamento?: number | null;
  codigoMunicipio?: number | null;
  codigoInstitucion?: number | null;
  codigoSnies?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class InstitucionesService {

  private readonly base = `${environment.generalApi}/instituciones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<InstitucionOption[]> {
    return this.http.get<InstitucionOption[]>(this.base);
  }

  getByCodigoPais(codigoPais: number | string): Observable<InstitucionOption[]> {
    return this.http.get<InstitucionOption[]>(`${this.base}/by-pais/${codigoPais}`);
  }

  getByCodigoPaisAndDepartamento(codigoPais: number | string, codigoDepartamento: number | string): Observable<InstitucionOption[]> {
    return this.http.get<InstitucionOption[]>(`${this.base}/by-pais/${codigoPais}/departamento/${codigoDepartamento}`);
  }

  getByCodigoPaisAndDepartamentoAndMunicipio(codigoPais: number | string, codigoDepartamento: number | string, codigoMunicipio: number | string): Observable<InstitucionOption[]> {
    return this.http.get<InstitucionOption[]>(`${this.base}/by-pais/${codigoPais}/departamento/${codigoDepartamento}/municipio/${codigoMunicipio}`);
  }

  searchByNombre(nombre: string): Observable<InstitucionOption[]> {
    return this.http.get<InstitucionOption[]>(`${this.base}/search`, { params: { nombre } });
  }
}