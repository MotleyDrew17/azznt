import { afterEveryRender, Directive, ElementRef, inject, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: 'input.control[type=text], textarea.control',
  standalone: true,
})
export class ClearInputDirective implements OnDestroy {
  private element = inject(ElementRef<HTMLInputElement | HTMLTextAreaElement>);
  private renderer = inject(Renderer2);
  private unlistens: Array<() => void> = [];
  private button: HTMLButtonElement | null = null;
  private focused = false;

  constructor() {
    afterEveryRender(() => this.#sync());

    const field = this.element.nativeElement;
    const parent = field.parentElement;
    if (!parent) return;

    const wrap = this.renderer.createElement('span');
    this.renderer.addClass(wrap, 'control-clear');
    if (field instanceof HTMLTextAreaElement) this.renderer.addClass(wrap, 'control-clear_area');
    this.renderer.insertBefore(parent, wrap, field);
    this.renderer.appendChild(wrap, field);

    const button = this.renderer.createElement('button');
    this.renderer.setAttribute(button, 'type', 'button');
    this.renderer.setAttribute(button, 'aria-label', 'Очистить');
    this.renderer.addClass(button, 'control__clear');
    const icon = this.renderer.createElement('span');
    this.renderer.addClass(icon, 'control__clear-icon');
    this.renderer.appendChild(button, icon);
    this.renderer.appendChild(wrap, button);
    this.button = button;

    this.unlistens.push(
      this.renderer.listen(field, 'focus', () => {
        this.focused = true;
        this.#sync();
      }),
      this.renderer.listen(field, 'blur', () => {
        this.focused = false;
        this.#sync();
      }),
      this.renderer.listen(field, 'input', () => this.#sync()),
      this.renderer.listen(button, 'mousedown', (event: MouseEvent) => event.preventDefault()),
      this.renderer.listen(button, 'click', () => this.#clear()),
    );
  }

  ngOnDestroy(): void {
    for (const unlisten of this.unlistens) unlisten();
  }

  #clear(): void {
    const field = this.element.nativeElement;
    field.value = '';
    field.dispatchEvent(new InputEvent('input', { bubbles: true }));
    field.focus();
    this.#sync();
  }

  #sync(): void {
    const button = this.button;
    if (!button) return;
    const field = this.element.nativeElement;
    const visible = this.focused && !field.disabled && field.value.length > 0;
    button.classList.toggle('control__clear_visible', visible);
  }
}
