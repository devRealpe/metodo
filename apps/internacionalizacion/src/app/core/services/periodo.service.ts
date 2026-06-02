import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Periodo } from '../models/periodo.model';

@Injectable({
  providedIn: 'root'
})
export class PeriodoService {
  private apiUrl = `${environment.internacionalizacionApi}/periodos`;

  // Signal para almacenar las opciones de periodo
  private _periodoOpciones = signal<Periodo[]>([]);
  public periodoOpciones = this._periodoOpciones.asReadonly();

  constructor(private http: HttpClient) {}

  getAllActive(): Observable<Periodo[]> {
    return this.http.get<Periodo[]>(this.apiUrl).pipe(
      tap(periodos => {
        this._periodoOpciones.set(periodos);
      })
    );
  }

  // Método para cargar opciones al inicio
  loadPeriodoOpciones(): Observable<Periodo[]> {
    return this.getAllActive();
  }

  getAll(): Observable<Periodo[]> {
    return this.getAllActive();
  }
}