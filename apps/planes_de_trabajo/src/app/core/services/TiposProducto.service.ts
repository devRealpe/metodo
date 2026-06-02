import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { TipoProducto } from '../models/investigaciones.model';

@Injectable({
  providedIn: 'root'
})
export class TiposProductoService {
  private readonly base = `${environment.apiPlanesDeTraba}/tipo-producto/`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoProducto> {
    return this.http.get<TipoProducto>(`${this.base}`);
  }

}