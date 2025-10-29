// src/app/layout/shell/shell.ts
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <header class="topbar">
        <div class="brand">tacticsphere</div>
        <div class="right">
          <span>Rol: {{ rol }}</span>
          <button (click)="logout()">Salir</button>
        </div>
      </header>

      <div class="content">
        <aside class="sidebar">
          <nav>
            <a
              routerLink="/admin"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              >Dashboard Admin</a
            >
            <a routerLink="/admin/dashboards" routerLinkActive="active">Resultados</a>
            <a routerLink="/admin/companies" routerLinkActive="active">Empresas</a>
            <a routerLink="/admin/pillars" routerLinkActive="active">Pilares</a>
            <a routerLink="/admin/questions" routerLinkActive="active">Preguntas</a>
            <a routerLink="/admin/users" routerLinkActive="active">Usuarios</a>
            <a routerLink="/survey" class="block px-4 py-2 hover:bg-gray-100">Encuesta</a>
          </nav>
        </aside>

        <main class="main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-rows: auto 1fr; height: 100vh; }
    .topbar { display:flex; justify-content:space-between; align-items:center; padding:.75rem 1rem; background:#f7f7f7; border-bottom:1px solid #e5e5e5; }
    .brand { font-weight:700; }
    .content { display:grid; grid-template-columns: 220px 1fr; height:100%; }
    .sidebar { border-right:1px solid #e5e5e5; padding:1rem; background:#fafafa; }
    nav { display:grid; gap:.5rem; }
    nav a { text-decoration:none; color:#333; padding:.4rem .6rem; border-radius:.4rem; }
    nav a.active, nav a:hover { background:#e9eefc; }
    .main { padding:1rem; overflow:auto; }
    button { cursor:pointer; }
  `]
})
export class ShellComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  rol = this.auth.getRole() ?? '—';

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
