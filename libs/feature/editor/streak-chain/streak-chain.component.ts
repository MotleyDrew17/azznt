import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Quest, StreakDay } from '../../../core/shared/classes/quest.class';
import { startOfLocalDay } from '../../../core/shared/classes/skill.class';
import { SkillService } from '../../../core/shared/services/skill.service';

type StreakTone = 'idle' | 'done' | 'missed';

interface StreakMark {
  day: StreakDay;
  tone: StreakTone;
}

@Component({
  selector: 'gm-streak-chain',
  templateUrl: './streak-chain.component.html',
  styleUrl: './streak-chain.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakChainComponent {
  private skillService = inject(SkillService);

  readonly quest = input.required<Quest>();

  // Кружки серии: ещё не наступило, выполнено или пропущено
  readonly marks = computed(() => {
    this.skillService.now();
    this.skillService.exerciseDone();
    const quest = this.quest();
    const goal = quest.streak?.mustBeDoneCount ?? 0;
    const today = startOfLocalDay(this.skillService.now());
    let won = 0;
    return quest.streakDays.map((day): StreakMark => {
      let tone: StreakTone = 'idle';
      if (day.was_done) {
        tone = 'done';
        won += 1;
      } else if (day.date_ms < today && won < goal) {
        tone = 'missed';
      }
      return { day, tone };
    });
  });
}
