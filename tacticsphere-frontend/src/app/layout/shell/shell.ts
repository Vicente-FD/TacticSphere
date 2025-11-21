// src/app/layout/shell/shell.ts
import { Component, HostListener, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../auth.service';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { NotificationToastComponent } from '../../shared/ui/notification-toast/notification-toast.component';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationToastComponent],
  styles: [
    `
      .notification-badge {
        background-color: rgba(231, 76, 60, 0.9);
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease-in-out;
      }
      .notification-badge:hover {
        background-color: rgba(231, 76, 60, 1);
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1), 0 2px 6px 0 rgba(0, 0, 0, 0.15);
      }
    `,
  ],
  template: `
    <div class="min-h-screen bg-bg text-ink">
      <header class="sticky top-0 z-40 border-b border-border bg-white shadow-card">
        <div class="flex h-16 w-full items-center justify-between gap-6 px-6">
          <a [routerLink]="defaultRoute" class="flex items-center gap-3">
            <img src="assets/logo_ts.png" alt="TacticSphere" class="h-8 w-auto" />
            <span class="text-lg font-semibold tracking-tight text-ink">TacticSphere</span>
          </a>
          <div class="flex items-center gap-3 text-sm">
            <button
              type="button"
              class="ts-btn ts-btn--secondary px-3 py-2 text-xs font-medium uppercase tracking-wide lg:hidden"
              (click)="toggleSidebar(true)"
            >
              Menú
            </button>
            <span class="text-muted">Usuario: <span class="text-ink">{{ userName() }}</span></span>
            <button type="button" class="ts-btn ts-btn--secondary" (click)="logout()">Salir</button>
          </div>
        </div>
      </header>

      <div class="relative flex min-h-[calc(100vh-4rem)] bg-bg">
        <div
          class="fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden"
          *ngIf="sidebarOpen"
          (click)="toggleSidebar(false)"
        ></div>

        <aside
          class="fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-white transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:bg-white lg:shadow-none"
          [class.-translate-x-full]="!sidebarOpen"
          [class.translate-x-0]="sidebarOpen"
        >
          <div class="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
            <span class="text-sm font-semibold text-ink">Navegación</span>
            <button type="button" class="ts-btn ts-btn--secondary px-3 py-1 text-xs" (click)="toggleSidebar(false)">
              Cerrar
            </button>
          </div>
          <nav class="flex h-full flex-col gap-1 overflow-y-auto px-4 py-6 text-sm">
            <a
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/results"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              (click)="handleNavClick()"
              >Resultados</a
            >
            <a
              *ngIf="canSeeSurvey"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/survey"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              (click)="handleNavClick()"
              >Encuesta</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink flex items-center justify-between"
              routerLink="/admin/companies"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              (click)="handleNavClick()"
            >
              <span>Empresas</span>
              <span
                *ngIf="consultingRequestsCount() > 0"
                class="notification-badge ml-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
              >
                {{ consultingRequestsCount() > 99 ? '99+' : consultingRequestsCount() }}
              </span>
            </a>
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/pillars"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              (click)="handleNavClick()"
              >Pilares</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/questions"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              (click)="handleNavClick()"
              >Preguntas</a
            >
            <a
              *ngIf="canManageAdmin"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink flex items-center justify-between"
              routerLink="/admin/users"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              (click)="handleNavClick()"
            >
              <span>Usuarios</span>
              <span
                *ngIf="passwordRequestsCount() > 0"
                class="notification-badge ml-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
              >
                {{ passwordRequestsCount() > 99 ? '99+' : passwordRequestsCount() }}
              </span>
            </a>
            <a
              *ngIf="isAdminSistema"
              class="rounded-xl px-3 py-2 text-muted transition-colors hover:bg-[#f6f6f6] hover:text-ink"
              routerLink="/admin/auditoria"
              routerLinkActive="bg-[#f6f6f6] text-ink"
              (click)="handleNavClick()"
              >Registro de auditoría</a
            >
          </nav>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col bg-bg lg:ml-0">
          <main class="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <router-outlet></router-outlet>
          </main>
          <footer class="border-t border-border bg-white px-6 py-4 text-xs text-muted sm:text-sm">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>© 2025 TacticSphere. Todos los derechos reservados.</span>
              <div class="flex flex-wrap items-center gap-4">
                <a class="transition-colors hover:text-ink" href="mailto:soporte@tacticsphere.com">Soporte</a>
                <button
                  type="button"
                  class="transition-colors hover:text-ink"
                  (click)="scrollToTop()"
                >
                  Ir arriba
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <!-- Componente de notificaciones toast -->
      <app-notification-toast></app-notification-toast>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private notificationCenter = inject(NotificationCenterService);

  readonly userName = signal<string>(this.auth.getUserName() ?? 'Usuario');
  readonly currentYear = new Date().getFullYear();
  readonly canManageAdmin = this.auth.hasRole(['ADMIN', 'ADMIN_SISTEMA']);
  readonly canSeeSurvey = this.auth.hasRole(['ADMIN', 'ADMIN_SISTEMA', 'ANALISTA']);
  readonly isAdminSistema = this.auth.hasRole('ADMIN_SISTEMA');
  readonly defaultRoute = this.auth.getDefaultRoute() || '/results';
  private readonly desktopBreakpoint = 1024;
  sidebarOpen = typeof window === 'undefined' ? true : window.innerWidth >= this.desktopBreakpoint;

  // Contadores de notificaciones
  passwordRequestsCount = signal<number>(0);
  consultingRequestsCount = signal<number>(0);
  private notificationSubscriptions?: Subscription;
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    // Asegurar que el nombre del usuario esté cargado
    const currentName = this.auth.getUserName();
    if (!currentName) {
      // Si no hay nombre en el storage, obtenerlo desde /me
      this.auth.ensureMe().subscribe({
        next: () => {
          const name = this.auth.getUserName();
          if (name) {
            this.userName.set(name);
          }
          // Inicializar notificaciones después de cargar el usuario
          this.initializeNotifications();
        },
        error: () => {
          // Si hay error, mantener el valor por defecto
          this.initializeNotifications();
        },
      });
    } else {
      // Si ya hay nombre, inicializar notificaciones directamente
      this.initializeNotifications();
    }

    // Suscribirse a los contadores de notificaciones
    this.notificationSubscriptions = new Subscription();
    this.notificationSubscriptions.add(
      this.notificationCenter.passwordRequestsCount$.subscribe((count) => {
        this.passwordRequestsCount.set(count);
      })
    );
    this.notificationSubscriptions.add(
      this.notificationCenter.consultingRequestsCount$.subscribe((count) => {
        this.consultingRequestsCount.set(count);
      })
    );

    // El polling ya se encarga de actualizar automáticamente, no necesitamos refrescar en cada cambio de ruta
  }

  /**
   * Inicializa el servicio de notificaciones cargando las solicitudes pendientes
   */
  private initializeNotifications(): void {
    if (this.auth.isLoggedIn() && this.canManageAdmin) {
      this.notificationCenter.initialize(this.isAdminSistema);
      // Iniciar polling en segundo plano para actualizaciones automáticas
      this.notificationCenter.startPolling(this.isAdminSistema);
    }
  }

  ngOnDestroy(): void {
    this.notificationSubscriptions?.unsubscribe();
    this.routerSubscription?.unsubscribe();
    // Detener polling al destruir el componente
    this.notificationCenter.stopPolling();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  toggleSidebar(open?: boolean): void {
    if (typeof open === 'boolean') {
      this.sidebarOpen = open;
    } else {
      this.sidebarOpen = !this.sidebarOpen;
    }
  }

  handleNavClick(): void {
    if (typeof window !== 'undefined' && window.innerWidth < this.desktopBreakpoint) {
      this.sidebarOpen = false;
    }
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= this.desktopBreakpoint) {
      this.sidebarOpen = true;
    }
  }
}
