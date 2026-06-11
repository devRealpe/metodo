import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  LOCALE_ID,
  APP_INITIALIZER,
  forwardRef,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import ThemePreset from '@shared/shared-ui/theme';
import { PRIMENG_ES_CO_TRANSLATION } from '@microfrontends/shared-ui';
import { AuthInterceptor, AUTH_API_URL, KEYCLOAK_CONFIG, KeycloakClientConfigService } from '@microfrontends/shared-services';
import { APP_BASE_HREF, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import localeEsCoExtra from '@angular/common/locales/extra/es-CO';
import { environment } from '@shared/shared-environments';
import { AppInitService } from './core/services/app-init.service';

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
    { provide: APP_BASE_HREF, useValue: '/paz-salvos/' },
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitService],
      multi: true,
    },
    {
      provide: KEYCLOAK_CONFIG,
      useFactory: keycloakConfigFactory,
      deps: [KeycloakClientConfigService],
    },
    {
      provide: AUTH_API_URL,
      useValue: environment.authApi,
    },
    providePrimeNG({
      theme: {
        preset: ThemePreset,
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
      translation: PRIMENG_ES_CO_TRANSLATION,
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: forwardRef(() => AuthInterceptor),
      multi: true,
    },
  ],
};
