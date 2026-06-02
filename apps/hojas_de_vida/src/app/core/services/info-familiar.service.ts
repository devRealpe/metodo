import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { InfoFamiliar } from '../models/infoFamiliar.model';
import { environment } from '@shared/shared-environments';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class InfoFamiliarService {
		private baseUrl = `${environment.apiHojasDeVida}/hojas-de-vida/info_familiar`;

	constructor(private http: HttpClient) {}

	getAll(): Observable<InfoFamiliar[]> {
		return this.http.get<InfoFamiliar[]>(this.baseUrl);
	}

	getById(id: string): Observable<InfoFamiliar> {
		return this.http.get<InfoFamiliar>(`${this.baseUrl}/${id}`);
	}

	getByUsuarioId(usuarioId: string): Observable<InfoFamiliar[]> {
		return this.http.get<InfoFamiliar[]>(`${this.baseUrl}/persona/${usuarioId}`);
	}

	create(data: InfoFamiliar): Observable<InfoFamiliar> {
		return this.http.post<InfoFamiliar>(this.baseUrl, data);
	}

	update(id: string, data: InfoFamiliar): Observable<InfoFamiliar> {
		const dataWithId = { ...data, id };
		return this.http.put<InfoFamiliar>(this.baseUrl, dataWithId);
	}

	delete(id: string): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}`);
	}
}
