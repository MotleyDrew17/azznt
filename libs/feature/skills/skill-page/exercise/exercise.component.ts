import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Exercise } from '../../../../core/shared/classes/skill.class';
import { HintDirective } from '../../../../core/shared/directives/hint.directive';
import { ScrollDirective } from '../../../../core/shared/directives/scroll.directive';
import { ExerciseComponent } from '../../skill/exercise/exercise.component';

@Component({
  selector: 'gm-exercise-row',
  imports: [ExerciseComponent, HintDirective, ScrollDirective],
  templateUrl: './exercise.component.html',
  styleUrl: './exercise.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseRowComponent {
  readonly exercises = input<Exercise[]>([]);
  readonly add = output<void>();
}
