import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface EntidadInternacional {
  id: string;
  nombre: string;
  codigo?: string; // algunos registros pueden no tener código
}

@Injectable({ providedIn: 'root' })
export class EntidadesInternacionalesService {
  private readonly apiUrl = `${environment.internacionalizacionApi}/entidades-internacionales`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EntidadInternacional[]> {
    return this.http.get<EntidadInternacional[]>(this.apiUrl);
  }
}
