import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export interface ErrorDetails {
  status?: number;
  message: string;
  originalError?: unknown;
  context?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  /**
   * @param error Error HTTP
   * @param serviceName Nombre del servicio donde ocurrió el error
   * @returns Observable que emite el error
   */
  handleHttpError(error: HttpErrorResponse, serviceName: string): Observable<never> {
    const errorDetails = this.parseHttpError(error, serviceName);

    this.logError(errorDetails);

    return throwError(() => new Error(errorDetails.message));
  }

  /**
   * Maneja errores genéricos de aplicación
   * @param error Error genérico
   * @param serviceName Nombre del servicio donde ocurrió el error
   * @returns Observable que emite el error
   */
  handleAppError(error: unknown, serviceName: string): Observable<never> {
    const errorDetails = this.parseAppError(error, serviceName);

    this.logError(errorDetails);

    return throwError(() => new Error(errorDetails.message));
  }

  
  private parseHttpError(error: HttpErrorResponse, serviceName: string): ErrorDetails {
    let message = 'Ha ocurrido un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente (red, etc.)
      message = `Error del cliente: ${error.error.message}`;
    } else {
      // Error del servidor
      message = this.getHttpStatusMessage(error.status, error.message);
    }

    return {
      status: error.status,
      message,
      originalError: error,
      context: serviceName,
      timestamp: new Date().toISOString()
    };
  }

 
  private parseAppError(error: unknown, serviceName: string): ErrorDetails {
    let message = 'Ha ocurrido un error desconocido';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as { message: unknown }).message);
    }

    return {
      message,
      originalError: error,
      context: serviceName,
      timestamp: new Date().toISOString()
    };
  }

  
  private getHttpStatusMessage(status: number, defaultMessage: string): string {
    const statusMessages: Record<number, string> = {
      400: 'Datos inválidos. Verifique la información enviada.',
      401: 'No autorizado. Verifique sus credenciales.',
      403: 'Acceso denegado.',
      404: 'Recurso no encontrado.',
      409: 'Conflicto: Los datos ya existen o están en uso.',
      422: 'Datos no procesables. Verifique el formato.',
      500: 'Error interno del servidor. Intente más tarde.',
      502: 'Servicio no disponible. Intente más tarde.',
      503: 'Servicio no disponible. Intente más tarde.',
      504: 'Servicio no disponible. Intente más tarde.'
    };

    return statusMessages[status] || `Error del servidor: ${status} - ${defaultMessage}`;
  }

  
  private logError(errorDetails: ErrorDetails): void {
    const logData = {
      status: errorDetails.status,
      message: errorDetails.message,
      context: errorDetails.context,
      url: errorDetails.originalError && typeof errorDetails.originalError === 'object' && 'url' in errorDetails.originalError
        ? (errorDetails.originalError as { url: unknown }).url
        : undefined,
      timestamp: errorDetails.timestamp
    };

    if (errorDetails.status && errorDetails.status >= 500) {
      console.error(` Error crítico en ${errorDetails.context}:`, logData);
    } else {
      console.error(`Error en ${errorDetails.context}:`, logData);
    }
  }
}