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
  BellRing,
  Building2,
  ChevronDown,
  Download,
  HelpCircle,
  KeyRound,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Pencil,
  PencilLine,
  Plus,
  PlusCircle,
  RefreshCcw,
  Settings,
  Shield,
  ShieldCheck,
  Slash,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
  Check,
  Circle,
  Filter,
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
        BellRing,
        Building2,
        ChevronDown,
        Download,
        HelpCircle,
        KeyRound,
        Layers,
        ListChecks,
        Loader2,
        Lock,
        LogIn,
        Mail,
        Pencil,
        PencilLine,
        Plus,
        PlusCircle,
        RefreshCcw,
        Settings,
        Shield,
        ShieldCheck,
        Slash,
        SlidersHorizontal,
        Sparkles,
        Trash2,
        UserPlus,
        Users,
        X,
        Check,
        Circle,
        Filter,
      })
    ),
    importProvidersFrom(
      NgxEchartsModule.forRoot({
        echarts: () => import('echarts'),
      })
    ),
  ],
};
