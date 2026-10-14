import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

@Component({
  selector: 'gm-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent implements FormCheckboxControl {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly controlId = input<string>();
  readonly touch = output<void>();

  private box = viewChild<ElementRef<HTMLInputElement>>('box');

  setChecked(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }

  focus(options?: FocusOptions): void {
    this.box()?.nativeElement.focus(options);
  }
}
