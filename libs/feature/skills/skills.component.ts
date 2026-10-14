import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogService } from '../../core/shared/services/dialog.service';
import { SkillService } from '../../core/shared/services/skill.service';
import { SkillDialogKind } from '../../core/shared/enums/skill-dialog-kind.enum';
import { SkillItemComponent } from './skill-item/skill-item.component';

@Component({
  selector: 'gm-skills',
  imports: [SkillItemComponent],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsComponent {
  private dialogService = inject(DialogService);
  private skillService = inject(SkillService);

  readonly skills = this.skillService.skills;

  openSkillDialog(): void {
    this.dialogService.openSkillDialog({ kind: SkillDialogKind.New });
  }
}
