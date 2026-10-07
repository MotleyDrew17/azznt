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
    const tag = this.element.nativeElement.tagName;
    const nativeDisabled = tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (!this.appDisabled || nativeDisabled) {
      return null;
    }

    return 'none';
  }
}
