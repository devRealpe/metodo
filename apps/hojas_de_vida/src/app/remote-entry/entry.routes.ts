import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { InformacionUsuarioComponentPage } from '../pages/informacion-usuario-component-page/informacion-usuario-component-page';
import { AuthGuard } from '@microfrontends/shared-services';
// Importar todos los componentes que existen
import { InformacionPersonalComponent } from '../pages/informacion-usuario-component-page/pages/informacion-personal-component/informacion-personal-component';
import { InformacionAcademicaComponent } from '../pages/informacion-usuario-component-page/pages/informacion-academica-component/informacion-academica-component';
import { ReferenciasPersonalesComponent } from '../pages/informacion-usuario-component-page/pages/referencias-personales-component/referencias-personales-component';
import { InformacionLaboralComponent } from '../pages/informacion-usuario-component-page/pages/informacion-laboral-component/informacion-laboral-component';
import { InformacionFamiliarComponent } from '../pages/informacion-usuario-component-page/pages/informacion-familiar-component/informacion-familiar-component';
import { CompetenciasComponent } from '../pages/informacion-usuario-component-page/pages/competencias-usuario-component/competencias-usuario-component';
import { AfiliacionesComponent } from '../pages/informacion-usuario-component-page/pages/afiliaciones-component/afiliaciones-component';
import { DocumentosSoporteComponent } from '../pages/informacion-usuario-component-page/pages/documentos-soporte-component/documentos-soporte-component';
import { MiHojaVidaComponent } from '../pages/mi-hoja-vida-component/mi-hoja-vida-component';
import { OfertasLaboralesComponent } from '../pages/oferta-laboral-component/oferta-laboral-component';
import { OfertasUsuariosComponent } from '../pages/ofertas-usuarios/ofertas-usuarios.component';
import { PostulacionComponent } from '../pages/postulacion/postulacion.component';
import { MisPostulacionesComponent } from '../pages/mis-postulaciones/mis-postulaciones.component';
import { AdminListasValoresComponent } from '../pages/admin-listas-valores/admin-listas-valores.component';
import { AdminUbicacionesComponent } from '../pages/admin-ubicaciones/admin-ubicaciones.component';
import { RankingOfertasComponent } from '../pages/ranking-ofertas/ranking-ofertas.component';
import { RankingPostulacionesComponent } from '../pages/ranking-postulaciones/ranking-postulaciones.component';
import { EntrevistasFormComponent } from '../pages/entrevistas-form/entrevistas-form.component';
import { SeleccionadosFase2Component } from '../pages/seleccionados-fase2/seleccionados-fase2.component';
import { SeleccionadosFase3Component } from '../pages/seleccionados-fase3/seleccionados-fase3.component';
import { EntrevistasMasivasComponent } from '../pages/entrevistas-masivas/entrevistas-masivas.component';
import { ConvocatoriasEliminadasComponent } from '../pages/convocatorias-eliminadas/convocatorias-eliminadas.component';
import { OfertasFinalizadasComponent } from '../pages/ofertas-finalizadas/ofertas-finalizadas.component';
import { ListaEntrevistasComponent } from '../pages/lista-entrevistas/lista-entrevistas.component';
import { EditProfileComponent, UserRoleManagementComponent } from '@microfrontends/shared-ui';
import { environment } from '@shared/shared-environments';
import { BancoHojasDeVidaComponent } from '../pages/banco-hojas-de-vida/banco-hojas-de-vida.component';
import { GestionConvocatoriasCerradasComponent } from '../pages/gestion-convocatorias-cerradas/gestion-convocatorias-cerradas.component';
import { VisorHojaVidaComponent } from '../pages/visor-hoja-vida/visor-hoja-vida.component';
import { HistorialAuditoriaComponent } from '../pages/historial-auditoria/historial-auditoria.component';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    canActivate: [AuthGuard], // Proteger todas las rutas hijas con autenticación
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        component: InformacionUsuarioComponentPage,
        canActivate: [AuthGuard]
        // data: {
        //   requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        // }
      },
      {
        path: 'informacion-personal',
        component: InformacionPersonalComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'informacion-academica',
        component: InformacionAcademicaComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'informacion-laboral',
        component: InformacionLaboralComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'informacion-familiar',
        component: InformacionFamiliarComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'referencias-personales',
        component: ReferenciasPersonalesComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'competencias',
        component: CompetenciasComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'afiliaciones',
        component: AfiliacionesComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'documentos-soporte',
        component: DocumentosSoporteComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'hoja-de-vida',
        component: MiHojaVidaComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'administrador-convocatorias',
        component: OfertasLaboralesComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'GESTION_HUMANA']
        }
      },
      {
        path: 'ofertas-laborales',
        component: OfertasUsuariosComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'ofertas-laborales/:id',
        component: OfertasUsuariosComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        }
      },
      {
        path: 'ofertas-usuarios',
        component: OfertasUsuariosComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'postulacion/:ofertaId',
        component: PostulacionComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'mis-postulaciones',
        component: MisPostulacionesComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
     
      {
        path: 'admin/listas-valores',
        component: AdminListasValoresComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN']
        }
      },
      {
        path: 'admin/ubicaciones',
        component: AdminUbicacionesComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN']
        }
      },
      {
        path: 'admin/convocatorias-eliminadas',
        component: ConvocatoriasEliminadasComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN']
        }
      },
      {
        path: 'admin/user-role-management',
        component: UserRoleManagementComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN'],
          roleConfig: {
            clientId: 'hojas-de-vida-client',
            adminRole: 'ADMIN',
            availableRoles: [
              'HOJAS_ADMIN',
              'HOJAS_POSTULANTE',
              'HOJAS_EVALUADOR',
            ],
            apiHojasDeVida: environment.apiHojasDeVida,
          },
        },
      },
      {
        path: 'banco-hojas-de-vida',
        component: BancoHojasDeVidaComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },

      {
        path: 'ofertas-trabajo',
        component: OfertasUsuariosComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'ranking-ofertas',
        component: RankingOfertasComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'ranking-postulaciones/:id',
        component: RankingPostulacionesComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'ofertas-finalizadas',
        component: OfertasFinalizadasComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'seleccionados-fase2',
        component: SeleccionadosFase2Component,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'lista-entrevistas',
        component: ListaEntrevistasComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'entrevistas/crear',
        component: EntrevistasFormComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'entrevistas/editar/:id',
        component: EntrevistasFormComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'seleccionados-fase2/:ofertaId',
        component: SeleccionadosFase2Component,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'seleccionados-fase2-general',
        component: SeleccionadosFase2Component,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'seleccionados-fase3',
        component: SeleccionadosFase3Component,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'seleccionados-fase3/:ofertaId',
        component: SeleccionadosFase3Component,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'entrevistas-masivas',
        component: EntrevistasMasivasComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'gestion-convocatorias-cerradas',
        component: GestionConvocatoriasCerradasComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'HOJAS_CONSULTOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'visor-hoja-vida/:personaId',
        component: VisorHojaVidaComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'HOJAS_EVALUADOR', 'HOJAS_CONSULTOR', 'GESTION_HUMANA']
        }
      },
      {
        path: 'historial-auditoria',
        component: HistorialAuditoriaComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['ADMIN', 'GESTOR_RH']
        }
      },
      {
        path: 'edit-profile',
        component: EditProfileComponent,
        canActivate: [AuthGuard],
        data: {
          requiredRoles: ['USUARIO', 'ADMIN', 'HOJAS_CONSULTOR', 'HOJAS_EVALUADOR']
        }
      },
    ],
  },

];