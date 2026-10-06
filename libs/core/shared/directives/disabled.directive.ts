import { booleanAttribute, Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appDisabled]',
  standalone: true,
  host: {
    '[class.is-disabled]': 'appDisabled',
    '[attr.disabled]': 'appDisabled ? "" : null',
    '[attr.aria-disabled]': 'appDisabled ? "true" : null',
    '[style.pointer-events]': 'pointerEvents',
  },
})
export class DisabledDirective {
  @Input({ transform: booleanAttribute }) appDisabled = false;

  constructor(private element: ElementRef<HTMLElement>) {}

  get pointerEvents(): string | null {
    if (!this.appDisabled || this.element.nativeElement.tagName === 'BUTTON') {
      return null;
    }

    return 'none';
  }
}
