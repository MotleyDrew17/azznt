import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { disabled, form, FormField, required, validate } from '@angular/forms/signals';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { CheckboxComponent } from '../../../core/shared/components/checkbox/checkbox.component';
import { ClearInputDirective } from '../../../core/shared/directives/clear-input.directive';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { HintDirective } from '../../../core/shared/directives/hint.directive';
import { CreateExerciseData, ExerciseDialogData } from '../../../core/shared/models/skill.model';
import { SkillService } from '../../../core/shared/services/skill.service';

@Component({
  selector: 'gm-exercise-dialog',
  imports: [FormField, CheckboxComponent, ButtonComponent, DisabledDirective, ClearInputDirective, HintDirective],
  templateUrl: './exercise-dialog.component.html',
  styleUrl: './exercise-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog-host' },
})
export class ExerciseDialogComponent {
  private data = inject<ExerciseDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, ExerciseDialogData>);
  private skillService = inject(SkillService);

  readonly hasDecay = !!this.skillService.skills().find((item) => item.id === this.data.skillId)?.getLevel()?.decay;
  readonly editing = !!this.data.exerciseId;
  readonly title = this.editing ? 'Редактирование' : 'Добавить упражнение';

  readonly exerciseModel = signal(this.#draft());

  readonly exerciseForm = form(this.exerciseModel, (path) => {
    required(path.name, { message: 'Название обязательно' });
    validate(path.name, ({ value }) => {
      const name = value();
      if (!name || name.trim()) return;
      return { kind: 'blank', message: 'Название обязательно' };
    });

    required(path.experience, { message: 'Укажите опыт' });
    validate(path.experience, ({ value }) => {
      const experience = value();
      if (experience == null || Number.isNaN(experience)) return;
      if (experience > 0) return;
      return { kind: 'positive', message: 'Только положительное число' };
    });

    disabled(path.maxLevel, { when: ({ valueOf }) => !valueOf(path.limitEnabled) });
    required(path.maxLevel, { message: 'Укажите максимальный уровень' });
    validate(path.maxLevel, ({ value }) => {
      const level = value();
      if (level == null || Number.isNaN(level)) return;
      if (Number.isInteger(level)) return;
      return { kind: 'integer', message: 'Только целое число' };
    });
    validate(path.maxLevel, ({ value }) => {
      const level = value();
      if (level == null || Number.isNaN(level)) return;
      if (level > 1) return;
      return { kind: 'min', message: 'Число должно быть больше 1' };
    });
  });

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const value = this.exerciseForm().value();
    if (value.experience == null || this.exerciseForm().invalid()) return;

    const data: CreateExerciseData = {
      name: value.name.trim(),
      description: value.description,
      experience: value.experience,
      maxLevel: value.limitEnabled && value.maxLevel != null ? value.maxLevel : 0,
      availableOnLevel: this.data.levelScore,
      isFreezingDecay: this.hasDecay && value.resetsDecay,
    };

    if (this.data.exerciseId) {
      this.skillService.updateExercise(this.data.skillId, this.data.exerciseId, data);
    } else {
      this.skillService.addExerciseToLayer(this.data.skillId, this.data.levelScore, data);
    }
    this.close();
  }

  #draft() {
    const empty = {
      name: '',
      description: '',
      experience: null as number | null,
      limitEnabled: false,
      maxLevel: null as number | null,
      resetsDecay: this.hasDecay,
    };
    if (!this.data.exerciseId) return empty;

    const exercise = this.skillService.skills().find((item) => item.id === this.data.skillId)?.getExercise(this.data.exerciseId);
    if (!exercise) return empty;

    return {
      name: exercise.name,
      description: exercise.description,
      experience: exercise.experience,
      limitEnabled: exercise.maxLevel > 0,
      maxLevel: exercise.maxLevel > 0 ? exercise.maxLevel : null,
      resetsDecay: exercise.isFreezingDecay,
    };
  }
}
