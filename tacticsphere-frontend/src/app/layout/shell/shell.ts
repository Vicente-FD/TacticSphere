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
    <div class="min-h-screen bg-bg text-ink">
      <header class="sticky top-0 z-40 border-b border-border bg-white shadow-card">
        <div class="flex h-16 w-full items-center justify-between gap-6 px-6">
          <a [routerLink]="defaultRoute" class="flex items-center gap-3">
            <img src="assets/logo_ts.png" alt="TacticSphere" class="h-8 w-auto" />
            <span class="text-lg font-semibold tracking-tight text-ink">TacticSphere</span>
          </a>
          <div class="flex items-center gap-4 text-sm">
            <span class="text-muted">Rol: <span class="text-ink">{{ rol }}</span></span>
            <button type="button" class="ts-btn ts-btn--secondary" (click)="logout()">Salir</button>
          </div>
        </div>
      </header>

      <div class="flex min-h-[calc(100vh-4rem)] bg-bg">
        <aside class="w-64 shrink-0 border-r border-border bg-white">
          <nav class="flex flex-col gap-1 px-4 py-6 text-sm">
            <a
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/results"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              >Resultados</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/dashboards"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              >Panel admin</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/companies"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              >Empresas</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/pillars"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              >Pilares</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/questions"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              >Preguntas</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/users"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              >Usuarios</a
            >
            <a
              *ngIf="canSeeSurvey"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/survey"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              >Encuesta</a
            >
          </nav>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col bg-bg">
          <main class="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <router-outlet></router-outlet>
          </main>
          <footer class="border-t border-border bg-white px-6 py-4 text-xs text-muted sm:text-sm">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>© {{ currentYear }} TacticSphere. Todos los derechos reservados.</span>
              <div class="flex flex-wrap items-center gap-4">
                <a class="transition-colors hover:text-ink" href="mailto:contacto@tacticsphere.com">Contacto</a>
                <a class="transition-colors hover:text-ink" [routerLink]="defaultRoute">Ir a inicio</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly rol = this.auth.getRole() ?? 'N/A';
  readonly currentYear = new Date().getFullYear();
  readonly canManageAdmin = this.auth.hasRole(['ADMIN', 'ADMIN_SISTEMA']);
  readonly canSeeSurvey = this.auth.hasRole(['ADMIN', 'ADMIN_SISTEMA', 'ANALISTA']);
  readonly defaultRoute = this.auth.getDefaultRoute() || '/results';

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
