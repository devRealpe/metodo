import { environment } from '@shared/shared-environments';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Convenio, ConvenioCreate, ConvenioUpdate } from '../models/convenio.model';

@Injectable({
  providedIn: 'root'
})
export class ConvenioService {

  private apiUrl = `${environment.internacionalizacionApi}/convenio`;

  constructor(private http: HttpClient) { }
    getAll() {
      return this.http.get<Convenio[]>(this.apiUrl);
    }

    getById(id: string) {
      return this.http.get<Convenio>(`${this.apiUrl}/${id}`);
    }

    create(convenio: ConvenioCreate) {
      return this.http.post<Convenio>(this.apiUrl, convenio);
    }

    update(id: string, convenio: ConvenioUpdate) {
      return this.http.put<Convenio>(`${this.apiUrl}/${id}`, convenio);
    }

    delete(id: string) {
      return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getHistorial(id: string) {
      return this.http.get<any[]>(`${this.apiUrl}/${id}/historial`);
    }

    aceptarRenovacion(id: string) {
      return this.http.post(`${this.apiUrl}/${id}/aceptar-renovacion`, {});
    }

    rechazarRenovacion(id: string) {
      return this.http.post(`${this.apiUrl}/${id}/rechazar-renovacion`, {});
    }

    updateFechaProgramada(id: string, evento: any) {
      return this.http.put(`${this.apiUrl}/fechas-programadas/${id}`, evento);
    }

    deleteFechaProgramada(id: string) {
      return this.http.delete<void>(`${this.apiUrl}/fechas-programadas/${id}`);
    }

    downloadPdf(id: string) {
      return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
    }


    downloadPdfWithData(convenio: Convenio) {
      return this.http.post(`${this.apiUrl}/pdf`, convenio, { responseType: 'blob' });
    }

    exportExcel(convenios: any[]) {
      return this.http.post(`${this.apiUrl}/excel`, convenios, { responseType: 'blob' });
    }
}
