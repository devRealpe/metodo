import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { RegistroExterno } from '../models/registro-externo.model';

@Injectable({ providedIn: 'root' })
export class RegistroExternoService {

  private readonly base = `${environment.apilaboratoriosLocal}/registros-externos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RegistroExterno[]> {
    return this.http.get<RegistroExterno[]>(this.base);
  }

  getById(id: string): Observable<RegistroExterno | null> {
    return this.http.get<RegistroExterno>(`${this.base}/${id}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  getByNit(nit: string): Observable<RegistroExterno | null> {
    return this.http.get<RegistroExterno>(`${this.base}/nit/${encodeURIComponent(nit)}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  getByNombre(nombre: string): Observable<RegistroExterno | null> {
    return this.http.get<RegistroExterno>(`${this.base}/nombre/${encodeURIComponent(nombre)}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  create(data: RegistroExterno): Observable<RegistroExterno> {
    return this.http.post<RegistroExterno>(this.base, data);
  }

  update(id: string, data: RegistroExterno): Observable<RegistroExterno> {
    return this.http.put<RegistroExterno>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
