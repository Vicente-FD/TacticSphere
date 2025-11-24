import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalComponent } from './shared/ui/modal/modal.component';
import { InactivityService } from './inactivity.service';
import { AuthService } from './auth.service';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-session-expiry-modal',
  imports: [CommonModule, ModalComponent],
  template: `
    <ts-modal title="Sesión por expirar" [open]="showWarning" (close)="onClose()">
      <div class="space-y-4">
        <div class="rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
          <p class="text-sm text-ink">
            Tu sesión está por expirar por inactividad. Si no realizas ninguna acción, se cerrará automáticamente en 1 minuto.
          </p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="ts-btn ts-btn--secondary"
            (click)="onLogout()"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            class="ts-btn"
            (click)="onExtendSession()"
          >
            Seguir conectado
          </button>
        </div>
      </div>
    </ts-modal>
  `,
})
export class SessionExpiryModalComponent implements OnInit, OnDestroy {
  private inactivityService = inject(InactivityService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private warningSubscription?: Subscription;
  private autoLogoutTimer: ReturnType<typeof setTimeout> | null = null;
  
  showWarning = false;

  ngOnInit(): void {
    // Suscribirse a las advertencias de inactividad
    this.warningSubscription = this.inactivityService.warning$.subscribe(() => {
      this.showWarning = true;
      // Iniciar timer de 1 minuto para auto-logout
      this.startAutoLogoutTimer();
    });
  }

  ngOnDestroy(): void {
    this.clearAutoLogoutTimer();
    if (this.warningSubscription) {
      this.warningSubscription.unsubscribe();
    }
  }

  private startAutoLogoutTimer(): void {
    this.clearAutoLogoutTimer();
    // Timer de 1 minuto (60000 ms) para auto-logout
    this.autoLogoutTimer = setTimeout(() => {
      this.performAutoLogout();
    }, 60000);
  }

  private clearAutoLogoutTimer(): void {
    if (this.autoLogoutTimer) {
      clearTimeout(this.autoLogoutTimer);
      this.autoLogoutTimer = null;
    }
  }

  private performAutoLogout(): void {
    this.clearAutoLogoutTimer();
    this.inactivityService.stopTracking();
    this.authService.logout();
    this.showWarning = false;
    this.router.navigate(['/login']);
  }

  onExtendSession(): void {
    this.clearAutoLogoutTimer();
    this.inactivityService.extendSession();
    this.showWarning = false;
  }

  onLogout(): void {
    this.clearAutoLogoutTimer();
    // Cerrar sesión inmediatamente si el usuario lo solicita
    this.inactivityService.stopTracking();
    this.authService.logout();
    this.showWarning = false;
    this.router.navigate(['/login']);
  }

  onClose(): void {
    // Si el usuario cierra el modal con X, no extendemos la sesión
    // pero el timer de auto-logout debe seguir funcionando
    // No limpiamos el timer aquí, solo ocultamos el modal
    this.showWarning = false;
  }
}

