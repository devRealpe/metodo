import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root',
})
export class ArchivoPlanoService {
  private readonly apiUrl = `${environment.internacionalizacionApi}/archivo-plano`;

  constructor(private http: HttpClient) {}

  uploadUsuariosMasivos(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload-usuarios-masivos`, formData);
  }

  uploadEstudiantesMasivos(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload-estudiantes-masivos`, formData);
  }
}