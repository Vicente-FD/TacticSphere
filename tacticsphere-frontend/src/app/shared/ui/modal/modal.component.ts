import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'ts-modal',
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200"
      *ngIf="open"
      (click)="handleBackdrop($event)"
      role="presentation"
    >
      <div
        class="ts-card w-full max-w-lg animate-subtleUp shadow-card"
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-label]="title"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between gap-4 border-b border-border pb-4">
          <h2 class="text-lg font-semibold text-ink">{{ title }}</h2>
          <button
            type="button"
            class="ts-btn ts-btn--ghost px-3 py-1 text-sm"
            aria-label="Cerrar modal"
            (click)="close.emit()"
          >
            Cerrar
          </button>
        </div>
        <div class="mt-4">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent {
  @Input() title = '';
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close.emit();
    }
  }

  handleBackdrop(event: MouseEvent): void {
    event.stopPropagation();
    this.close.emit();
  }
}
