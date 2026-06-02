import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class ProgramaService {

  private readonly base = `${environment.apiOracle}/programas`;
  private readonly baseFacultades = `${environment.apiOracle}/facultades`;
  private readonly baseSnies = `${environment.internacionalizacionApi}/snies`;

  private programas$: Observable<{id: string, nombre: string, idFacultad: string, codOficial: string | null}[]> | null = null;
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

  getAll(): Observable<{id: string, nombre: string, idFacultad: string, codOficial: string | null}[]> {
    if (!this.programas$) {
      this.programas$ = this.http.get<{idPrograma: string, nomPrograma: string, idFacultad: string, codOficial?: string}[]>(this.base).pipe(
        map(programas => this.distinctById(
          programas.map(p => ({ id: p.idPrograma, nombre: p.nomPrograma, idFacultad: p.idFacultad, codOficial: p.codOficial || null }))
        )),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.programas$;
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
    return this.getAll().pipe(
      map(programas => programas.map(p => ({ id: p.id, nombre: p.nombre })))
    );
  }

  clearCache(): void {
    this.programas$ = null;
    this.facultades$ = null;
  }

  // ===========================================
  // MÉTODOS PARA SNIES
  // ===========================================

  getAllSnies(): Observable<{id: string, codigo: string}[]> {
    return this.http.get<any[]>(this.baseSnies).pipe(
      map(snies => snies.map(s => ({ id: s.id, codigo: s.codigo })))
    );
  }

  getSniesByCodigo(codigo: string): Observable<{id: string, codigo: string} | null> {
    return this.http.get<{id: string, codigo: string}>(`${this.baseSnies}/codigo/${codigo}`).pipe(
      map(snies => snies),
      catchError(() => of(null))
    );
  }

  getSniesForProgram(programId: string): Observable<string | null> {
    return this.http.get<Array<{codigo: string}>>(`${this.baseSnies}/${programId}/snies`).pipe(
      map(response => response && response.length > 0 ? response[0].codigo : null),
      catchError(() => of(null))
    );
  }
}