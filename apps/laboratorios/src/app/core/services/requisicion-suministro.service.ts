import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { 
  RequisicionSuministro, 
  RequisicionValidation, 
  RequisicionResponse 
} from '../models/requisicion-suministro.models';

@Injectable({ providedIn: 'root' })
export class RequisicionSuministroService {
  private readonly base = `${environment.apilaboratoriosLocal}/requisiciones`;
  private readonly http = inject(HttpClient);

  validarRequisicion(requisicion: RequisicionSuministro): Observable<RequisicionValidation> {
    return this.http.post<RequisicionValidation>(`${this.base}/validar`, requisicion)
      .pipe(
        catchError(error => {
          
          return throwError(() => error);
        })
      );
  }

  generarPdfPrevia(requisicion: RequisicionSuministro): Observable<Blob> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.base}/generar-pdf`, requisicion, {
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        
        return throwError(() => error);
      })
    );
  }

  generarPdfImpresion(requisicion: RequisicionSuministro): Observable<Blob> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.base}/generar-pdf-impresion`, requisicion, {
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        
        return throwError(() => error);
      })
    );
  }

  abrirPdfEnNuevaPestana(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  descargarPdf(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  generarNombreArchivo(requisicion: RequisicionSuministro): string {
    const nombre = requisicion.solicitanteNombre
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    
    const fecha = requisicion.fechaSolicitud.replace(/-/g, '');
    
    return `requisicion_suministros_${nombre}_${fecha}.pdf`;
  }

  healthCheck(): Observable<RequisicionResponse> {
    return this.http.get<RequisicionResponse>(`${this.base}/health`)
      .pipe(
        catchError(error => {
         
          return throwError(() => error);
        })
      );
  }

  validarDatosLocalmente(requisicion: RequisicionSuministro): { esValida: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!requisicion.solicitanteNombre?.trim()) {
      errores.push('El nombre del solicitante es obligatorio');
    }

    if (!requisicion.solicitanteCedula?.trim()) {
      errores.push('La cédula del solicitante es obligatoria');
    }

    if (!requisicion.solicitanteCentroCosto?.trim()) {
      errores.push('El centro de costo es obligatorio');
    }

    if (!requisicion.solicitanteDependencia?.trim()) {
      errores.push('La dependencia es obligatoria');
    }

    if (!requisicion.fechaSolicitud) {
      errores.push('La fecha de solicitud es obligatoria');
    }

    if (!requisicion.tipoActivoFijo && !requisicion.tipoSuministro && !requisicion.tipoServicio) {
      errores.push('Debe seleccionar al menos un tipo de solicitud');
    }

    if (!requisicion.items || requisicion.items.length === 0) {
      errores.push('Debe agregar al menos un item a la requisición');
    }

    requisicion.items?.forEach((item, index) => {
      if (!item.descripcion?.trim()) {
        errores.push(`El item ${index + 1} debe tener una descripción`);
      }
      if (!item.cantidad || item.cantidad <= 0) {
        errores.push(`El item ${index + 1} debe tener una cantidad válida`);
      }
      if (!item.unidad?.trim()) {
        errores.push(`El item ${index + 1} debe tener una unidad de medida`);
      }
    });

    return {
      esValida: errores.length === 0,
      errores
    };
  }
}