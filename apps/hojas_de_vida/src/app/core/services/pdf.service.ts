import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, forkJoin, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { AuthService } from '@microfrontends/shared-services';
import JSZip from 'jszip';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  
  private readonly BACKEND_BASE_URL = `${environment.apiHojasDeVida}/hojas-de-vida/personas`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  downloadPdfByAuthUserId(authUserId: string): Observable<Blob> {
    const url = `${this.BACKEND_BASE_URL}/por-auth-usuario/${authUserId}/pdf`;
    return this.getPdfBlobDirect(url);
  }

  downloadPdfWithAttachmentsByAuthUserId(authUserId: string): Observable<Blob> {
    const url = `${this.BACKEND_BASE_URL}/por-auth-usuario/${authUserId}/pdf/with-attachments`;
    return this.getPdfBlobDirect(url);
  }

  previewPdfByAuthUserId(authUserId: string): Observable<Blob> {
    const url = `${this.BACKEND_BASE_URL}/por-auth-usuario/${authUserId}/pdf/preview`;
    return this.getPdfBlobDirect(url);
  }

  downloadPdfByPersonaId(personaId: string): Observable<Blob> {
    const url = `${this.BACKEND_BASE_URL}/${personaId}/pdf`;
    return this.getPdfBlobDirect(url);
  }

  downloadPdfWithAttachmentsByPersonaId(personaId: string): Observable<Blob> {
    const url = `${this.BACKEND_BASE_URL}/${personaId}/pdf/with-attachments`;
    return this.getPdfBlobDirect(url);
  }

  previewPdfByPersonaId(personaId: string): Observable<Blob> {
    const url = `${this.BACKEND_BASE_URL}/${personaId}/pdf/preview`;
    return this.getPdfBlobDirect(url);
  }

  downloadMultiplePdfsAsZip(candidatos: Array<{personaId: string, identificacion: string, nombreCompleto: string}>): Observable<Blob> {
    const pdfDownloads$ = candidatos.map(candidato => 
      this.downloadPdfByPersonaId(candidato.personaId).pipe(
        map(blob => ({ 
          personaId: candidato.personaId,
          identificacion: candidato.identificacion,
          nombreCompleto: candidato.nombreCompleto,
          blob 
        })),
        catchError(error => {
          return throwError(() => error);
        })
      )
    );

    return forkJoin(pdfDownloads$).pipe(
      switchMap(results => {
        const zip = new JSZip();
        results.forEach((result) => {
          const nombreLimpio = this.limpiarNombreArchivo(result.nombreCompleto);
          const fileName = `${result.identificacion}-${nombreLimpio}.pdf`;
          zip.file(fileName, result.blob);
        });
        return from(zip.generateAsync({ type: 'blob' }));
      }),
      catchError(this.handleError)
    );
  }

  private limpiarNombreArchivo(nombre: string): string {
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') 
      .replace(/[^a-zA-Z0-9\s]/g, '') 
      .replace(/\s+/g, '_') 
      .substring(0, 50); 
  }

  private getPdfBlobDirect(absoluteUrl: string): Observable<Blob> {
    return new Observable<Blob>(observer => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('GET', absoluteUrl, true);
      xhr.responseType = 'blob';
      
      const token = this.authService.getAccessToken();
      xhr.setRequestHeader('Accept', 'application/pdf');
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          observer.next(xhr.response);
          observer.complete();
        } else {
          const error = this.createHttpError(xhr);
          observer.error(error);
        }
      };
      
      xhr.onerror = () => {
        observer.error(new Error('Network error - Cannot connect to backend at ' + absoluteUrl));
      };
      
      xhr.ontimeout = () => {
        observer.error(new Error('Request timeout - Backend did not respond within 30 seconds'));
      };
      
      xhr.timeout = 30000;
      xhr.send();
    }).pipe(
      catchError(this.handleError)
    );
  }

  downloadPdf(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  }

  openPdfInNewTab(blob: Blob): void {
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, '_blank');
    
    if (!newWindow) {
      this.downloadPdf(blob, 'hoja_de_vida_preview.pdf');
    }
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }

  private createHttpError(xhr: XMLHttpRequest): HttpErrorResponse {
    return new HttpErrorResponse({
      error: xhr.response || xhr.statusText,
      headers: new HttpHeaders(),
      status: xhr.status,
      statusText: xhr.statusText,
      url: xhr.responseURL || undefined,
    });
  }

  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'Error desconocido';
    
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          errorMessage = 'No se puede conectar con el servidor. Verifique que el backend esté ejecutándose y que no haya problemas de CORS.';
          break;
        case 401:
          errorMessage = 'No autorizado. Su sesión ha expirado, por favor inicie sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'Acceso denegado. No tiene permisos para acceder a esta hoja de vida.';
          break;
        case 404:
          errorMessage = 'La hoja de vida no fue encontrada. Verifique que el usuario tenga una hoja de vida registrada.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. El backend encontró un problema al generar el PDF.';
          break;
        default:
          errorMessage = `Error del servidor: ${error.status} - ${error.statusText || error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  generatePdfFilename(nombre: string, primerApellido: string, segundoApellido?: string, withAttachments: boolean = false): string {
    const nombreCompleto = `${nombre}_${primerApellido}_${segundoApellido || ''}`;
    const fechaHoy = new Date().toISOString().split('T')[0];
    const nombreLimpio = nombreCompleto.replace(/[^a-zA-Z0-9]/g, '_');
    const suffix = withAttachments ? '_con_archivos' : '';
    
    return `HojaVida_${nombreLimpio}_${fechaHoy}${suffix}.pdf`;
  }

  async testBackendConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const testUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas`;
      
      xhr.open('GET', testUrl, true);
      xhr.timeout = 5000;
      
      const token = this.authService.getAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = () => {
        const connected = xhr.status >= 200 && xhr.status < 500;
        resolve(connected);
      };
      
      xhr.onerror = xhr.ontimeout = () => {
        resolve(false);
      };
      
      xhr.send();
    });
  }
}
