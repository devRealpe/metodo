import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TipoConvenio } from '../models/tipo-convenio.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class TipoConvenioService {

  private apiUrl = `${environment.internacionalizacionApi}/tipo-convenio`;

  // Signal para almacenar las opciones de tipo convenio
  private _tipoConvenioOpciones = signal<TipoConvenio[]>([]);
  public tipoConvenioOpciones = this._tipoConvenioOpciones.asReadonly();

  constructor(private http: HttpClient) {}

  getAllActive(): Observable<TipoConvenio[]> {
    return this.http.get<TipoConvenio[]>(this.apiUrl).pipe(
      tap(tipoConvenios => {
        this._tipoConvenioOpciones.set(tipoConvenios);
      })
    );
  }

  // Método para cargar opciones al inicio
  loadTipoConvenioOpciones(): Observable<TipoConvenio[]> {
    return this.getAllActive();
  }

  getAll(): Observable<TipoConvenio[]> {
    return this.getAllActive();
  }
}