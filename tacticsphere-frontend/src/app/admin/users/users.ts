import { Component, OnInit, OnDestroy, HostListener, WritableSignal, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { finalize } from 'rxjs/operators';

import { CompanyService } from '../../company.service';
import { UserService } from '../../user.service';
import { AuthService } from '../../auth.service';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

import { Empresa, RolEnum, Usuario, UsuarioCreate, UsuarioUpdate, PasswordChangeRequest } from '../../types';

type PasswordDialogMode = 'user' | 'request';

interface PasswordDialogState {
  open: boolean;
  mode: PasswordDialogMode;
  user: Usuario | null;
  request: PasswordChangeRequest | null;
  value: string;
}

interface EditDialogState {
  open: boolean;
  user: Usuario | null;
  type: 'company' | 'role' | 'email' | null;
  value: number | string | null; // empresa_id (number) | rol (string) | email (string)
  busy: boolean;
}

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [
    CommonModule,
    FormsModule,
    NgxSkeletonLoaderModule,
    ModalComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ts-page">
      <div class="ts-container space-y-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <h1 class="ts-title">Gestión de usuarios</h1>
            <p class="ts-subtitle">Crea usuarios, asigna roles y controla el acceso a la plataforma.</p>
          </div>
          <div class="ts-chip h-fit">
            <app-icon name="users" size="16" class="h-4 w-4 text-accent" strokeWidth="1.75"></app-icon>
            {{ users().length }} visibles
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="ts-btn ts-btn--positive gap-2"
            (click)="toggleCreateCard()"
          >
            <app-icon name="user-plus" size="16" class="h-4 w-4" strokeWidth="1.75"></app-icon>
            <span>{{ showCreateCard ? 'Cerrar creación' : 'Crear usuario' }}</span>
          </button>
          <button
            type="button"
            class="ts-btn ts-btn--ghost gap-2"
            (click)="toggleFiltersCard()"
          >
            <app-icon name="sliders-horizontal" size="16" class="h-4 w-4" strokeWidth="1.75"></app-icon>
            <span>Filtros</span>
          </button>
        </div>

        <div class="space-y-6">
          <div *ngIf="showCreateCard" class="ts-card space-y-5">
            <div class="flex items-center gap-3">
              <app-icon name="user-plus" size="20" class="h-5 w-5 text-accent" strokeWidth="1.75"></app-icon>
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
                  <app-icon name="mail" size="16" class="h-4 w-4 text-neutral-400" strokeWidth="1.75"></app-icon>
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
                    <option *ngFor="let r of roles" [ngValue]="r">{{ formatRoleForSelect(r) }}</option>
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
              <app-icon
                *ngIf="!creatingUser"
                name="shield"
                size="16"
                class="h-4 w-4"
                strokeWidth="1.75"
              ></app-icon>
              <app-icon
                *ngIf="creatingUser"
                name="loader2"
                size="16"
                class="h-4 w-4 animate-spin"
                strokeWidth="1.75"
              ></app-icon>
              <span>{{ creatingUser ? 'Creando...' : 'Crear usuario' }}</span>
            </button>
          </div>

          <div *ngIf="showFiltersCard" class="ts-card space-y-4">
            <div class="flex items-center gap-3">
              <app-icon name="building2" size="20" class="h-5 w-5 text-accent" strokeWidth="1.75"></app-icon>
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

            <ng-container *ngIf="loadingUsers(); else usersTable">
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
                    <tr *ngFor="let i of [1,2,3,4,5]" class="users-skeleton-row">
                      <td><div class="skeleton h-4 w-32"></div></td>
                      <td><div class="skeleton h-4 w-40"></div></td>
                      <td><div class="skeleton h-8 w-24"></div></td>
                      <td><div class="skeleton h-4 w-28"></div></td>
                      <td><div class="skeleton h-6 w-24"></div></td>
                      <td><div class="skeleton h-8 w-8 ml-auto"></div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>

            <ng-template #usersTable>
              <ng-container *ngIf="users().length; else emptyUsers">
                <!-- Contenedor de tabla: overflow solo horizontal, sin afectar el menú flotante -->
                <div class="overflow-x-auto overflow-y-visible">
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
                      <tr *ngFor="let u of users(); trackBy: trackByUserId">
                        <td>
                          <div class="font-semibold text-ink">{{ u.nombre }}</div>
                          <div class="text-xs uppercase tracking-[0.08em] text-neutral-400">ID: {{ u.id }}</div>
                        </td>
                        <td class="text-sm text-neutral-500">{{ u.email }}</td>
                        <td>
                          <span class="ts-chip inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium">
                            {{ formatRoleLabel(u.rol) }}
                          </span>
                        </td>
                        <td>{{ empresaName(u.empresa_id) }}</td>
                        <td>
                          <button
                            type="button"
                            class="ts-chip inline-flex items-center justify-center gap-1.5 w-[110px] px-2.5 py-1 text-xs"
                            [class.bg-success/10]="u.activo"
                            [class.bg-error/10]="!u.activo"
                            (click)="toggleActive(u)"
                            [disabled]="togglingActiveId === u.id || u.rol === 'ADMIN_SISTEMA'"
                          >
                            <app-icon
                              *ngIf="togglingActiveId !== u.id"
                              [name]="u.activo ? 'check' : 'slash'"
                              size="16"
                              class="h-4 w-4 flex-shrink-0"
                              strokeWidth="1.75"
                            ></app-icon>
                            <app-icon
                              *ngIf="togglingActiveId === u.id"
                              name="loader2"
                              size="16"
                              class="h-4 w-4 flex-shrink-0 animate-spin"
                              strokeWidth="1.75"
                            ></app-icon>
                            <span class="text-xs font-medium">{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
                          </button>
                        </td>
                        <td>
                          <!-- Menú de acciones: overlay flotante que no afecta el layout -->
                          <div class="flex justify-end">
                            <button
                              type="button"
                              #menuButton
                              class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink p-2 user-actions-button"
                              (click)="toggleUserMenu(u.id, menuButton); $event.stopPropagation()"
                              [disabled]="resettingId === u.id || deletingId === u.id || passwordDialogBusy"
                              aria-label="Acciones del usuario"
                            >
                              <app-icon
                                *ngIf="resettingId !== u.id && deletingId !== u.id"
                                name="settings"
                                size="16"
                                class="h-4 w-4"
                                strokeWidth="1.75"
                              ></app-icon>
                              <app-icon
                                *ngIf="resettingId === u.id || deletingId === u.id"
                                name="loader2"
                                size="16"
                                class="h-4 w-4 animate-spin"
                                strokeWidth="1.75"
                              ></app-icon>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ng-container>
            </ng-template>

            <ng-template #loadingTable>
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
                    <tr *ngFor="let i of [1,2,3,4,5]" class="users-skeleton-row">
                      <td><div class="skeleton h-4 w-32"></div></td>
                      <td><div class="skeleton h-4 w-40"></div></td>
                      <td><div class="skeleton h-4 w-24"></div></td>
                      <td><div class="skeleton h-4 w-28"></div></td>
                      <td><div class="skeleton h-6 w-20"></div></td>
                      <td><div class="skeleton h-8 w-8 ml-auto"></div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-template>

            <ng-template #emptyUsers>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-center">
                <p class="text-sm text-neutral-400">
                  {{ selectedEmpresaId ? 'No hay usuarios en esta empresa.' : 'Crea tu primer usuario para comenzar.' }}
                </p>
              </div>
            </ng-template>
          </div>

          <div *ngIf="isAdminSistema" class="ts-card space-y-4" id="solicitudes-password">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <app-icon name="bell-ring" size="20" class="h-5 w-5 text-accent" strokeWidth="1.75"></app-icon>
              <div>
                <h2 class="text-lg font-semibold text-ink">Solicitudes de cambio de contraseña</h2>
                <p class="text-sm text-neutral-400">
                  Atiende las solicitudes enviadas desde la pantalla de recuperación.
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="ts-btn ts-btn--secondary text-xs sm:text-sm"
                (click)="loadPasswordRequests()"
                [disabled]="loadingPasswordRequests"
              >
                <app-icon
                  *ngIf="!loadingPasswordRequests"
                  name="refresh-ccw"
                  size="16"
                  class="h-4 w-4"
                  strokeWidth="1.75"
                ></app-icon>
                <app-icon
                  *ngIf="loadingPasswordRequests"
                  name="loader2"
                  size="16"
                  class="h-4 w-4 animate-spin"
                  strokeWidth="1.75"
                ></app-icon>
                <span>{{ loadingPasswordRequests ? 'Recargando...' : 'Recargar' }}</span>
              </button>
              <button
                type="button"
                class="ts-btn ts-btn--secondary text-xs sm:text-sm"
                (click)="openClearPasswordRequestsDialog()"
                [disabled]="loadingPasswordRequests || !passwordRequests().length || clearingPasswordRequests"
              >
                Limpiar solicitudes
              </button>
              <div class="ts-chip">
                <app-icon name="bell-ring" size="16" class="h-4 w-4 text-ink" strokeWidth="1.75"></app-icon>
                {{ passwordRequests().length }} solicitudes
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
                          <app-icon
                            *ngIf="resolvingRequestId !== req.id"
                            name="key-round"
                            size="16"
                            class="h-4 w-4"
                            strokeWidth="1.75"
                          ></app-icon>
                          <app-icon
                            *ngIf="resolvingRequestId === req.id"
                            name="loader2"
                            size="16"
                            class="h-4 w-4 animate-spin"
                            strokeWidth="1.75"
                          ></app-icon>
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

      <ts-modal [title]="getEditDialogTitle()" [open]="editDialog.open" (close)="closeEditDialog()">
        <div class="space-y-4">
          <p *ngIf="editDialogMessage" class="text-sm text-neutral-500">{{ editDialogMessage }}</p>

          <!-- Diálogo para cambiar empresa -->
          <div *ngIf="editDialog.type === 'company'">
            <label class="block space-y-2">
              <span class="ts-label">Empresa</span>
              <select
                class="ts-select"
                [ngModel]="editDialog.value"
                (ngModelChange)="editDialog.value = $event"
                [disabled]="editDialog.busy"
              >
                <option [ngValue]="null">Sin asignar</option>
                <option *ngFor="let empresa of empresas()" [ngValue]="empresa.id">
                  {{ empresa.nombre }}
                </option>
              </select>
            </label>
          </div>

          <!-- Diálogo para cambiar rol -->
          <div *ngIf="editDialog.type === 'role'">
            <label class="block space-y-2">
              <span class="ts-label">Rol</span>
              <select
                class="ts-select"
                [ngModel]="editDialog.value"
                (ngModelChange)="editDialog.value = $event"
                [disabled]="editDialog.busy || (updatingRoleId === editDialog.user?.id)"
              >
                <option
                  *ngFor="let r of roles"
                  [ngValue]="r"
                  [disabled]="
                    !isAdminSistema && r === 'ADMIN_SISTEMA' && editDialog.user?.rol !== 'ADMIN_SISTEMA'
                  "
                >
                  {{ formatRoleForSelect(r) }}
                </option>
              </select>
            </label>
            <p class="text-xs text-muted">
              * Solo usuarios ADMIN_SISTEMA pueden asignar el rol ADMIN_SISTEMA
            </p>
          </div>

          <!-- Diálogo para cambiar correo -->
          <div *ngIf="editDialog.type === 'email'">
            <label class="block space-y-2">
              <span class="ts-label">Correo electrónico</span>
              <input
                type="email"
                class="ts-input"
                [(ngModel)]="editDialog.value"
                [disabled]="editDialog.busy"
                placeholder="usuario@ejemplo.com"
              />
            </label>
          </div>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="closeEditDialog()"
              [disabled]="editDialog.busy"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--positive"
              (click)="confirmEditDialog()"
              [disabled]="editDialog.busy"
            >
              {{ editDialog.busy ? 'Guardando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </ts-modal>

      <!-- Modal de confirmación para eliminar usuario -->
      <ts-modal
        title="Eliminar usuario"
        [open]="deleteConfirmDialog.open"
        (close)="closeDeleteConfirmDialog()"
      >
        <div class="space-y-4">
          <p class="text-sm text-neutral-500">
            ¿Seguro que deseas eliminar al usuario <strong>{{ deleteConfirmDialog.user?.email }}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="closeDeleteConfirmDialog()"
              [disabled]="deletingId === deleteConfirmDialog.user?.id"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--danger"
              (click)="confirmDeleteUser()"
              [disabled]="deletingId === deleteConfirmDialog.user?.id || !deleteConfirmDialog.user"
            >
              <app-icon
                *ngIf="deletingId !== deleteConfirmDialog.user?.id"
                name="trash2"
                size="16"
                class="h-4 w-4"
                strokeWidth="1.75"
              ></app-icon>
              <app-icon
                *ngIf="deletingId === deleteConfirmDialog.user?.id"
                name="loader2"
                size="16"
                class="h-4 w-4 animate-spin"
                strokeWidth="1.75"
              ></app-icon>
              <span>{{ deletingId === deleteConfirmDialog.user?.id ? 'Eliminando...' : 'Eliminar usuario' }}</span>
            </button>
          </div>
        </div>
      </ts-modal>

      <!-- Dropdown overlay flotante: renderizado fuera del flujo de la tabla para evitar afectar el layout -->
      <div
        *ngIf="openMenuUserId !== null && menuPosition"
        class="user-actions-dropdown"
        [style.top.px]="menuPosition.top"
        [style.right.px]="menuPosition.right"
        [class.user-actions-dropdown--top]="menuPosition.openUp"
        (click)="$event.stopPropagation()"
      >
        <ng-container *ngFor="let action of getMenuActions(openMenuUserId); let isLast = last">
          <button
            *ngIf="action.type !== 'delete'"
            type="button"
            [class]="action.class"
            (click)="handleMenuAction(getUserById(openMenuUserId)!, action.type)"
            [disabled]="action.disabled"
          >
            <app-icon [name]="$any(action.icon)" size="16" class="h-4 w-4 text-muted" strokeWidth="1.75"></app-icon>
            <span>{{ action.label }}</span>
          </button>
          <div *ngIf="action.type === 'delete'" class="my-1 border-t border-border"></div>
          <button
            *ngIf="action.type === 'delete'"
            type="button"
            [class]="action.class"
            (click)="handleMenuAction(getUserById(openMenuUserId)!, action.type)"
            [disabled]="action.disabled"
          >
            <app-icon [name]="$any(action.icon)" size="16" class="h-4 w-4" strokeWidth="1.75"></app-icon>
            <span>{{ action.label }}</span>
          </button>
        </ng-container>
      </div>

      <!-- Modal de confirmación para limpiar solicitudes de contraseña -->
      <ts-modal
        title="Limpiar solicitudes de cambio de contraseña"
        [open]="clearPasswordRequestsDialog.open"
        (close)="closeClearPasswordRequestsDialog()"
      >
        <div class="space-y-4">
          <p class="text-sm text-neutral-500">
            ¿Estás seguro de que deseas eliminar todas las solicitudes de cambio de contraseña pendientes?
            Esta acción no se puede deshacer.
          </p>
          <p class="text-sm font-medium text-ink">
            Se eliminarán <strong>{{ passwordRequests().length }}</strong> solicitud{{ passwordRequests().length !== 1 ? 'es' : '' }} pendiente{{ passwordRequests().length !== 1 ? 's' : '' }}.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="ts-btn ts-btn--secondary"
              (click)="closeClearPasswordRequestsDialog()"
              [disabled]="clearPasswordRequestsDialog.busy"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ts-btn ts-btn--danger"
              (click)="confirmClearPasswordRequests()"
              [disabled]="clearPasswordRequestsDialog.busy"
            >
              <app-icon
                *ngIf="!clearPasswordRequestsDialog.busy"
                name="trash2"
                size="16"
                class="h-4 w-4"
                strokeWidth="1.75"
              ></app-icon>
              <app-icon
                *ngIf="clearPasswordRequestsDialog.busy"
                name="loader2"
                size="16"
                class="h-4 w-4 animate-spin"
                strokeWidth="1.75"
              ></app-icon>
              <span>{{ clearPasswordRequestsDialog.busy ? 'Limpiando...' : 'Limpiar solicitudes' }}</span>
            </button>
          </div>
        </div>
      </ts-modal>
    </div>
  `,
})
export class UsersComponent implements OnInit, OnDestroy {
  private companies = inject(CompanyService);
  private usersApi = inject(UserService);
  private auth = inject(AuthService);
  private notificationCenter = inject(NotificationCenterService);
  private cdr = inject(ChangeDetectorRef);

  empresas: WritableSignal<Empresa[]> = signal<Empresa[]>([]);
  users: WritableSignal<Usuario[]> = signal<Usuario[]>([]);
  passwordRequests: WritableSignal<PasswordChangeRequest[]> = signal<PasswordChangeRequest[]>([]);
  selectedEmpresaId: number | null = null;

  roles: RolEnum[] = ['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA', 'USUARIO'];

  loadingCompanies = true;
  loadingUsers = signal(true);
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
  openMenuUserId: number | null = null;
  menuPosition: { top: number; right: number; openUp?: boolean } | null = null;
  private documentClickHandler?: (event: MouseEvent) => void;
  private scrollHandler?: () => void;
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

  editDialog: EditDialogState = {
    open: false,
    user: null,
    type: null,
    value: null,
    busy: false,
  };
  editDialogMessage = '';
  updatingUserId: number | null = null;

  // =========================================================
  // MODAL DE CONFIRMACIÓN PARA ELIMINAR USUARIO
  // =========================================================
  deleteConfirmDialog = {
    open: false,
    user: null as Usuario | null,
  };

  // Modal de confirmación para limpiar solicitudes de contraseña
  clearPasswordRequestsDialog = {
    open: false,
    busy: false,
  };
  clearingPasswordRequests = false;

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
    // Cerrar menú al hacer clic fuera o al hacer scroll
    if (typeof document !== 'undefined') {
      this.documentClickHandler = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        // Cerrar si el clic no está dentro del botón ni del dropdown
        if (!target.closest('.user-actions-button') && !target.closest('.user-actions-dropdown')) {
          this.closeUserMenu();
        }
      };
      document.addEventListener('click', this.documentClickHandler);
      
      // Cerrar menú al hacer scroll
      this.scrollHandler = () => {
        this.closeUserMenu();
      };
      window.addEventListener('scroll', this.scrollHandler, true); // Use capture para capturar scrolls anidados
    }
  }

  ngOnDestroy(): void {
    // Remover listeners al destruir el componente
    if (typeof document !== 'undefined') {
      if (this.documentClickHandler) {
        document.removeEventListener('click', this.documentClickHandler);
      }
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler, true);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeUserMenu();
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
    this.loadingUsers.set(true);
    this.usersApi
      .list(this.selectedEmpresaId ?? undefined)
      .pipe(
        finalize(() => {
          this.loadingUsers.set(false);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (rows) => {
          this.users.set(rows ?? []);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error cargando usuarios', error);
          this.loadingUsers.set(false);
          this.cdr.markForCheck();
        },
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
          const requests = rows ?? [];
          
          this.passwordRequests.set(requests);
          // Actualizar contador en el servicio de notificaciones
          this.notificationCenter.setInitialPasswordRequestsCount(requests.length);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error cargando solicitudes de contraseña', error);
          this.cdr.markForCheck();
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
    this.cdr.markForCheck();

    this.usersApi.create(this.form).subscribe({
      next: () => {
        this.form = { nombre: '', email: '', password: '', rol: 'USUARIO', empresa_id: null };
        this.showCreateCard = false;
        this.loadUsers();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error creando usuario', error);
        this.creatingUser = false;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.creatingUser = false;
        this.cdr.markForCheck();
      },
    });
  }

  formatRoleLabel(rol: RolEnum): string {
    // Mapear ANALISTA a CONSULTOR para mostrar en la UI
    if (rol === 'ANALISTA') {
      return 'CONSULTOR';
    }
    return rol;
  }

  formatRoleForSelect(rol: RolEnum): string {
    // Mapear ANALISTA a CONSULTOR para mostrar en selects
    return this.formatRoleLabel(rol);
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
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error actualizando rol', error);
        if (previousRole) {
          u.rol = previousRole;
        }
        this.updatingRoleId = null;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.updatingRoleId = null;
        this.cdr.markForCheck();
      },
    });
  }


  toggleActive(u: Usuario): void {
    if (u.rol === 'ADMIN_SISTEMA' || this.togglingActiveId) return;
    this.togglingActiveId = u.id;
    this.usersApi.toggleActive(u).subscribe({
      next: (updated) => {
        this.users.set(this.users().map((x) => (x.id === u.id ? updated : x)));
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error cambiando estado', error);
        this.togglingActiveId = null;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.togglingActiveId = null;
        this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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
            this.cdr.markForCheck();
          })
        )
        .subscribe({
          next: () => {
            this.closePasswordDialog(true);
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error reseteando contraseña', error);
            this.cdr.markForCheck();
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
            this.cdr.markForCheck();
          })
        )
        .subscribe({
          next: () => {
            this.closePasswordDialog(true);
            // Recargar solicitudes y actualizar contador
            this.loadPasswordRequests();
            // Refrescar notificaciones para actualizar contador
            this.notificationCenter.refresh(this.isAdminSistema);
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error completando solicitud de contraseña', error);
            this.cdr.markForCheck();
          },
        });
      return;
    }

    this.passwordDialogBusy = false;
  }

  // =========================================================
  // ELIMINAR USUARIO: Abre modal de confirmación
  // =========================================================
  deleteUser(u: Usuario): void {
    if (u.rol === 'ADMIN_SISTEMA') return;
    if (this.deletingId !== null) return; // Ya hay una eliminación en proceso
    
    this.deleteConfirmDialog = {
      open: true,
      user: u,
    };
  }

  // =========================================================
  // CONFIRMAR ELIMINACIÓN: Ejecuta la eliminación real
  // =========================================================
  confirmDeleteUser(): void {
    const user = this.deleteConfirmDialog.user;
    if (!user || user.rol === 'ADMIN_SISTEMA' || this.deletingId !== null) return;

    this.deletingId = user.id;
    this.usersApi.delete(user.id).subscribe({
      next: () => {
        this.deletingId = null;
        // Cerrar el modal inmediatamente después de confirmar
        this.deleteConfirmDialog = {
          open: false,
          user: null,
        };
        // Recargar usuarios y actualizar vista
        this.loadUsers();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error eliminando usuario', error);
        this.deletingId = null;
        // No cerrar el modal si hay error, para que el usuario pueda intentar de nuevo
        this.cdr.markForCheck();
      },
      complete: () => {
        // Asegurar que el estado de eliminación se resetee
        this.deletingId = null;
        this.cdr.markForCheck();
      },
    });
  }

  // =========================================================
  // CERRAR MODAL DE CONFIRMACIÓN
  // =========================================================
  closeDeleteConfirmDialog(): void {
    // Permitir cerrar solo si no hay una eliminación en proceso
    if (this.deletingId !== null) return;
    this.deleteConfirmDialog = {
      open: false,
      user: null,
    };
    this.cdr.markForCheck();
  }

  trackByUserId: TrackByFunction<Usuario> = (index: number, user: Usuario) => user.id;

  empresaName(id: number | null | undefined): string {
    if (id == null) return 'Sin asignar';
    const e = this.empresas().find((x) => x.id === id);
    return e?.nombre ?? `#${id}`;
  }

  // =========================================================
  // MENÚ DE ACCIONES: Toggle para abrir/cerrar el menú con posicionamiento inteligente
  // =========================================================
  toggleUserMenu(userId: number, buttonElement?: HTMLButtonElement): void {
    // Solo un menú abierto a la vez
    if (this.openMenuUserId === userId) {
      this.openMenuUserId = null;
      this.menuPosition = null;
    } else {
      // Calcular posición del menú basado en el botón con detección de espacio
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const MENU_ESTIMATED_HEIGHT = 250; // Altura aproximada del menú (5 opciones + espaciado)
        const MENU_MARGIN = 8; // Margen entre botón y menú
        const VIEWPORT_PADDING = 16; // Padding desde el borde del viewport
        
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
        const spaceAbove = rect.top - VIEWPORT_PADDING;
        
        // Si no hay espacio hacia abajo pero sí hacia arriba, abrir hacia arriba
        const openUp = spaceBelow < MENU_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;
        
        // Calcular posición top
        let top: number;
        if (openUp) {
          // Abrir hacia arriba: posicionar encima del botón
          top = rect.top - MENU_ESTIMATED_HEIGHT - MENU_MARGIN;
          // Asegurar que no se salga por arriba
          if (top < VIEWPORT_PADDING) {
            top = VIEWPORT_PADDING;
          }
        } else {
          // Abrir hacia abajo: posicionar debajo del botón
          top = rect.bottom + MENU_MARGIN;
          // Asegurar que no se salga por abajo
          const maxTop = window.innerHeight - MENU_ESTIMATED_HEIGHT - VIEWPORT_PADDING;
          if (top > maxTop) {
            top = maxTop;
          }
        }
        
        // Posicionar el menú alineado a la derecha del botón
        this.menuPosition = {
          top,
          right: window.innerWidth - rect.right, // Distancia desde el borde derecho
          openUp,
        };
      }
      this.openMenuUserId = userId;
    }
    this.cdr.markForCheck();
  }

  // =========================================================
  // CERRAR MENÚ DE ACCIONES
  // =========================================================
  closeUserMenu(): void {
    if (this.openMenuUserId !== null) {
      this.openMenuUserId = null;
      this.menuPosition = null;
      this.cdr.markForCheck();
    }
  }

  // =========================================================
  // OBTENER USUARIO POR ID: Helper para el menú flotante
  // =========================================================
  getUserById(userId: number): Usuario | undefined {
    return this.users().find(u => u.id === userId);
  }

  // =========================================================
  // OBTENER ACCIONES DEL MENÚ: Configuración de las opciones del menú
  // =========================================================
  getMenuActions(userId: number): Array<{
    type: 'password' | 'company' | 'role' | 'email' | 'delete';
    label: string;
    icon: 'key-round' | 'building2' | 'shield' | 'mail' | 'trash2';
    class: string;
    disabled: boolean;
    danger?: boolean;
  }> {
    const user = this.getUserById(userId);
    if (!user) return [];

    return [
      {
        type: 'password',
        label: 'Cambiar contraseña',
        icon: 'key-round',
        class: 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-[#f6f6f6]',
        disabled: this.resettingId === user.id || this.passwordDialogBusy,
      },
      {
        type: 'company',
        label: 'Cambiar empresa',
        icon: 'building2',
        class: 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-[#f6f6f6]',
        disabled: false,
      },
      {
        type: 'role',
        label: 'Cambiar rol',
        icon: 'shield',
        class: 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-[#f6f6f6]',
        disabled: this.updatingRoleId === user.id,
      },
      {
        type: 'email',
        label: 'Cambiar correo',
        icon: 'mail',
        class: 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-[#f6f6f6]',
        disabled: false,
      },
      {
        type: 'delete',
        label: 'Eliminar usuario',
        icon: 'trash2',
        class: 'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-error transition-colors hover:bg-error/10',
        disabled: this.deletingId === user.id || user.rol === 'ADMIN_SISTEMA',
        danger: true,
      },
    ];
  }

  // =========================================================
  // MANEJAR ACCIONES DEL MENÚ: Dispatcher para las acciones
  // =========================================================
  handleMenuAction(user: Usuario, action: 'password' | 'company' | 'role' | 'email' | 'delete'): void {
    // Cerrar el menú inmediatamente después de seleccionar una acción
    this.closeUserMenu();

    switch (action) {
      case 'password':
        this.resetPassword(user);
        break;
      case 'company':
        this.onChangeCompany(user);
        break;
      case 'role':
        this.onChangeRole(user);
        break;
      case 'email':
        this.onChangeEmail(user);
        break;
      case 'delete':
        this.deleteUser(user);
        break;
    }
  }

  onChangeCompany(user: Usuario): void {
    if (this.editDialog.busy) return;
    this.editDialog = {
      open: true,
      user,
      type: 'company',
      value: user.empresa_id ?? null,
      busy: false,
    };
    this.editDialogMessage = `Selecciona una nueva empresa para ${user.email}.`;
  }

  onChangeRole(user: Usuario): void {
    if (this.editDialog.busy || this.updatingRoleId === user.id) return;
    this.editDialog = {
      open: true,
      user,
      type: 'role',
      value: user.rol,
      busy: false,
    };
    this.editDialogMessage = `Selecciona un nuevo rol para ${user.email}.`;
  }

  onChangeEmail(user: Usuario): void {
    if (this.editDialog.busy) return;
    this.editDialog = {
      open: true,
      user,
      type: 'email',
      value: user.email,
      busy: false,
    };
    this.editDialogMessage = `Ingresa el nuevo correo electrónico para ${user.nombre}.`;
  }

  closeEditDialog(force = false): void {
    if (this.editDialog.busy && !force) return;
    this.editDialog = {
      open: false,
      user: null,
      type: null,
      value: null,
      busy: false,
    };
    this.editDialogMessage = '';
    this.updatingUserId = null;
  }

  confirmEditDialog(): void {
    if (this.editDialog.busy || !this.editDialog.user || !this.editDialog.type) return;

    const user = this.editDialog.user;
    let updateData: UsuarioUpdate = {};

    // Validar según el tipo
    if (this.editDialog.type === 'company') {
      const newEmpresaId = this.editDialog.value as number | null;
      if (newEmpresaId === user.empresa_id) {
        this.closeEditDialog();
        return;
      }
      updateData.empresa_id = newEmpresaId;
    } else if (this.editDialog.type === 'role') {
      const newRole = this.editDialog.value as RolEnum;
      if (newRole === user.rol) {
        this.closeEditDialog();
        return;
      }
      // Validar permisos
      if (!this.isAdminSistema) {
        if (newRole === 'ADMIN_SISTEMA' && user.rol !== 'ADMIN_SISTEMA') {
          alert('No tienes permisos para asignar el rol ADMIN_SISTEMA');
          return;
        }
        if (user.rol === 'ADMIN_SISTEMA' && newRole !== 'ADMIN_SISTEMA') {
          alert('No tienes permisos para modificar usuarios ADMIN_SISTEMA');
          return;
        }
      }
      updateData.rol = newRole;
    } else if (this.editDialog.type === 'email') {
      const newEmail = (this.editDialog.value as string)?.trim();
      if (!newEmail || newEmail === user.email) {
        this.closeEditDialog();
        return;
      }
      // Validar formato de email básico
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        alert('Por favor ingresa un correo electrónico válido');
        return;
      }
      updateData.email = newEmail;
    }

    // Actualizar
    this.editDialog.busy = true;
    this.updatingUserId = user.id;
    this.usersApi
      .update(user.id, updateData)
      .pipe(
        finalize(() => {
          this.editDialog.busy = false;
          if (this.updatingUserId === user.id) {
            this.updatingUserId = null;
          }
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (updated) => {
          // Actualizar el usuario en la lista
          this.users.set(this.users().map((u) => (u.id === user.id ? updated : u)));
          this.closeEditDialog(true);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(`Error actualizando ${this.editDialog.type}`, error);
          const errorMessage =
            error.error?.detail || error.message || 'Error al actualizar. Por favor intenta nuevamente.';
          alert(errorMessage);
          this.cdr.markForCheck();
        },
      });
  }

  getEditDialogTitle(): string {
    if (!this.editDialog.type) return 'Editar';
    switch (this.editDialog.type) {
      case 'company':
        return 'Cambiar empresa';
      case 'role':
        return 'Cambiar rol';
      case 'email':
        return 'Cambiar correo electrónico';
      default:
        return 'Editar';
    }
  }

  /**
   * Abre el modal de confirmación para limpiar solicitudes de contraseña
   */
  openClearPasswordRequestsDialog(): void {
    if (this.clearingPasswordRequests || !this.passwordRequests().length) {
      return;
    }
    this.clearPasswordRequestsDialog = {
      open: true,
      busy: false,
    };
  }

  /**
   * Cierra el modal de confirmación
   */
  closeClearPasswordRequestsDialog(): void {
    if (this.clearPasswordRequestsDialog.busy) {
      return;
    }
    this.clearPasswordRequestsDialog = {
      open: false,
      busy: false,
    };
  }

  /**
   * Confirma y ejecuta la limpieza de solicitudes de contraseña
   */
  confirmClearPasswordRequests(): void {
    if (this.clearPasswordRequestsDialog.busy || !this.passwordRequests().length) {
      return;
    }

    this.clearPasswordRequestsDialog.busy = true;
    this.clearingPasswordRequests = true;

    this.usersApi.clearPasswordChangeRequests().subscribe({
      next: () => {
        // Cerrar el modal
        this.clearPasswordRequestsDialog = {
          open: false,
          busy: false,
        };
        // Recargar la lista
        this.loadPasswordRequests();
        // Refrescar notificaciones
        this.notificationCenter.refresh(this.isAdminSistema);
        this.clearingPasswordRequests = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error limpiando solicitudes de contraseña', error);
        this.clearPasswordRequestsDialog.busy = false;
        this.clearingPasswordRequests = false;
        this.cdr.markForCheck();
      },
    });
  }
}

