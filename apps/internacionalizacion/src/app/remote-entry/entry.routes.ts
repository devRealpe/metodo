import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout.component';
import { MenuComponent } from '../pages/Menu/menu.component';






import { ConvenioComponent } from '../pages/convenios/convenio.component';
import { MovilidadComponent } from '../pages/Movilidad/movilidad.component';
import { ConveniosListComponent } from '../pages/convenios/list/convenios-list.component';
import { UsuariosOracleConsultaComponent } from '../pages/usuarios-oracle-consulta-component/usuarios-oracle-consulta.component';
import { ActividadesAsignadasComponent } from '../pages/ActividadesAsignadas/actividadesAsignadas.component';
import { AutorizacionComponent } from '../pages/Autorizaciones/listaSolicitudAutorizaciones/autorizacion.component';
import { MovilidadSalienteListComponent } from '../pages/usuarios-oracle-consulta-component/listaMovilidadesSalientes/movilidadSaliente-list.component';
import { EstudiantesOracleConsultaComponent } from '../pages/estudiantes-oracle-consulta-component/estudiantes-oracle-consulta.component';
import { MovilidadEstudiantesListComponent } from '../pages/estudiantes-oracle-consulta-component/listaMovilidadesEstudiante/movilidadEstudiantes-list.component';
import { MovilidadListComponent } from '../pages/Movilidad/listaMovilidades/movilidad-list.component';
import { MovilidadesProcesoComponent } from '../pages/movilidadesProceso/movilidadesProceso.component';
import { MovilidadProcesoFormComponent } from '../pages/movilidadesProceso/movilidad-proceso-form/movilidad-proceso-form.component';
import { ReporteMovilidadesComponent } from '../pages/reporte-movilidades/reporte-movilidades.component';
import { EditProfileComponent, UserRoleManagementComponent } from '@microfrontends/shared-ui';
import { AuthGuard } from '@microfrontends/shared-services';
import { environment } from '@shared/shared-environments';
import { LineasEstrategicasComponent } from '../pages/lineas-estrategicas/lineas-estrategicas.component';
import { ConvocatoriasListComponent } from '../pages/convocatorias/convocatorias-list.component';

export const remoteRoutes: Route[] = [
    {
         path: '', component: RemoteEntry,
         canActivate: [AuthGuard],
         children: [
            { path: '', redirectTo: 'inicio', pathMatch: 'full'},
           {   
                path: 'inicio',
               component: MenuComponent,
               canActivate: [AuthGuard],
               data: {
                 clientId: 'clients-service',
                 requiredRoles: [
                   'ADMIN',
                   'ORI',
                   'VICERRECTORIA_ACADEMICA',
                   'DECANO',
                   'DIRECTOR_PROGRAMA',
                   'USUARIO',
                   'RECTORA',
                   'VICERECTORIA_FINANCIERA',
                   'DIRECCION_INVESTIGACION'
                 ],
                 apiHojasDeVida: environment.authApi,
               }
            },





             
              {
                path: 'convenio',
                component: ConvenioComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'convenios-list',
                component: ConveniosListComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'USUARIO'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'convocatorias',
                component: ConvocatoriasListComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'DECANO',
                    'DIRECTOR_PROGRAMA',
                    'USUARIO'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
          {
                path: 'movilidad',
                component: MovilidadComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'DIRECTOR_PROGRAMA',
                    'DECANO'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
           
            {
                path: 'movilidades-proceso',
                component: MovilidadesProcesoComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'DECANO',
                    'DIRECTOR_PROGRAMA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'movilidad-proceso/:id/:modo',
                component: MovilidadProcesoFormComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'DECANO',
                    'DIRECTOR_PROGRAMA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'reporte-movilidades',
                component: ReporteMovilidadesComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'DECANO',
                    'DIRECTOR_PROGRAMA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'profesores-oracle',
                component: UsuariosOracleConsultaComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'estudiantes-oracle-consulta',
                component: EstudiantesOracleConsultaComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'DIRECTOR_PROGRAMA',
                    'DECANO'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'autorizacion',
                component: AutorizacionComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'DECANO',
                    'DIRECCION_INVESTIGACION',
                    'DIRECTOR_PROGRAMA',
                    'ORI',
                    'RECTORA',
                    'VICERECTORIA_FINANCIERA',
                    'VICERRECTORIA_ACADEMICA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'movilidad-saliente-list',
                component: MovilidadSalienteListComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'DECANO',
                    'DIRECTOR_PROGRAMA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'movilidad-estudiantes-list',
                component: MovilidadEstudiantesListComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'DIRECTOR_PROGRAMA',
                    'DECANO'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'movilidad-list',
                component: MovilidadListComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'DECANO',
                    'DIRECTOR_PROGRAMA'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'movilidad-saliente-edit',
                component: UsuariosOracleConsultaComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'movilidad-estudiante-edit',
                component: EstudiantesOracleConsultaComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'DIRECTOR_PROGRAMA',
                    'DECANO'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'edit-profile',
                component: EditProfileComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'USUARIO'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
            },
            {
                path: 'lineas-estrategicas',
                component: LineasEstrategicasComponent,
                canActivate: [AuthGuard],
                data: {
                  clientId: 'clients-service',
                  requiredRoles: [
                    'ADMIN',
                    'ORI',
                    'VICERRECTORIA_ACADEMICA',
                    'DECANO',
                    'DIRECTOR_PROGRAMA',
                    'USUARIO',
                    'RECTORA',
                    'VICERECTORIA_FINANCIERA',
                    'DIRECCION_INVESTIGACION'
                  ],
                  apiHojasDeVida: environment.authApi,
                }
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
                      'ORI',
                      'VICERRECTORIA_ACADEMICA',
                      'DECANO',
                      'DIRECTOR_PROGRAMA',
                      'USUARIO',
                      'RECTORA',
                      'VICERECTORIA_FINANCIERA',
                      'DIRECCION_INVESTIGACION'
                    ],
                    apiHojasDeVida: environment.authApi,
                  },
                },
            }
         ]
        }
    ];
