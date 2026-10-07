import { Directive } from '@angular/core';

@Directive({
  selector: 'button.text-button',
  standalone: true,
  host: {
    '(mouseenter)': 'place($event)',
    '(mousemove)': 'place($event)',
  },
})
export class TextButtonDirective {
  place(event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    button.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    button.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }
}
