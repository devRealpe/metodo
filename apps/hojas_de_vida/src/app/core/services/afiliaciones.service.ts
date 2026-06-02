
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Afiliacion } from '../models/afiliacion.model';
import { environment } from '@shared/shared-environments';
import { FileAttachmentService } from '@microfrontends/shared-services';

@Injectable({
	providedIn: 'root',
})
export class AfiliacionesService {
		private baseUrl = `${environment.apiHojasDeVida}/hojas-de-vida/afiliaciones`;
        private entidadesUrl = `${environment.generalApi}/listas-valores/dropdown/tipo/ENT`;

	constructor(
		private http: HttpClient,
		private fileAttachmentService: FileAttachmentService
	) {}

	//
  getEntidades(): Observable<any[]> {
    return this.http.get<any[]>(this.entidadesUrl).pipe(
      map(items => items.filter(item => item.nombrePadre === 'Entidades')),
    );
  }

	getByUsuarioId(idPersona: string): Observable<Afiliacion[]> {
		return this.http.get<Afiliacion[]>(this.baseUrl).pipe(
			map(records => {
				const filtered = records
					.filter(record => record.persona === idPersona)
					.map(record => ({
						...record,
						archivos: record.archivos || []
					}));
				return filtered;
			}),
		);
	}

	getById(id: string): Observable<Afiliacion> {
		return this.http.get<Afiliacion>(`${this.baseUrl}/${id}`).pipe();
	}

	getAfiliacionesPersonas(idPersona: string): Observable<Afiliacion[]> {
		return this.http.get<Afiliacion[]>(`${this.baseUrl}/mis_afiliaciones/${idPersona}`).pipe(
		);
	}

	create(data: Afiliacion): Observable<Afiliacion> {
		return this.http.post<Afiliacion>(this.baseUrl, data).pipe(
		);
	}

	update(afiliacion: Afiliacion): Observable<Afiliacion> {
		if (!afiliacion.id) {
			return throwError(() => new Error('ID de afiliación es requerido para actualizar'));
		}
		return this.http.put<Afiliacion>(`${this.baseUrl}/${afiliacion.id}`, afiliacion).pipe(
		);
	}

	delete(id: string): Observable<void> {
		this.fileAttachmentService.deleteFileAssociationsByRecord(id, 'afiliacion').subscribe({
			next: (fileIds) => {
				fileIds.forEach(fileId => {
					this.fileAttachmentService.deleteUploadedFile(fileId).subscribe();
				});
			},
			error: (err) =>{}
		});

		return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe();
	}

	uploadFile(formData: FormData): Observable<any> {
		return this.http.post<any>(`${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/subir`, formData).pipe();
	}

	deleteArchivoAsociacion(afiliacionId: string): Observable<void> {
		return this.fileAttachmentService.deleteFileAssociationsByRecord(afiliacionId, 'afiliacion').pipe(
			map(() => void 0)
		);
	}

	deleteArchivoAsociacionByAfiliacion(afiliacionId: string): Observable<string[]> {
		return this.fileAttachmentService.deleteFileAssociationsByRecord(afiliacionId, 'afiliacion');
	}

	associateFileWithAfiliacion(archivoSubidoId: string, afiliacionId: string): Observable<any> {
		return this.fileAttachmentService.associateFileWithRecord(archivoSubidoId, afiliacionId, 'afiliacion');
	}


	deleteArchivo(id: string): Observable<void> {
		return this.fileAttachmentService.deleteUploadedFile(id);
	}

	
}
