import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LucideAngularModule } from 'lucide-angular';

import { CompanyService } from '../../company.service';
import { LeadService } from '../../core/services/lead.service';
import { Empresa, Lead } from '../../types';

@Component({
  standalone: true,
  selector: 'app-companies',
  imports: [
    CommonModule,
    FormsModule,
    NgxSkeletonLoaderModule,
    LucideAngularModule,
  ],
  template: `
    <div class="ts-page">
      <div class="ts-container">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-1">
            <h1 class="ts-title">Empresas</h1>
            <p class="ts-subtitle">Administra la información base y los departamentos asociados.</p>
          </div>
          <div class="ts-chip h-fit">
            <lucide-icon name="Building2" class="h-4 w-4 text-ink" strokeWidth="1.75"></lucide-icon>
            {{ empresas().length }} registradas
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)]">
          <div class="ts-card space-y-6">
            <div>
              <h2 class="text-xl font-semibold text-ink">Crear empresa</h2>
              <p class="text-sm text-muted">Completa los datos para dar de alta una nueva empresa.</p>
            </div>

            <div class="space-y-4">
              <label class="block space-y-2">
                <span class="ts-label">Nombre</span>
                <input class="ts-input" [(ngModel)]="form.nombre" placeholder="Ej: Acme SpA" />
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="ts-label">RUT</span>
                  <input class="ts-input" [(ngModel)]="form.rut" placeholder="12345678-9" />
                </label>

                <label class="block space-y-2">
                  <span class="ts-label">Giro</span>
                  <input class="ts-input" [(ngModel)]="form.giro" placeholder="Tecnología" />
                </label>
              </div>

              <label class="block space-y-2">
                <span class="ts-label">Departamentos</span>
                <input
                  class="ts-input"
                  [(ngModel)]="form.departamentos"
                  placeholder="Ventas, Marketing, Operaciones"
                />
                <span class="text-xs text-muted">Separa cada departamento con coma.</span>
              </label>
            </div>

            <button class="ts-btn w-full md:w-auto" (click)="crear()" [disabled]="creating || !form.nombre.trim()">
              <lucide-icon
                *ngIf="!creating"
                name="Plus"
                class="h-4 w-4"
                strokeWidth="1.75"
              ></lucide-icon>
              <lucide-icon
                *ngIf="creating"
                name="Loader2"
                class="h-4 w-4 animate-spin"
                strokeWidth="1.75"
              ></lucide-icon>
              <span>{{ creating ? 'Creando...' : 'Crear empresa' }}</span>
            </button>
          </div>

          <div class="ts-card space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-ink">Listado</h2>
              <span class="text-sm text-muted">
                {{ loadingList ? 'Cargando empresas...' : 'Actualizado al día' }}
              </span>
            </div>

            <ng-container *ngIf="loadingList">
              <ngx-skeleton-loader count="4" [theme]="{ height: '70px', marginBottom: '1rem', borderRadius: '12px' }">
              </ngx-skeleton-loader>
            </ng-container>

            <ng-container *ngIf="!loadingList && empresas().length; else emptyState">
              <div class="space-y-3">
                <div
                  *ngFor="let e of empresas()"
                  class="rounded-xl border border-border p-4 transition-all duration-200 hover:border-ink/40 hover:shadow-card"
                >
                  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <lucide-icon
                          name="Building2"
                          class="h-5 w-5 text-ink"
                          strokeWidth="1.75"
                        ></lucide-icon>
                        <p class="text-lg font-semibold text-ink">{{ e.nombre }}</p>
                      </div>
                      <div class="flex flex-wrap gap-2 text-sm text-muted">
                        <span class="ts-chip">RUT: {{ e.rut || 'Sin RUT' }}</span>
                        <span class="ts-chip">Giro: {{ e.giro || 'Sin giro' }}</span>
                        <span class="ts-chip">
                          Estado:
                          <span class="font-medium text-success" *ngIf="e.activa; else inactive">Activa</span>
                          <ng-template #inactive>
                            <span class="font-medium text-muted">Inactiva</span>
                          </ng-template>
                        </span>
                      </div>
                    </div>

                    <button
                      class="ts-btn ts-btn--ghost border border-error/30 text-error hover:bg-error/10 hover:text-error"
                      (click)="eliminar(e)"
                      [disabled]="deletingId === e.id"
                    >
                      <lucide-icon
                        *ngIf="deletingId !== e.id"
                        name="Trash2"
                        class="h-4 w-4"
                        strokeWidth="1.75"
                      ></lucide-icon>
                      <lucide-icon
                        *ngIf="deletingId === e.id"
                        name="Loader2"
                        class="h-4 w-4 animate-spin"
                        strokeWidth="1.75"
                      ></lucide-icon>
                      <span>{{ deletingId === e.id ? 'Eliminando...' : 'Eliminar' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </ng-container>

            <ng-template #emptyState>
              <div class="rounded-xl border border-dashed border-border bg-[#f6f6f6] p-6 text-center">
                <p class="text-sm text-muted">
                  Todavía no tienes empresas registradas. Comienza creando la primera con el formulario.
                </p>
              </div>
            </ng-template>
          </div>
        </div>

        <div class="ts-card space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-ink">Empresas que desean una consultoría</h2>
              <p class="text-sm text-muted">
                Solicitudes recibidas desde la landing pública.
              </p>
            </div>
            <div class="ts-chip">
              <lucide-icon name="Mail" class="h-4 w-4 text-ink" strokeWidth="1.75"></lucide-icon>
              {{ leads().length }} solicitudes
            </div>
          </div>

          <div *ngIf="loadingLeads" class="space-y-3">
            <ngx-skeleton-loader count="3" [theme]="{ height: '50px', marginBottom: '0.75rem', borderRadius: '18px' }">
            </ngx-skeleton-loader>
          </div>

          <div *ngIf="!loadingLeads && leads().length" class="overflow-x-auto">
            <table class="ts-table min-w-full">
              <thead>
                <tr>
                  <th class="whitespace-nowrap">Empresa</th>
                  <th class="whitespace-nowrap">Correo</th>
                  <th class="whitespace-nowrap">Fecha</th>
                  <th class="whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let lead of leads(); trackBy: trackByLead">
                  <td class="py-3 font-medium text-ink">{{ lead.company }}</td>
                  <td class="py-3">
                    <a class="text-ink underline-offset-2 hover:underline" [href]="'mailto:' + lead.email">
                      {{ lead.email }}
                    </a>
                  </td>
                  <td class="py-3 text-sm text-muted">{{ lead.created_at | date: 'medium' }}</td>
                  <td class="py-3">
                    <span class="ts-chip text-xs font-medium text-ink">Nuevo</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="!loadingLeads && !leads().length" class="rounded-xl border border-dashed border-border bg-[#f6f6f6] p-6 text-center text-sm text-muted">
            Aún no recibimos solicitudes de consultoría. Cuando lleguen, aparecerán aquí.
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CompaniesComponent implements OnInit {
  private api = inject(CompanyService);
  private leadsApi = inject(LeadService);

  empresas: WritableSignal<Empresa[]> = signal<Empresa[]>([]);
  loadingList = true;
  creating = false;
  deletingId: number | null = null;

  leads: WritableSignal<Lead[]> = signal<Lead[]>([]);
  loadingLeads = true;

  form = {
    nombre: '',
    rut: '',
    giro: '',
    departamentos: '',
  };

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadLeads();
  }

  private loadEmpresas(): void {
    this.loadingList = true;
    this.api.list().subscribe({
      next: (rows: Empresa[]) => this.empresas.set(rows ?? []),
      error: (error) => console.error('Error cargando empresas', error),
      complete: () => (this.loadingList = false),
    });
  }

  private loadLeads(): void {
    this.loadingLeads = true;
    this.leadsApi.listLeads().subscribe({
      next: (rows: Lead[]) => {
        const ordered = [...(rows ?? [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        this.leads.set(ordered);
      },
      error: (error) => {
        console.error('Error cargando leads', error);
        this.loadingLeads = false;
      },
      complete: () => {
        this.loadingLeads = false;
      },
    });
  }

  crear(): void {
    const deps = this.form.departamentos
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      nombre: this.form.nombre.trim(),
      rut: this.form.rut || undefined,
      giro: this.form.giro || undefined,
      departamentos: deps.length ? deps : undefined,
    };

    if (!payload.nombre || this.creating) return;

    this.creating = true;

    this.api.create(payload).subscribe({
      next: () => {
        this.form = { nombre: '', rut: '', giro: '', departamentos: '' };
        this.loadEmpresas();
      },
      error: (error) => {
        console.error('Error creando empresa', error);
        this.creating = false;
      },
      complete: () => (this.creating = false),
    });
  }

  eliminar(e: Empresa): void {
    if (!confirm(`¿Eliminar empresa ${e.nombre}?`)) return;

    this.deletingId = e.id;
    this.api.delete(e.id).subscribe({
      next: () => {
        this.empresas.set(this.empresas().filter((x) => x.id !== e.id));
      },
      error: (error) => {
        console.error('Error eliminando empresa', error);
        this.deletingId = null;
      },
      complete: () => {
        this.deletingId = null;
      },
    });
  }

  trackByLead = (_: number, item: Lead) => item.id;
}
