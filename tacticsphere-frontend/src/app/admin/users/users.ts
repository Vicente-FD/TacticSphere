import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs/operators';

import { CompanyService } from '../../company.service';
import { UserService } from '../../user.service';
import { AuthService } from '../../auth.service';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

import { Empresa, RolEnum, Usuario, UsuarioCreate, PasswordChangeRequest } from '../../types';

type PasswordDialogMode = 'user' | 'request';

interface PasswordDialogState {
  open: boolean;
  mode: PasswordDialogMode;
  user: Usuario | null;
  request: PasswordChangeRequest | null;
  value: string;
}

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [
    CommonModule,
    FormsModule,
    NgxSkeletonLoaderModule,
    LucideAngularModule,
    ModalComponent,
  ],
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <h1 class="ts-title">Gestión de usuarios</h1>
            <p class="ts-subtitle">Crea usuarios, asigna roles y controla el acceso a la plataforma.</p>
          </div>
          <div class="ts-chip h-fit">
            <lucide-icon name="Users" class="h-4 w-4 text-accent" strokeWidth="1.75"></lucide-icon>
            {{ users().length }} visibles
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="ts-btn ts-btn--positive gap-2"
            (click)="toggleCreateCard()"
          >
            <lucide-icon name="UserPlus" class="h-4 w-4" strokeWidth="1.75"></lucide-icon>
            <span>{{ showCreateCard ? 'Cerrar creación' : 'Crear usuario' }}</span>
          </button>
          <button
            type="button"
            class="ts-btn ts-btn--ghost gap-2"
            (click)="toggleFiltersCard()"
          >
            <lucide-icon name="SlidersHorizontal" class="h-4 w-4" strokeWidth="1.75"></lucide-icon>
            <span>Filtros</span>
          </button>
        </div>

        <div class="space-y-6">
          <div *ngIf="showCreateCard" class="ts-card space-y-5">
            <div class="flex items-center gap-3">
              <lucide-icon name="UserPlus" class="h-5 w-5 text-accent" strokeWidth="1.75"></lucide-icon>
              <div>
                <h2 class="text-lg font-semibold text-ink">Crear usuario</h2>
                <p class="text-sm text-neutral-400">Proporciona las credenciales iniciales y asigna el rol adecuado.</p>
              </div>
            </div>

            <div class="space-y-4">
              <label class="block space-y-2">
                <span class="ts-label">Nombre</span>
                <input class="ts-input" [(ngModel)]="form.nombre" placeholder="Nombre completo" />
              </label>

              <label class="block space-y-2">
                <span class="ts-label">Email</span>
                <div
                  class="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 transition-all duration-120 ease-smooth focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
                >
                  <lucide-icon name="Mail" class="h-4 w-4 text-neutral-400" strokeWidth="1.75"></lucide-icon>
                  <input
                    class="flex-1 border-none bg-transparent p-0 text-base text-ink placeholder:text-neutral-300 focus:outline-none"
                    [(ngModel)]="form.email"
                    placeholder="email@dominio.com"
                  />
                </div>
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="ts-label">Contraseña temporal</span>
                  <input
                    class="ts-input"
                    [(ngModel)]="form.password"
                    placeholder="Mínimo 10 caracteres"
                    type="password"
                    minlength="10"
                  />
                </label>
                <label class="block space-y-2">
                  <span class="ts-label">Rol</span>
                  <select class="ts-select" [(ngModel)]="form.rol">
                    <option *ngFor="let r of roles" [ngValue]="r">{{ r }}</option>
                  </select>
                </label>
              </div>

              <label class="block space-y-2">
                <span class="ts-label">Empresa</span>
                <select class="ts-select" [(ngModel)]="form.empresa_id">
                  <option [ngValue]="null">Sin empresa</option>
                  <option *ngFor="let e of empresas()" [ngValue]="e.id">{{ e.nombre }}</option>
                </select>
              </label>
            </div>

            <button
              class="ts-btn ts-btn--positive w-full md:w-auto"
              (click)="createUser()"
              [disabled]="creatingUser || !isValidForm()"
            >
              <lucide-icon
                *ngIf="!creatingUser"
                name="ShieldCheck"
                class="h-4 w-4"
                strokeWidth="1.75"
              ></lucide-icon>
              <lucide-icon
                *ngIf="creatingUser"
                name="Loader2"
                class="h-4 w-4 animate-spin"
                strokeWidth="1.75"
              ></lucide-icon>
              <span>{{ creatingUser ? 'Creando...' : 'Crear usuario' }}</span>
            </button>
          </div>

          <div *ngIf="showFiltersCard" class="ts-card space-y-4">
            <div class="flex items-center gap-3">
              <lucide-icon name="Building2" class="h-5 w-5 text-accent" strokeWidth="1.75"></lucide-icon>
              <div>
                <h2 class="text-lg font-semibold text-ink">Filtrar por empresa</h2>
                <p class="text-sm text-neutral-400">Muestra solo los usuarios de una organización específica.</p>
              </div>
            </div>

            <label class="block space-y-2">
              <span class="ts-label">Empresa</span>
              <select
                class="ts-select"
                [(ngModel)]="selectedEmpresaId"
                (change)="loadUsers()"
                [disabled]="loadingCompanies"
              >
                <option [ngValue]="null">Todas las empresas</option>
                <option *ngFor="let e of empresas()" [ngValue]="e.id">{{ e.nombre }}</option>
              </select>
            </label>

            <ngx-skeleton-loader
              *ngIf="loadingCompanies"
              count="3"
              [theme]="{ height: '16px', marginBottom: '12px', borderRadius: '6px' }"
            ></ngx-skeleton-loader>
          </div>

          <div class="ts-card space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-ink">Usuarios</h2>
                <p class="text-sm text-neutral-400">Actualiza roles, estados o elimina accesos en cualquier momento.</p>
              </div>
            </div>

            <ng-container *ngIf="loadingUsers">
              <ngx-skeleton-loader
                count="6"
                [theme]="{ height: '48px', marginBottom: '10px', borderRadius: '10px' }"
              ></ngx-skeleton-loader>
            </ng-container>

            <ng-container *ngIf="!loadingUsers && users().length; else emptyUsers">
              <div class="overflow-x-auto">
                <table class="ts-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Empresa</th>
                      <th>Estado</th>
                      <th class="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let u of users()">
                      <td>
                        <div class="font-semibold text-ink">{{ u.nombre }}</div>
                        <div class="text-xs uppercase tracking-[0.08em] text-neutral-400">ID: {{ u.id }}</div>
                      </td>
                      <td class="text-sm text-neutral-500">{{ u.email }}</td>
                      <td>
                        <select
                          class="ts-select"
                          [ngModel]="u.rol"
                          (ngModelChange)="onRoleChange(u, $event)"
                          [disabled]="updatingRoleId === u.id || (!isAdminSistema && u.rol === 'ADMIN_SISTEMA')"
                        >
                          <option
                            *ngFor="let r of roles"
                            [ngValue]="r"
                            [disabled]="!isAdminSistema && r === 'ADMIN_SISTEMA' && u.rol !== 'ADMIN_SISTEMA'"
                          >
                            {{ r }}
                          </option>
                        </select>
                      </td>
                      <td>{{ empresaName(u.empresa_id) }}</td>
                      <td>
                        <button
                          type="button"
                          class="ts-chip inline-flex items-center justify-center gap-2 w-[110px] px-3 py-1.5 text-sm"
                          [class.bg-success/10]="u.activo"
                          [class.bg-error/10]="!u.activo"
                          (click)="toggleActive(u)"
                          [disabled]="togglingActiveId === u.id || u.rol === 'ADMIN_SISTEMA'"
                        >
                          <lucide-icon
                            *ngIf="togglingActiveId !== u.id"
                            [name]="u.activo ? 'Check' : 'Slash'"
                            class="h-4 w-4 flex-shrink-0"
                            strokeWidth="1.75"
                          ></lucide-icon>
                          <lucide-icon
                            *ngIf="togglingActiveId === u.id"
                            name="Loader2"
                            class="h-4 w-4 flex-shrink-0 animate-spin"
                            strokeWidth="1.75"
                          ></lucide-icon>
                          <span class="text-sm font-medium">{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
                        </button>
                      </td>
                      <td>
                        <div class="flex flex-wrap gap-2 justify-end">
                          <button
                            class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink"
                            (click)="resetPassword(u)"
                            type="button"
                            [disabled]="resettingId === u.id || passwordDialogBusy"
                          >
                            <lucide-icon
                              *ngIf="resettingId !== u.id"
                              name="KeyRound"
                              class="h-4 w-4"
                              strokeWidth="1.75"
                            ></lucide-icon>
                            <lucide-icon
                              *ngIf="resettingId === u.id"
                              name="Loader2"
                              class="h-4 w-4 animate-spin"
                              strokeWidth="1.75"
                            ></lucide-icon>
                            <span>Cambiar contraseña</span>
                          </button>
                          <button
                            class="ts-btn ts-btn--danger"
                            (click)="deleteUser(u)"
                            [disabled]="deletingId === u.id || u.rol === 'ADMIN_SISTEMA'"
                          >
                            <lucide-icon
                              *ngIf="deletingId !== u.id"
                              name="Trash2"
                              class="h-4 w-4"
                              strokeWidth="1.75"
                            ></lucide-icon>
                            <lucide-icon
                              *ngIf="deletingId === u.id"
                              name="Loader2"
                              class="h-4 w-4 animate-spin"
                              strokeWidth="1.75"
                            ></lucide-icon>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>

            <ng-template #emptyUsers>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-center">
                <p class="text-sm text-neutral-400">
                  {{ selectedEmpresaId ? 'No hay usuarios en esta empresa.' : 'Crea tu primer usuario para comenzar.' }}
                </p>
              </div>
            </ng-template>
          </div>

          <div *ngIf="isAdminSistema" class="ts-card space-y-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <lucide-icon name="BellRing" class="h-5 w-5 text-accent" strokeWidth="1.75"></lucide-icon>
              <div>
                <h2 class="text-lg font-semibold text-ink">Solicitudes de cambio de contraseña</h2>
                <p class="text-sm text-neutral-400">
                  Atiende las solicitudes enviadas desde la pantalla de recuperación.
                </p>
              </div>
            </div>
          </div>

            <ng-container *ngIf="passwordRequests().length; else noRequests">
              <div class="overflow-x-auto">
                <table class="ts-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Email</th>
                      <th>Empresa</th>
                      <th>Solicitada</th>
                      <th class="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let req of passwordRequests()">
                      <td>
                        <div class="font-semibold text-ink">{{ req.user?.nombre ?? req.user_nombre }}</div>
                        <div class="text-xs uppercase tracking-wide text-neutral-400">
                          {{ req.user?.rol ?? 'PENDIENTE' }}
                        </div>
                      </td>
                      <td class="text-sm text-neutral-500">{{ req.user?.email ?? req.user_email }}</td>
                      <td>{{ empresaName(req.user?.empresa_id ?? req.empresa_id ?? null) }}</td>
                      <td class="text-sm text-neutral-500">{{ req.created_at | date: 'short' }}</td>
                      <td class="text-right">
                        <button
                          class="ts-btn ts-btn--positive"
                          (click)="handlePasswordRequest(req)"
                          type="button"
                          [disabled]="resolvingRequestId === req.id || passwordDialogBusy"
                        >
                          <lucide-icon
                            *ngIf="resolvingRequestId !== req.id"
                            name="KeyRound"
                            class="h-4 w-4"
                            strokeWidth="1.75"
                          ></lucide-icon>
                          <lucide-icon
                            *ngIf="resolvingRequestId === req.id"
                            name="Loader2"
                            class="h-4 w-4 animate-spin"
                            strokeWidth="1.75"
                          ></lucide-icon>
                          <span>Atender</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>
          </div>

          <ng-template #noRequests>
            <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-center">
              <p class="text-sm text-neutral-400">
                {{
                  loadingPasswordRequests
                    ? 'Cargando solicitudes pendientes...'
                    : 'No hay solicitudes pendientes en este momento.'
                }}
              </p>
            </div>
          </ng-template>
        </div>
      </div>
      <ts-modal
        [title]="passwordDialog.mode === 'request' ? 'Atender cambio de contraseña' : 'Cambiar contraseña'"
        [open]="passwordDialog.open"
        (close)="closePasswordDialog()"
      >
        <div class="space-y-4">
          <p class="text-sm text-neutral-500">
            {{
              passwordDialog.mode === 'request'
                ? 'Ingresa la nueva contraseña que se enviará al usuario que solicitó el cambio.'
                : 'Define una nueva contraseña temporal para el usuario seleccionado.'
            }}
          </p>
          <div
            *ngIf="passwordDialogMessage"
            class="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600"
          >
            {{ passwordDialogMessage }}
          </div>
          <label class="block space-y-2">
            <span class="ts-label">Nueva contraseña</span>
            <input
              type="password"
              class="ts-input"
              minlength="10"
              [(ngModel)]="passwordDialog.value"
              placeholder="Mínimo 10 caracteres"
            />
          </label>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="closePasswordDialog()"
              [disabled]="passwordDialogBusy"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--positive"
              (click)="confirmPasswordDialog()"
              [disabled]="
                passwordDialogBusy || passwordDialog.value.trim().length < passwordMinLength
              "
            >
              {{ passwordDialogBusy ? 'Guardando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </ts-modal>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private companies = inject(CompanyService);
  private usersApi = inject(UserService);
  private auth = inject(AuthService);

  empresas: WritableSignal<Empresa[]> = signal<Empresa[]>([]);
  users: WritableSignal<Usuario[]> = signal<Usuario[]>([]);
  passwordRequests: WritableSignal<PasswordChangeRequest[]> = signal<PasswordChangeRequest[]>([]);
  selectedEmpresaId: number | null = null;

  roles: RolEnum[] = ['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA', 'USUARIO'];

  loadingCompanies = true;
  loadingUsers = true;
  loadingPasswordRequests = false;
  creatingUser = false;
  updatingRoleId: number | null = null;
  togglingActiveId: number | null = null;
  resettingId: number | null = null;
  deletingId: number | null = null;
  resolvingRequestId: number | null = null;
  isAdminSistema = this.auth.hasRole('ADMIN_SISTEMA');
  showCreateCard = false;
  showFiltersCard = false;
  readonly passwordMinLength = 10;
  passwordDialog: PasswordDialogState = {
    open: false,
    mode: 'user',
    user: null,
    request: null,
    value: '',
  };
  passwordDialogMessage = '';
  passwordDialogBusy = false;

  form: UsuarioCreate = {
    nombre: '',
    email: '',
    password: '',
    rol: 'USUARIO',
    empresa_id: null,
  };

  ngOnInit(): void {
    this.loadCompanies();
    this.loadUsers();
    this.initializeAdminData();
  }

  toggleCreateCard(): void {
    this.showCreateCard = !this.showCreateCard;
  }

  toggleFiltersCard(): void {
    this.showFiltersCard = !this.showFiltersCard;
  }

  private initializeAdminData(): void {
    this.auth
      .ensureMe()
      .pipe(
        finalize(() => {
          this.isAdminSistema = this.auth.hasRole('ADMIN_SISTEMA');
          if (this.isAdminSistema) {
            this.loadPasswordRequests();
          } else {
            this.passwordRequests.set([]);
          }
        })
      )
      .subscribe({
        error: (error) => console.warn('No fue posible refrescar /me', error),
      });
  }

  private loadCompanies(): void {
    this.loadingCompanies = true;
    this.companies.list().subscribe({
      next: (rows) => this.empresas.set(rows ?? []),
      error: (error) => console.error('Error cargando empresas', error),
      complete: () => (this.loadingCompanies = false),
    });
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.usersApi
      .list(this.selectedEmpresaId ?? undefined)
      .pipe(finalize(() => (this.loadingUsers = false)))
      .subscribe({
        next: (rows) => this.users.set(rows ?? []),
        error: (error) => console.error('Error cargando usuarios', error),
      });
  }

  loadPasswordRequests(): void {
    if (!this.isAdminSistema) {
      return;
    }
    this.loadingPasswordRequests = true;
    this.usersApi
      .listPasswordChangeRequests()
      .pipe(finalize(() => (this.loadingPasswordRequests = false)))
      .subscribe({
        next: (rows) => {
          this.passwordRequests.set(rows ?? []);
        },
        error: (error) => {
          console.error('Error cargando solicitudes de contraseña', error);
        },
      });
  }

  isValidForm(): boolean {
    const f = this.form;
    const pwd = f.password?.trim() ?? '';
    return Boolean(f.nombre.trim() && f.email.trim() && pwd.length >= 10);
  }

  createUser(): void {
    if (!this.isValidForm() || this.creatingUser) return;
    this.creatingUser = true;

    this.usersApi.create(this.form).subscribe({
      next: () => {
        this.form = { nombre: '', email: '', password: '', rol: 'USUARIO', empresa_id: null };
        this.showCreateCard = false;
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error creando usuario', error);
        this.creatingUser = false;
      },
      complete: () => (this.creatingUser = false),
    });
  }

  onRoleChange(u: Usuario, nextRole: RolEnum): void {
    const previousRole = u.rol;
    if (nextRole === previousRole) {
      return;
    }
    if (!this.isAdminSistema) {
      if (nextRole === 'ADMIN_SISTEMA' && previousRole !== 'ADMIN_SISTEMA') {
        return;
      }
      if (previousRole === 'ADMIN_SISTEMA' && nextRole !== 'ADMIN_SISTEMA') {
        return;
      }
    }
    u.rol = nextRole;
    this.changeRole(u, nextRole, previousRole);
  }

  changeRole(u: Usuario, rol: RolEnum, previousRole?: RolEnum): void {
    if (this.updatingRoleId) {
      if (previousRole && u.rol !== previousRole) {
        u.rol = previousRole;
      }
      return;
    }
    if (!this.isAdminSistema) {
      if (rol === 'ADMIN_SISTEMA' && previousRole !== 'ADMIN_SISTEMA') {
        if (previousRole) {
          u.rol = previousRole;
        }
        return;
      }
      if (previousRole === 'ADMIN_SISTEMA' && rol !== 'ADMIN_SISTEMA') {
        if (previousRole) {
          u.rol = previousRole;
        }
        return;
      }
    }
    this.updatingRoleId = u.id;
    this.usersApi.update(u.id, { rol }).subscribe({
      next: (updated) => {
        this.users.set(this.users().map((x) => (x.id === u.id ? updated : x)));
      },
      error: (error) => {
        console.error('Error actualizando rol', error);
        if (previousRole) {
          u.rol = previousRole;
        }
        this.updatingRoleId = null;
      },
      complete: () => {
        this.updatingRoleId = null;
      },
    });
  }


  toggleActive(u: Usuario): void {
    if (u.rol === 'ADMIN_SISTEMA' || this.togglingActiveId) return;
    this.togglingActiveId = u.id;
    this.usersApi.toggleActive(u).subscribe({
      next: (updated) => {
        this.users.set(this.users().map((x) => (x.id === u.id ? updated : x)));
      },
      error: (error) => {
        console.error('Error cambiando estado', error);
        this.togglingActiveId = null;
      },
      complete: () => {
        this.togglingActiveId = null;
      },
    });
  }

  resetPassword(u: Usuario): void {
    if (this.passwordDialogBusy) {
      return;
    }
    this.passwordDialog = {
      open: true,
      mode: 'user',
      user: u,
      request: null,
      value: '',
    };
    this.passwordDialogMessage = `Se enviará una nueva contraseña temporal a ${u.email}.`;
  }

  handlePasswordRequest(req: PasswordChangeRequest): void {
    if (!this.isAdminSistema || this.passwordDialogBusy) {
      return;
    }
    const targetEmail = req.user?.email ?? req.user_email;
    this.passwordDialog = {
      open: true,
      mode: 'request',
      user: req.user ?? null,
      request: req,
      value: '',
    };
    this.passwordDialogMessage = `Solicitud #${req.id} para ${targetEmail}.`;
  }

  closePasswordDialog(force = false): void {
    if (this.passwordDialogBusy && !force) {
      return;
    }
    this.passwordDialog = {
      open: false,
      mode: 'user',
      user: null,
      request: null,
      value: '',
    };
    this.passwordDialogMessage = '';
  }

  confirmPasswordDialog(): void {
    const password = this.passwordDialog.value.trim();
    if (this.passwordDialogBusy || password.length < this.passwordMinLength) {
      return;
    }
    this.passwordDialogBusy = true;

    if (this.passwordDialog.mode === 'user' && this.passwordDialog.user) {
      const userId = this.passwordDialog.user.id;
      this.resettingId = userId;
      this.usersApi
        .setPassword(userId, password)
        .pipe(
          finalize(() => {
            if (this.resettingId === userId) {
              this.resettingId = null;
            }
            this.passwordDialogBusy = false;
          })
        )
        .subscribe({
          next: () => {
            this.closePasswordDialog(true);
          },
          error: (error) => {
            console.error('Error reseteando contraseña', error);
          },
        });
      return;
    }

    if (this.passwordDialog.mode === 'request' && this.passwordDialog.request) {
      const requestId = this.passwordDialog.request.id;
      const userId = this.passwordDialog.request.user_id;
      this.resolvingRequestId = requestId;
      this.usersApi
        .setPassword(userId, password, requestId)
        .pipe(
          finalize(() => {
            if (this.resolvingRequestId === requestId) {
              this.resolvingRequestId = null;
            }
            this.passwordDialogBusy = false;
          })
        )
        .subscribe({
          next: () => {
            this.closePasswordDialog(true);
            this.loadPasswordRequests();
          },
          error: (error) => {
            console.error('Error completando solicitud de contraseña', error);
          },
        });
      return;
    }

    this.passwordDialogBusy = false;
  }

  deleteUser(u: Usuario): void {
    if (u.rol === 'ADMIN_SISTEMA') return;
    if (!confirm(`Â¿Eliminar usuario ${u.email}?`)) return;
    this.deletingId = u.id;
    this.usersApi.delete(u.id).subscribe({
      next: () => this.loadUsers(),
      error: (error) => {
        console.error('Error eliminando usuario', error);
        this.deletingId = null;
      },
      complete: () => {
        this.deletingId = null;
      },
    });
  }

  empresaName(id: number | null | undefined): string {
    if (id == null) return 'Sin asignar';
    const e = this.empresas().find((x) => x.id === id);
    return e?.nombre ?? `#${id}`;
  }
}

