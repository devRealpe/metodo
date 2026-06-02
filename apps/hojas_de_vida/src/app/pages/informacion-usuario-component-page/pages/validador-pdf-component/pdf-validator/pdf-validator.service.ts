import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { PdfValidationResult } from './pdf-validator.component';
import { getDocumentInfoForModule, ModuleDocumentConfig } from './document-validation.config';
import { environment } from '@shared/shared-environments';

export interface PdfAnalysisResponse {
  success: boolean;
  extracted_text: string;
  full_text_length: number;
  watermarks_detected: number;
  processing_time: number;
  text_quality: {
    overall: number;
    length: number;
    vocabulary: number;
    structure: number;
  };
  file_info: {
    filename: string;
    size_mb: number;
  };
  criteria_applied: {
    domain: string | null;
    subcriteria: string | null;
    applied_keywords_count: number;
    explain: string;
  };
  // Campos opcionales que pueden venir con request completo
  match?: boolean;
  keywords_found?: string[];
  confidence_score?: number;
  extraction_method?: string;
  extraction_details?: {
    confidence_scores: Record<string, number>;
    semantic_matches: Record<string, number>;
    text_quality_metrics: {
      overall: number;
      length: number;
      vocabulary: number;
      structure: number;
    };
    analysis_time: number;
    matching_strategy: string;
    watermarks_removed: number;
    performance_optimizations: string[];
  };
  preview_text?: string;
  normalized_preview?: string;
  document_type?: string;
  performance_metrics?: {
    models_loaded: Record<string, boolean>;
    cache_stats: Record<string, number>;
    optimization_score: number;
  };
}

export interface PdfAnalysisRequest {
  keywords?: string[];
  min_matches?: number;
  fast_mode?: boolean;
  // Removidas domain y subcriteria - usar keywords en su lugar para compatibilidad
}

export interface BatchAnalysisRequest {
  files: File[];
  expectedDocumentType?: string;
}

