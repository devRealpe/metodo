import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Destreza } from '../models/destrezas.model';
import { environment } from '@shared/shared-environments';

@Injectable({
	providedIn: 'root',
})
export class DestrezaService {
		private apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/destrezas`;

	constructor(private http: HttpClient) {}

	guardarDestreza(payload: Destreza): Observable<Destreza> {
		return this.http.post<Destreza>(this.apiUrl, payload);
	}

	actualizarDestreza(payload: Destreza): Observable<Destreza> {
		return this.http.put<Destreza>(this.apiUrl, payload);
	}

	obtenerDestrezas(): Observable<Destreza[]> {
		return this.http.get<Destreza[]>(this.apiUrl);
	}

	obtenerDestrezasPorPersona(personaId: string): Observable<Destreza[]> {
		return this.http.get<Destreza[]>(`${this.apiUrl}/mis_destrezas/${personaId}`);
	}

	obtenerDestrezaPorId(id: string): Observable<Destreza> {
		return this.http.get<Destreza>(`${this.apiUrl}/${id}`);
	}

	eliminarDestreza(id: string): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`);
	}
}
