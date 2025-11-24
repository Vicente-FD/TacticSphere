import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  
  // Tiempos en milisegundos
  private readonly INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos
  private readonly WARNING_TIME = 14 * 60 * 1000; // 14 minutos (1 minuto antes)
  
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityTime = Date.now();
  private routerSubscription?: Subscription;
  
  // Subject para notificar cuando se debe mostrar el warning
  private warningSubject = new Subject<void>();
  warning$ = this.warningSubject.asObservable();
  
  // Subject para notificar cuando se debe cerrar sesión
  private logoutSubject = new Subject<void>();
  logout$ = this.logoutSubject.asObservable();

  constructor() {
    this.startTracking();
  }

  /**
   * Inicia el seguimiento de actividad del usuario
   */
  startTracking(): void {
    if (!this.auth.isLoggedIn()) {
      return;
    }

    this.resetTimers();
    this.setupEventListeners();
    this.setupRouterListener();
  }

  /**
   * Detiene el seguimiento de actividad
   */
  stopTracking(): void {
    this.clearTimers();
    this.removeEventListeners();
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Reinicia el contador de inactividad (llamado cuando hay actividad)
   */
  resetTimers(): void {
    this.lastActivityTime = Date.now();
    this.clearTimers();
    
    // Timer para mostrar advertencia (14 minutos)
    this.warningTimer = setTimeout(() => {
      this.warningSubject.next();
      // Cancelar el logoutTimer ya que el modal se encargará del auto-logout
      if (this.logoutTimer) {
        clearTimeout(this.logoutTimer);
        this.logoutTimer = null;
      }
    }, this.WARNING_TIME);
    
    // Timer para cerrar sesión (15 minutos) - solo si no se muestra el warning
    this.logoutTimer = setTimeout(() => {
      this.performLogout();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Limpia todos los timers
   */
  private clearTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }

  /**
   * Configura los listeners de eventos de actividad
   */
  private setupEventListeners(): void {
    // Eventos que indican actividad
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((event) => {
      document.addEventListener(event, this.onActivity.bind(this), true);
    });
  }

  /**
   * Remueve los listeners de eventos
   */
  private removeEventListeners(): void {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((event) => {
      document.removeEventListener(event, this.onActivity.bind(this), true);
    });
  }

  /**
   * Listener de actividad del usuario
   */
  private onActivity(): void {
    if (!this.auth.isLoggedIn()) {
      this.stopTracking();
      return;
    }
    this.resetTimers();
  }

  /**
   * Configura listener para cambios de ruta (navegación)
   */
  private setupRouterListener(): void {
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.auth.isLoggedIn()) {
          this.resetTimers();
        }
      });
  }

  /**
   * Ejecuta el cierre de sesión
   */
  private performLogout(): void {
    this.stopTracking();
    this.auth.logout();
    this.logoutSubject.next();
    this.router.navigate(['/login']);
  }

  /**
   * Método público para extender la sesión (llamado desde el modal)
   */
  extendSession(): void {
    this.resetTimers();
  }

  ngOnDestroy(): void {
    this.stopTracking();
    this.warningSubject.complete();
    this.logoutSubject.complete();
  }
}

