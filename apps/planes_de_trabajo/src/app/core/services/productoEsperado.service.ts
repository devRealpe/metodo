import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { ProductosEsperados, CrearProductoEsperado } from '../models/investigaciones.model';

@Injectable({
  providedIn: 'root'
})
export class ProductoEsperadoService {
  private readonly base = `${environment.apiPlanesDeTraba}/productos-esperados`;
  
  constructor(private http: HttpClient) {}

  create(newProductoEsperado: CrearProductoEsperado): Observable<any> {
    return this.http.post(`${this.base}`, newProductoEsperado);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${encodeURIComponent(id)}`);
  }
}