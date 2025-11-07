import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LucideAngularModule } from 'lucide-angular';

import { CompanyService } from '../../company.service';
import { UserService } from '../../user.service';

import { Empresa, RolEnum, Usuario, UsuarioCreate } from '../../types';

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [
    CommonModule,
    FormsModule,
    NgxSkeletonLoaderModule,
    LucideAngularModule,
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

        <div class="space-y-6">
          <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div class="ts-card space-y-4">
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
                      placeholder="Minimo 10 caracteres"
                      type="password"
                      minlength=\"10\"
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
              <table class="ts-table w-full table-fixed">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Empresa</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let u of users()">
                    <td class="text-xs uppercase tracking-wide text-neutral-400">#{{ u.id }}</td>
                    <td class="font-medium text-ink">{{ u.nombre }}</td>
                    <td class="text-sm text-neutral-500 break-words">{{ u.email }}</td>
                    <td>
                      <select
                        class="ts-select w-full max-w-[12rem]"
                        [ngModel]="u.rol"
                        (ngModelChange)="changeRole(u, $event)"
                        [disabled]="updatingRoleId === u.id"
                      >
                        <option *ngFor="let r of roles" [ngValue]="r">{{ r }}</option>
                      </select>
                    </td>
                    <td class="text-sm text-neutral-500 break-words">{{ empresaName(u.empresa_id) }}</td>
                    <td>
                      <label class="flex items-center gap-2 text-sm text-neutral-500">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent"
                          [checked]="u.activo"
                          (change)="toggleActive(u)"
                          [disabled]="togglingActiveId === u.id"
                        />
                        <span>{{ u.activo ? 'Sí' : 'No' }}</span>
                      </label>
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="ts-btn ts-btn--ghost border border-neutral-200 text-neutral-500 hover:text-ink"
                          (click)="resetPassword(u)"
                          [disabled]="resettingId === u.id"
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
                          <span>Reset pass</span>
                        </button>
                        <button
                          class="ts-btn ts-btn--danger"
                          (click)="deleteUser(u)"
                          [disabled]="deletingId === u.id"
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
            </ng-container>

            <ng-template #emptyUsers>
              <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-100/60 p-6 text-center">
                <p class="text-sm text-neutral-400">
                  {{ selectedEmpresaId ? 'No hay usuarios en esta empresa.' : 'Crea tu primer usuario para comenzar.' }}
                </p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private companies = inject(CompanyService);
  private usersApi = inject(UserService);

  empresas: WritableSignal<Empresa[]> = signal<Empresa[]>([]);
  users: WritableSignal<Usuario[]> = signal<Usuario[]>([]);
  selectedEmpresaId: number | null = null;

  roles: RolEnum[] = ['ADMIN_SISTEMA', 'ADMIN', 'ANALISTA', 'USUARIO'];

  loadingCompanies = true;
  loadingUsers = true;
  creatingUser = false;
  updatingRoleId: number | null = null;
  togglingActiveId: number | null = null;
  resettingId: number | null = null;
  deletingId: number | null = null;

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
      .subscribe({
        next: (rows) => this.users.set(rows ?? []),
        error: (error) => console.error('Error cargando usuarios', error),
        complete: () => (this.loadingUsers = false),
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
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error creando usuario', error);
        this.creatingUser = false;
      },
      complete: () => (this.creatingUser = false),
    });
  }

  changeRole(u: Usuario, rol: RolEnum): void {
    if (this.updatingRoleId) return;
    this.updatingRoleId = u.id;
    this.usersApi.update(u.id, { rol }).subscribe({
      next: (updated) => {
        this.users.set(this.users().map((x) => (x.id === u.id ? updated : x)));
      },
      error: (error) => {
        console.error('Error actualizando rol', error);
        this.updatingRoleId = null;
      },
      complete: () => {
        this.updatingRoleId = null;
      },
    });
  }

  toggleActive(u: Usuario): void {
    if (this.togglingActiveId) return;
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
    const pwd = prompt(`Nueva contraseña para ${u.email}:`, '');
    if (!pwd) return;
    this.resettingId = u.id;
    this.usersApi.setPassword(u.id, pwd).subscribe({
      next: () => {},
      error: (error) => {
        console.error('Error reseteando contraseña', error);
        this.resettingId = null;
      },
      complete: () => {
        this.resettingId = null;
      },
    });
  }

  deleteUser(u: Usuario): void {
    if (!confirm(`¿Eliminar usuario ${u.email}?`)) return;
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
