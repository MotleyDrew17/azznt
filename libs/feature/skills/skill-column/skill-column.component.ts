import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterEveryRender, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Skill, roundExp } from '../../../core/shared/classes/skill.class';
import { FieldMode } from '../../../core/shared/enums/field-mode.enum';
import { SkillDialogKind } from '../../../core/shared/enums/skill-dialog-kind.enum';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { FieldModeService } from '../../../core/shared/services/field-mode.service';
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
  private fieldMode = inject(FieldModeService);

  readonly editor = computed(() => this.fieldMode.mode() === FieldMode.Editor);
  private nameRef = viewChild<ElementRef<HTMLElement>>('nameLabel');
  private now = signal(Date.now());
  private trackedSkill: string | null = null;
  private seenLevel = 1;
  private seenExercise = -1;
  private dropToken = 0;
  private levelToken = 0;
  private dropTimers: number[] = [];
  private levelTimer = 0;

  readonly nameOverflow = signal(false);
  readonly drops = signal<SkillDrop[]>([]);
  readonly levelBurst = signal(0);
  readonly levelMarks = computed(() => {
    const burst = this.levelBurst();
    return burst ? [burst] : [];
  });
  readonly sparks = LEVEL_SPARKS;

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
    const level = this.skill()?.getLevel();
    if (!level) return 0;
    return roundExp(Math.max(0, level.current_exp - level.prev_exp));
  });
  readonly requiredExp = computed(() => {
    this.skillService.skills();
    const level = this.skill()?.getLevel();
    if (!level) return 0;
    return roundExp(Math.max(0, level.next_exp - level.prev_exp));
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
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      clearInterval(timer);
      window.clearTimeout(this.levelTimer);
      for (const dropTimer of this.dropTimers) clearTimeout(dropTimer);
    });

    effect(() => {
      const skillId = this.skill()?.id ?? null;
      const level = this.currentLevel();
      const done = this.skillService.exerciseDone();
      if (skillId !== this.trackedSkill) {
        this.trackedSkill = skillId;
        this.seenLevel = level;
        this.seenExercise = done && done.skillId === skillId ? done.count : 0;
        return;
      }
      const leveled = level > this.seenLevel;
      this.seenLevel = level;
      if (!done || done.skillId !== skillId || done.count === this.seenExercise) return;
      this.seenExercise = done.count;
      this.spawnDrops();
      if (leveled) this.celebrate();
    });

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

  private celebrate(): void {
    const id = ++this.levelToken;
    this.levelBurst.set(id);
    window.clearTimeout(this.levelTimer);
    this.levelTimer = window.setTimeout(() => {
      if (this.levelBurst() === id) this.levelBurst.set(0);
    }, 4100);
  }

  private spawnDrops(): void {
    const created: SkillDrop[] = [];
    for (let wave = 0; wave < 3; wave++) {
      for (const [index, left] of [24, 48, 72].entries()) {
        created.push({
          id: ++this.dropToken,
          left,
          delay: wave * 900 + index * 80,
        });
      }
    }
    this.drops.update((drops) => [...drops, ...created]);
    const ids = new Set(created.map((drop) => drop.id));
    this.dropTimers.push(window.setTimeout(() => {
      this.drops.update((drops) => drops.filter((drop) => !ids.has(drop.id)));
    }, 3000));
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

interface SkillDrop {
  id: number;
  left: number;
  delay: number;
}

interface LevelSpark {
  left: number;
  top: number;
  delay: number;
}

const LEVEL_SPARKS: LevelSpark[] = [
  { left: 50, top: 0, delay: 320 },
  { left: 6, top: 16, delay: 770 },
  { left: 94, top: 24, delay: 1150 },
  { left: 0, top: 48, delay: 1540 },
  { left: 100, top: 62, delay: 1890 },
  { left: 14, top: 100, delay: 2270 },
  { left: 82, top: 96, delay: 2660 },
];

function formatDecayDelay(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
