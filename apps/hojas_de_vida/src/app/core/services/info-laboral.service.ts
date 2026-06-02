import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap } from 'rxjs';
import { InfoLaboral } from '../models/info-laboral.model';
import { environment } from '@shared/shared-environments';
import { FileAttachmentService } from '@microfrontends/shared-services';

export interface SinExperienciaLaboralResponse {
  idPersona: string;
  sinExperienciaLaboral: boolean;
  fechaDeclaracionSinExperienciaLaboral: string | null;
  estadoExperienciaLaboral: string;
  mensajeExperienciaLaboral: string;
}

@Injectable({ providedIn: 'root' })
export class InfoLaboralService {
      private readonly apiUrl = `${environment.apiHojasDeVida}/hojas-de-vida/info_laboral`;

  constructor(
    private http: HttpClient,
    private fileAttachmentService: FileAttachmentService
  ) {}

  getAll(personaId?: string): Observable<InfoLaboral[]> {
    const url = personaId ? `${this.apiUrl}?personaId=${personaId}` : this.apiUrl;
    return this.http.get<InfoLaboral[]>(url);
  }

  getById(id: string): Observable<InfoLaboral> {
    return this.http.get<InfoLaboral>(`${this.apiUrl}/${id}`);
  }

  create(infoLaboral: InfoLaboral): Observable<InfoLaboral> {
    return this.http.post<InfoLaboral>(this.apiUrl, infoLaboral);
  }

  update(infoLaboral: InfoLaboral): Observable<InfoLaboral> {
    return this.http.put<InfoLaboral>(this.apiUrl, infoLaboral);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteArchivoAsociacion(infoLaboralId: string): Observable<void> {
    return this.fileAttachmentService.deleteAssociation(infoLaboralId);
  }

  deleteArchivoAsociacionByInfoLaboral(infoLaboralId: string): Observable<string[]> {
    return this.fileAttachmentService.deleteFileAssociationsByRecord(infoLaboralId, 'info_laboral');
  }

  uploadFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiHojasDeVida}/hojas-de-vida/archivos_subidos/subir`, formData);
  }

  associateFileWithInfoLaboral(archivoSubidoId: string, infoLaboralId: string): Observable<any> {
    return this.fileAttachmentService.associateFileWithRecord(archivoSubidoId, infoLaboralId, 'info_laboral');
  }

  getByUsuarioId(usuarioId: string): Observable<InfoLaboral[]> {
    return this.getAll(usuarioId);
  }

  deleteArchivo(id: string): Observable<void> {
    return this.fileAttachmentService.deleteUploadedFile(id);
  }

  getSinExperienciaLaboral(personaId: string): Observable<SinExperienciaLaboralResponse> {
    return this.http.get<SinExperienciaLaboralResponse>(
      `${this.apiUrl}/personas/${personaId}/sin-experiencia-laboral`
    );
  }

  actualizarSinExperienciaLaboral(personaId: string, sinExperienciaLaboral: boolean): Observable<SinExperienciaLaboralResponse> {
    return this.http.patch<SinExperienciaLaboralResponse>(
      `${this.apiUrl}/personas/${personaId}/sin-experiencia-laboral`,
      { sinExperienciaLaboral }
    );
  }
}
