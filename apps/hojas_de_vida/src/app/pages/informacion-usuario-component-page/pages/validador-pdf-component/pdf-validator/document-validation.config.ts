/**
 * Configuraciones predefinidas para validación de documentos PDF
 * según el tipo de módulo de la aplicación
 */

import { PdfValidatorConfig } from './pdf-validator.component';

export interface ModuleDocumentConfig {
  moduleType: 'afiliacion' | 'info_laboral' | 'info_academica';
  documentType: 'Social_Security_Affiliation' | 'Employment_Document' | 'Educational_Certificate';
  displayName: string;
  description: string;
  examples: string[];
  validatorConfig: PdfValidatorConfig;
  // Configuración para la API Python
  domain: string;
  availableSubcriteria: string[];
  defaultSubcriteria: string[];
}

/**
 * Configuraciones predefinidas por módulo
 */
export const DOCUMENT_CONFIGS: Record<string, ModuleDocumentConfig> = {
  afiliacion: {
    moduleType: 'afiliacion',
    documentType: 'Social_Security_Affiliation',
    displayName: 'Afiliación a Seguridad Social',
    description: 'Documentos que comprueban la afiliación a sistemas de seguridad social',
    examples: [
      'Certificados de afiliación a EPS',
      'Comprobantes de afiliación a ARL',
      'Certificados de afiliación a fondos de pensiones',
      'Planillas integradas de liquidación de aportes (PILA)'
    ],
    domain: 'seguridad_social',
    availableSubcriteria: ['eps', 'arl', 'pension', 'cesantias', 'caja_compensacion'],
    defaultSubcriteria: ['eps'],
    validatorConfig: {
      expectedDocumentType: 'Social_Security_Affiliation',
      acceptedMimeTypes: ['application/pdf'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowMultipleFiles: false,
      showDetailedResults: true,
      autoValidateOnSelect: true
    }
  },
  
  info_laboral: {
    moduleType: 'info_laboral',
    documentType: 'Employment_Document',
    displayName: 'Documentos Laborales',
    description: 'Documentos relacionados con experiencia laboral y empleos',
    examples: [
      'Contratos de trabajo',
      'Certificados laborales',
      'Cartas de referencia laboral',
      'Liquidaciones de prestaciones sociales',
      'Comprobantes de pago de nómina'
    ],
    domain: 'laborales',
    availableSubcriteria: ['constancia_trabajo', 'experiencia', 'recomendacion', 'retiro'],
    defaultSubcriteria: ['constancia_trabajo'],
    validatorConfig: {
      expectedDocumentType: 'Employment_Document',
      acceptedMimeTypes: ['application/pdf'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowMultipleFiles: false,
      showDetailedResults: true,
      autoValidateOnSelect: true
    }
  },
  
  info_academica: {
    moduleType: 'info_academica',
    documentType: 'Educational_Certificate',
    displayName: 'Certificados Educativos',
    description: 'Títulos académicos, certificados de estudio y documentos educativos',
    examples: [
      'Diplomas universitarios',
      'Certificados de bachillerato',
      'Certificados de cursos de capacitación',
      'Actas de grado',
      'Certificados de notas',
      'Títulos técnicos o tecnológicos'
    ],
    domain: 'academicos',
    availableSubcriteria: ['media', 'pregrado', 'posgrado', 'certificaciones'],
    defaultSubcriteria: ['pregrado'],
    validatorConfig: {
      expectedDocumentType: 'Educational_Certificate',
      acceptedMimeTypes: ['application/pdf'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowMultipleFiles: false,
      showDetailedResults: true,
      autoValidateOnSelect: true
    }
  }
};

/**
 * Obtiene la configuración del validador para un módulo específico
 */
export function getValidatorConfigForModule(moduleType: string): PdfValidatorConfig {
  const config = DOCUMENT_CONFIGS[moduleType];
  if (!config) {
    // Configuración por defecto si el módulo no existe
    return {
      expectedDocumentType: 'Social_Security_Affiliation',
      acceptedMimeTypes: ['application/pdf'],
      maxFileSize: 10 * 1024 * 1024,
      allowMultipleFiles: false,
      showDetailedResults: true,
      autoValidateOnSelect: true
    };
  }
  return { ...config.validatorConfig };
}

/**
 * Obtiene información del documento para un módulo específico
 */
export function getDocumentInfoForModule(moduleType: string): ModuleDocumentConfig | null {
  return DOCUMENT_CONFIGS[moduleType] || null;
}

/**
 * Obtiene todos los tipos de documento disponibles
 */
export function getAllDocumentTypes(): string[] {
  return Object.values(DOCUMENT_CONFIGS).map(config => config.documentType);
}

/**
 * Obtiene el nombre para mostrar de un tipo de documento
 */
export function getDocumentTypeDisplayName(documentType: string): string {
  const config = Object.values(DOCUMENT_CONFIGS).find(c => c.documentType === documentType);
  return config?.displayName || documentType;
}

/**
 * Valida si un tipo de documento es válido para un módulo específico
 */
export function isValidDocumentTypeForModule(moduleType: string, documentType: string): boolean {
  const config = DOCUMENT_CONFIGS[moduleType];
  return config ? config.documentType === documentType : false;
}