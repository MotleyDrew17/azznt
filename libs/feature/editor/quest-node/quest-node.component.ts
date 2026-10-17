import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Quest, QuestPriority } from '../../../core/shared/classes/quest.class';

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

@Component({
  selector: 'gm-quest-node',
  templateUrl: './quest-node.component.html',
  styleUrl: './quest-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestNodeComponent {
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
  readonly available = input(true);
  readonly sparks = QUEST_SPARKS;

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
