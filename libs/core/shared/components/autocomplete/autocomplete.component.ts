import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { ClearInputDirective } from '../../directives/clear-input.directive';

export interface AutocompleteOption {
  id: string;
  label: string;
}

@Component({
  selector: 'gm-autocomplete',
  imports: [ClearInputDirective],
  templateUrl: './autocomplete.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'autocomplete' },
})
export class AutocompleteComponent {
  readonly options = input<AutocompleteOption[]>([]);
  readonly placeholder = input('Поиск');
  readonly value = model('');
  readonly picked = output<string>();

  readonly open = signal(false);
  readonly filtered = computed(() => {
    const query = this.value().trim().toLowerCase();
    const options = this.options();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  });

  onInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.value.set(target.value);
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
