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
import { DialogService } from '../../../core/shared/services/dialog.service';
import { EditorDialogKind } from '../editor-dialog/editor-dialog.component';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { QuestNodeComponent } from '../quest-node/quest-node.component';

interface QuestEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrow: string;
}

@Component({
  selector: 'gm-work-field',
  imports: [QuestNodeComponent, ButtonComponent],
  templateUrl: './work-field.component.html',
  styleUrl: './work-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(click)': 'onClick($event)',
    '(contextmenu)': 'onContextMenu($event)',
    '[class.is-grabbing]': 'grabbedId() !== null',
    '[class.is-linking]': 'linkDraft() !== null',
  },
})
export class WorkFieldComponent implements OnInit, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);
  private graphService = inject(GraphService);
  private dialogService = inject(DialogService);

  private graph = this.graphService.graph;
  readonly quests = computed(() => {
    this.graphService.listVersion();
    const root = this.graph();
    if (!root) return [];
    return this.graphService.questsList;
  });
  #keys = new WeakMap<Quest, string>();
  #keyIndex = 0;

  readonly selectedQuestId = this.graphService.selectedQuestId;
  readonly selectedQuest = computed(() => {
    const id = this.selectedQuestId();
    if (!id) return undefined;
    return this.quests().find((quest) => quest.id === id);
  });
  readonly shiftHeld = signal(false);
  readonly rootId = computed(() => this.graph()?.id ?? null);
  readonly edges = computed(() => {
    this.#overrides();
    const edges: QuestEdge[] = [];

    for (const quest of this.quests()) {
      for (const parent of quest.parents) {
        if (!parent || parent === quest) continue;
        const edge = this.#edgeToParent(quest, parent);
        if (edge) edges.push(edge);
      }
    }

    return edges;
  });
  readonly linkDraft = signal<{ fromId: string; x: number; y: number; targetId: string | null } | null>(null);
  readonly draftEdge = computed(() => {
    const draft = this.linkDraft();
    if (!draft) return null;

    const from = this.quests().find((quest) => quest.id === draft.fromId);
    if (!from) return null;

    if (draft.targetId) {
      const target = this.quests().find((quest) => quest.id === draft.targetId);
      if (target) return this.#edgeToParent(from, target);
    }

    return this.#edgeToPoint(from, draft.x, draft.y);
  });
  readonly contextMenu = signal<{ x: number; y: number; pinX: number; pinY: number } | null>(null);
  readonly grabbedId = signal<string | null>(null);
  #overrides = signal(new Map<string, { x: number; y: number }>());
  #grabOffsetX = 0;
  #grabOffsetY = 0;
  #pointerId: number | null = null;
  #suppressClick = false;
  #nodeWidth = 48;
  #nodeHeight = 48;
  #toolbarHeight = 36;
  #menuWidth = 180;
  #menuHeight = 44;

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.linkDraft.set(null);
      return;
    }
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

  #onDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('.context-menu')) return;
    this.contextMenu.set(null);
  };

  ngOnInit(): void {
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keyup', this.#onKeyUp);
    document.addEventListener('pointerdown', this.#onDocumentPointerDown);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('keyup', this.#onKeyUp);
    document.removeEventListener('pointerdown', this.#onDocumentPointerDown);
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

  toolbarPosition(quest: Quest): { x: number; y: number } {
    const gap = 8;
    const field = this.host.nativeElement;
    const left = this.leftOf(quest);
    const top = this.topOf(quest);
    const toolbarWidth = this.toolbarWidth(quest);
    let x = left + this.#nodeWidth + gap;
    if (x + toolbarWidth > field.clientWidth) {
      x = left - gap - toolbarWidth;
    }
    const y = top + (this.#nodeHeight - this.#toolbarHeight) / 2;
    return {
      x: Math.max(0, x),
      y: Math.min(Math.max(0, y), Math.max(0, field.clientHeight - this.#toolbarHeight)),
    };
  }

  hintBelow(quest: Quest): boolean {
    const y = this.toolbarPosition(quest).y;
    const above = y;
    const below = this.host.nativeElement.clientHeight - y - this.#toolbarHeight;
    return above < 32 && below > above;
  }

  canLink(quest: Quest): boolean {
    return !this.#isRoot(quest);
  }

  canDelete(quest: Quest): boolean {
    return !this.#isRoot(quest);
  }

  toolbarWidth(quest: Quest): number {
    let count = 2;
    if (this.canLink(quest)) count++;
    if (this.canDelete(quest)) count++;
    return count * 28 + (count - 1) * 2 + 8;
  }

  startLink(event: MouseEvent): void {
    const quest = this.selectedQuest();
    if (!quest || !this.canLink(quest)) return;

    const origin = this.#origin();
    this.linkDraft.set({
      fromId: quest.id,
      x: event.clientX - origin.left,
      y: event.clientY - origin.top,
      targetId: null,
    });
  }

  openRelatedQuest(): void {
    const quest = this.selectedQuest();
    if (!quest) return;

    this.linkDraft.set(null);
    const offset = 16;
    const pos = this.#clamp(this.leftOf(quest) + offset, this.topOf(quest) + offset);
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Relation,
      name: '',
      description: '',
      anchorId: quest.id,
      relation: this.#isRoot(quest) ? 'previous' : 'next',
      pos_x: pos.x,
      pos_y: pos.y,
    });
  }

  editSelectedQuest(): void {
    this.linkDraft.set(null);
    const quest = this.selectedQuest();
    if (!quest) return;

    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Edit,
      id: quest.id,
      name: quest.name,
      description: quest.description,
    });
  }

  deleteSelectedQuest(): void {
    this.linkDraft.set(null);
    const quest = this.selectedQuest();
    if (!quest || !this.canDelete(quest)) return;
    const id = quest.id;

    this.dialogService.openConfirmDialog({
      title: 'Удалить квест',
      message: 'Квест будет удалён.',
      okLabel: 'Удалить',
      onOk: () => this.graphService.removeQuest(id),
    });
  }

  onPointerDown(event: PointerEvent): void {
    this.#suppressClick = false;
    if (this.linkDraft() || !event.shiftKey || this.grabbedId()) return;

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
    this.#moveLink(event);

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

  onContextMenu(event: MouseEvent): void {
    if (!event.shiftKey || this.#nodeFromEvent(event)) {
      this.contextMenu.set(null);
      return;
    }

    event.preventDefault();
    const origin = this.#origin();
    const pinX = event.clientX - origin.left;
    const pinY = event.clientY - origin.top;
    const menu = this.#placeMenu(pinX + 14, pinY + 14);
    this.contextMenu.set({ x: menu.x, y: menu.y, pinX, pinY });
  }

  openCreateQuest(): void {
    const menu = this.contextMenu();
    this.contextMenu.set(null);
    if (!menu) return;

    const pos = this.#clamp(menu.pinX - this.#nodeWidth / 2, menu.pinY - this.#nodeHeight / 2);
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Quest,
      name: '',
      description: '',
      pos_x: pos.x,
      pos_y: pos.y,
    });
  }

  onClick(event: MouseEvent): void {
    if (this.#suppressClick) {
      this.#suppressClick = false;
      return;
    }

    const node = this.#nodeFromEvent(event);
    const key = node?.dataset['questId'];
    const quest = key ? this.#questByKey(key) : undefined;
    const draft = this.linkDraft();

    if (draft) {
      if (quest && quest.id !== draft.fromId) {
        const error = this.graphService.linkQuests(draft.fromId, quest.id);
        if (error) {
          this.dialogService.openWarningDialog({
            title: 'Нельзя соединить',
            message: error,
          });
        }
      }
      this.linkDraft.set(null);
      return;
    }

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
    const wasGrabbing = this.grabbedId() !== null;
    const host = this.host.nativeElement;
    const pointerId = event?.pointerId ?? this.#pointerId;
    if (pointerId !== null && host.hasPointerCapture(pointerId)) {
      host.releasePointerCapture(pointerId);
    }
    this.#pointerId = null;
    this.grabbedId.set(null);
    this.#unlisten();

    if (wasGrabbing) this.#suppressClick = true;
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
    this.graphService.saveGraphToStorage();
  }

  #setOverride(id: string, x: number, y: number): void {
    const next = new Map(this.#overrides());
    next.set(id, { x, y });
    this.#overrides.set(next);
  }


  #questByKey(key: string): Quest | undefined {
    return this.quests().find((quest) => this.keyOf(quest) === key);
  }

  #isRoot(quest: Quest): boolean {
    return quest.id === this.rootId() || quest.isRoot;
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

  #placeMenu(x: number, y: number): { x: number; y: number } {
    const field = this.host.nativeElement;
    const maxX = Math.max(0, field.clientWidth - this.#menuWidth);
    const maxY = Math.max(0, field.clientHeight - this.#menuHeight);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  }

  #moveLink(event: PointerEvent): void {
    const draft = this.linkDraft();
    if (!draft) return;

    const origin = this.#origin();
    const node = this.#nodeFromEvent(event);
    const key = node?.dataset['questId'];
    const target = key ? this.#questByKey(key) : undefined;

    this.linkDraft.set({
      fromId: draft.fromId,
      x: event.clientX - origin.left,
      y: event.clientY - origin.top,
      targetId: target && target.id !== draft.fromId ? target.id : null,
    });
  }

  #edgeToParent(quest: Quest, parent: Quest): QuestEdge | null {
    const radius = this.#nodeWidth / 2;
    return this.#edge(
      `${quest.id}:${parent.id}`,
      this.leftOf(quest) + radius,
      this.topOf(quest) + radius,
      this.leftOf(parent) + radius,
      this.topOf(parent) + radius,
      radius,
    );
  }

  #edgeToPoint(quest: Quest, x: number, y: number): QuestEdge | null {
    const radius = this.#nodeWidth / 2;
    return this.#edge(
      'draft',
      this.leftOf(quest) + radius,
      this.topOf(quest) + radius,
      x,
      y,
      0,
    );
  }

  #edge(id: string, fromX: number, fromY: number, toX: number, toY: number, endGap: number): QuestEdge | null {
    const radius = this.#nodeWidth / 2;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    const head = Math.min(9, Math.max(0, length - radius - endGap));
    if (head <= 0) return null;

    const ux = dx / length;
    const uy = dy / length;
    const x1 = fromX + ux * radius;
    const y1 = fromY + uy * radius;
    const tipX = toX - ux * endGap;
    const tipY = toY - uy * endGap;
    const x2 = tipX - ux * head;
    const y2 = tipY - uy * head;
    const wing = head * 0.55;
    const px = -uy;
    const py = ux;

    return {
      id,
      x1,
      y1,
      x2,
      y2,
      arrow: `${tipX},${tipY} ${x2 + px * wing},${y2 + py * wing} ${x2 - px * wing},${y2 - py * wing}`,
    };
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
