import { Route } from '@angular/router';
import { LoginComponent, RegisterComponent, ForgotPasswordComponent, ResetPasswordComponent, VerifyEmailComponent } from '@microfrontends/shared-ui';
import { AsistenciaQrPublicaComponent } from './pages/asistencia-qr-publica/asistencia-qr-publica.component';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: '',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent
  },
  // Ruta pública para asistencia por QR (sin autenticación)
  {
    path: 'asistencia-qr',
    component: AsistenciaQrPublicaComponent
  },
  {
    path: 'app',
    loadChildren: () =>
      import('./remote-entry/entry.routes').then((m) => m.remoteRoutes),
  },
];
