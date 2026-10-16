import { booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, input, model, output, signal } from '@angular/core';
import { ClearInputDirective } from '../../directives/clear-input.directive';
import { DisabledDirective } from '../../directives/disabled.directive';

export interface AutocompleteOption {
  id: string;
  label: string;
}

@Component({
  selector: 'gm-autocomplete',
  imports: [ClearInputDirective, DisabledDirective],
  templateUrl: './autocomplete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'autocomplete' },
})
export class AutocompleteComponent {
  readonly options = input<AutocompleteOption[]>([]);
  readonly placeholder = input('Поиск');
  readonly controlId = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly value = model('');
  readonly picked = output<string>();

  constructor() {
    effect(() => {
      if (this.disabled()) this.open.set(false);
    });
  }

  readonly open = signal(false);
  readonly filtered = computed(() => {
    const query = this.value().trim().toLowerCase();
    const options = this.options();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  });

  onInput(event: Event): void {
    if (this.disabled()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.value.set(target.value);
    this.open.set(true);
  }

  show(): void {
    if (this.disabled()) return;
    this.open.set(true);
  }

  pick(option: AutocompleteOption): void {
    this.value.set(option.label);
    this.picked.emit(option.id);
    this.open.set(false);
  }

  close(): void {
    this.open.set(false);
  }
}
