import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type IconName =
  | 'bell-ring'
  | 'building2'
  | 'chevron-down'
  | 'download'
  | 'help-circle'
  | 'key-round'
  | 'layers'
  | 'list-checks'
  | 'loader2'
  | 'lock'
  | 'log-in'
  | 'mail'
  | 'pencil'
  | 'pencil-line'
  | 'plus'
  | 'plus-circle'
  | 'refresh-ccw'
  | 'settings'
  | 'shield'
  | 'shield-check'
  | 'slash'
  | 'sliders-horizontal'
  | 'sparkles'
  | 'trash2'
  | 'user-plus'
  | 'users'
  | 'x'
  | 'check'
  | 'circle'
  | 'filter';

type IconSize = 'sm' | 'md' | 'lg';
type IconVariant = 'default' | 'muted' | 'danger' | 'accent' | 'success';

// Mapeo de nombres en kebab-case a nombres en PascalCase que Lucide espera
const iconNameMap: Record<IconName, string> = {
  'bell-ring': 'BellRing',
  'building2': 'Building2',
  'chevron-down': 'ChevronDown',
  'download': 'Download',
  'help-circle': 'HelpCircle',
  'key-round': 'KeyRound',
  'layers': 'Layers',
  'list-checks': 'ListChecks',
  'loader2': 'Loader2',
  'lock': 'Lock',
  'log-in': 'LogIn',
  'mail': 'Mail',
  'pencil': 'Pencil',
  'pencil-line': 'PencilLine',
  'plus': 'Plus',
  'plus-circle': 'PlusCircle',
  'refresh-ccw': 'RefreshCcw',
  'settings': 'Settings',
  'shield': 'Shield',
  'shield-check': 'ShieldCheck',
  'slash': 'Slash',
  'sliders-horizontal': 'SlidersHorizontal',
  'sparkles': 'Sparkles',
  'trash2': 'Trash2',
  'user-plus': 'UserPlus',
  'users': 'Users',
  'x': 'X',
  'check': 'Check',
  'circle': 'Circle',
  'filter': 'Filter',
};

const sizeMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

const variantColorMap: Record<IconVariant, string> = {
  default: 'text-gray-700',
  muted: 'text-gray-400',
  danger: 'text-red-600',
  accent: 'text-accent',
  success: 'text-green-600',
};

@Component({
  standalone: true,
  selector: 'app-icon',
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lucide-icon
      [name]="iconNamePascal()"
      [size]="sizePixels()"
      [class]="iconClasses()"
      [strokeWidth]="strokeWidthNum()"
      [attr.aria-hidden]="'true'"
    />
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size: IconSize | string = 'md';
  @Input() variant: IconVariant = 'default';
  @Input() class: string = '';
  @Input() strokeWidthValue: string = '1.5';

  iconNamePascal = computed(() => {
    return iconNameMap[this.name] || this.name;
  });

  sizePixels = computed(() => {
    // Si es un string numérico, convertir a número
    if (typeof this.size === 'string' && /^\d+$/.test(this.size)) {
      return parseInt(this.size, 10);
    }
    return sizeMap[this.size as IconSize] || sizeMap.md;
  });

  iconClasses = computed(() => {
    const classes: string[] = [];

    // Tamaño basado en píxeles - usamos clases de Tailwind
    const sizePx = this.sizePixels();
    if (sizePx === 16) {
      classes.push('h-4', 'w-4');
    } else if (sizePx === 20) {
      classes.push('h-5', 'w-5');
    } else if (sizePx === 24) {
      classes.push('h-6', 'w-6');
    } else {
      // Tamaño personalizado usando atributos de estilo inline
      classes.push(`h-[${sizePx}px]`, `w-[${sizePx}px]`);
    }

    // Variante de color
    classes.push(variantColorMap[this.variant]);

    // Clases adicionales del usuario
    if (this.class) {
      classes.push(this.class);
    }

    return classes.join(' ');
  });

  strokeWidthNum = computed(() => {
    return parseFloat(this.strokeWidthValue) || 1.5;
  });
}
