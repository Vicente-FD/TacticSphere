import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface Me {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'CONSULTOR' | 'USUARIO';
  empresa_id: number | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class MeService {
  constructor(private http: HttpClient) {}
  me() { return this.http.get<Me>(`${environment.apiUrl}/me`); }
}