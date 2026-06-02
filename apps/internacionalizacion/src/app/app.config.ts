import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  LOCALE_ID,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';
import { appRoutes } from './app.routes';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import localeEsCoExtra from '@angular/common/locales/extra/es-CO';
import { PRIMENG_ES_CO_TRANSLATION } from '@microfrontends/shared-ui';
import ThemePreset from '@shared/shared-ui/theme';
import { KEYCLOAK_CONFIG, KeycloakClientConfigService, KeycloakClientConfig, AuthInterceptor, AuthService, AUTH_API_URL } from '@microfrontends/shared-services';
import { forwardRef } from '@angular/core';
import { environment } from '@shared/shared-environments';
import { AppInitService } from './core/services/app-init.service';

// Registrar el locale español de Colombia con datos adicionales
registerLocaleData(localeEsCo, 'es-CO', localeEsCoExtra);

export function keycloakConfigFactory(keycloakService: KeycloakClientConfigService) {
  return keycloakService.getCurrentClientConfig();
}

/**
 * Factory function para inicializar la aplicación.
 * Carga los datos del usuario autenticado antes de renderizar la app.
 */
export function initializeApp(appInitService: AppInitService) {
  return () => appInitService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    { provide: APP_BASE_HREF, useValue: '/internacionalizacion/' },
    provideHttpClient(withInterceptorsFromDi()), // ✅ Habilitar interceptores de DI
    provideAnimationsAsync(),
    // Configurar español de Colombia como idioma por defecto
    { provide: LOCALE_ID, useValue: 'es-CO' },
    // Inicializar aplicación antes de renderizar (carga datos del usuario)
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitService],
      multi: true
    },
    // Proporcionar configuración de Keycloak usando el servicio
    {
      provide: KEYCLOAK_CONFIG,
      useFactory: keycloakConfigFactory,
      deps: [KeycloakClientConfigService]
    },
    // ✅ NUEVO: Proporcionar la URL del API de autenticación desde environment local
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
      // Configuración de idioma español de Colombia para PrimeNG
      translation: PRIMENG_ES_CO_TRANSLATION
    }),
    // Proporcionar el interceptor de autenticación
    {
      provide: HTTP_INTERCEPTORS,
      useClass: forwardRef(() => AuthInterceptor),
      multi: true
    },
    MessageService
  ],
};
