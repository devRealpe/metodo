import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class ProgramaService {

  private readonly base = `${environment.apiOracle}/programas`;
  private readonly baseFacultades = `${environment.apiOracle}/facultades`;

  private programas$: Observable<{id: string, nombre: string}[]> | null = null;
  private facultades$: Observable<{id: string, nombre: string}[]> | null = null;

  constructor(private http: HttpClient) {}

  private distinctById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  getAllFacultades(): Observable<{id: string, nombre: string}[]> {
    if (!this.facultades$) {
      this.facultades$ = this.http.get<{idFacultad: string, nomFacultad: string}[]>(this.baseFacultades).pipe(
        map(facultades => this.distinctById(
          facultades.map(f => ({ id: f.idFacultad, nombre: f.nomFacultad }))
        )),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.facultades$;
  }

  getAllProgramas(): Observable<{id: string, nombre: string}[]> {
    if (!this.programas$) {
      this.programas$ = this.http.get<{idPrograma: string, nomPrograma: string}[]>(this.base).pipe(
        map(programas => this.distinctById(
          programas.map(p => ({ id: p.idPrograma, nombre: p.nomPrograma }))
        )),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.programas$;
  }
}
