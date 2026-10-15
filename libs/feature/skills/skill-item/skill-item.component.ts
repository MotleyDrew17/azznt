import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Skill } from '../../../core/shared/classes/skill.class';
import { SkillColumnComponent } from '../skill-column/skill-column.component';

@Component({
  selector: 'gm-skill-item',
  imports: [SkillColumnComponent],
  templateUrl: './skill-item.component.html',
  styleUrl: './skill-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-active]': 'active()',
  },
})
export class SkillItemComponent {
  private router = inject(Router);

  skill = input<Skill>();
  active = input(true);
  blockClick = input(false);

  open(): void {
    const skill = this.skill();
    if (!this.active() || this.blockClick() || !skill) return;
    void this.router.navigate(['/skill', skill.id]);
  }
}
