import { Route } from '@angular/router';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout.component';
import { InicioPazSalvosComponent } from '../pages/inicio-paz-salvos-component/inicio-paz-salvos.component';
import { RegistroComponent } from '../pages/registro/registro.component';
import { AuthGuard } from '@microfrontends/shared-services';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        component: InicioPazSalvosComponent,
        canActivate: [AuthGuard],
      },
      {
        path: 'registro',
        component: RegistroComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_DIRECTOR', 'ADMIN'] },
      },
    ],
  },
];
