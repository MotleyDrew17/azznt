import { booleanAttribute, Component, inject, Input } from '@angular/core';
import { DisabledDirective } from '../../directives/disabled.directive';

export type ButtonVariant = 'neutral' | 'confirm' | 'reject';

@Component({
  selector: 'app-button',
  imports: [DisabledDirective],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  standalone: true,
  host: {
    '[style.width]': 'width',
  },
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'neutral';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() width?: string;

  private hostDisabled = inject(DisabledDirective, { optional: true, self: true });

  get isDisabled(): boolean {
    return this.disabled || !!this.hostDisabled?.appDisabled;
  }
}
