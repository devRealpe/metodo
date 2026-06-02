import { Injectable } from '@angular/core';
import { Profesor } from '../models/profesor.model';
import { environment } from '@shared/shared-environments';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, map, Observable, of, tap } from 'rxjs';
import { Facultad } from '../models/facultad.model';

@Injectable({ providedIn: 'root' })
export class FacultadService {
  private readonly base = `${environment.apiOracle}/facultades`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Facultad[]> {
    return this.http.get<Facultad[]>(this.base).pipe(
      map(facultades => facultades.filter(f =>
          f.nomFacultad !== 'DEPARTAMENTO DE HUMANIDADES' &&
          f.nomFacultad !== 'CENTRO DE IDIOMAS'
        )
      )
    );
  }


}