import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { HintDirective } from '../../../core/shared/directives/hint.directive';
import { ScrollDirective } from '../../../core/shared/directives/scroll.directive';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { SkillService } from '../../../core/shared/services/skill.service';
import { SkillColumnComponent } from '../skill-column/skill-column.component';
import { ExerciseRowComponent } from './exercise/exercise.component';

@Component({
  selector: 'gm-skill-page',
  imports: [SkillColumnComponent, ExerciseRowComponent, HintDirective, ScrollDirective],
  templateUrl: './skill-page.component.html',
  styleUrl: './skill-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private skillService = inject(SkillService);
  private dialogService = inject(DialogService);
  private params = toSignal(this.route.paramMap);

  readonly skill = computed(() => {
    const id = this.params()?.get('id');
    if (!id) return null;
    return this.skillService.skills().find((item) => item.id === id) ?? null;
  });

  readonly layers = computed(() => {
    const id = this.params()?.get('id');
    const skill = id ? this.skillService.skills().find((item) => item.id === id) : undefined;
    const score = skill?.getLevel()?.score ?? 1;
    return (skill?.getLayers() ?? [])
      .map((layer) => ({
        levelScore: layer.levelScore,
        exercises: [...layer.exercises],
        state: layer.levelScore < score ? 'reached' : layer.levelScore === score ? 'current' : 'locked',
      }))
      .sort((a, b) => b.levelScore - a.levelScore);
  });

  ngOnInit(): void {
    if (!this.skillService.skills().length) this.skillService.loadSkills();
  }

  openLayerDialog(): void {
    const skill = this.skill();
    if (!skill) return;
    this.dialogService.openLayerDialog({ skillId: skill.id });
  }

  openExerciseDialog(levelScore: number): void {
    const skill = this.skill();
    if (!skill) return;
    this.dialogService.openExerciseDialog({ skillId: skill.id, levelScore });
  }

  confirmRemoveLayer(levelScore: number): void {
    const skill = this.skill();
    if (!skill || levelScore <= 1) return;
    const id = skill.id;

    this.dialogService.openConfirmDialog({
      title: 'Вы хотите удалить уровень?',
      message: 'Удаление уровня также удалит все упражнения на нем.',
      okLabel: 'Удалить',
      onOk: () => this.skillService.removeLayer(id, levelScore),
    });
  }
}
