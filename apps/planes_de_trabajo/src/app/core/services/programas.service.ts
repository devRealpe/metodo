import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';

@Injectable({ providedIn: 'root' })
export class ProgramasService {
  private readonly base = `${environment.apiOracle}/programas`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los programas de una facultad específica 
   * /programas/por-facultad/{idFacultad}
   */
  getByFacultad(idFacultad: string): Observable<{id: string, nombre: string}[]> {
    const url = `${this.base}/por-facultad/${idFacultad}`;
    return this.http.get<{idPrograma: string, nomPrograma: string}[]>(url).pipe(
      map(programas => programas.map(p => ({ id: p.idPrograma, nombre: p.nomPrograma })))
    );
  }
}
