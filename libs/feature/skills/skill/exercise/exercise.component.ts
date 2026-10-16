import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Exercise, roundExp } from '../../../../core/shared/classes/skill.class';
import { FieldMode } from '../../../../core/shared/enums/field-mode.enum';
import { DisabledDirective } from '../../../../core/shared/directives/disabled.directive';
import { HintDirective } from '../../../../core/shared/directives/hint.directive';
import { DialogService } from '../../../../core/shared/services/dialog.service';
import { FieldModeService } from '../../../../core/shared/services/field-mode.service';
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
  private fieldMode = inject(FieldModeService);
  private route = inject(ActivatedRoute);
  private params = toSignal(this.route.paramMap);

  readonly editor = computed(() => this.fieldMode.mode() === FieldMode.Editor);
  private gains: HTMLSpanElement[] = [];
  private gainTimers: number[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const timer of this.gainTimers) window.clearTimeout(timer);
      for (const gain of this.gains) gain.remove();
    });
  }

  readonly exercise = input.required<Exercise>();

  readonly view = computed(() => {
    this.skillService.skills();
    const exercise = this.exercise();
    const reached = exercise.reachedMaxLevel();
    const unavailable = !exercise.isAvailable(exercise.currentLevel);

    return {
      name: exercise.name,
      description: exercise.description,
      experience: roundExp(exercise.experience),
      unavailable,
      completed: !unavailable && exercise.performedToday(this.skillService.now()),
      showExperience: !reached,
    };
  });

  edit(event: Event): void {
    event.stopPropagation();
    const skillId = this.params()?.get('id');
    const exercise = this.exercise();
    if (!skillId) return;
    this.dialogService.openExerciseDialog({
      skillId,
      levelScore: exercise.availableOnLevel,
      exerciseId: exercise.id,
    });
  }

  move(event: Event): void {
    event.stopPropagation();
    const skillId = this.params()?.get('id');
    if (!skillId) return;
    this.dialogService.openMoveExerciseDialog({
      skillId,
      exerciseId: this.exercise().id,
    });
  }

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

  doExercise(event: Event): void {
    if (this.fieldMode.mode() !== FieldMode.View) return;
    const skillId = this.params()?.get('id');
    if (!skillId) return;
    const gained = this.skillService.doExercise(skillId, this.exercise().id);
    const button = event.currentTarget;
    if (gained <= 0 || !(button instanceof HTMLElement)) return;
    const rect = button.getBoundingClientRect();
    this.#showGain(gained, rect.left + rect.width / 2, rect.top);
  }

  #showGain(amount: number, x: number, y: number): void {
    const gain = document.createElement('span');
    gain.className = 'exercise-gain';
    gain.textContent = `+${roundExp(amount)}`;
    gain.style.left = `${x}px`;
    gain.style.top = `${y}px`;
    document.body.appendChild(gain);
    this.gains.push(gain);
    this.gainTimers.push(window.setTimeout(() => {
      gain.remove();
      this.gains = this.gains.filter((item) => item !== gain);
    }, 1100));
  }
}
