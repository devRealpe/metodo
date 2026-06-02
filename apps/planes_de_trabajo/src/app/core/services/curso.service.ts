import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@shared/shared-environments';
import { Curso } from '../models/curso.model';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private readonly base = `${environment.apiOracle}/prof-asignaturas`;

  constructor(private http: HttpClient) { }

  getByProfesor(id: string): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${this.base}/profesor/${encodeURIComponent(id)}`).pipe(
      map(cursos => {
        const cursosConHoras = cursos.map(curso => ({
          ...curso,
          horasPresenciales: this.calcularHorasPresenciales(curso.horaInicio, curso.horaFin)
        }));

        const cursosAgrupados = new Map<string, Curso>();

        cursosConHoras.forEach(curso => {
          const clave = `${curso.codAsignatura}-${curso.grupo}`;

          if (cursosAgrupados.has(clave)) {
            const cursoExistente = cursosAgrupados.get(clave)!;
            cursoExistente.horasPresenciales += curso.horasPresenciales;
          } else {
            cursosAgrupados.set(clave, { ...curso });
          }
        });

        return Array.from(cursosAgrupados.values());
      })
    );
  }

  private calcularHorasPresenciales(horaInicio: string, horaFin: string): number {
    const convertirA24Horas = (hora: string): number => {
      const [tiempo, periodo] = hora.split(' ');
      let [horas, minutos] = tiempo.split(':').map(Number);

      if (periodo === 'PM' && horas !== 12) {
        horas += 12;
      } else if (periodo === 'AM' && horas === 12) {
        horas = 0;
      }

      return horas + (minutos / 60);
    };

    const inicio = convertirA24Horas(horaInicio);
    const fin = convertirA24Horas(horaFin);

    const diferencia = fin - inicio;
    return Math.round(diferencia);
  }

}
