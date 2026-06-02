import { Route } from '@angular/router';
import { PlanDeTrabajo } from '../pages/plan-de-trabajo/plan-de-trabajo';
import { SistemasHomeComponent } from '../pages/home/sistemas-home/sistemas-home.component';
import { environment } from '@shared/shared-environments';
import { AuthGuard } from '@microfrontends/shared-services';
import { Home } from '../pages/home/home';
import { Notificaciones } from '../pages/notificaciones/notificaciones';
import { Novedades } from '../pages/novedades/novedades';
import { Reportes } from '../pages/reportes/reportes';
import { ProfesorHome } from '../pages/home/profesor_home/profesor_home';
import { DecanoHome } from '../pages/home/decano_home/decano_home';
import { RemoteEntry } from './entry';
import { NovedadesDirectorComponent } from '../pages/novedades-director-component/novedades-director.component';
import { DirectorHome } from '../pages/home/director-home/director-home';
import { GestionHumanaHomeComponent } from '../pages/home/gestion-humana-home/gestion-humana-home';
import { PlaneacionHome } from '../pages/home/planeacion-home/planeacion-home';
import { VicerrectoriaHome } from '../pages/home/vicerrectoria-home/vicerrectoria-home';
import { AdminHomeComponent } from '../pages/home/admin-home/admin-home';
import { PlaneacionGestionPtComponent } from '../pages/home/planeacion-gestion-pt/planeacion-gestion-pt';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    canActivate: [AuthGuard],
    children: [
      // Quitar canActivate de aquí - las redirecciones no pueden tener guards
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },

      // Ruta unificada 'home' - mantiene el path y renderiza según rol
      {
        path: 'inicio',
        component: Home,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: [
            'USUARIO',
            'PLANES_DECANO',
            'PLANES_SISTEMAS',
            'PLANES_DIRECTOR',
            'ADMIN',
            'PLANES_PLANEACION', 
            'PLANES_VICERRECTORIA',
            'PLANES_GESTION',
          ],
        },
      },

      // Ruta especifica para gestion de planes de trabajo, accesible solo para rol de planeación

      {
        path: 'gestion-planes',
        component: PlaneacionGestionPtComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_PLANEACION', 'ADMIN'] },
      },

      // Rutas específicas para ADMIN con acceso libre
      {
        path: 'home-sistemas',
        component: SistemasHomeComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'home-planeacion',
        component: PlaneacionHome,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'admin',
        component: AdminHomeComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'home-profesor',
        component: ProfesorHome,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'home-decano',
        component: DecanoHome,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'home-director',
        component: DirectorHome,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'home-gestion-humana',
        component: GestionHumanaHomeComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'home-vicerrectoria',
        component: VicerrectoriaHome,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      // Otras rutas
      { path: 'notificaciones', component: Notificaciones },
      {
        path: 'novedades',
        component: Novedades,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'PLANES_GESTION'] }, // Temporarily ADMIN only
      },
      {
        path: 'reportes',
        component: Reportes,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_DIRECTOR', 'ADMIN'] },
      },
      {
        path: 'plan-de-trabajo',
        component: PlanDeTrabajo,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_DIRECTOR', 'ADMIN'] },
      },
      {
        path: 'novedades-director',
        component: NovedadesDirectorComponent,
        canActivate: [AuthGuard],
        data: { requiredRoles: ['PLANES_DIRECTOR', 'ADMIN'] },
      },
    ],
  },
];
