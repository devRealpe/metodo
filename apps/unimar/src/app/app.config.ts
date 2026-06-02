import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  LOCALE_ID,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideHttpClient } from '@angular/common/http';
import ThemePreset from '@shared/shared-ui/theme';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import localeEsCoExtra from '@angular/common/locales/extra/es-CO';
import { PRIMENG_ES_CO_TRANSLATION } from '@microfrontends/shared-ui';
import { KEYCLOAK_CONFIG, KeycloakClientConfigService, KeycloakClientConfig } from '@microfrontends/shared-services';


// Registrar el locale español de Colombia con datos adicionales
registerLocaleData(localeEsCo, 'es-CO', localeEsCoExtra);

/**
 * Factory function para proporcionar la configuración de Keycloak
 */
export function keycloakConfigFactory(keycloakService: KeycloakClientConfigService): KeycloakClientConfig {
  return keycloakService.getCurrentClientConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(),
    provideAnimationsAsync(),
    // Configurar español de Colombia como idioma por defecto
    { provide: LOCALE_ID, useValue: 'es-CO' },
    // Proporcionar configuración de Keycloak usando el servicio
    {
      provide: KEYCLOAK_CONFIG,
      useFactory: keycloakConfigFactory,
      deps: [KeycloakClientConfigService]
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
    })
  ],
};
