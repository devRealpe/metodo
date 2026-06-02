import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@shared/shared-environments';
import { catchError, of, tap } from 'rxjs';
import { AuthService } from '@microfrontends/shared-services';

/**
 * Servicio de inicialización de la aplicación.
 * Se ejecuta automáticamente al inicio para cargar datos del usuario autenticado.
 * 
 * Este servicio resuelve el problema de que los datos se pierden al recargar la página,
 * ya que se ejecuta en el APP_INITIALIZER, antes de renderizar cualquier componente.
 */
@Injectable({
  providedIn: 'root'
})
export class AppInitService {

  private authService = inject(AuthService);
  private http = inject(HttpClient);

  /**
   * Inicializa la aplicación cargando los datos del usuario autenticado.
   * Este método se llama automáticamente antes de que la app se renderice.
   */
 
  /**
   * Carga la foto de perfil del usuario
   */

  /**
   * Convierte un Blob a una cadena base64
   */
  private blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
