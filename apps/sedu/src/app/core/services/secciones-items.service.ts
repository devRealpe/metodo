import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Seccion, CreateSectionRequest, UpdateSectionRequest } from '../models';
import { Item, CreateItemRequest, UpdateItemRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class SeccionesItemsService {
  private http = inject(HttpClient);
  private seccionesUrl = `${environment.apiSedu}/secciones`;
  private itemsUrl = `${environment.apiSedu}/items`;

  // Secciones
  listSecciones(formatoVersionId: string): Observable<Seccion[]> {
    return this.http.get<Seccion[]>(`${this.seccionesUrl}/por-formato-version/${formatoVersionId}`);
  }

  getSeccion(id: string): Observable<Seccion> {
    return this.http.get<Seccion>(`${this.seccionesUrl}/${id}`);
  }

  createSeccion(req: CreateSectionRequest): Observable<Seccion> {
    return this.http.post<Seccion>(this.seccionesUrl, req);
  }

  updateSeccion(id: string, req: UpdateSectionRequest): Observable<Seccion> {
    return this.http.put<Seccion>(`${this.seccionesUrl}/${id}`, req);
  }

  deleteSeccion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.seccionesUrl}/${id}`);
  }

  // Items
  listItems(sectionId: string): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.itemsUrl}/por-seccion/${sectionId}`);
  }

  getItem(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.itemsUrl}/${id}`);
  }

  createItem(req: CreateItemRequest): Observable<Item> {
    return this.http.post<Item>(this.itemsUrl, req);
  }

  updateItem(id: string, req: UpdateItemRequest): Observable<Item> {
    return this.http.put<Item>(`${this.itemsUrl}/${id}`, req);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.itemsUrl}/${id}`);
  }
}
