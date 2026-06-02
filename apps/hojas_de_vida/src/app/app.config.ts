import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  LOCALE_ID,
  APP_INITIALIZER,
} from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, withFetch } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import ThemePreset from '@shared/shared-ui/theme';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import localeEsCoExtra from '@angular/common/locales/extra/es-CO';
import { PRIMENG_ES_CO_TRANSLATION } from '@microfrontends/shared-ui';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { forwardRef } from '@angular/core';
import { AuthInterceptor, AUTH_API_URL } from '@microfrontends/shared-services'; 
import { AppInitService } from './core/services/app-init.service';
import { KEYCLOAK_CONFIG, KeycloakClientConfigService, KeycloakClientConfig } from '@microfrontends/shared-services';
import { APP_BASE_HREF } from '@angular/common';
import { environment } from '@shared/shared-environments';

registerLocaleData(localeEsCo, 'es-CO', localeEsCoExtra);

export function initializeApp(appInitService: AppInitService) {
  return () => appInitService.initialize();
}

export function keycloakConfigFactory(keycloakService: KeycloakClientConfigService) {
  return keycloakService.getCurrentClientConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    { provide: APP_BASE_HREF, useValue: '/hojas_de_vida/' },
    provideHttpClient(withInterceptorsFromDi()), 
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitService],
      multi: true
    },
    {
      provide: KEYCLOAK_CONFIG,
      useFactory: keycloakConfigFactory,
      deps: [KeycloakClientConfigService]
    },
    {
      provide: AUTH_API_URL,
      useValue: environment.authApi
    },
    providePrimeNG({
      theme: {
        preset: ThemePreset,
        options: {
          darkModeSelector: '.my-app-dark'
        }
      },
      translation: PRIMENG_ES_CO_TRANSLATION
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: forwardRef(() => AuthInterceptor),
      multi: true
    }
  ],
};
