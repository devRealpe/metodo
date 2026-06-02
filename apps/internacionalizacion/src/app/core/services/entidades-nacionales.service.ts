import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

export interface EntidadNacional {
  id: string;
  nombre: string;
  codigo?: string; // opcional, algunos registros pueden no tenerlo
}

@Injectable({ providedIn: 'root' })
export class EntidadesNacionalesService {
  private readonly apiUrl = `${environment.internacionalizacionApi}/entidades-nacionales`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EntidadNacional[]> {
    return this.http.get<EntidadNacional[]>(this.apiUrl);
  }
}
