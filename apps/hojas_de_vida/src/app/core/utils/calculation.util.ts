export class CalculationUtil {

  static calcularPorcentaje(valor: number, total: number, decimales = 0): number {
    if (!total || total === 0) return 0;
    const porcentaje = (valor / total) * 100;
    return Number(porcentaje.toFixed(decimales));
  }

  static getSeverityByPercentage(porcentaje: number): 'success' | 'warn' | 'danger' {
    if (porcentaje >= 80) return 'success';
    if (porcentaje >= 60) return 'warn';
    return 'danger';
  }

  static getColorByCompletitud(completitud: number | undefined): string {
    if (!completitud) return 'var(--neutral-gray-400)';
    if (completitud >= 80) return 'var(--secondary-green)';
    if (completitud >= 50) return 'var(--accent-orange)';
    return 'var(--error)';
  }

  static getColorByCalificacion(calificacion: number | undefined): string {
    if (!calificacion) return 'var(--neutral-gray-400)';
    if (calificacion >= 4.5) return 'var(--secondary-green)';
    if (calificacion >= 3.5) return 'var(--primary-blue)';
    if (calificacion >= 2.5) return 'var(--accent-orange)';
    return 'var(--error)';
  }

  static getIconoByCalificacion(calificacion: number | undefined): string {
    if (!calificacion) return 'pi-minus';
    if (calificacion >= 4.5) return 'pi-star-fill';
    if (calificacion >= 3.5) return 'pi-star';
    return 'pi-circle';
  }

  /**
   * Convierte un boolean a severity de PrimeNG
   * @param aprueba - Indica si aprueba o no
   */
  static booleanToSeverity(aprueba: boolean): 'success' | 'danger' {
    return aprueba ? 'success' : 'danger';
  }

  /**
   * Limita un valor entre un mínimo y máximo
   * @param valor - Valor a limitar
   * @param min - Valor mínimo
   * @param max - Valor máximo
   */
  static clamp(valor: number, min: number, max: number): number {
    return Math.min(Math.max(valor, min), max);
  }

  /**
   * Obtiene las iniciales de un nombre completo
   * @param nombres - Nombres de la persona
   * @param apellidos - Apellidos de la persona
   */
  static getInitials(nombres: string, apellidos: string): string {
    const nombreInicial = nombres?.charAt(0)?.toUpperCase() || '';
    const apellidoInicial = apellidos?.charAt(0)?.toUpperCase() || '';
    return nombreInicial + apellidoInicial;
  }

  /**
   * Trunca un texto si excede un límite
   * @param texto - Texto a truncar
   * @param limite - Límite de caracteres
   */
  static truncateText(texto: string, limite = 50): string {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite).trim() + '...';
  }
}
