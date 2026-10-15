import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { form, FormField, hidden, min, required, validate } from '@angular/forms/signals';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { CheckboxComponent } from '../../../core/shared/components/checkbox/checkbox.component';
import { ClearInputDirective } from '../../../core/shared/directives/clear-input.directive';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { HintDirective } from '../../../core/shared/directives/hint.directive';
import { SkillDialogKind } from '../../../core/shared/enums/skill-dialog-kind.enum';
import { CreateSkillData, SkillDialogData } from '../../../core/shared/models/skill.model';
import { SkillService } from '../../../core/shared/services/skill.service';

const TITLES: Record<SkillDialogKind, string> = {
  [SkillDialogKind.New]: 'Новый навык',
  [SkillDialogKind.Edit]: 'Редактирование',
};

@Component({
  selector: 'gm-skill-dialog',
  standalone: true,
  imports: [FormField, CheckboxComponent, ButtonComponent, DisabledDirective, ClearInputDirective, HintDirective],
  templateUrl: './skill-dialog.component.html',
  styleUrl: './skill-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog-host' },
})
export class SkillDialogComponent {
  private data = inject<SkillDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, SkillDialogData>);
  private skillService = inject(SkillService);

  readonly SkillDialogKind = SkillDialogKind;
  readonly kind = this.data.kind;
  readonly title = TITLES[this.kind];

  readonly skillModel = signal(this.#draft());

  readonly skillForm = form(this.skillModel, (path) => {
    required(path.name, { message: 'Название обязательно' });
    validate(path.name, ({ value }) => {
      const name = value();
      if (!name || name.trim()) return;
      return { kind: 'blank', message: 'Название обязательно' };
    });
    validate(path.name, ({ value }) => {
      const name = value().trim().toLowerCase();
      if (!name) return;
      const taken = this.skillService.skills().some((skill) => {
        if (this.kind === SkillDialogKind.Edit && skill.id === this.data.id) return false;
        return skill.name.trim().toLowerCase() === name;
      });
      if (!taken) return;
      return { kind: 'duplicate', message: 'Такой навык уже есть' };
    });

    required(path.requiredExp, { message: 'Укажите требуемый опыт' });
    validate(path.requiredExp, ({ value }) => {
      const exp = value();
      if (exp == null || Number.isNaN(exp)) return;
      if (exp > 0) return;
      return { kind: 'positive', message: 'Только положительное число' };
    });

    min(path.expIncreasePercent, 0, { message: 'Число не может быть отрицательным' });

    hidden(path.inactivityDays, { when: ({ valueOf }) => !valueOf(path.decayEnabled) });
    hidden(path.lostExp, { when: ({ valueOf }) => !valueOf(path.decayEnabled) });

    required(path.inactivityDays, { message: 'Укажите срок бездействия' });
    validate(path.inactivityDays, ({ value }) => {
      const days = value();
      if (days == null || Number.isNaN(days)) return;
      if (days > 0) return;
      return { kind: 'positive', message: 'Только положительное число' };
    });
    validate(path.inactivityDays, ({ value }) => {
      const days = value();
      if (days == null || Number.isNaN(days)) return;
      if (Number.isInteger(days)) return;
      return { kind: 'integer', message: 'Только целое число' };
    });

    required(path.lostExp, { message: 'Укажите теряемый опыт' });
    validate(path.lostExp, ({ value }) => {
      const exp = value();
      if (exp == null || Number.isNaN(exp)) return;
      if (exp > 0) return;
      return { kind: 'positive', message: 'Только положительное число' };
    });
  });

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const value = this.skillForm().value();
    if (value.requiredExp == null) return;

    const data: CreateSkillData = {
      name: value.name.trim(),
      description: value.description,
      requiredExp: value.requiredExp,
      expIncreasePercent: value.expIncreasePercent ?? 0,
      decayEnabled: value.decayEnabled,
    };

    if (value.inactivityDays != null) data.inactivityDays = value.inactivityDays;
    if (value.lostExp != null) data.lostExp = value.lostExp;

    if (this.kind === SkillDialogKind.Edit) {
      if (!this.data.id) return;
      this.skillService.updateSkill(this.data.id, data);
      this.close();
      return;
    }

    this.skillService.addSkill(data);
    this.close();
  }

  #draft() {
    const empty = {
      name: '',
      description: '',
      requiredExp: null as number | null,
      expIncreasePercent: null as number | null,
      decayEnabled: false,
      inactivityDays: null as number | null,
      lostExp: null as number | null,
    };
    if (this.kind !== SkillDialogKind.Edit || !this.data.id) return empty;

    const skill = this.skillService.skills().find((item) => item.id === this.data.id);
    const level = skill?.getLevel();
    if (!skill || !level) return empty;

    const decay = level.decay;
    return {
      name: skill.name,
      description: skill.description,
      requiredExp: level.next_exp,
      expIncreasePercent: level.coefficient,
      decayEnabled: !!decay,
      inactivityDays: decay ? decay.freezed_interval_ms / (24 * 60 * 60 * 1000) : null,
      lostExp: decay?.value ?? null,
    };
  }
}
