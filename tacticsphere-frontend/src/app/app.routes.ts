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
        loadComponent: () =>
          import('./admin/home/home').then((m) => m.HomeComponent),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['ADMIN', 'ADMIN_SISTEMA'] as RolEnum[])],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./admin/home/home').then((m) => m.HomeComponent),
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
            path: 'dashboards',
            loadComponent: () =>
              import('./admin/dashboard-analytics/dashboard-analytics').then(
                (m) => m.DashboardAnalyticsComponent,
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./admin/users/users').then((m) => m.UsersComponent),
          },
        ],
      },
      {
        path: 'survey',
        loadComponent: () =>
          import('./survey/survey').then((m) => m.SurveyComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
