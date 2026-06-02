import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { InicioViaticosComponent } from '../pages/inicio-viaticos-component/inicio-viaticos.component';
import { SolicitudViaticosComponent } from '../pages/solicitud-viaticos-component/solicitud-viaticos.component';
import { ListaViaticosComponent } from '../pages/lista-viaticos-component/lista-viaticos.component';
import { RegistroTarifasComponent } from '../pages/registro-tarifas-component/registro-tarifas.component';
import { TarifasRegistradasComponent } from '../pages/tarifas-registradas-component/tarifas-registradas.component';
import { ListaAprobacionesViaticosComponent } from '../pages/lista-aprobaciones-viaticos-component/lista-aprobaciones-viaticos.component';
import { MisViaticosComponent } from '../pages/mis-viaticos-component/mis-viaticos.component';
import { UserRoleManagementComponent } from '@microfrontends/shared-ui';
import { AuthGuard } from '@microfrontends/shared-services';
import { environment } from '@shared/shared-environments';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    canActivate: [AuthGuard], // Proteger todas las rutas hijas con autenticación
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        component: InicioViaticosComponent,
        canActivate: [AuthGuard]
        // No requiere roles específicos - accesible para todos los usuarios autenticados
      },
      {
        path: 'solicitudViaticos',
        component: SolicitudViaticosComponent,
        canActivate: [AuthGuard],
        data: {
          clientId: 'clients-service',
          requiredRoles: [
            'ADMIN',
            'VIATICOS_ADMINISTRATIVOS',
            'VIATICOS_PROFESOR',
            'VIATICOS_DIRECTOR',
            'USUARIO',
            'VIATICOS_DECANO_DIRECTOR',
            'VIATICOS_VICE_ADMINISTRATIVO',
            'VIATICOS_TALENTO_HUMANO'
          ],

          apiHojasDeVida: environment.authApi,
        },
      },
      {
        path: 'listaViaticos',
        component: ListaViaticosComponent,
        canActivate: [AuthGuard],
        data: {
          clientId: 'clients-service',

          requiredRoles: [
            'ADMIN',
            'VIATICOS_ADMINISTRATIVOS',
            'VIATICOS_VICE_ADMINISTRATIVO',
            'VIATICOS_DECANO_DIRECTOR',
            'VIATICOS_VICE_ADMINISTRATIVO',
            'VIATICOS_TALENTO_HUMANO'
          ],
          apiHojasDeVida: environment.authApi,
        },
      },
      {
        path: 'registroTarifas',
        component: RegistroTarifasComponent,
        canActivate: [AuthGuard],
        data: {
          clientId: 'clients-service',

          requiredRoles: ['ADMIN', 'VIATICOS_ADMINISTRATIVOS', 'VIATICOS_TALENTO_HUMANO'],
          apiHojasDeVida: environment.authApi,
        },
      },
      {
        path: 'tarifasRegistradas',
        component: TarifasRegistradasComponent,
        canActivate: [AuthGuard],
        data: {
          clientId: 'clients-service',

          requiredRoles: ['ADMIN',  'VIATICOS_TALENTO_HUMANO'],
          apiHojasDeVida: environment.authApi,
        },
      },
      {
        path: 'listaAprobaciones',
        component: ListaAprobacionesViaticosComponent,
        canActivate: [AuthGuard],
        data: {
          clientId: 'clients-service',

          requiredRoles: [
            'ADMIN',
            'VIATICOS_ADMINISTRATIVOS',
            'VIATICOS_VICE_ADMINISTRATIVO',
            'VIATICOS_DECANO_DIRECTOR',
            'VIATICOS_TALENTO_HUMANO'
          ],
          apiHojasDeVida: environment.authApi,
        },
      },
      {
        path: 'misViaticos',
        component: MisViaticosComponent,
        canActivate: [AuthGuard],
        data: {
          clientId: 'clients-service',

          requiredRoles: [
            'ADMIN',
            'VIATICOS_ADMINISTRATIVOS',
            'VIATICOS_PROFESOR',
            'USUARIO',
            'VIATICOS_DECANO_DIRECTOR',
            'VIATICOS_TALENTO_HUMANO',
            'VIATICOS_VICE_ADMINISTRATIVO'
          ],
          apiHojasDeVida: environment.authApi,
        },
      },
      {
        path: 'admin/user-role-management',
        component: UserRoleManagementComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN'],
          roleConfig: {
            clientId: 'clients-service',
            adminRole: 'ADMIN',
            availableRoles: [
              'ADMIN',
              'VIATICOS_ADMINISTRATIVOS',
              'VIATICOS_PROFESOR',
              'VIATICOS_VICE_ADMINISTRATIVO',
              'USUARIO',
              'VIATICOS_DECANO_DIRECTOR'
            ],
            apiHojasDeVida: environment.apiViaticos,
          },
        },
      },
    ],
  },
];
