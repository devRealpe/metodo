// cobertura.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Cobertura } from '../models/cobertura.model';

@Injectable({
  providedIn: 'root'
})
export class CoberturaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.internacionalizacionApi}/coberturas`;

  getAll(): Observable<Cobertura[]> {
    return this.http.get<Cobertura[]>(this.apiUrl).pipe(
      map(coberturas => coberturas.map(cobertura => ({
        ...cobertura,
        display: `${cobertura.codigo} - ${cobertura.nombre}`
      })))
    );
  }
}