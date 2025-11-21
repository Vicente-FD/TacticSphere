import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, interval, Subscription, forkJoin } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PasswordChangeRequest } from '../../types';
import { Lead } from '../../types';
import { UserService } from '../../user.service';
import { LeadService } from './lead.service';

/**
 * Payload para notificaciones toast
 */
export interface NotificationPayload {
  type: 'password' | 'consulting';
  message: string;
  data: PasswordChangeRequest | Lead;
}

/**
 * Servicio centralizado para gestionar notificaciones y contadores
 * de solicitudes pendientes (cambio de contraseña y consultoría)
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private userService = inject(UserService);
  private leadService = inject(LeadService);

  // Contadores de solicitudes pendientes
  private passwordRequestsCountSubject = new BehaviorSubject<number>(0);
  private consultingRequestsCountSubject = new BehaviorSubject<number>(0);

  // Observable para los contadores (para suscripciones en componentes)
  readonly passwordRequestsCount$ = this.passwordRequestsCountSubject.asObservable();
  readonly consultingRequestsCount$ = this.consultingRequestsCountSubject.asObservable();

  // Subject para disparar notificaciones toast
  private notificationSubject = new Subject<NotificationPayload>();
  readonly notification$ = this.notificationSubject.asObservable();

  // Estado de inicialización
  private initialized = false;
  private previousPasswordRequestsIds = new Set<number>();
  private previousLeadsIds = new Set<number>();
  private isFirstLoad = true; // Flag para evitar notificaciones en la primera carga
  private passwordRequestsLoaded = false; // Flag para saber si ya se cargaron las solicitudes de contraseña
  private consultingRequestsLoaded = false; // Flag para saber si ya se cargaron las solicitudes de consultoría

  // Polling
  private pollingSubscription?: Subscription;
  private readonly POLLING_INTERVAL = 12000; // 12 segundos
  private pollingActive = false;

  /**
   * Inicializa el contador de solicitudes de cambio de contraseña
   */
  setInitialPasswordRequestsCount(count: number): void {
    this.passwordRequestsCountSubject.next(count);
  }

  /**
   * Inicializa el contador de solicitudes de consultoría
   */
  setInitialConsultingRequestsCount(count: number): void {
    this.consultingRequestsCountSubject.next(count);
  }

  /**
   * Notifica una nueva solicitud de cambio de contraseña
   * Incrementa el contador y dispara el toast
   */
  notifyPasswordRequest(request: PasswordChangeRequest): void {
    const currentCount = this.passwordRequestsCountSubject.value;
    // Solo incrementar si no está ya en el contador (evitar duplicados)
    if (!this.previousPasswordRequestsIds.has(request.id)) {
      this.passwordRequestsCountSubject.next(currentCount + 1);
      this.previousPasswordRequestsIds.add(request.id);
    }

    this.notificationSubject.next({
      type: 'password',
      message: `El usuario ${request.user_nombre} solicita cambio de contraseña.`,
      data: request,
    });
  }

  /**
   * Notifica una nueva solicitud de cambio de contraseña desde el frontend
   * Se usa cuando se crea una solicitud desde el formulario público
   */
  notifyNewPasswordRequest(email: string, nombre?: string): void {
    // Crear un objeto temporal para la notificación inmediata
    const tempRequest: PasswordChangeRequest = {
      id: Date.now(), // ID temporal
      user_id: 0,
      user_email: email,
      user_nombre: nombre || email.split('@')[0],
      empresa_id: null,
      created_at: new Date().toISOString(),
      resolved: false,
    };

    // Disparar la alerta inmediatamente
    this.notificationSubject.next({
      type: 'password',
      message: `El usuario ${tempRequest.user_nombre} solicita cambio de contraseña.`,
      data: tempRequest,
    });

    // Recargar la lista real para obtener el ID correcto y actualizar el contador
    // La lógica de loadPasswordRequests detectará la nueva solicitud y actualizará el contador
    this.loadPasswordRequests();
  }

  /**
   * Notifica una nueva solicitud de consultoría
   * Incrementa el contador y dispara el toast
   */
  notifyConsultingRequest(lead: Lead): void {
    const currentCount = this.consultingRequestsCountSubject.value;
    // Solo incrementar si no está ya en el contador (evitar duplicados)
    if (!this.previousLeadsIds.has(lead.id)) {
      this.consultingRequestsCountSubject.next(currentCount + 1);
      this.previousLeadsIds.add(lead.id);
    }

    this.notificationSubject.next({
      type: 'consulting',
      message: `La empresa ${lead.company} solicita una consultoría.`,
      data: lead,
    });
  }

  /**
   * Notifica una nueva solicitud de consultoría desde el frontend
   * Se usa cuando se crea un lead desde el formulario público
   */
  notifyNewConsultingRequest(lead: Lead): void {
    // Agregar el ID a la lista para evitar duplicados cuando se recargue
    this.previousLeadsIds.add(lead.id);

    // Disparar la alerta inmediatamente
    this.notificationSubject.next({
      type: 'consulting',
      message: `La empresa ${lead.company} solicita una consultoría.`,
      data: lead,
    });

    // Recargar la lista real para actualizar el contador con el número correcto
    // La lógica de loadConsultingRequests actualizará el contador sin duplicar
    this.loadConsultingRequests();
  }

  /**
   * Decrementa el contador de solicitudes de cambio de contraseña
   * (cuando se atiende o elimina una solicitud)
   */
  decrementPasswordRequestsCount(): void {
    const currentCount = this.passwordRequestsCountSubject.value;
    if (currentCount > 0) {
      this.passwordRequestsCountSubject.next(currentCount - 1);
    }
  }

  /**
   * Decrementa el contador de solicitudes de consultoría
   * (cuando se atiende o elimina una solicitud)
   */
  decrementConsultingRequestsCount(): void {
    const currentCount = this.consultingRequestsCountSubject.value;
    if (currentCount > 0) {
      this.consultingRequestsCountSubject.next(currentCount - 1);
    }
  }

  /**
   * Obtiene el valor actual del contador de solicitudes de cambio de contraseña
   */
  getPasswordRequestsCount(): number {
    return this.passwordRequestsCountSubject.value;
  }

  /**
   * Obtiene el valor actual del contador de solicitudes de consultoría
   */
  getConsultingRequestsCount(): number {
    return this.consultingRequestsCountSubject.value;
  }

  /**
   * Inicializa el servicio cargando las solicitudes pendientes desde el backend
   * Debe llamarse cuando el usuario está autenticado
   */
  initialize(isAdminSistema: boolean): void {
    if (this.initialized) {
      return; // Ya está inicializado
    }

    // Marcar como primera carga para evitar notificaciones al recargar la página
    this.isFirstLoad = true;
    this.passwordRequestsLoaded = false;
    this.consultingRequestsLoaded = false;
    // Limpiar los Sets de IDs previos para empezar limpio
    this.previousPasswordRequestsIds.clear();
    this.previousLeadsIds.clear();

    // Cargar solicitudes de consultoría (siempre disponible para admins)
    this.loadConsultingRequests();

    // Cargar solicitudes de cambio de contraseña (solo para ADMIN_SISTEMA)
    if (isAdminSistema) {
      this.loadPasswordRequests();
    } else {
      // Si no es admin sistema, marcar como cargado para que el flag se desactive
      this.passwordRequestsLoaded = true;
    }

    this.initialized = true;
  }

  /**
   * Recarga las solicitudes desde el backend
   * Útil para actualizar después de cambios
   */
  refresh(isAdminSistema: boolean): void {
    this.loadConsultingRequests();
    if (isAdminSistema) {
      this.loadPasswordRequests();
    }
  }

  /**
   * Inicia el polling en segundo plano para actualizar notificaciones automáticamente
   * @param isAdminSistema Si el usuario es ADMIN_SISTEMA para cargar solicitudes de contraseña
   */
  startPolling(isAdminSistema: boolean): void {
    if (this.pollingActive) {
      return; // Ya está activo
    }

    this.pollingActive = true;

    // Iniciar polling cada X segundos
    this.pollingSubscription = interval(this.POLLING_INTERVAL)
      .pipe(
        switchMap(() => {
          // Cargar ambas listas en paralelo usando forkJoin
          const consulting$ = this.leadService.listLeads().pipe(
            catchError((error) => {
              console.error('Error en polling de consultoría', error);
              return of([]);
            })
          );

          const password$ = isAdminSistema
            ? this.userService.listPasswordChangeRequests().pipe(
                catchError((error) => {
                  console.error('Error en polling de contraseña', error);
                  return of([]);
                })
              )
            : of([]);

          return forkJoin({
            leads: consulting$,
            requests: password$,
          });
        })
      )
      .subscribe({
        next: ({ leads, requests }) => {
          // Procesar solicitudes (la lógica interna de process* verifica isFirstLoad)
          this.processConsultingLeads(leads);
          if (isAdminSistema) {
            this.processPasswordRequests(requests);
          }
        },
        error: (error) => {
          console.error('Error en polling de notificaciones', error);
        },
      });
  }

  /**
   * Detiene el polling en segundo plano
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    this.pollingActive = false;
  }

  /**
   * Procesa las solicitudes de consultoría y detecta nuevas
   */
  private processConsultingLeads(leads: Lead[]): void {
    const currentIds = new Set(leads.map(l => l.id));

    // Solo detectar nuevas solicitudes si NO es la primera carga y hay IDs previos
    if (!this.isFirstLoad && this.previousLeadsIds.size > 0) {
      leads.forEach(lead => {
        if (!this.previousLeadsIds.has(lead.id)) {
          // Es una nueva solicitud, notificar
          this.notifyConsultingRequest(lead);
        }
      });
    }

    // Actualizar contador con el número real
    this.consultingRequestsCountSubject.next(leads.length);
    this.previousLeadsIds = currentIds;
    
    // Marcar como cargado y verificar si podemos desactivar el flag de primera carga
    this.consultingRequestsLoaded = true;
    this.checkAndDisableFirstLoad();
  }

  /**
   * Procesa las solicitudes de contraseña y detecta nuevas
   */
  private processPasswordRequests(requests: PasswordChangeRequest[]): void {
    const currentIds = new Set(requests.map(r => r.id));

    // Solo detectar nuevas solicitudes si NO es la primera carga y hay IDs previos
    if (!this.isFirstLoad && this.previousPasswordRequestsIds.size > 0) {
      requests.forEach(request => {
        if (!this.previousPasswordRequestsIds.has(request.id)) {
          // Es una nueva solicitud, notificar
          this.notifyPasswordRequest(request);
        }
      });
    }

    // Actualizar contador con el número real
    this.passwordRequestsCountSubject.next(requests.length);
    this.previousPasswordRequestsIds = currentIds;
    
    // Marcar como cargado y verificar si podemos desactivar el flag de primera carga
    this.passwordRequestsLoaded = true;
    this.checkAndDisableFirstLoad();
  }

  /**
   * Verifica si ambas cargas se completaron y desactiva el flag de primera carga
   */
  private checkAndDisableFirstLoad(): void {
    if (this.isFirstLoad && this.consultingRequestsLoaded && this.passwordRequestsLoaded) {
      // Ambas cargas se completaron, desactivar el flag de primera carga
      // Usar setTimeout para asegurar que se procesen todas las solicitudes antes
      setTimeout(() => {
        this.isFirstLoad = false;
      }, 100);
    }
  }

  /**
   * Carga las solicitudes de cambio de contraseña desde el backend
   */
  private loadPasswordRequests(): void {
    this.userService.listPasswordChangeRequests().subscribe({
      next: (requests) => {
        this.processPasswordRequests(requests);
      },
      error: (error) => {
        console.error('Error cargando solicitudes de cambio de contraseña', error);
      },
    });
  }

  /**
   * Carga las solicitudes de consultoría desde el backend
   */
  private loadConsultingRequests(): void {
    this.leadService.listLeads().subscribe({
      next: (leads) => {
        this.processConsultingLeads(leads);
      },
      error: (error) => {
        console.error('Error cargando solicitudes de consultoría', error);
      },
    });
  }
}

