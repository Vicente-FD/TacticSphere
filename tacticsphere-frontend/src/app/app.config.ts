import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  LucideAngularModule,
  LogIn,
  Mail,
  Lock,
  Building2,
  Plus,
  Trash2,
  Loader2,
  HelpCircle,
  Layers,
  ListChecks,
  KeyRound,
  ShieldCheck,
  UserPlus,
  Users,
  Sparkles,
} from 'lucide-angular';
import { NgxEchartsModule } from 'ngx-echarts';
import { tokenInterceptor } from './token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // HttpClient con interceptor (solo una vez)
    provideHttpClient(withInterceptors([tokenInterceptor])),

    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    importProvidersFrom(
      LucideAngularModule.pick({
        LogIn,
        Mail,
        Lock,
        Building2,
        Plus,
        Trash2,
        Loader2,
        HelpCircle,
        Layers,
        ListChecks,
        KeyRound,
        ShieldCheck,
        UserPlus,
        Users,
        Sparkles,
      })
    ),
    importProvidersFrom(
      NgxEchartsModule.forRoot({
        echarts: () => import('echarts'),
      })
    ),
  ],
};
