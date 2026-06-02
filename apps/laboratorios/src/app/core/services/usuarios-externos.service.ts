import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { UsuarioExterno } from '../models/usuario-externos.model';

@Injectable({ providedIn: 'root' })
export class UsuariosExternosService {

  private readonly base = `${environment.apilaboratoriosLocal}/usuarios-externos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UsuarioExterno[]> {
    return this.http.get<UsuarioExterno[]>(this.base);
  }

  getById(id: string): Observable<UsuarioExterno | null> {
    return this.http.get<UsuarioExterno>(`${this.base}/${id}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  /** Buscar personas por su número de identificación (cédula) — retorna lista */
  getByIdentificacion(identificacion: string): Observable<UsuarioExterno[]> {
    return this.http.get<UsuarioExterno[]>(
      `${this.base}/identificacion/${encodeURIComponent(identificacion)}`
    ).pipe(catchError(() => of([])));
  }

  /** Buscar todas las personas asociadas a una empresa por su UUID */
  getByRegistroId(registroId: string): Observable<UsuarioExterno[]> {
    return this.http.get<UsuarioExterno[]>(
      `${this.base}/registro/${encodeURIComponent(registroId)}`
    ).pipe(catchError(() => of([])));
  }

  getByTipo(tipo: string): Observable<UsuarioExterno[]> {
    return this.http.get<UsuarioExterno[]>(`${this.base}/tipo/${encodeURIComponent(tipo)}`);
  }

  create(usuario: UsuarioExterno): Observable<UsuarioExterno> {
    return this.http.post<UsuarioExterno>(this.base, usuario);
  }

  update(id: string, usuario: Partial<UsuarioExterno>): Observable<UsuarioExterno> {
    return this.http.put<UsuarioExterno>(`${this.base}/${id}`, usuario);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ---- Alias de compatibilidad ----
  /** @deprecated Usar getByIdentificacion() */
  getByCodigo(identificacion: string): Observable<UsuarioExterno | null> {
    return this.http.get<UsuarioExterno>(`${this.base}/${encodeURIComponent(identificacion)}`).pipe(
      catchError(err => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  /** @deprecated Usar create() */
  crearUsuarioExterno(usuario: UsuarioExterno): Observable<UsuarioExterno> {
    return this.create(usuario);
  }

  /** @deprecated Usar getAll() */
  obtenerUsuariosExternos(): Observable<UsuarioExterno[]> {
    return this.getAll();
  }

  /** @deprecated Usar update() */
  actualizarUsuarioExterno(id: string, usuario: Partial<UsuarioExterno>): Observable<UsuarioExterno> {
    return this.update(id, usuario);
  }

  /** @deprecated Usar delete() */
  eliminarUsuarioExterno(id: string): Observable<void> {
    return this.delete(id);
  }
}