export interface BatchAnalysisResponse {
  results: PdfAnalysisResponse[];
  totalProcessed: number;
  totalValid: number;
  processingTime: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  dependencies: {
    pythonApi: {
      status: 'up' | 'down';
      responseTime: number;
    };
    database?: {
      status: 'up' | 'down';
      responseTime: number;
    };
  };
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  lastHourRequests: number;
  peakResponseTime: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfValidatorService {
  private readonly baseUrl = `${environment.apiHojasDeVida}/hojas-de-vida/pdf-analysis`;
  private readonly httpClient = inject(HttpClient);
  
  // Subject para tracking de progreso
  private uploadProgress$ = new BehaviorSubject<number>(0);

  constructor() {}

  /**
   * Valida un PDF usando configuración específica del módulo
   */
  validatePdfForModule(file: File, moduleType: string): Observable<PdfValidationResult> {
    const config = getDocumentInfoForModule(moduleType);
    if (!config) {
      return throwError(() => new Error(`Configuración no encontrada para el módulo: ${moduleType}`));
    }

    return this.validatePdf(
      file,
      config.documentType,
      config.domain,
      config.defaultSubcriteria
    );
  }

  /**
   * Valida un solo PDF usando el endpoint /filter_pdf_v2
   */
  validatePdf(
    file: File, 
    expectedDocumentType?: 'Social_Security_Affiliation' | 'Employment_Document' | 'Educational_Certificate',
    domain?: string,
    subcriteria?: string[]
  ): Observable<PdfValidationResult> {
    const formData = new FormData();
    formData.append('file', file);

    // Crear el objeto request según el formato esperado por el backend Python
    const requestPayload: PdfAnalysisRequest = {
      min_matches: 1,
      fast_mode: true
    };

    // Usar keywords en lugar de domain/subcriteria para mayor compatibilidad
    if (domain && subcriteria && subcriteria.length > 0) {
      // Convertir dominio y subcriteria a keywords
      requestPayload.keywords = this.getKeywordsForDomainAndSubcriteria(domain, subcriteria);
      requestPayload.min_matches = Math.max(1, Math.floor(requestPayload.keywords.length * 0.4));
    } else {
      // Fallback a keywords por tipo de documento
      requestPayload.keywords = this.getKeywordsForDocumentType(expectedDocumentType);
      requestPayload.min_matches = 2;
    }

    // Enviar como parámetro de query string
    const requestString = JSON.stringify(requestPayload);
    const params = new URLSearchParams();
    params.append('request', requestString);

    const headers = new HttpHeaders({
      // No establecer Content-Type para multipart/form-data - el browser lo hace automáticamente
    });


    return this.httpClient.post<PdfAnalysisResponse>(
      `${this.baseUrl}/filter_pdf_v2?${params.toString()}`,
      formData,
      { 
        headers,
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      tap((event: HttpEvent<PdfAnalysisResponse>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          this.uploadProgress$.next(progress);
        }
      }),
      map((event: HttpEvent<PdfAnalysisResponse>) => {
        if (event.type === HttpEventType.Response && event.body) {
          return this.mapToValidationResult(event.body);
        }
        // Para otros tipos de eventos, devolver un resultado temporal
        return {
          isValid: false,
          documentType: expectedDocumentType || 'Unknown',
          confidence: 0,
          criteria: [],
          message: 'Procesando...'
        } as PdfValidationResult;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Convierte dominio y subcriteria a keywords específicas
   */
  private getKeywordsForDomainAndSubcriteria(domain: string, subcriteria: string[]): string[] {
    const keywords: string[] = [];

    // Agregar keywords base del dominio
    switch (domain) {
      case 'seguridad_social':
        keywords.push('seguridad_social', 'afiliacion', 'cotizante', 'aportes');
        break;
      case 'laborales':
        keywords.push('trabajo', 'laboral', 'empleo', 'empresa');
        break;
      case 'academicos':
        keywords.push('academico', 'educacion', 'titulo', 'certificado');
        break;
      default:
        keywords.push(domain);
    }

    // Agregar keywords específicas de subcriteria
    subcriteria.forEach(sub => {
      switch (sub) {
        case 'eps':
          keywords.push('eps', 'salud', 'entidad_promotora');
          break;
        case 'arl':
          keywords.push('arl', 'riesgos', 'accidente');
          break;
        case 'pension':
          keywords.push('pension', 'jubilacion', 'fondo');
          break;
        case 'cesantias':
          keywords.push('cesantias', 'cesantia', 'auxilio');
          break;
        case 'caja_compensacion':
          keywords.push('caja', 'compensacion', 'subsidio');
          break;
        case 'constancia_trabajo':
          keywords.push('constancia', 'certificacion', 'labora');
          break;
        case 'experiencia':
          keywords.push('experiencia', 'trayectoria', 'desempeño');
          break;
        case 'recomendacion':
          keywords.push('recomendacion', 'referencia', 'testimonio');
          break;
        case 'retiro':
          keywords.push('retiro', 'terminacion', 'finalizacion');
          break;
        case 'media':
          keywords.push('bachiller', 'media', 'secundaria');
          break;
        case 'pregrado':
          keywords.push('pregrado', 'universitario', 'licenciatura');
          break;
        case 'posgrado':
          keywords.push('posgrado', 'maestria', 'especializacion');
          break;
        case 'certificaciones':
          keywords.push('certificacion', 'curso', 'capacitacion');
          break;
        default:
          keywords.push(sub);
      }
    });

    return [...new Set(keywords)]; // Eliminar duplicados
  }

  /**
   * Obtiene keywords por defecto según el tipo de documento
   */
  private getKeywordsForDocumentType(documentType?: string): string[] {
    switch (documentType) {
      case 'Social_Security_Affiliation':
        return ['seguridad_social', 'eps'];
      case 'Employment_Document':
        return ['trabajo', 'laboral'];
      case 'Educational_Certificate':
        return ['academico', 'titulo'];
      default:
        return ['documento'];
    }
  }

  /**
   * Analiza múltiples PDFs en batch
   */
  validatePdfBatch(request: BatchAnalysisRequest): Observable<BatchAnalysisResponse> {
    const formData = new FormData();
    
    request.files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    if (request.expectedDocumentType) {
      formData.append('expected_document_type', request.expectedDocumentType);
    }

    return this.httpClient.post<BatchAnalysisResponse>(
      `${this.baseUrl}/batch_analyze`,
      formData
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtiene estadísticas de rendimiento del sistema
   */
  getPerformanceStats(): Observable<PerformanceStats> {
    return this.httpClient.get<PerformanceStats>(
      `${this.baseUrl}/performance_stats`
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Verifica el estado de salud del sistema
   */
  getHealthStatus(): Observable<HealthStatus> {
    return this.httpClient.get<HealthStatus>(
      `${this.baseUrl}/health_v2`
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtiene información de la API
   */
  getApiInfo(): Observable<any> {
    return this.httpClient.get(
      `${this.baseUrl}/api-info`
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Obtiene el progreso de upload actual
   */
  getUploadProgress(): Observable<number> {
    return this.uploadProgress$.asObservable();
  }

  /**
   * Resetea el progreso de upload
   */
  resetUploadProgress(): void {
    this.uploadProgress$.next(0);
  }

  /**
   * Mapea la respuesta del backend al formato esperado por el componente
   */
  private mapToValidationResult(response: PdfAnalysisResponse): PdfValidationResult {
    
    // Crear criterios basados en la información disponible
    const criteria = [];
    
    // Verificar si el proceso fue exitoso
    if (response.success !== undefined) {
      criteria.push({
        criterion: 'Procesamiento exitoso',
        satisfied: response.success,
        confidence: response.success ? 1.0 : 0.0,
        details: response.success ? 'PDF procesado correctamente' : 'Error procesando PDF'
      });
    }

    // Agregar criterio de calidad de texto
    if (response.text_quality?.overall !== undefined) {
      const textQuality = response.text_quality.overall;
      criteria.push({
        criterion: 'Calidad del texto extraído',
        satisfied: textQuality >= 0.7,
        confidence: textQuality,
        details: `Calidad: ${(textQuality * 100).toFixed(1)}%`
      });
    }

    // Si hay información de confianza (respuesta completa con análisis)
    if (response.confidence_score !== undefined) {
      criteria.push({
        criterion: 'Nivel de confianza general',
        satisfied: response.confidence_score >= 0.4,
        confidence: response.confidence_score,
        details: `Puntuación de confianza: ${(response.confidence_score * 100).toFixed(1)}%`
      });
    }

    // Si hay palabras clave encontradas
    if (response.keywords_found && response.keywords_found.length > 0) {
      criteria.push({
        criterion: 'Palabras clave encontradas',
        satisfied: response.keywords_found.length >= 1,
        confidence: Math.min(response.keywords_found.length / 5, 1),
        details: `Encontradas: ${response.keywords_found.join(', ')}`
      });
    }

    // Determinar si es válido
    let isValid = false;
    let confidence = 0;
    let documentType = 'Unknown';
    let message = '';

    if (response.match !== undefined && response.confidence_score !== undefined) {
      // Respuesta completa con análisis de matching
      isValid = response.success && response.match && response.confidence_score >= 0.4;
      confidence = response.confidence_score;
      documentType = response.document_type || 'Unknown';
      
      if (isValid) {
        message = `Documento válido detectado como ${documentType}. ` +
                 `Encontradas ${response.keywords_found?.length || 0} palabras clave relevantes.`;
      } else {
        if (!response.success) {
          message = 'Error procesando el documento PDF.';
        } else if (!response.match) {
          message = 'El documento no coincide con el tipo esperado para afiliación a seguridad social.';
        } else if (response.confidence_score < 0.4) {
          message = `Nivel de confianza demasiado bajo (${(response.confidence_score * 100).toFixed(1)}%). El documento puede no ser del tipo esperado.`;
        }
      }
    } else {
      // Respuesta básica sin análisis de matching - validar por contenido de texto
      const hasValidContent = this.validateContentForAffiliation(response.extracted_text);
      const textQualityGood = response.text_quality?.overall >= 0.8;
      
      isValid = response.success && hasValidContent && textQualityGood;
      confidence = hasValidContent ? (response.text_quality?.overall || 0.5) : 0.2;
      documentType = hasValidContent ? 'Social_Security_Affiliation' : 'Unknown';
      
      if (isValid) {
        message = 'Documento de afiliación a seguridad social detectado correctamente.';
      } else {
        if (!response.success) {
          message = 'Error procesando el documento PDF.';
        } else if (!hasValidContent) {
          message = 'El documento no parece ser una afiliación a seguridad social válida.';
        } else if (!textQualityGood) {
          message = 'La calidad del texto extraído es demasiado baja para validar el documento.';
        }
      }
      
      // Agregar criterio de contenido específico
      criteria.push({
        criterion: 'Contenido de afiliación detectado',
        satisfied: hasValidContent,
        confidence: hasValidContent ? 0.8 : 0.2,
        details: hasValidContent ? 'Encontrado contenido relacionado con seguridad social' : 'No se encontró contenido de afiliación'
      });
    }

  

    return {
      isValid,
      documentType,
      confidence,
      criteria,
      message
    };
  }

  /**
   * Valida si el contenido del texto contiene información de afiliación a seguridad social
   */
  private validateContentForAffiliation(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }

    const lowercaseText = text.toLowerCase();
    
    // Palabras clave importantes para afiliación a seguridad social
    const affiliationKeywords = [
      'eps', 'arl', 'pension', 'afiliacion', 'afiliación', 'seguridad social',
      'cotizante', 'planilla', 'pila', 'entidad promotora', 'administradora',
      'fondo', 'aportes', 'liquidacion', 'liquidación', 'nit', 'identificacion',
      'razon social', 'razón social', 'periodo', 'período'
    ];

    // Contar cuántas palabras clave se encontraron
    let keywordCount = 0;
    for (const keyword of affiliationKeywords) {
      if (lowercaseText.includes(keyword)) {
        keywordCount++;
      }
    }

    // Considerar válido si se encuentran al menos 3 palabras clave
    return keywordCount >= 3;
  }

  /**
   * Maneja errores HTTP de forma centralizada
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido durante la validación';
    
    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else if (error.status === 0) {
      // Error de red o CORS - común con ERR_BLOCKED_BY_CLIENT
      errorMessage = 'No se pudo conectar al servicio de validación. Verifique que el servidor esté disponible y que no haya problemas de red.';
    } else {
      // Error del servidor
      switch (error.status) {
        case 400:
          errorMessage = 'Archivo inválido o parámetros incorrectos';
          break;
        case 401:
          errorMessage = 'No autorizado para realizar esta operación';
          break;
        case 413:
          errorMessage = 'El archivo es demasiado grande';
          break;
        case 415:
          errorMessage = 'Tipo de archivo no soportado';
          break;
        case 422:
          errorMessage = 'El archivo PDF está corrupto o no se puede procesar';
          break;
        case 500:
          errorMessage = 'Error interno del servidor durante el análisis';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'El servicio de análisis no está disponible temporalmente';
          break;
        default:
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = `Error del servidor: ${error.status} - ${error.statusText}`;
          }
      }
    }



    return throwError(() => new Error(errorMessage));
  }

  /**
   * Valida si un archivo es un PDF válido antes del upload
   */
  isValidPdfFile(file: File): boolean {
    const validMimeTypes = ['application/pdf'];
    const validExtensions = ['.pdf'];
    
    const hasValidMimeType = validMimeTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    return hasValidMimeType && hasValidExtension;
  }

  /**
   * Obtiene el tamaño máximo permitido para archivos
   */
  getMaxFileSize(): number {
    return 10 * 1024 * 1024; // 10MB
  }

  /**
   * Formatea el tamaño de archivo para mostrar
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Valida múltiples archivos antes del procesamiento
   */
  validateFiles(files: File[]): { validFiles: File[]; errors: string[] } {
    const validFiles: File[] = [];
    const errors: string[] = [];
    const maxSize = this.getMaxFileSize();

    files.forEach(file => {
      // Validar tipo de archivo
      if (!this.isValidPdfFile(file)) {
        errors.push(`${file.name}: Tipo de archivo no válido. Solo se permiten archivos PDF.`);
        return;
      }

      // Validar tamaño
      if (file.size > maxSize) {
        errors.push(`${file.name}: Archivo demasiado grande (${this.formatFileSize(file.size)}). Máximo permitido: ${this.formatFileSize(maxSize)}.`);
        return;
      }

      // Validar que no esté vacío
      if (file.size === 0) {
        errors.push(`${file.name}: El archivo está vacío.`);
        return;
      }

      validFiles.push(file);
    });

    return { validFiles, errors };
  }
}