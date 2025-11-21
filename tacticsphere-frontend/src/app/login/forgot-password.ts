import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../auth.service';
import { NotificationCenterService } from '../core/services/notification-center.service';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  template: `
    <div class="ts-page flex min-h-screen items-center justify-center bg-neutral-100 py-16">
      <div class="w-full max-w-lg space-y-6">
        <div class="ts-card space-y-6 shadow-hover">
          <div class="space-y-3 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-accent/10 text-accent">
              <lucide-icon name="KeyRound" class="h-6 w-6" strokeWidth="1.75"></lucide-icon>
            </div>
            <div>
              <h1 class="text-2xl font-semibold tracking-[-0.01em] text-ink">Solicitud de cambio de contraseña</h1>
              <p class="text-sm text-neutral-400">
                Ingresa tu correo corporativo para notificar al administrador del sistema.
              </p>
            </div>
          </div>

          <div *ngIf="message" class="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-[#0b7a56]">
            {{ message }}
          </div>

          <div *ngIf="error" class="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {{ error }}
          </div>

          <form class="space-y-4" (ngSubmit)="sendRequest()" autocomplete="off">
            <label class="block space-y-2">
              <span class="ts-label">Email</span>
              <input
                class="ts-input"
                name="email"
                type="email"
                [(ngModel)]="email"
                required
                autocomplete="email"
                placeholder="email@empresa.com"
              />
            </label>
            <button type="submit" class="ts-btn ts-btn--positive w-full md:w-auto" [disabled]="loadingRequest || !email">
              {{ loadingRequest ? 'Enviando...' : 'Solicitar cambio' }}
            </button>
            <p class="text-xs text-neutral-400">
              El administrador del sistema revisará tu solicitud y se pondrá en contacto contigo cuando actualice tu contraseña.
            </p>
          </form>
        </div>

        <div class="flex items-center justify-between text-sm text-neutral-500">
          <a routerLink="/login" class="text-accent hover:text-accent/80">Volver al inicio de sesión</a>
          <a routerLink="/home" class="hover:text-accent/80">Ir al home</a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private notificationCenter = inject(NotificationCenterService);

  email = '';
  loadingRequest = false;
  message = '';
  error = '';

  private readonly successMessage =
    'La solicitud ha sido realizada, el administrador se pondrá en contacto con usted para enviarle su nueva contraseña.';

  sendRequest(): void {
    const email = this.email.trim().toLowerCase();
    if (!email || this.loadingRequest) {
      return;
    }
    this.message = '';
    this.error = '';
    this.loadingRequest = true;

    this.auth
      .forgotPassword(email)
      .pipe(finalize(() => (this.loadingRequest = false)))
      .subscribe({
        next: () => {
          this.message = this.successMessage;
          const emailValue = this.email;
          this.email = '';
          
          // Notificar al servicio de notificaciones en tiempo real
          // Esto actualizará el contador y disparará la alerta para los admins
          this.notificationCenter.notifyNewPasswordRequest(emailValue);
        },
        error: (err) => {
          console.error('Error solicitando cambio de contraseña', err);
          this.error = err?.error?.detail ?? 'No fue posible registrar la solicitud. Inténtalo nuevamente.';
        },
      });
  }
}
