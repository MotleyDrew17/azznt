import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';

@Directive({
  selector: '[appScroll]',
  exportAs: 'scroll',
  standalone: true,
})
export class ScrollDirective {
  readonly appScroll = input<'x' | 'y'>('y');
  readonly canBack = signal(false);
  readonly canForward = signal(false);

  private element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const el = this.element.nativeElement;
      const update = () => this.measure();
      const resize = new ResizeObserver(update);
      const mutation = new MutationObserver(update);

      el.addEventListener('scroll', update, { passive: true });
      resize.observe(el);
      mutation.observe(el, { childList: true, subtree: true });
      update();

      destroyRef.onDestroy(() => {
        el.removeEventListener('scroll', update);
        resize.disconnect();
        mutation.disconnect();
      });
    });
  }

  step(direction: -1 | 1): void {
    const el = this.element.nativeElement;
    const axis = this.appScroll();
    const size = axis === 'x' ? el.clientWidth : el.clientHeight;
    const distance = Math.round(size * 0.7) * direction;

    el.scrollBy(axis === 'x' ? { left: distance, behavior: 'smooth' } : { top: distance, behavior: 'smooth' });
  }

  private measure(): void {
    const el = this.element.nativeElement;
    if (this.appScroll() === 'x') {
      this.canBack.set(el.scrollLeft > 1);
      this.canForward.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
      return;
    }

    this.canBack.set(el.scrollTop > 1);
    this.canForward.set(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }
}
