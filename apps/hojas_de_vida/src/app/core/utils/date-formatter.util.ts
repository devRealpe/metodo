/**
 *  Utilidad centralizada para formateo de fechas
 * Evita duplicación de lógica en múltiples componentes
 */

export class DateFormatterUtil {
  
  /**
   * Formatea una fecha a formato español corto (dd/mm/aaaa)
   * @param fecha - Fecha en formato Date, string o undefined
   * @param defaultValue - Valor por defecto si la fecha es inválida
   */
  static formatShort(fecha: Date | string | undefined | null, defaultValue = 'N/A'): string {
    if (!fecha) return defaultValue;
    
    try {
      const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return date.toLocaleDateString('es-ES');
    } catch {
      return defaultValue;
    }
  }

  /**
   * Formatea una fecha a formato largo con nombre de mes (ej: 15 nov 2025)
   * @param fecha - Fecha en formato Date, string o undefined
   * @param defaultValue - Valor por defecto si la fecha es inválida
   */
  static formatLong(fecha: Date | string | undefined | null, defaultValue = 'N/A'): string {
    if (!fecha) return defaultValue;
    
    try {
      const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return defaultValue;
    }
  }

  /**
   * Formatea una fecha a formato ISO (YYYY-MM-DD)
   * @param fecha - Fecha en formato Date
   */
  static toISO(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Verifica si una fecha es válida
   * @param fecha - Fecha a validar
   */
  static isValid(fecha: Date | string | undefined | null): boolean {
    if (!fecha) return false;
    
    try {
      const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
}
