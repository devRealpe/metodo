import { Route } from '@angular/router';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout.component';
import { RegistroSolicitudesComponent } from '../pages/registro-solicitudes/registro-solicitudes.component';
import { MisSolicitudesComponent } from '../pages/mis-solicitudes/mis-solicitudes.component';
import { RevisionSolicitudComponent } from '../pages/revision-solicitud/revision-solicitud.component';
import { GestionDependenciasComponent } from '../pages/gestion-dependencias/gestion-dependencias.component';
import { GestionTiposSolicitudComponent } from '../pages/gestion-tipos-solicitud/gestion-tipos-solicitud.component';
import { AuthGuard } from '@microfrontends/shared-services';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'registro', pathMatch: 'full' },
      {
        path: 'registro',
        component: RegistroSolicitudesComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_DIRECTOR', 'ADMIN'] },
      },
      {
        path: 'mis-solicitudes',
        component: MisSolicitudesComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_DIRECTOR', 'ADMIN'] },
      },
      {
        path: 'revision-solicitud',
        component: RevisionSolicitudComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_DIRECTOR', 'ADMIN', 'USUARIO'] },
      },
      {
        path: 'dependencias',
        component: GestionDependenciasComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'PS_REVISOR'] },
      },
      {
        path: 'tipos-solicitud',
        component: GestionTiposSolicitudComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'PS_REVISOR'] },
      },
    ],
  },
];
