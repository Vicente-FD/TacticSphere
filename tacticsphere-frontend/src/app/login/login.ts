import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, LucideAngularModule, RouterLink],
  template: `
    <div class="ts-page flex min-h-screen items-center justify-center bg-neutral-100 py-16">
      <div class="w-full max-w-md space-y-6">
        <div class="ts-card space-y-6 shadow-hover md:space-y-8">
          <div class="space-y-3 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-accent/10 text-accent">
              <lucide-icon name="LogIn" class="h-6 w-6" strokeWidth="1.75"></lucide-icon>
            </div>
            <div>
              <h1 class="text-2xl font-semibold tracking-[-0.01em] text-ink">Bienvenido</h1>
              <p class="text-sm text-neutral-400">
                Ingresa tus credenciales para continuar gestionando TacticSphere.
              </p>
            </div>
          </div>

          <form class="space-y-4" (ngSubmit)="submit()" autocomplete="on">
            <label class="block space-y-2">
              <span class="ts-label">Email</span>
              <div
                class="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 transition-all duration-120 ease-smooth focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
              >
                <lucide-icon name="Mail" class="h-5 w-5 text-neutral-400" strokeWidth="1.75"></lucide-icon>
                <input
                  [(ngModel)]="email"
                  name="email"
                  type="email"
                  placeholder="email@empresa.com"
                  required
                  autocomplete="email"
                  class="flex-1 border-none bg-transparent p-0 text-base text-ink placeholder:text-neutral-300 focus:outline-none"
                />
              </div>
            </label>

            <label class="block space-y-2">
              <span class="ts-label">Contraseña</span>
              <div
                class="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 transition-all duration-120 ease-smooth focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
              >
                <lucide-icon name="Lock" class="h-5 w-5 text-neutral-400" strokeWidth="1.75"></lucide-icon>
                <input
                  [(ngModel)]="password"
                  name="password"
                  type="password"
                  placeholder="********"
                  required
                  autocomplete="current-password"
                  class="flex-1 border-none bg-transparent p-0 text-base text-ink placeholder:text-neutral-300 focus:outline-none"
                />
              </div>
            </label>

            <div class="flex justify-end">
              <a class="text-sm font-medium text-accent hover:text-accent/80" routerLink="/password/recuperar">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button type="submit" class="ts-btn w-full" [disabled]="loading || !email || !password">
              <span>{{ loading ? 'Ingresando...' : 'Entrar' }}</span>
            </button>

            <button type="button" class="ts-btn ts-btn--secondary w-full" routerLink="/home">
              Volver al inicio
            </button>

            <div
              *ngIf="error"
              class="flex items-start gap-2 rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error"
            >
              <span>{{ error }}</span>
            </div>
          </form>
        </div>

        <p class="text-center text-xs text-neutral-400">
          Soporte:
          <a class="underline decoration-dotted underline-offset-2 hover:text-accent/90" href="mailto:soporte@tacticsphere.ai">
            soporte@tacticsphere.ai
          </a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = false;
  error = '';

  submit(): void {
    this.error = '';
    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (!email || !password || this.loading) {
      return;
    }

    this.loading = true;

    this.auth
      .login(email, password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.auth.getDefaultRoute() || '/results'),
        error: (e) => {
          console.error(e);
          if (e?.status === 403 && e.error?.detail) {
            this.error = e.error.detail;
          } else if (e?.status === 401) {
            this.error = 'Credenciales inválidas';
          } else {
            this.error = 'No se pudo iniciar sesión. Inténtalo nuevamente.';
          }
        },
      });
  }
}
