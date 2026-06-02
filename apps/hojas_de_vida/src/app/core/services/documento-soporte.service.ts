import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { DocumentoSoporte } from '../models/documento-soporte.model';
import { environment } from '@shared/shared-environments';
import { FileAttachmentService } from '@microfrontends/shared-services';

@Injectable({
	providedIn: 'root',
})
export class DocumentoSoporteService {
	private baseUrl = `${environment.apiHojasDeVida}/hojas-de-vida/documentos-soporte`;

	constructor(
		private http: HttpClient,
		private fileAttachmentService: FileAttachmentService
	) {}

	getByUsuarioId(idPersona: string): Observable<DocumentoSoporte[]> {
		return this.http.get<DocumentoSoporte[]>(this.baseUrl).pipe(
			map(records => {
				const filtered = records
					.filter(record => record.idPersona === idPersona)
					.map(record => ({
						...record,
						archivos: record.archivos || []
					}));
				return filtered;
			}),
		);
	}

	getById(id: string): Observable<DocumentoSoporte> {
		return this.http.get<DocumentoSoporte>(`${this.baseUrl}/${id}`).pipe(
		);
	}

	create(data: DocumentoSoporte): Observable<DocumentoSoporte> {
	
		return this.http.post<DocumentoSoporte>(this.baseUrl, data).pipe(
			tap(response => {
			}),	);
	}

	update(id: string, data: DocumentoSoporte): Observable<DocumentoSoporte> {
		
		return this.http.put<DocumentoSoporte>(`${this.baseUrl}/${id}`, data).pipe(
			tap(response => {
			}),);
	}

	delete(id: string): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
			tap(() => {
				this.fileAttachmentService.deleteFileAssociationsByRecord(id, 'documento_soporte').subscribe({
					next: (fileIds) => {
						fileIds.forEach(fileId => {
							this.fileAttachmentService.deleteUploadedFile(fileId).subscribe();
						});
					},
				});
			}),);
	}

}
