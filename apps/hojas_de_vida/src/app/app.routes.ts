import { Route } from '@angular/router';
import { LoginComponent, RegisterComponent, ForgotPasswordComponent, ResetPasswordComponent, VerifyEmailComponent } from '@microfrontends/shared-ui';
import { ConvocatoriasPublicasComponent } from './pages/convocatorias-publicas-component/convocatorias-publicas-component';

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
  {
    path: 'app',
    loadChildren: () =>
      import('./remote-entry/entry.routes').then((m) => m.remoteRoutes),
  },
  {
    path: 'convocatorias-publicas',
    component: ConvocatoriasPublicasComponent
  }
];