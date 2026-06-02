import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@shared/shared-environments';

@Injectable({
  providedIn: 'root'
})
export class ExportacionCsvService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiViaticos}/exportacion-csv`;

  /** Genera y descarga archivo CSV para solicitudes seleccionadas */
  generarCSV(codigosSolicitudes: string[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/generar`, codigosSolicitudes, {
      responseType: 'blob'
    });
  }
}
