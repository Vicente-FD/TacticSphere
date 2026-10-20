import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../shared/ui/icon/icon.component';
import { HeroLogoComponent } from '../home/hero-logo.component';

// Página para rutas inexistentes. Firebase responde todas las rutas con index.html (código 200),
// así que se marca como noindex para que los buscadores no la indexen.
@Component({
  standalone: true,
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, HeroLogoComponent],
  template: `
    <main class="not-found">
      <app-hero-logo></app-hero-logo>
      <p class="not-found__code">404</p>
      <h1 class="text-3xl font-semibold tracking-tight text-ink md:text-4xl">Esta página no existe</h1>
      <p class="max-w-md text-base leading-relaxed text-muted">
        Puede que el enlace esté mal escrito o que la página se haya movido.
      </p>
      <div class="flex flex-wrap justify-center gap-3 pt-2">
        <a routerLink="/home" class="ts-btn not-found__primary px-6 py-3">
          Ir al inicio
          <app-icon name="arrow-right" size="sm"></app-icon>
        </a>
        <a routerLink="/login" class="ts-btn ts-btn--secondary px-6 py-3">Ingresar a la plataforma</a>
      </div>
    </main>
  `,
  styles: [`
    .not-found {
      display: flex;
      min-height: 100vh;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem 1.5rem;
      text-align: center;
      background: #fff;
    }

    .not-found__code {
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.3em;
      color: #9ca3af;
    }

    .not-found__primary {
      border-color: #0f0f0f;
      background: #0f0f0f;
      color: #fff;
    }

    .not-found__primary:hover {
      background: #262626;
    }

    :host ::ng-deep .not-found__primary lucide-icon,
    :host ::ng-deep .not-found__primary svg {
      color: inherit !important;
    }
  `],
})
export class NotFoundComponent implements OnDestroy {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly previousTitle = this.title.getTitle();

  constructor() {
    this.title.setTitle('Página no encontrada · TacticSphere');
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  ngOnDestroy(): void {
    this.title.setTitle(this.previousTitle);
    this.meta.removeTag('name="robots"');
  }
}
