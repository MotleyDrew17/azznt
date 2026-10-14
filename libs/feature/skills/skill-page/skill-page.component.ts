import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'gm-skill-page',
  templateUrl: './skill-page.component.html',
  styleUrl: './skill-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillPageComponent {}
