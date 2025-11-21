import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { NotificationCenterService, NotificationPayload } from '../../../core/services/notification-center.service';
import { IconComponent } from '../icon/icon.component';

/**
 * Componente de toast/notificación que aparece cuando llega una nueva solicitud
 * Permanece visible 5 segundos con barra de progreso
 * Permite navegación al hacer clic
 */
@Component({
  standalone: true,
  selector: 'app-notification-toast',
  imports: [CommonModule, IconComponent],
  template: `
    <div
      *ngIf="currentNotification"
      class="notification-toast fixed top-4 right-6 z-50 w-full max-w-sm"
      (click)="handleClick()"
    >
      <div
        class="rounded-xl border border-neutral-200 bg-white shadow-md transition-shadow hover:shadow-lg cursor-pointer"
      >
        <div class="flex items-start gap-3 p-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            [class.bg-red-50]="currentNotification.type === 'password'"
            [class.bg-blue-50]="currentNotification.type === 'consulting'"
          >
            <app-icon
              [name]="currentNotification.type === 'password' ? 'key-round' : 'mail'"
              size="20"
              class="h-5 w-5"
              [class.text-red-600]="currentNotification.type === 'password'"
              [class.text-blue-600]="currentNotification.type === 'consulting'"
              strokeWidth="1.75"
            ></app-icon>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-neutral-800">{{ currentNotification.message }}</p>
            <p class="mt-1 text-xs text-neutral-500">Haz clic para ver detalles</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            (click)="dismiss(); $event.stopPropagation()"
            aria-label="Cerrar notificación"
          >
            <app-icon name="x" size="16" class="h-4 w-4" strokeWidth="1.75"></app-icon>
          </button>
        </div>
        <!-- Barra de progreso -->
        <div class="h-1 w-full bg-neutral-100 rounded-b-xl overflow-hidden">
          <div
            class="h-full transition-all ease-linear"
            [style.transition-duration]="'50ms'"
            [class.bg-red-400]="currentNotification.type === 'password'"
            [class.bg-blue-400]="currentNotification.type === 'consulting'"
            [style.width.%]="progressWidth"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .notification-toast {
        animation: slideInFade 0.3s ease-out;
      }
      @keyframes slideInFade {
        from {
          transform: translateY(-0.5rem);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  private notificationCenter = inject(NotificationCenterService);
  private router = inject(Router);

  currentNotification: NotificationPayload | null = null;
  progressWidth = 100;
  private subscription?: Subscription;
  private timerSubscription?: Subscription;
  private progressInterval?: number;
  private readonly DISPLAY_DURATION = 5000; // 5 segundos

  ngOnInit(): void {
    // Suscribirse a las notificaciones
    this.subscription = this.notificationCenter.notification$.subscribe((notification) => {
      this.showNotification(notification);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.timerSubscription?.unsubscribe();
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }

  /**
   * Muestra una notificación y programa su cierre automático
   */
  private showNotification(notification: NotificationPayload): void {
    // Si hay una notificación visible, la reemplazamos
    this.dismiss();

    this.currentNotification = notification;
    this.progressWidth = 100;

    // Iniciar animación de la barra de progreso (de 100% a 0% en 5 segundos)
    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, this.DISPLAY_DURATION - elapsed);
      this.progressWidth = (remaining / this.DISPLAY_DURATION) * 100;
      
      if (remaining > 0) {
        this.progressInterval = window.setTimeout(updateProgress, 50);
      } else {
        this.progressWidth = 0;
      }
    };
    
    // Pequeño delay para que la animación se vea
    setTimeout(() => {
      updateProgress();
    }, 50);

    // Cerrar automáticamente después de 5 segundos
    this.timerSubscription = timer(this.DISPLAY_DURATION).subscribe(() => {
      this.dismiss();
    });
  }

  /**
   * Maneja el clic en la notificación
   * Navega a la vista correspondiente
   */
  handleClick(): void {
    if (!this.currentNotification) return;

    if (this.currentNotification.type === 'password') {
      // Navegar a usuarios con fragment para scroll
      this.router.navigate(['/admin/users'], { fragment: 'solicitudes-password' }).then(() => {
        // Scroll a la sección después de navegar
        setTimeout(() => {
          const element = document.getElementById('solicitudes-password');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      });
    } else if (this.currentNotification.type === 'consulting') {
      // Navegar a empresas (la tabla de consultorías está en esa vista)
      this.router.navigate(['/admin/companies']).then(() => {
        // Scroll a la sección de consultorías
        setTimeout(() => {
          const element = document.querySelector('[data-section="consulting-requests"]');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      });
    }

    this.dismiss();
  }

  /**
   * Cierra la notificación manualmente
   */
  dismiss(): void {
    this.currentNotification = null;
    this.progressWidth = 100;
    this.timerSubscription?.unsubscribe();
    if (this.progressInterval) {
      clearTimeout(this.progressInterval);
      this.progressInterval = undefined;
    }
  }
}

