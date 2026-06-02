import { Route } from '@angular/router';
import { LandingPageHomeComponent } from './pages/landing-page-home-component/landing-page-home-component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: LandingPageHomeComponent,
  },
  {
    path: 'hojas-de-vida',
    loadChildren: () =>
      import('hojas_de_vida/Routes').then((m) => m.remoteRoutes),
  },
  {
    path: 'viaticos',
    loadChildren: () =>
      import('viaticos/Routes').then((m) => m.remoteRoutes),
  },
  {
    path: 'laboratorios',
    loadChildren: () =>
      import('laboratorios/Routes').then((m) => m.remoteRoutes),
  },
  {
    path: 'planes-de-trabajo',
    loadChildren: () =>
      import('planes_de_trabajo/Routes').then((m) => m.remoteRoutes),
  },
  {
    path: 'internacionalizacion',
    loadChildren: () =>
      import('internacionalizacion/Routes').then((m) => m.remoteRoutes),
  },
];
