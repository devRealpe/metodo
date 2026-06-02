import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { Persona } from '../models/persona.model';
import { environment } from '@shared/shared-environments';

@Injectable({
	providedIn: 'root',
})
export class PersonasService {
	private readonly apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas`;

	constructor(private http: HttpClient) { }

	crearPersona(persona: Persona): Observable<Persona> {
		return this.http.post<Persona>(this.apiUrl, persona).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	obtenerPersonas(): Observable<Persona[]> {
		return this.http.get<Persona[]>(this.apiUrl).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	obtenerPersonaPorId(id: string): Observable<Persona> {
		return this.http.get<Persona>(`${this.apiUrl}/${id}`).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	actualizarPersona(id: string, persona: Persona): Observable<Persona> {
		return this.http.put<Persona>(`${this.apiUrl}/${id}`, persona).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	eliminarPersona(id: string): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	getPersonaActual(): Observable<Persona> {
		return this.http.get<Persona>(`${this.apiUrl}/me`).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	crearPersonaActual(persona: Persona): Observable<Persona> {
		return this.http.post<Persona>(`${this.apiUrl}/me`, persona).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	actualizarPersonaActual(persona: Persona): Observable<Persona> {
		return this.http.put<Persona>(`${this.apiUrl}/me`, persona).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	createOrUpdatePersonaActual(persona: Persona): Observable<Persona> {
		return this.actualizarPersonaActual(persona);
	}
actualizarPreferenciasNotificaciones(
		personaId: string, 
		recibirNotificaciones: boolean
	): Observable<Persona> {
		return this.http.put<Persona>(
			`${this.apiUrl}/${personaId}/preferencias-notificaciones`,
			{ notificacionesConvocatoriasEmail: recibirNotificaciones }
		).pipe(
			retry(1),
			catchError(this.handleError.bind(this))
		);
	}

	tienePerfilCompleto(): Observable<boolean> {
		return this.http.get<{ existe: boolean }>(`${this.apiUrl}/me/existe`).pipe(
			retry(1),
			map((resp: { existe: boolean }) => resp.existe),
			catchError(() => {
				return [false];
			})
		);
	}

	esEmpleadoUniversidad(): Observable<{ esEmpleado: boolean; cargo: string }> {
		return this.http.get<{ esEmpleado: boolean; cargo: string }>(`${this.apiUrl}/me/es-empleado`).pipe(
			retry(1),
			catchError(() => {
				return [{ esEmpleado: false, cargo: '' }];
			})
		);
	}

	subirFoto(personaId: string, file: File): Observable<any> {
		const formData = new FormData();
		formData.append('foto', file);
		return this.http.post(`${this.apiUrl}/${personaId}/foto`, formData, { withCredentials: true });
	}

	eliminarFoto(personaId: string): Observable<any> {
		return this.http.delete(`${this.apiUrl}/${personaId}/foto`, { withCredentials: true });
	}

	descargarExcelPersona(personaId: string): Observable<Blob> {
		return this.http.get(`${this.apiUrl}/${personaId}/export-excel`, {
			responseType: 'blob',
			headers: {
				'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			}
		}).pipe(
			catchError(this.handleError.bind(this))
		);
	}

	descargarCsvPersona(personaId: string): Observable<Blob> {
		return this.http.get(`${this.apiUrl}/${personaId}/exportar-xlsx`, {
			responseType: 'blob',
			headers: {
				'Accept': 'application/zip'
			}
		}).pipe(
			catchError(this.handleError.bind(this))
		);
	}

	private handleError(error: HttpErrorResponse): Observable<never> {
		let errorMessage = 'Ha ocurrido un error desconocido';
		if (error.error instanceof ErrorEvent) {
			errorMessage = `Error del cliente: ${error.error.message}`;
		} else {
			switch (error.status) {
				case 400:
					errorMessage = 'Datos inválidos. Verifique la información enviada.';
					break;
				case 401:
					errorMessage = 'No autorizado. Verifique sus credenciales.';
					break;
				case 403:
					errorMessage = 'Acceso denegado.';
					break;
				case 404:
					errorMessage = 'Recurso no encontrado.';
					break;
				case 409:
					errorMessage = 'Conflicto: Los datos ya existen o están en uso.';
					break;
				case 422:
					errorMessage = 'Datos no procesables. Verifique el formato.';
					break;
				case 500:
					errorMessage = 'Error interno del servidor. Intente más tarde.';
					break;
				case 502:
				case 503:
				case 504:
					errorMessage = 'Servicio no disponible. Intente más tarde.';
					break;
				default:
					errorMessage = `Error del servidor: ${error.status} - ${error.message}`;
			}
		}
	
		return throwError(() => new Error(errorMessage));
	}

	guardarRegistro(persona: Persona): Observable<Persona> {
		return this.http.post<Persona>(this.apiUrl, persona);
	}

	updatePersona(persona: Persona): Observable<Persona> {
		return this.http.put<Persona>(this.apiUrl, persona);
	}
}
