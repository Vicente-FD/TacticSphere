import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

type IconName =
  | 'settings'
  | 'key-round'
  | 'building2'
  | 'shield'
  | 'mail'
  | 'trash2'
  | 'check'
  | 'slash'
  | 'loader2'
  | 'users'
  | 'user-plus'
  | 'sliders-horizontal'
  | 'bell-ring'
  | 'pencil'
  | 'plus'
  | 'x'
  | 'refresh-ccw';

@Component({
  standalone: true,
  selector: 'app-icon',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      [attr.class]="class"
      [attr.stroke-width]="strokeWidth"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ng-container [ngSwitch]="name">
        <!-- Settings (Tuerca) -->
        <g *ngSwitchCase="'settings'">
          <path
            d="M12.22 2h-.44a2 2 0 0 0-1.94 1.5L9.13 6.5a2 2 0 0 1-.84.84L5.5 8.87a2 2 0 0 0-1.5 1.94v.38a2 2 0 0 0 1.5 1.94l2.79.53a2 2 0 0 1 .84.84l.53 2.79a2 2 0 0 0 1.94 1.5h.38a2 2 0 0 0 1.94-1.5l.53-2.79a2 2 0 0 1 .84-.84l2.79-.53a2 2 0 0 0 1.5-1.94v-.38a2 2 0 0 0-1.5-1.94l-2.79-.53a2 2 0 0 1-.84-.84L12.22 2Z"
          />
          <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
        </g>

        <!-- Key Round (Llave) -->
        <g *ngSwitchCase="'key-round'">
          <circle cx="8" cy="15" r="4" />
          <path d="m10.85 12.15 3.44 3.44" />
          <path d="M15 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
        </g>

        <!-- Building2 (Edificio) -->
        <g *ngSwitchCase="'building2'">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12h10" />
          <path d="M6 16h10" />
          <path d="M6 20h10" />
          <path d="M10 8h2" />
        </g>

        <!-- Shield -->
        <g *ngSwitchCase="'shield'">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </g>

        <!-- Mail -->
        <g *ngSwitchCase="'mail'">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </g>

        <!-- Trash2 (Basura) -->
        <g *ngSwitchCase="'trash2'">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </g>

        <!-- Check (Check) -->
        <g *ngSwitchCase="'check'">
          <polyline points="20 6 9 17 4 12" />
        </g>

        <!-- Slash -->
        <g *ngSwitchCase="'slash'">
          <line x1="22" x2="2" y1="2" y2="22" />
        </g>

        <!-- Loader2 (Spinner) -->
        <g *ngSwitchCase="'loader2'">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </g>

        <!-- Users -->
        <g *ngSwitchCase="'users'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </g>

        <!-- UserPlus -->
        <g *ngSwitchCase="'user-plus'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </g>

        <!-- SlidersHorizontal -->
        <g *ngSwitchCase="'sliders-horizontal'">
          <line x1="21" x2="14" y1="4" y2="4" />
          <line x1="10" x2="3" y1="4" y2="4" />
          <line x1="21" x2="12" y1="12" y2="12" />
          <line x1="8" x2="3" y1="12" y2="12" />
          <line x1="21" x2="16" y1="20" y2="20" />
          <line x1="12" x2="3" y1="20" y2="20" />
          <line x1="14" x2="14" y1="2" y2="6" />
          <line x1="8" x2="8" y1="10" y2="14" />
          <line x1="16" x2="16" y1="18" y2="22" />
        </g>

        <!-- BellRing -->
        <g *ngSwitchCase="'bell-ring'">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          <path d="M18 2v4" />
          <path d="M6 2v4" />
          <path d="M10 2h4" />
        </g>

        <!-- Pencil (Lápiz) -->
        <g *ngSwitchCase="'pencil'">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </g>

        <!-- Plus -->
        <g *ngSwitchCase="'plus'">
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </g>

        <!-- X -->
        <g *ngSwitchCase="'x'">
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </g>

        <!-- RefreshCcw (Recargar) -->
        <g *ngSwitchCase="'refresh-ccw'">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </g>
      </ng-container>
    </svg>
  `,
})
export class IconComponent {
  @Input() name!: IconName;
  @Input() size: string = '16';
  @Input() class: string = '';
  @Input() strokeWidth: string = '2';
}

