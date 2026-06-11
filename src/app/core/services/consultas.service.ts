import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { EstudianteConsultaResponse, ValidacionRequisitos } from '../models/solicitud.models';

/** Nivel mínimo de inglés requerido (en orden de menor a mayor) */
const NIVELES_INGLES_ORDENADOS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NIVEL_MINIMO_REQUERIDO = 'B1';

/** Estados de solicitud de grado que se consideran válidos */
const ESTADOS_GRADO_VALIDOS = ['solicitado', 'aprobado'];

@Injectable({ providedIn: 'root' })
export class ConsultasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiOracle}/consultas-app/estudiantes`;

  /**
   * Consulta los datos académicos de un estudiante por su número de identificación.
   * Retorna null si no se encuentra o si el servicio falla.
   */
  getEstudianteByIdentificacion(
    numeroIdentificacion: string | number
  ): Observable<EstudianteConsultaResponse[] | null> {
    return this.http
      .get<EstudianteConsultaResponse[]>(
        `${this.baseUrl}/identificacion/${encodeURIComponent(String(numeroIdentificacion))}`
      )
      .pipe(catchError(() => of(null)));
  }

  /**
   * Valida si el estudiante cumple los tres requisitos académicos
   * para que el director pueda otorgar el sello.
   */
  calcularValidacion(estudiante: EstudianteConsultaResponse): ValidacionRequisitos {
    // Requisito 1: Solicitud de grado activa ("Solicitado" o "Aprobado")
    const estadoGrado = (estudiante.estadoSolicitudGrado ?? '').toLowerCase().trim();
    const tieneSolicitudGrado = ESTADOS_GRADO_VALIDOS.includes(estadoGrado);

    // Requisito 2: Pensum completado (100% por materias)
    const pensumCompleto = estudiante.porcentajePorMaterias >= 100;

    // Requisito 3: Nivel de inglés B1 o superior
    const nivelEstudiante = (estudiante.nivelIngles ?? '').toUpperCase().trim();
    const idxEstudiante = NIVELES_INGLES_ORDENADOS.indexOf(nivelEstudiante);
    const idxMinimo = NIVELES_INGLES_ORDENADOS.indexOf(NIVEL_MINIMO_REQUERIDO);
    const nivelInglesOk = idxEstudiante >= 0 && idxEstudiante >= idxMinimo;

    return {
      tieneSolicitudGrado,
      pensumCompleto,
      nivelInglesOk,
      todosCumplidos: tieneSolicitudGrado && pensumCompleto && nivelInglesOk,
    };
  }
}
