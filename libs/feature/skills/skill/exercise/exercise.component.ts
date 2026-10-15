import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Exercise } from '../../../../core/shared/classes/skill.class';
import { DisabledDirective } from '../../../../core/shared/directives/disabled.directive';
import { HintDirective } from '../../../../core/shared/directives/hint.directive';
import { DialogService } from '../../../../core/shared/services/dialog.service';
import { SkillService } from '../../../../core/shared/services/skill.service';

@Component({
  selector: 'gm-exercise',
  imports: [DisabledDirective, HintDirective],
  templateUrl: './exercise.component.html',
  styleUrl: './exercise.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [HintDirective],
  host: {
    '[class.exercise_done]': 'view().completed',
    '[class.exercise_locked]': 'view().unavailable',
  },
})
export class ExerciseComponent {
  private dialogService = inject(DialogService);
  private skillService = inject(SkillService);
  private route = inject(ActivatedRoute);
  private params = toSignal(this.route.paramMap);

  readonly exercise = input.required<Exercise>();

  readonly view = computed(() => {
    this.skillService.skills();
    const exercise = this.exercise();
    const reached = exercise.reachedMaxLevel();
    const unavailable = !exercise.isAvailable(exercise.currentLevel);

    return {
      name: exercise.name,
      description: exercise.description,
      experience: exercise.experience,
      unavailable,
      completed: !unavailable && reached,
      showExperience: !reached,
    };
  });

  remove(event: Event): void {
    event.stopPropagation();
    const exercise = this.exercise();
    const id = exercise.id;
    const name = exercise.name;

    this.dialogService.openConfirmDialog({
      title: 'Удалить упражнение?',
      message: `Упражнение «${name}» будет удалено.`,
      okLabel: 'Удалить',
      onOk: () => this.skillService.removeExercise(id),
    });
  }

  doExercise() {
    const skillId = this.params()?.get('id');
    if (!skillId) return;
    this.skillService.doExercise(skillId, this.exercise().id);
  }
}
