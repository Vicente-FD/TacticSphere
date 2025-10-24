import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { MeService, Me } from '../../me.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf],
  template: `
  <div class="p-6 space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight">Home (protegido)</h2>
      <p class="text-neutral-400 mt-1">Solo ves esto si tu sesión está activa.</p>
    </div>

    <div class="bg-white rounded-2xl shadow-card p-5" *ngIf="me">
      <div class="text-lg font-medium">Hola, {{ me.nombre }}</div>
      <div class="text-neutral-400 text-sm mt-1">{{ me.email }} • Rol: {{ me.rol }}</div>
    </div>
  </div>`,
})
export class HomeComponent {
  private api = inject(MeService);
  me: Me | null = null;
  constructor(){ this.api.me().subscribe(v => this.me = v); }
}