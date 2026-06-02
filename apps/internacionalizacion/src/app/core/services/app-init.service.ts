import { Injectable, inject } from '@angular/core';
import { AuthService } from '@microfrontends/shared-services';


@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  private authService = inject(AuthService);

 
  async initialize(): Promise<void> {
    await this.authService.initializeSession();
  }
}