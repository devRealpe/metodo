import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

import { FileInfoS, FileAttachmentConfig } from '@microfrontends/shared-ui';
import { environment } from '@shared/shared-environments';

export interface ArchivoSubido {
  id: string;
  nombre: string;
  tamano: number;
  tipoContenido: string;
  fechaSubida: Date;
  ruta: string;
  modulo?: string;
  convenio?: any;
  movilidad?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ArchivoService {

  static readonly DEFAULT_FILE_ATTACHMENT_CONFIG: FileAttachmentConfig = {
    moduleType: 'documento_soporte',
    multiple: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    accept: '.pdf',
    autoUpload: false,
    showPreview: true,
    showDownload: true,
    showDelete: true,
    renameFiles: false
  };

  private readonly baseUrl = `${environment.internacionalizacionApi}`;
  private readonly uploadUrl = `${this.baseUrl}/archivos_subidos/subir`;
  private readonly downloadUrl = `${this.baseUrl}/archivos_subidos/descargar`;

  constructor(private http: HttpClient) {}

  
  uploadFile(file: File, config: any, personaId: string, recordId?: string): Observable<ArchivoSubido> {
    // Default behavior: send modulo from config (supports 'documento_soporte' and 'movilidad_proceso')
    return this.uploadConvenioFile(file, recordId || '', personaId, config?.moduleType || 'convenio');
  }

  uploadConvenioFile(file: File, convenioId: string, personaId: string, moduleType: string = 'convenio'): Observable<ArchivoSubido> {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('modulo', moduleType);
    formData.append('tipo', 'contrato');
    formData.append('idPersona', personaId);
    formData.append('idRegistro', convenioId);

    return this.http.post<ArchivoSubido>(this.uploadUrl, formData).pipe(
      catchError(this.handleError)
    );
  }

  deleteUploadedFile(fileId: string): Observable<any> {
    const url = `${this.baseUrl}/archivos_subidos/${fileId}`;
    return this.http.delete(url).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          console.warn('Archivo ya fue eliminado (404):', fileId);
          return of(undefined);
        }
        return this.handleError(error);
      })
    );
  }

  getFilesByRecord(recordId: string, moduleType?: string): Observable<ArchivoSubido[]> {
    if (moduleType === 'movilidad_proceso' || moduleType === 'documento_soporte') {
      const url = `${this.baseUrl}/archivos_subidos/registro/${recordId}/modulo/${moduleType}`;
      return this.http.get<ArchivoSubido[]>(url).pipe(
        catchError(this.handleError)
      );
    }
    return this.getConvenioFiles(recordId, moduleType || 'convenio');
  }

  getConvenioFiles(convenioId: string, moduleType: string = 'convenio'): Observable<ArchivoSubido[]> {
    const url = `${this.baseUrl}/archivos_subidos/convenio/${convenioId}`;
    return this.http.get<ArchivoSubido[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getFilesByPersona(personaId: string): Observable<ArchivoSubido[]> {
    const url = `${this.baseUrl}/archivos_subidos/persona/${personaId}`;
    return this.http.get<ArchivoSubido[]>(url).pipe(
      catchError(this.handleError)
    );
  }



  associateFileWithRecord(fileId: string, recordId: string, moduleType?: string): Observable<any> {
    // Para documento_soporte y movilidad_proceso se usa el endpoint PUT de convenio (que maneja movilidad si convenio falla)
    if (moduleType === 'documento_soporte' || moduleType === 'movilidad_proceso') {
      const url = `${this.baseUrl}/archivos_subidos/${fileId}/convenio/${recordId}`;
      return this.http.put(url, {}).pipe(catchError(this.handleError));
    }

    // Para otros casos, usar el método original
    return this.associateFileWithConvenio(fileId, recordId, moduleType || 'convenio');
  }

  associateFileWithConvenio(fileId: string, convenioId: string, moduleType: string = 'convenio'): Observable<any> {
    if (moduleType === 'documento_soporte') {
      const url = `${this.baseUrl}/archivos_subidos/${fileId}/convenio/${convenioId}`;
      return this.http.put(url, {}).pipe(catchError(this.handleError));
    }

    const url = `${this.baseUrl}/archivos_subidos/asociar`;
    return this.http.post(url, { idArchivo: fileId, idRegistro: convenioId, modulo: moduleType }).pipe(
      catchError(this.handleError)
    );
  }

  deleteFileAssociationsByRecord(recordId: string, moduleType?: string): Observable<any> {
    return this.deleteConvenioFiles(recordId, moduleType || 'convenio');
  }

  deleteConvenioFiles(convenioId: string, moduleType: string = 'convenio'): Observable<any> {
    const url = `${this.baseUrl}/archivos_subidos/registro/${convenioId}/modulo/${moduleType}`;
    return this.http.delete(url).pipe(
      catchError(this.handleError)
    );
  }

  convertToFileInfo(archivoSubido: ArchivoSubido): FileInfoS {
    return {
      id: archivoSubido.id,
      name: archivoSubido.nombre,
      size: archivoSubido.tamano,
      type: archivoSubido.tipoContenido,
      uploadDate: archivoSubido.fechaSubida,
      url: `${this.downloadUrl}/${archivoSubido.id}`
    };
  }

  convertToFileInfoList(archivosSubidos: ArchivoSubido[]): FileInfoS[] {
    return archivosSubidos.map(archivo => this.convertToFileInfo(archivo));
  }

  getDownloadUrl(fileId: string): string {
    return `${this.downloadUrl}/${fileId}/download`;
  }

  uploadAndAssociateFile(file: File, recordId: string, config: any, personaId: string): Observable<any> {
    return new Observable(observer => {
      this.uploadFile(file, config, personaId, recordId).subscribe({
        next: (uploadedFile) => {
          const fileInfo = this.convertToFileInfo(uploadedFile);
          observer.next({
            success: true,
            files: [fileInfo]
          });
          observer.complete();
        },
        error: (uploadError) => {
          observer.next({
            success: false,
            error: `Error al subir archivo: ${uploadError}`
          });
          observer.complete();
        }
      });
    });
  }

  uploadAndAssociateMultipleFiles(files: File[], recordId: string, config: any, personaId: string): Observable<any> {
    const uploads$ = files.map(file => this.uploadFile(file, config, personaId, recordId));
    return forkJoin(uploads$).pipe(
      map((uploadedFiles: ArchivoSubido[]) => ({ success: true, files: this.convertToFileInfoList(uploadedFiles) })),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Código: ${error.status}, Mensaje: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}