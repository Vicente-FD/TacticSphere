import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { RolEnum } from './types';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'results',
      },
      {
        path: 'results',
        canActivate: [roleGuard(['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA', 'USUARIO'] as RolEnum[])],
        loadComponent: () =>
          import('./admin/dashboard-analytics/dashboard-analytics').then(
            (m) => m.DashboardAnalyticsComponent,
          ),
      },
      {
        path: 'survey',
        canActivate: [roleGuard(['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA'] as RolEnum[])],
        loadComponent: () =>
          import('./survey/survey').then((m) => m.SurveyComponent),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['ADMIN', 'ADMIN_SISTEMA'] as RolEnum[])],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'dashboards',
          },
          {
            path: 'dashboards',
            loadComponent: () =>
              import('./admin/dashboard-analytics/dashboard-analytics').then(
                (m) => m.DashboardAnalyticsComponent,
              ),
          },
          {
            path: 'companies',
            loadComponent: () =>
              import('./admin/companies/companies').then(
                (m) => m.CompaniesComponent,
              ),
          },
          {
            path: 'questions',
            loadComponent: () =>
              import('./admin/questions/questions').then(
                (m) => m.QuestionsComponent,
              ),
          },
          {
            path: 'pillars',
            loadComponent: () =>
              import('./admin/pillars/pillars').then(
                (m) => m.PillarsComponent,
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./admin/users/users').then((m) => m.UsersComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
