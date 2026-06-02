import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@shared/shared-environments';
import { CategoriaFormacion, TituloCatalogoOption } from '../models/oferta-laboral.model';

export interface CatalogoTitulosResponse {
  content: TituloCatalogoOption[];
  totalElements: number;
  page?: number;
  size?: number;
}

/** Formato que devuelve el Oracle service en /titulos/buscar */
interface OracleTituloDto {
  tituloAcademico: string;
  nombreTitulo: string;
}

/** Etiqueta de nivel derivada de la categoría de formación */
const NIVEL_LABEL: Record<CategoriaFormacion, string> = {
  TECNICA_TECNOLOGICA: 'Técnico / Tecnólogo',
  PREGRADO: 'Pregrado',
  POSGRADO: 'Posgrado',
};

@Injectable({ providedIn: 'root' })
export class TituloAcademicoCatalogoService {
  /**
   * Mismo endpoint que usa `lib-titulo-select-component` para el modo de un solo título.
   * Devuelve: { tituloAcademico: string, nombreTitulo: string }[]
   */
  private readonly apiUrl = `${environment.apiOracle}/titulos/buscar`;

  constructor(private http: HttpClient) {}

  /**
   * Busca títulos académicos usando el mismo servicio Oracle que el selector de un único título.
   *
   * @param categoria  Se usa solo para mostrar el nivel en la UI (no filtra en el servidor).
   * @param query      Texto libre para buscar.
   * @param _page      No utilizado (Oracle no pagina), mantenido para compatibilidad.
   * @param _size      No utilizado, mantenido para compatibilidad.
   */
  buscarTitulos(
    categoria: CategoriaFormacion | null,
    query: string,
    _page = 0,
    _size = 20
  ): Observable<CatalogoTitulosResponse> {
    if (!query?.trim()) {
      return of({ content: [], totalElements: 0 });
    }

    const url = `${this.apiUrl}?q=${encodeURIComponent(query.trim())}`;
    const nivelFormacion = categoria ? NIVEL_LABEL[categoria] : '';

    return this.http.get<OracleTituloDto[]>(url).pipe(
      map(items => {
        const content: TituloCatalogoOption[] = (items ?? []).map(t => ({
          id: t.tituloAcademico,
          codigo: t.tituloAcademico,
          nombre: t.nombreTitulo,
          nivelFormacion,
          fuenteCatalogo: 'ORACLE_TITULOS',
        }));
        return { content, totalElements: content.length };
      }),
      catchError(() => of({ content: [], totalElements: 0 }))
    );
  }
}
