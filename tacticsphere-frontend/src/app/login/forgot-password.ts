import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  template: `
    <div class="ts-page flex min-h-screen items-center justify-center bg-neutral-100 py-16">
      <div class="w-full max-w-xl space-y-6">
        <div class="ts-card space-y-6 shadow-hover">
          <div class="space-y-3 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-accent/10 text-accent">
              <lucide-icon name="KeyRound" class="h-6 w-6" strokeWidth="1.75"></lucide-icon>
            </div>
            <div>
              <h1 class="text-2xl font-semibold tracking-[-0.01em] text-ink">Recuperar contraseña</h1>
              <p class="text-sm text-neutral-400">
                Genera un token temporal y establece una nueva contraseña segura.
              </p>
            </div>
          </div>

          <div *ngIf="message" class="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-[#0b7a56]">
            {{ message }}
          </div>

          <div *ngIf="error" class="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {{ error }}
          </div>

          <div class="space-y-8">
            <form class="space-y-4" (ngSubmit)="sendRequest()" autocomplete="off">
              <div>
                <h2 class="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Paso 1</h2>
                <p class="text-sm text-neutral-500">
                  Ingresa tu correo y genera un token temporal (visible sólo una vez).
                </p>
              </div>
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
                {{ loadingRequest ? 'Generando...' : 'Generar token' }}
              </button>
              <div *ngIf="generatedToken" class="rounded-lg border border-dashed border-neutral-200 bg-neutral-100/60 p-4 text-sm">
                <p class="font-medium text-ink">Token generado:</p>
                <code class="mt-1 block break-words text-xs text-neutral-600">{{ generatedToken }}</code>
                <p class="mt-2 text-xs text-neutral-500">
                  Copia este token y utilízalo en el siguiente paso antes de que expire.
                </p>
              </div>
            </form>

            <div class="border-t border-neutral-200 pt-6">
              <form class="space-y-4" (ngSubmit)="resetPassword()" autocomplete="off">
                <div>
                  <h2 class="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Paso 2</h2>
                  <p class="text-sm text-neutral-500">
                    Ingresa el token y define tu nueva contraseña (mínimo 10 caracteres).
                  </p>
                </div>
                <label class="block space-y-2">
                  <span class="ts-label">Token</span>
                  <input
                    class="ts-input"
                    name="token"
                    [(ngModel)]="token"
                    required
                    placeholder="Pega aquí tu token"
                  />
                </label>
                <div class="grid gap-4 md:grid-cols-2">
                  <label class="block space-y-2">
                    <span class="ts-label">Nueva contraseña</span>
                    <input
                      class="ts-input"
                      name="newPassword"
                      type="password"
                      [(ngModel)]="newPassword"
                      required
                      minlength="10"
                      autocomplete="new-password"
                    />
                  </label>
                  <label class="block space-y-2">
                    <span class="ts-label">Confirmar contraseña</span>
                    <input
                      class="ts-input"
                      name="confirmPassword"
                      type="password"
                      [(ngModel)]="confirmPassword"
                      required
                      minlength="10"
                      autocomplete="new-password"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  class="ts-btn ts-btn--positive w-full md:w-auto"
                  [disabled]="loadingReset || !token || !newPassword || !confirmPassword"
                >
                  {{ loadingReset ? 'Actualizando...' : 'Actualizar contraseña' }}
                </button>
              </form>
            </div>
          </div>
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

  email = '';
  generatedToken: string | null = null;
  token = '';
  newPassword = '';
  confirmPassword = '';

  loadingRequest = false;
  loadingReset = false;
  message = '';
  error = '';

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
        next: (res) => {
          this.generatedToken = res.reset_token ?? null;
          if (this.generatedToken) {
            this.token = this.generatedToken;
            this.message = 'Token generado con éxito. Recuerda usarlo antes de su expiración.';
          } else {
            this.message = 'Si el correo existe, se generó un token temporal. Revisa con tu administrador.';
          }
        },
        error: (err) => {
          console.error('Error solicitando token de contraseña', err);
          this.error = err?.error?.detail ?? 'No fue posible generar el token. Inténtalo nuevamente.';
        },
      });
  }

  resetPassword(): void {
    const token = this.token.trim();
    const newPassword = this.newPassword;
    const confirm = this.confirmPassword;

    if (!token || this.loadingReset) {
      return;
    }
    if (!newPassword || newPassword.length < 10) {
      this.error = 'La contraseña debe tener al menos 10 caracteres.';
      return;
    }
    if (newPassword !== confirm) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.error = '';
    this.message = '';
    this.loadingReset = true;

    this.auth
      .resetPassword(token, newPassword)
      .pipe(finalize(() => (this.loadingReset = false)))
      .subscribe({
        next: () => {
          this.message = 'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva credencial.';
          this.generatedToken = null;
          this.token = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: (err) => {
          console.error('Error restableciendo contraseña', err);
          this.error = err?.error?.detail ?? 'No se pudo actualizar la contraseña. Verifica el token e inténtalo de nuevo.';
        },
      });
  }
}
