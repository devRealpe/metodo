
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap } from 'rxjs';
import { InformacionAcademica, DepartamentoData } from '../models/informacion-academica.model';
import { environment } from '@shared/shared-environments';
import { FileAttachmentService } from '@microfrontends/shared-services';

@Injectable({
  providedIn: 'root',
})
export class InformacionAcademicaService {
  private apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/info_academica`;

  constructor(
    private http: HttpClient,
    private fileAttachmentService: FileAttachmentService
  ) {}

  guardarRegistro(payload: InformacionAcademica): Observable<InformacionAcademica> {
    return this.http.post<InformacionAcademica>(this.apiUrl, payload);
  }

  actualizarRegistro(payload: InformacionAcademica): Observable<InformacionAcademica> {
    return this.http.put<InformacionAcademica>(this.apiUrl, payload);
  }

  obtenerRegistros(personaId?: string): Observable<InformacionAcademica[]> {
    const url = personaId ? `${this.apiUrl}?personaId=${personaId}` : this.apiUrl;
    return this.http.get<InformacionAcademica[]>(url).pipe(
    );
  }

  obtenerRegistroPorId(id: string): Observable<InformacionAcademica> {
    return this.http.get<InformacionAcademica>(`${this.apiUrl}/${id}`);
  }

  eliminarRegistro(id: string): Observable<void> {
    this.fileAttachmentService.deleteFileAssociationsByRecord(id, 'info_academica').subscribe({
      next: (fileIds) => {
        fileIds.forEach(fileId => {
          this.fileAttachmentService.deleteUploadedFile(fileId).subscribe();
        });
      },
    });

    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  uploadFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/subir`, formData);
  }

  associateFileWithInfoAcademica(archivoSubidoId: string, infoAcademicaId: string): Observable<any> {
    return this.fileAttachmentService.associateFileWithRecord(archivoSubidoId, infoAcademicaId, 'info_academica');
  }

  deleteArchivoAsociacion(infoAcademicaId: string): Observable<void> {
    return this.fileAttachmentService.deleteAssociation(infoAcademicaId);
  }

  deleteArchivoAsociacionByInfoAcademica(infoAcademicaId: string): Observable<string[] | void> {
    return this.fileAttachmentService.deleteFileAssociationsByRecord(infoAcademicaId, 'info_academica');
  }

  deleteArchivo(id: string): Observable<void> {
    return this.fileAttachmentService.deleteUploadedFile(id);
  }
}
