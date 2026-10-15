import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'gm-exercise',
  templateUrl: './exercise.component.html',
  styleUrl: './exercise.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseComponent {
  readonly add = output<void>();
}
