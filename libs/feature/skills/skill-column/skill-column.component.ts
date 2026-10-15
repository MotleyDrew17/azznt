import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterEveryRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { Skill } from '../../../core/shared/classes/skill.class';
import { SkillDialogKind } from '../../../core/shared/enums/skill-dialog-kind.enum';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { SkillService } from '../../../core/shared/services/skill.service';
import { HintDirective } from '../../../core/shared/directives/hint.directive';

@Component({
  selector: 'gm-skill-column',
  imports: [HintDirective],
  templateUrl: './skill-column.component.html',
  styleUrl: './skill-column.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.skill-column_active]': 'active()',
    '[class.skill-column_fill]': 'fill()',
    '[class.skill-column_decaying]': 'decaying()',
  },
})
export class SkillColumnComponent {
  private dialogService = inject(DialogService);
  private skillService = inject(SkillService);
  private nameRef = viewChild<ElementRef<HTMLElement>>('nameLabel');
  private now = signal(Date.now());

  readonly nameOverflow = signal(false);

  skill = input<Skill>();
  active = input(true);
  showDelete = input(true);
  fill = input(false);

  readonly name = computed(() => {
    this.skillService.skills();
    return this.skill()?.name ?? '';
  });
  readonly description = computed(() => {
    this.skillService.skills();
    return this.skill()?.description ?? '';
  });
  readonly currentLevel = computed(() => {
    this.skillService.skills();
    return this.skill()?.getLevel()?.score ?? 1;
  });
  readonly nextLevel = computed(() => this.currentLevel() + 1);
  readonly currentExp = computed(() => {
    this.skillService.skills();
    return this.skill()?.getLevel()?.current_exp ?? 0;
  });
  readonly requiredExp = computed(() => {
    this.skillService.skills();
    return this.skill()?.getLevel()?.next_exp ?? 0;
  });
  readonly availableActions = computed(() => {
    const skill = this.skill();
    if (!skill) return 0;
    return skill.exercises.filter((exercise) => exercise.isAvailable(this.currentLevel())).length;
  });
  readonly fillPercent = computed(() => {
    const required = this.requiredExp();
    if (required <= 0) return 0;
    const percent = (this.currentExp() / required) * 100;
    return Math.min(100, Math.max(0, percent));
  });
  readonly hasDecay = computed(() => {
    this.skillService.skills();
    return !!this.skill()?.getLevel()?.decay;
  });
  readonly decayValue = computed(() => {
    this.skillService.skills();
    return this.skill()?.getLevel()?.decay?.value ?? 0;
  });
  readonly decayDelay = computed(() => {
    this.skillService.skills();
    const till = this.skill()?.getDecayTimestamp() ?? 0;
    if (!this.hasDecay() || till <= 0) return formatDecayDelay(0);
    return formatDecayDelay(till - this.now());
  });
  readonly decaying = computed(() => {
    this.skillService.skills();
    if (!this.hasDecay()) return false;
    return (this.skill()?.getDecayTimestamp() ?? 0) <= this.now();
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    afterEveryRender(() => {
      const name = this.nameRef()?.nativeElement;
      const overflow = !!name && name.scrollWidth > name.clientWidth;
      if (overflow !== this.nameOverflow()) this.nameOverflow.set(overflow);
    });
  }

  edit(event: Event): void {
    event.stopPropagation();
    const skill = this.skill();
    if (!this.active() || !skill) return;
    this.dialogService.openSkillDialog({ kind: SkillDialogKind.Edit, id: skill.id });
  }

  remove(event: Event): void {
    event.stopPropagation();
    const skill = this.skill();
    if (!this.active() || !this.showDelete() || !skill) return;
    const id = skill.id;

    this.dialogService.openConfirmDialog({
      title: 'Удалить навык',
      message: `Навык «${skill.name}» будет удалён.`,
      okLabel: 'Удалить',
      onOk: () => this.skillService.removeSkill(id),
    });
  }
}

function formatDecayDelay(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
