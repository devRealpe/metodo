import { Route } from '@angular/router';
import { RemoteEntry } from './entry';
import { AuthGuard } from '@microfrontends/shared-services';

export const remoteRoutes: Route[] = [
  {
    path: '',
    component: RemoteEntry,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },

      // ── Landing: redirige según rol ──
      {
        path: 'inicio',
        loadComponent: () =>
          import('../pages/shared/sedu-landing/sedu-landing.component').then(
            (m) => m.SeduLandingComponent
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'admin/dashboard',
        loadComponent: () =>
          import('../pages/admin/dashboard-admin/dashboard-admin.component').then(
            (m) => m.DashboardAdminComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'ADMIN_GTH'] },
      },
      {
        path: 'admin/periodos',
        loadComponent: () =>
          import('../pages/admin/gestion-periodos/gestion-periodos.component').then(
            (m) => m.GestionPeriodosComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'ADMIN_GTH'] },
      },
      {
        path: 'admin/catalogos',
        loadComponent: () =>
          import('../pages/admin/gestion-catalogos/gestion-catalogos.component').then(
            (m) => m.GestionCatalogosComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'ADMIN_GTH'] },
      },
      {
        path: 'admin/asignaciones',
        loadComponent: () =>
          import('../pages/admin/gestion-asignaciones/gestion-asignaciones.component').then(
            (m) => m.GestionAsignacionesComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'ADMIN_GTH'] },
      },
      {
        path: 'admin/seguimiento',
        loadComponent: () =>
          import('../pages/admin/seguimiento-global/seguimiento-global.component').then(
            (m) => m.SeguimientoGlobalComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN', 'ADMIN_GTH'] },
      },

      // ── Super Admin (ADMIN) ──
      {
        path: 'superadmin/auditoria',
        loadComponent: () =>
          import('../pages/admin/auditoria/auditoria.component').then(
            (m) => m.AuditoriaComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },
      {
        path: 'superadmin/gestion',
        loadComponent: () =>
          import('../pages/admin/super-admin/super-admin.component').then(
            (m) => m.SuperAdminComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['ADMIN'] },
      },

      // ── Evaluador ──
      {
        path: 'evaluador/dashboard',
        loadComponent: () =>
          import('../pages/evaluador/dashboard-evaluador/dashboard-evaluador.component').then(
            (m) => m.DashboardEvaluadorComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['EVALUADOR'] },
      },
      {
        path: 'evaluador/evaluacion/:id',
        loadComponent: () =>
          import('../pages/evaluador/evaluacion/evaluacion.component').then(
            (m) => m.EvaluacionComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['EVALUADOR'] },
      },
      {
        path: 'evaluador/plan-mejoramiento/:evaluacionId',
        loadComponent: () =>
          import('../pages/evaluador/plan-mejoramiento/plan-mejoramiento.component').then(
            (m) => m.PlanMejoramientoComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['EVALUADOR'] },
      },

      // ── Evaluado ──
      {
        path: 'evaluado/dashboard',
        loadComponent: () =>
          import('../pages/evaluado/dashboard-evaluado/dashboard-evaluado.component').then(
            (m) => m.DashboardEvaluadoComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['EVALUADO'] },
      },
      {
        path: 'evaluado/revision/:id',
        loadComponent: () =>
          import('../pages/evaluado/revision-evaluacion/revision-evaluacion.component').then(
            (m) => m.RevisionEvaluacionComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['EVALUADO'] },
      },
      {
        path: 'evaluado/firma/:id',
        loadComponent: () =>
          import('../pages/evaluado/firma-evaluacion/firma-evaluacion.component').then(
            (m) => m.FirmaEvaluacionComponent
          ),
        canActivate: [AuthGuard],
        data: { requiredRoles: ['EVALUADO'] },
      },

      // ── Transversales ──
      {
        path: 'perfil',
        loadComponent: () =>
          import('../pages/shared/perfil-usuario/perfil-usuario.component').then(
            (m) => m.PerfilUsuarioComponent
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'notificaciones',
        loadComponent: () =>
          import('../pages/shared/notificaciones/notificaciones.component').then(
            (m) => m.NotificacionesComponent
          ),
        canActivate: [AuthGuard],
      },
    ],
  },
];
