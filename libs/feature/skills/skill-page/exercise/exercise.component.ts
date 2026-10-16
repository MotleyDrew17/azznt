import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Exercise } from '../../../../core/shared/classes/skill.class';
import { FieldMode } from '../../../../core/shared/enums/field-mode.enum';
import { HintDirective } from '../../../../core/shared/directives/hint.directive';
import { FieldModeService } from '../../../../core/shared/services/field-mode.service';
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
  private fieldMode = inject(FieldModeService);

  readonly editor = computed(() => this.fieldMode.mode() === FieldMode.Editor);
  readonly exercises = input<Exercise[]>([]);
  readonly add = output<void>();
}
