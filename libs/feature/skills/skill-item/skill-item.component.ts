import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skill } from '../../../core/shared/classes/skill.class';

@Component({
  selector: 'gm-skill-item',
  templateUrl: './skill-item.component.html',
  styleUrl: './skill-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillItemComponent {
  skill = input<Skill>();

}
