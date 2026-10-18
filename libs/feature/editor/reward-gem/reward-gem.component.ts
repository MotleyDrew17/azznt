import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';
import { Quest } from '../../../core/shared/classes/quest.class';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { GraphService } from '../../../core/shared/services/graph.service';

@Component({
  selector: 'gm-reward-gem',
  imports: [DisabledDirective],
  templateUrl: './reward-gem.component.html',
  styleUrl: './reward-gem.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardGemComponent {
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private graphService = inject(GraphService);

  readonly quest = input.required<Quest>();
  readonly open = signal(false);
  readonly above = signal(true);
  readonly left = signal(0);
  readonly top = signal(0);

  // Список наград обновляется после «Забрать»
  readonly rewards = computed(() => {
    this.graphService.listVersion();
    return this.quest().rewards;
  });
  readonly claimable = computed(() => {
    this.graphService.listVersion();
    return this.quest().rewardClaimable;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#unlisten());
  }

  // Открыть или закрыть описание награды
  toggle(event: Event): void {
    event.stopPropagation();
    if (this.open()) {
      this.#close();
      return;
    }
    this.#place();
    this.open.set(true);
    document.addEventListener('pointerdown', this.#onPointerDown, true);
    document.addEventListener('scroll', this.#onScroll, true);
  }

  // Забрать одну награду
  claim(event: Event, id: string): void {
    event.stopPropagation();
    this.graphService.takeReward(this.quest().id, id);
  }

  #onPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (target instanceof Node && this.element.nativeElement.contains(target)) return;
    this.#close();
  };

  #onScroll = (): void => {
    this.#close();
  };

  #close(): void {
    this.open.set(false);
    this.#unlisten();
  }

  #unlisten(): void {
    document.removeEventListener('pointerdown', this.#onPointerDown, true);
    document.removeEventListener('scroll', this.#onScroll, true);
  }

  #place(): void {
    const rect = this.element.nativeElement.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
    const above = rect.top > 160;
    this.above.set(above);
    this.left.set(left);
    this.top.set(above ? rect.top : rect.bottom);
  }
}
