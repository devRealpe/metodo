import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserProfile {
  nombre: string;
  email?: string;
  fotoUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FotoPerfilService {
  private fotoUrlSubject = new BehaviorSubject<string | null>(null);
  public fotoUrl$ = this.fotoUrlSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<UserProfile>({
    nombre: 'Usuario',
    email: undefined,
    fotoUrl: null
  });
  public userProfile$ = this.userProfileSubject.asObservable();

  updateFotoUrl(url: string | null) {
    this.fotoUrlSubject.next(url);
    
    // También actualizar en el perfil de usuario
    const currentProfile = this.userProfileSubject.value;
    this.userProfileSubject.next({
      ...currentProfile,
      fotoUrl: url
    });
  }

  updateUserProfile(profile: Partial<UserProfile>) {
    const currentProfile = this.userProfileSubject.value;
    this.userProfileSubject.next({
      ...currentProfile,
      ...profile
    });
  }

  getFotoUrl(): string | null {
    return this.fotoUrlSubject.value;
  }

  getUserProfile(): UserProfile {
    return this.userProfileSubject.value;
  }
}