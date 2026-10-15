import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { LayerDialogData } from '../../../core/shared/models/skill.model';
import { SkillService } from '../../../core/shared/services/skill.service';

@Component({
  selector: 'gm-layer-dialog',
  imports: [FormField, ButtonComponent, DisabledDirective],
  templateUrl: './layer-dialog.component.html',
  styleUrl: './layer-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog-host' },
})
export class LayerDialogComponent {
  private data = inject<LayerDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, LayerDialogData>);
  private skillService = inject(SkillService);

  readonly levelModel = signal({
    levelScore: null as number | null,
  });

  readonly levelForm = form(this.levelModel, (path) => {
    required(path.levelScore, { message: 'Укажите уровень' });
    validate(path.levelScore, ({ value }) => {
      const level = value();
      if (level == null || Number.isNaN(level)) return;
      if (Number.isInteger(level)) return;
      return { kind: 'integer', message: 'Только целое число' };
    });
    validate(path.levelScore, ({ value }) => {
      const level = value();
      if (level == null || Number.isNaN(level)) return;
      if (level > 1) return;
      return { kind: 'min', message: 'Число должно быть больше 1' };
    });
    validate(path.levelScore, ({ value }) => {
      const level = value();
      if (level == null || Number.isNaN(level)) return;
      const skill = this.skillService.skills().find((item) => item.id === this.data.skillId);
      const taken = skill?.getLayers().some((layer) => layer.levelScore === level);
      if (!taken) return;
      return { kind: 'duplicate', message: 'Такой уровень уже есть' };
    });
  });

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const level = this.levelForm().value().levelScore;
    if (level == null || this.levelForm().invalid()) return;
    this.skillService.addLayer(this.data.skillId, level);
    this.close();
  }
}
