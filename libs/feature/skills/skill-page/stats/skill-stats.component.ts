import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'gm-skill-stats',
  templateUrl: './skill-stats.component.html',
  styleUrl: './skill-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillStatsComponent {}
