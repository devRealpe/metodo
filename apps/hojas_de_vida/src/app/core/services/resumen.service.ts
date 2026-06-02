// src/app/services/persona.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Persona } from '../models/persona.model';

@Injectable({
  providedIn: 'root'
})
export class ResumenService {
  private apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas`;

  constructor(private http: HttpClient) {}

  getAllPersonas(): Observable<Persona[]> {
    return this.http.get<Persona[]>(this.apiUrl);
  }
}