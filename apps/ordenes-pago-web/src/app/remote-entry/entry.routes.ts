import { Route } from '@angular/router';
import { RemoteEntry } from './entry';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      // TODO: añadir rutas hijas aquí
    ]
  }
];
