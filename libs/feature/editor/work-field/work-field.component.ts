import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Quest } from '../../../core/shared/classes/quest.class';
import { GraphService } from '../../../core/shared/services/graph.service';
import { QuestNodeComponent } from '../quest-node/quest-node.component';

@Component({
  selector: 'gm-work-field',
  imports: [QuestNodeComponent],
  templateUrl: './work-field.component.html',
  styleUrl: './work-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(click)': 'onClick($event)',
    '[class.is-grabbing]': 'grabbedId() !== null',
  },
})
export class WorkFieldComponent implements OnInit, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);
  private graphService = inject(GraphService);

  private graph = this.graphService.graph;
  readonly quests = computed(() => {
    const root = this.graph();
    if (!root) return [];
    return this.graphService.questsList;
  });
  #keys = new WeakMap<Quest, string>();
  #keyIndex = 0;

  readonly selectedQuestId = this.graphService.selectedQuestId;
  readonly shiftHeld = signal(false);
  readonly grabbedId = signal<string | null>(null);
  #overrides = signal(new Map<string, { x: number; y: number }>());
  #grabOffsetX = 0;
  #grabOffsetY = 0;
  #pointerId: number | null = null;
  #nodeWidth = 48;
  #nodeHeight = 48;

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Shift' || this.shiftHeld()) return;
    this.shiftHeld.set(true);
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Shift') return;
    this.shiftHeld.set(false);
    this.#endGrab();
    this.#commit();
  };

  #onDocumentPointerUp = (event: PointerEvent): void => {
    this.onPointerUp(event);
  };

  #onPointerLeavePage = (): void => {
    this.#endGrab();
    this.#commit();
  };

  #onWindowBlur = (): void => {
    this.shiftHeld.set(false);
    this.#endGrab();
    this.#commit();
  };

  ngOnInit(): void {
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keyup', this.#onKeyUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('keyup', this.#onKeyUp);
    this.#endGrab();
    this.#commit();
  }

  keyOf(quest: Quest): string {
    if (quest.id) return quest.id;

    const existing = this.#keys.get(quest);
    if (existing) return existing;

    const key = `node-${this.#keyIndex++}`;
    this.#keys.set(quest, key);
    return key;
  }

  leftOf(quest: Quest): number {
    return this.#overrides().get(this.keyOf(quest))?.x ?? quest.pos_x ?? 0;
  }

  topOf(quest: Quest): number {
    return this.#overrides().get(this.keyOf(quest))?.y ?? quest.pos_y ?? 0;
  }

  onPointerDown(event: PointerEvent): void {
    if (!event.shiftKey || this.grabbedId()) return;

    const node = this.#nodeFromEvent(event);
    const id = node?.dataset['questId'];
    const quest = id ? this.#questByKey(id) : undefined;
    if (!node || !id || !quest) return;

    event.preventDefault();
    this.host.nativeElement.setPointerCapture(event.pointerId);
    const origin = this.#origin();
    this.#grabOffsetX = event.clientX - origin.left - this.leftOf(quest);
    this.#grabOffsetY = event.clientY - origin.top - this.topOf(quest);
    this.#nodeWidth = node.offsetWidth;
    this.#nodeHeight = node.offsetHeight;
    this.#pointerId = event.pointerId;
    this.grabbedId.set(id);
    this.#listen();
  }

  onPointerMove(event: PointerEvent): void {
    const id = this.grabbedId();
    if (!id) return;

    if (event.buttons === 0 || !event.shiftKey) {
      this.#endGrab();
      if (!event.shiftKey) this.#commit();
      return;
    }

    const origin = this.#origin();
    const next = this.#clamp(
      event.clientX - origin.left - this.#grabOffsetX,
      event.clientY - origin.top - this.#grabOffsetY,
    );
    this.#setOverride(id, next.x, next.y);
  }

  onClick(event: MouseEvent): void {
    const node = this.#nodeFromEvent(event);
    const key = node?.dataset['questId'];
    const quest = key ? this.#questByKey(key) : undefined;
    this.graphService.selectQuest(quest?.id ?? null);
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.grabbedId()) return;
    this.#endGrab(event);
  }

  #listen(): void {
    this.#unlisten();
    document.addEventListener('pointerup', this.#onDocumentPointerUp);
    document.addEventListener('pointercancel', this.#onDocumentPointerUp);
    document.documentElement.addEventListener('pointerleave', this.#onPointerLeavePage);
    window.addEventListener('blur', this.#onWindowBlur);
  }

  #unlisten(): void {
    document.removeEventListener('pointerup', this.#onDocumentPointerUp);
    document.removeEventListener('pointercancel', this.#onDocumentPointerUp);
    document.documentElement.removeEventListener('pointerleave', this.#onPointerLeavePage);
    window.removeEventListener('blur', this.#onWindowBlur);
  }

  #endGrab(event?: PointerEvent): void {
    const host = this.host.nativeElement;
    const pointerId = event?.pointerId ?? this.#pointerId;
    if (pointerId !== null && host.hasPointerCapture(pointerId)) {
      host.releasePointerCapture(pointerId);
    }
    this.#pointerId = null;
    this.grabbedId.set(null);
    this.#unlisten();
  }

  #commit(): void {
    const overrides = this.#overrides();
    if (overrides.size === 0) return;

    for (const quest of this.quests()) {
      const pos = overrides.get(this.keyOf(quest));
      if (!pos) continue;
      quest.pos_x = pos.x;
      quest.pos_y = pos.y;
    }
    this.#overrides.set(new Map());
  }

  #setOverride(id: string, x: number, y: number): void {
    const next = new Map(this.#overrides());
    next.set(id, { x, y });
    this.#overrides.set(next);
  }


  #questByKey(key: string): Quest | undefined {
    return this.quests().find((quest) => this.keyOf(quest) === key);
  }

  #nodeFromEvent(event: Event): HTMLElement | null {
    const target = event.target;
    if (!(target instanceof Element)) return null;

    const node = target.closest('[data-quest-id]');
    return node instanceof HTMLElement ? node : null;
  }

  #origin(): { left: number; top: number } {
    const rect = this.host.nativeElement.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }

  #clamp(x: number, y: number): { x: number; y: number } {
    const field = this.host.nativeElement;
    const maxX = Math.max(0, field.clientWidth - this.#nodeWidth);
    const maxY = Math.max(0, field.clientHeight - this.#nodeHeight);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  }
}
