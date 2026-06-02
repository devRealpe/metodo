import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  LOCALE_ID,
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
import { AuthInterceptor } from '@microfrontends/shared-services';

import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'es-CO' },
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
