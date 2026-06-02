import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Referencia } from '../models/referencias-personales.model';
import { environment } from '@shared/shared-environments';

@Injectable({
	providedIn: 'root'
})
export class ReferenciaService {
		private apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/referencias`;

	constructor(private http: HttpClient) {}

	guardarReferencia(payload: Referencia): Observable<Referencia> {
		return this.http.post<Referencia>(this.apiUrl, payload);
	}

	actualizarReferencia(payload: Referencia): Observable<Referencia> {
		return this.http.put<Referencia>(this.apiUrl, payload);
	}

	obtenerReferencias(): Observable<Referencia[]> {
		return this.http.get<Referencia[]>(this.apiUrl);
	}

	obtenerReferenciasPorPersona(personaId: string): Observable<Referencia[]> {
		const url = `${this.apiUrl}/mis_referencias/${personaId}`;
		return this.http.get<Referencia[]>(url);
	}

	obtenerReferenciaPorId(id: string): Observable<Referencia> {
		return this.http.get<Referencia>(`${this.apiUrl}/${id}`);
	}

	eliminarReferencia(id: string): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`);
	}
}
