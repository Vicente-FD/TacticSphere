import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter, Subscription } from 'rxjs';
import { InactivityService } from './inactivity.service';
import { AuthService } from './auth.service';
import { SessionExpiryModalComponent } from './session-expiry-modal.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SessionExpiryModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('tacticsphere-frontend');
  pong = signal<string | null>(null);
  
  private http = inject(HttpClient);
  private router = inject(Router);
  private inactivityService = inject(InactivityService);
  private authService = inject(AuthService);
  private routerSubscription?: Subscription;

  constructor() {
    this.http.get<{ message: string }>(`${environment.apiUrl}/ping`).subscribe({
      next: (res) => this.pong.set(res.message),
      error: (err) => {
        console.error('Ping error', err);
        this.pong.set(null);
      },
    });
  }

  ngOnInit(): void {
    // Iniciar seguimiento de inactividad si el usuario ya está logueado
    if (this.authService.isLoggedIn()) {
      this.inactivityService.startTracking();
    }

    // Escuchar cambios de ruta para reiniciar el seguimiento cuando sea necesario
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        // Si el usuario está logueado y el servicio no está activo, iniciarlo
        if (this.authService.isLoggedIn()) {
          this.inactivityService.startTracking();
        } else {
          // Si el usuario no está logueado, detener el seguimiento
          this.inactivityService.stopTracking();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    this.inactivityService.stopTracking();
  }
}