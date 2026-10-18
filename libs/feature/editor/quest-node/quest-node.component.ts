import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Quest, QuestPriority } from '../../../core/shared/classes/quest.class';
import { GraphService } from '../../../core/shared/services/graph.service';
import { RewardGemComponent } from '../reward-gem/reward-gem.component';

interface QuestSpark {
  left: number;
  top: number;
  delay: number;
}

// Позиции искр
const QUEST_SPARKS: QuestSpark[] = [
  { left: 50, top: 0, delay: 40 },
  { left: 100, top: 18, delay: 220 },
  { left: 100, top: 82, delay: 460 },
  { left: 50, top: 100, delay: 720 },
  { left: 0, top: 82, delay: 980 },
  { left: 0, top: 18, delay: 1240 },
];

// Пауза до вмятины и длительность возврата
const PRESS_DELAY_MS = 1500;
const PRESS_MS = 900;

const VOWEL = /[aeiouyаеёиоуыэюя]/i;

// Первые согласные названия, не больше трёх
function questMark(name: string): string {
  const consonants: string[] = [];
  for (const char of name) {
    if (!/\p{L}/u.test(char) || VOWEL.test(char)) continue;
    const lower = char.toLowerCase();
    if (lower === 'ь' || lower === 'ъ') continue;
    consonants.push(char);
    if (consonants.length === 3) break;
  }
  return consonants.join('').toLocaleUpperCase('ru');
}

@Component({
  selector: 'gm-quest-node',
  imports: [RewardGemComponent],
  templateUrl: './quest-node.component.html',
  styleUrl: './quest-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestNodeComponent {
  private graphService = inject(GraphService);

  readonly QuestPriority = QuestPriority;
  readonly quest = input<Quest>();
  readonly nodeId = input('');
  readonly left = input(0);
  readonly top = input(0);
  readonly size = input(48);
  readonly shiftHeld = input(false);
  readonly grabbing = input(false);
  readonly selected = input(false);
  readonly priority = input(QuestPriority.Common);
  readonly completed = input(false);
  readonly failed = input(false);
  readonly available = input(true);
  readonly sparks = QUEST_SPARKS;
  // Согласные в центре кружка
  readonly mark = computed(() => {
    this.graphService.listVersion();
    return questMark(this.quest()?.name ?? '');
  });

  private burstToken = 0;
  private burstTimer = 0;
  private pressTimer = 0;
  private primed = false;
  private seenCompleted = false;
  private burst = signal(0);
  readonly bursts = computed(() => {
    const burst = this.burst();
    return burst ? [burst] : [];
  });
  // Плавный переход вмятины
  readonly pressing = signal(false);
  // Зелёный вид после вспышки обода
  readonly shownCompleted = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      window.clearTimeout(this.burstTimer);
      window.clearTimeout(this.pressTimer);
    });
    effect(() => {
      const completed = this.completed();
      // Уже выполненные квесты при открытии не вспыхивают
      if (!this.primed) {
        this.primed = true;
        this.seenCompleted = completed;
        this.pressing.set(completed);
        this.shownCompleted.set(completed);
        return;
      }
      const started = completed && !this.seenCompleted;
      this.seenCompleted = completed;
      if (started) {
        this.#celebrate();
        return;
      }
      if (!completed) this.#showOpen();
    });
  }

  // Вспышка обода, затем вмятина
  #celebrate(): void {
    const id = ++this.burstToken;
    this.burst.set(id);
    this.pressing.set(true);
    this.shownCompleted.set(false);
    window.clearTimeout(this.burstTimer);
    window.clearTimeout(this.pressTimer);
    this.burstTimer = window.setTimeout(() => {
      if (this.burst() === id) this.burst.set(0);
    }, 4100);
    this.pressTimer = window.setTimeout(() => {
      if (this.completed()) this.shownCompleted.set(true);
    }, PRESS_DELAY_MS);
  }

  // Снять выполнение
  #showOpen(): void {
    window.clearTimeout(this.pressTimer);
    this.shownCompleted.set(false);
    window.clearTimeout(this.burstTimer);
    this.burst.set(0);
    this.pressTimer = window.setTimeout(() => this.pressing.set(false), PRESS_MS);
  }
}
