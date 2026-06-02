import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TipoConvenioIntercambio } from '../models/tipo-convenio-intercambio.model';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class TipoConvenioIntercambioService {

  private apiUrl = `${environment.internacionalizacionApi}/tipo-convenio-intercambio`;

  // Signal para almacenar las opciones de tipo convenio intercambio
  private _tipoConvenioIntercambioOpciones = signal<TipoConvenioIntercambio[]>([]);
  public tipoConvenioIntercambioOpciones = this._tipoConvenioIntercambioOpciones.asReadonly();

  constructor(private http: HttpClient) {}

  getAllActive(): Observable<TipoConvenioIntercambio[]> {
    return this.http.get<TipoConvenioIntercambio[]>(this.apiUrl).pipe(
      tap(tipoConvenioIntercambios => {
        this._tipoConvenioIntercambioOpciones.set(tipoConvenioIntercambios);
      })
    );
  }

  // Método para cargar opciones al inicio
  loadTipoConvenioIntercambioOpciones(): Observable<TipoConvenioIntercambio[]> {
    return this.getAllActive();
  }

  getAll(): Observable<TipoConvenioIntercambio[]> {
    return this.getAllActive();
  }

  /**
   * Devuelve los tipos de intercambio que tienen el identificador dado como padre.
   */
  getByPadre(idPadre: string): Observable<TipoConvenioIntercambio[]> {
    return this.http.get<TipoConvenioIntercambio[]>(`${this.apiUrl}/hijos/${idPadre}`);
  }

  /**
   * Obtiene los intercambios relacionados con un tipo de convenio específico.
   * Esta ruta utiliza la nueva columna tipo_convenio_id en el backend.
   */
  getByTipoConvenio(tipoId: string): Observable<TipoConvenioIntercambio[]> {
    return this.http.get<TipoConvenioIntercambio[]>(`${this.apiUrl}/por-tipo/${tipoId}`);
  }
}