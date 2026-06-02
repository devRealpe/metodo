import { Injectable, inject } from '@angular/core';
import { PersonasService } from './personas.service';
import { FotoPerfilService } from './foto-perfil.service';
import { HojaVidaStatusService } from './hoja-vida-status.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '@shared/shared-environments';
import { catchError, of, tap } from 'rxjs';
import { AuthService } from '@microfrontends/shared-services';


@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  private personasService = inject(PersonasService);
  private fotoPerfilService = inject(FotoPerfilService);
  private authService = inject(AuthService);
  private hojaVidaStatusService = inject(HojaVidaStatusService);
  private http = inject(HttpClient);


  async initialize(): Promise<void> {
    await this.authService.initializeSession();
    
    const token = this.authService.getAccessToken();
    
    if (!token) {
      return;
    }

    
    return new Promise((resolve) => {
      this.personasService.getPersonaActual().pipe(
        tap(persona => {
          if (persona) {
            // Actualizar información del usuario en FotoPerfilService
            const nombreCompleto = `${persona.primerNombre || ''} ${persona.segundoNombre || ''} ${persona.primerApellido || ''} ${persona.segundoApellido || ''}`.trim();
            
            this.fotoPerfilService.updateUserProfile({
              nombre: nombreCompleto,
              email: persona.correo || undefined
            });

            // Cargar foto de perfil si existe
            if (persona.id) {
              this.cargarFotoPerfil(persona.id);
            }

            // Actualizar localStorage
            localStorage.setItem('tieneDatosGuardados', 'true');
            if (persona.identificacion) {
              localStorage.setItem('identificacion', persona.identificacion);
            }
          } else {
            localStorage.setItem('tieneDatosGuardados', 'false');
          }
        }),
        catchError(error => {
          localStorage.setItem('tieneDatosGuardados', 'false');
          return of(null);
        })
      ).subscribe({
        complete: () => {
          resolve();
        }
      });
    });
  }

  private cargarFotoPerfil(personaId: string): void {
    const fotoUrl = `${environment.apiHojasDeVida}/hojas-de-vida/personas/${personaId}/foto`;

    this.http.get(fotoUrl, { 
      responseType: 'blob', 
      observe: 'response',
      withCredentials: false 
    }).subscribe({
      next: (response) => {
        if (response.status !== 204 && response.body && response.body.size > 0) {
          this.blobToBase64(response.body).then(base64 => {
            this.fotoPerfilService.updateFotoUrl(base64 as string);
            }).catch(error => {
            this.fotoPerfilService.updateFotoUrl(null);
          });
        } else {
          this.fotoPerfilService.updateFotoUrl(null);
        }
      },
      error: (err) => {
        this.fotoPerfilService.updateFotoUrl(null);
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
