import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { SelectComponent } from '../../../core/shared/components/select/select.component';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { MoveExerciseDialogData } from '../../../core/shared/models/skill.model';
import { SkillService } from '../../../core/shared/services/skill.service';

@Component({
  selector: 'gm-move-exercise-dialog',
  imports: [ButtonComponent, SelectComponent, DisabledDirective],
  templateUrl: './move-exercise-dialog.component.html',
  styleUrl: './move-exercise-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog-host' },
})
export class MoveExerciseDialogComponent {
  private data = inject<MoveExerciseDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, MoveExerciseDialogData>);
  private skillService = inject(SkillService);

  readonly selected = signal<string | null>(null);

  readonly levels = computed(() => {
    this.skillService.skills();
    const skill = this.skillService.skills().find((item) => item.id === this.data.skillId);
    const current = skill?.getLayers().find((layer) => layer.exercises.some((exercise) => exercise.id === this.data.exerciseId))?.levelScore;
    return (skill?.getLayers() ?? [])
      .map((layer) => layer.levelScore)
      .filter((level) => level !== current)
      .sort((a, b) => a - b);
  });
  readonly options = computed(() => this.levels().map((level) => String(level)));

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const level = Number(this.selected());
    if (!this.levels().includes(level)) return;
    this.skillService.moveExercise(this.data.skillId, this.data.exerciseId, level);
    this.close();
  }
}
