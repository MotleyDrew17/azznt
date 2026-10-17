import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HintDirective } from '../../../core/shared/directives/hint.directive';

@Component({
  selector: 'gm-storyline',
  imports: [HintDirective],
  templateUrl: './storyline.component.html',
  styleUrl: './storyline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorylineComponent {
  readonly name = input('');
  readonly open = output<void>();
  readonly remove = output<void>();

  // Удаление не открывает проект
  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
