import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Quest } from '../../../core/shared/classes/quest.class';
import { GraphService } from '../../../core/shared/services/graph.service';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { EditorDialogKind } from '../editor-dialog/editor-dialog.component';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { QuestNodeComponent } from '../quest-node/quest-node.component';
import { FieldAction, modeAllows } from '../../../core/shared/enums/field-mode.enum';
import { FieldModeService } from '../../../core/shared/services/field-mode.service';
import { HintDirective } from '../../../core/shared/directives/hint.directive';

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
  imports: [QuestNodeComponent, ButtonComponent, HintDirective],
  templateUrl: './work-field.component.html',
  styleUrl: './work-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(click)': 'onClick($event)',
    '(contextmenu)': 'onContextMenu($event)',
    '(pointerover)': 'onPointerOver($event)',
    '(pointerout)': 'onPointerOut($event)',
    '[class.is-grabbing]': 'grabbedId() !== null',
    '[class.is-panning]': 'panning()',
    '[class.is-space]': 'spaceHeld() && !panning()',
    '[class.is-linking]': 'linkDraft() !== null',
    '[style.--field-zoom]': 'zoom()',
  },
})
export class WorkFieldComponent implements OnInit, OnDestroy {
  readonly FieldAction = FieldAction;

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

  readonly mode = inject(FieldModeService).mode;
  readonly showToolbar = computed(() =>
    [FieldAction.LinkQuest, FieldAction.AddQuest, FieldAction.EditQuest, FieldAction.DeleteQuest].some((action) =>
      modeAllows(this.mode(), action),
    ),
  );
  readonly pan = signal({ x: 0, y: 0 });
  readonly zoom = signal(1);
  #zoomMin = 0.25;
  #zoomMax = 1.5;
  readonly panning = signal(false);
  readonly viewport = signal({ width: 0, height: 0 });
  readonly selectedQuestId = this.graphService.selectedQuestId;
  readonly selectedQuest = computed(() => {
    const id = this.selectedQuestId();
    if (!id) return undefined;
    return this.quests().find((quest) => quest.id === id);
  });
  readonly shiftHeld = signal(false);
  readonly spaceHeld = signal(false);
  readonly hoveredId = signal<string | null>(null);
  readonly hoveredQuest = computed(() => {
    const id = this.hoveredId();
    if (!id) return undefined;
    const quest = this.quests().find((item) => this.keyOf(item) === id);
    if (!quest || (!quest.name.trim() && !quest.description.trim())) return undefined;
    return quest;
  });
  readonly cardQuest = computed(() => {
    if (this.allows(FieldAction.PinCard)) {
      const selected = this.selectedQuest();
      if (selected && (selected.name.trim() || selected.description.trim())) return selected;
    }
    return this.hoveredQuest();
  });
  readonly cardPinned = computed(() => {
    const quest = this.cardQuest();
    return this.allows(FieldAction.PinCard) && !!quest && quest.id === this.selectedQuestId();
  });
  readonly visibleQuests = computed(() => {
    this.#overrides();
    const quests = this.quests();
    const { width, height } = this.viewport();
    if (width === 0 || height === 0) return quests;

    const pan = this.pan();
    const zoom = this.zoom();
    const buffer = 320 / zoom;
    const left = pan.x - buffer;
    const top = pan.y - buffer;
    const right = pan.x + width / zoom + buffer;
    const bottom = pan.y + height / zoom + buffer;
    return quests.filter((quest) => {
      const x = this.#worldX(quest);
      const y = this.#worldY(quest);
      return x + this.#nodeWidth >= left && x <= right && y + this.#nodeHeight >= top && y <= bottom;
    });
  });
  readonly rootId = computed(() => this.graph()?.id ?? null);
  readonly edges = computed(() => {
    this.#overrides();
    const edges: QuestEdge[] = [];

    for (const quest of this.quests()) {
      for (const parent of quest.parents) {
        if (!parent || parent === quest) continue;
        const edge = this.#edgeToParent(quest, parent);
        if (edge && this.#edgeHitsView(edge)) edges.push(edge);
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
  #panStart = { x: 0, y: 0, clientX: 0, clientY: 0 };
  #suppressClick = false;
  #resizeObserver: ResizeObserver | null = null;
  #nodeWidth = 48;
  #nodeHeight = 48;
  #cardWidth = 260;
  #toolbarHeight = 36;
  #menuWidth = 180;
  #menuHeight = 44;

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.linkDraft.set(null);
      return;
    }
    if (event.code === 'Space') {
      if (this.#typing(event)) return;
      event.preventDefault();
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (button instanceof HTMLElement) button.blur();
      if (!this.spaceHeld()) this.spaceHeld.set(true);
      return;
    }
    if (event.key !== 'Shift' || this.shiftHeld()) return;
    this.shiftHeld.set(true);
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      if (!this.#typing(event)) event.preventDefault();
      this.spaceHeld.set(false);
      if (this.panning()) this.#endGesture();
      return;
    }
    if (event.key !== 'Shift') return;
    this.shiftHeld.set(false);
    this.#endGesture();
    this.#commit();
  };

  #onDocumentPointerUp = (event: PointerEvent): void => {
    this.onPointerUp(event);
  };

  #onPointerLeavePage = (): void => {
    this.spaceHeld.set(false);
    this.#endGesture();
    this.#commit();
  };

  #onWindowBlur = (): void => {
    this.shiftHeld.set(false);
    this.spaceHeld.set(false);
    this.#endGesture();
    this.#commit();
  };

  #onHostPointerDown = (event: PointerEvent): void => {
    this.onPointerDown(event);
  };

  #onDocumentPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('.context-menu')) return;
    this.contextMenu.set(null);
  };

  constructor() {
    effect(() => {
      this.mode();
      this.#applyMode();
    });
    effect(() => {
      this.graphService.listVersion();
      this.#overrides.set(new Map());
    });
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keyup', this.#onKeyUp);
    document.addEventListener('pointerdown', this.#onDocumentPointerDown);
    this.host.nativeElement.addEventListener('pointerdown', this.#onHostPointerDown, { capture: true });
    this.#resizeObserver = new ResizeObserver(() => this.#syncViewport());
    this.#resizeObserver.observe(this.host.nativeElement);
    this.host.nativeElement.addEventListener('wheel', this.#onWheel, { passive: false });
    this.#syncViewport();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('keyup', this.#onKeyUp);
    document.removeEventListener('pointerdown', this.#onDocumentPointerDown);
    this.host.nativeElement.removeEventListener('pointerdown', this.#onHostPointerDown, { capture: true });
    this.host.nativeElement.removeEventListener('wheel', this.#onWheel);
    this.#resizeObserver?.disconnect();
    this.#endGesture();
    this.#commit();
  }

  allows(action: FieldAction): boolean {
    return modeAllows(this.mode(), action);
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
    return (this.#worldX(quest) - this.pan().x) * this.zoom();
  }

  topOf(quest: Quest): number {
    return (this.#worldY(quest) - this.pan().y) * this.zoom();
  }

  nodeSize(): number {
    return this.#screenNode();
  }

  toolbarPosition(quest: Quest): { x: number; y: number } {
    const gap = 8;
    const field = this.host.nativeElement;
    const left = this.leftOf(quest);
    const top = this.topOf(quest);
    const toolbarWidth = this.toolbarWidth(quest);
    const node = this.#screenNode();
    let x = left + node + gap;
    if (x + toolbarWidth > field.clientWidth) {
      x = left - gap - toolbarWidth;
    }
    const y = top + (node - this.#toolbarHeight) / 2;
    return {
      x: Math.max(0, x),
      y: Math.min(Math.max(0, y), Math.max(0, field.clientHeight - this.#toolbarHeight)),
    };
  }

  canLink(quest: Quest): boolean {
    return !this.#isRoot(quest);
  }

  canDelete(quest: Quest): boolean {
    return !this.#isRoot(quest);
  }

  cardBelow(quest: Quest): boolean {
    const top = this.topOf(quest);
    const above = top;
    const below = this.host.nativeElement.clientHeight - top - this.#screenNode();
    return above < 80 && below > above;
  }

  cardLeft(quest: Quest): number {
    const field = this.host.nativeElement.clientWidth;
    const x = this.leftOf(quest) + this.#screenNode() / 2 - this.#cardWidth / 2;
    return Math.min(Math.max(0, x), Math.max(0, field - this.#cardWidth));
  }

  cardTail(quest: Quest): number {
    const center = this.leftOf(quest) + this.#screenNode() / 2 - this.cardLeft(quest);
    const inset = 18;
    return Math.min(this.#cardWidth - inset, Math.max(inset, center));
  }

  cardTop(quest: Quest): number {
    const top = this.topOf(quest);
    return this.cardBelow(quest) ? top + this.#screenNode() : top;
  }

  toolbarWidth(quest: Quest): number {
    let count = 0;
    if (this.allows(FieldAction.LinkQuest) && this.canLink(quest)) count++;
    if (this.allows(FieldAction.AddQuest)) count++;
    if (this.allows(FieldAction.EditQuest)) count++;
    if (this.allows(FieldAction.DeleteQuest) && this.canDelete(quest)) count++;
    if (count === 0) return 0;
    return count * 28 + (count - 1) * 2 + 8;
  }

  startLink(event: MouseEvent): void {
    if (!this.allows(FieldAction.LinkQuest)) return;
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
    if (!this.allows(FieldAction.AddQuest)) return;
    const quest = this.selectedQuest();
    if (!quest) return;

    this.linkDraft.set(null);
    const offset = 16;
    const pos = {
      x: this.#worldX(quest) + offset,
      y: this.#worldY(quest) + offset,
    };
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
    if (!this.allows(FieldAction.EditQuest)) return;
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
    if (!this.allows(FieldAction.DeleteQuest)) return;
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

  onPointerOver(event: PointerEvent): void {
    const id = this.#hoverTargetId(event.target);
    if (id) this.hoveredId.set(id);
  }

  onPointerOut(event: PointerEvent): void {
    const id = this.#hoverTargetId(event.target);
    if (!id || this.hoveredId() !== id) return;
    if (this.#hoverTargetId(event.relatedTarget) === id) return;
    this.hoveredId.set(null);
  }

  onPointerDown(event: PointerEvent): void {
    this.#suppressClick = false;
    if (this.grabbedId() || this.panning()) return;

    const node = this.#nodeFromEvent(event);
    const id = node?.dataset['questId'];
    const quest = id ? this.#questByKey(id) : undefined;
    const panField = this.spaceHeld() && this.allows(FieldAction.Pan);
    const grabNode = !panField
      && event.shiftKey
      && !(this.allows(FieldAction.LinkQuest) && this.linkDraft())
      && this.allows(FieldAction.MoveQuest)
      && !!node
      && !!id
      && !!quest;
    if (!grabNode && !panField) return;

    event.preventDefault();
    this.host.nativeElement.setPointerCapture(event.pointerId);
    this.#pointerId = event.pointerId;
    this.#listen();

    if (grabNode && node && quest && id) {
      const origin = this.#origin();
      this.#grabOffsetX = event.clientX - origin.left - this.leftOf(quest);
      this.#grabOffsetY = event.clientY - origin.top - this.topOf(quest);
      this.grabbedId.set(id);
      return;
    }

    const pan = this.pan();
    this.#panStart = { x: pan.x, y: pan.y, clientX: event.clientX, clientY: event.clientY };
    this.panning.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.allows(FieldAction.LinkQuest)) this.#moveLink(event);

    if (this.panning()) {
      if (event.buttons === 0 || !this.spaceHeld()) {
        this.#endGesture();
        return;
      }
      const zoom = this.zoom();
      this.pan.set({
        x: this.#panStart.x - (event.clientX - this.#panStart.clientX) / zoom,
        y: this.#panStart.y - (event.clientY - this.#panStart.clientY) / zoom,
      });
      return;
    }

    const id = this.grabbedId();
    if (!id) return;

    if (event.buttons === 0 || !event.shiftKey) {
      this.#endGesture();
      if (!event.shiftKey) this.#commit();
      return;
    }

    const origin = this.#origin();
    const zoom = this.zoom();
    this.#setOverride(
      id,
      (event.clientX - origin.left - this.#grabOffsetX) / zoom + this.pan().x,
      (event.clientY - origin.top - this.#grabOffsetY) / zoom + this.pan().y,
    );
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenu.set(null);
  }

  openCreateQuest(): void {
    if (!this.allows(FieldAction.CreateQuest)) return;
    const menu = this.contextMenu();
    this.contextMenu.set(null);
    if (!menu) return;

    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Quest,
      name: '',
      description: '',
      pos_x: menu.pinX / this.zoom() + this.pan().x - this.#nodeWidth / 2,
      pos_y: menu.pinY / this.zoom() + this.pan().y - this.#nodeHeight / 2,
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
    const draft = this.allows(FieldAction.LinkQuest) ? this.linkDraft() : null;

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
    if (!this.grabbedId() && !this.panning()) return;
    this.#endGesture(event);
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

  #endGesture(event?: PointerEvent): void {
    const wasActive = this.grabbedId() !== null || this.panning();
    const host = this.host.nativeElement;
    const pointerId = event?.pointerId ?? this.#pointerId;
    if (pointerId !== null && host.hasPointerCapture(pointerId)) {
      host.releasePointerCapture(pointerId);
    }
    this.#pointerId = null;
    this.grabbedId.set(null);
    this.panning.set(false);
    this.#unlisten();

    if (wasActive) this.#suppressClick = true;
  }

  #applyMode(): void {
    if (!this.allows(FieldAction.LinkQuest)) this.linkDraft.set(null);
    if (!this.allows(FieldAction.CreateQuest)) this.contextMenu.set(null);
    if (!this.allows(FieldAction.MoveQuest)) this.#endGesture();
  }

  #syncViewport(): void {
    const field = this.host.nativeElement;
    this.viewport.set({ width: field.clientWidth, height: field.clientHeight });
  }

  #onWheel = (event: WheelEvent): void => {
    if (!event.shiftKey || !this.allows(FieldAction.Zoom)) return;
    event.preventDefault();

    const raw = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    const pixels =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE ? raw * 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? raw * this.viewport().height : raw;
    if (pixels === 0) return;

    const prev = this.zoom();
    const next = Math.min(this.#zoomMax, Math.max(this.#zoomMin, prev * Math.exp(-pixels * 0.002)));
    if (next === prev) return;

    const origin = this.#origin();
    const cursorX = event.clientX - origin.left;
    const cursorY = event.clientY - origin.top;
    const pan = this.pan();
    const worldX = pan.x + cursorX / prev;
    const worldY = pan.y + cursorY / prev;
    this.zoom.set(next);
    this.pan.set({
      x: worldX - cursorX / next,
      y: worldY - cursorY / next,
    });
  };

  #screenNode(): number {
    return this.#nodeWidth * this.zoom();
  }

  #worldX(quest: Quest): number {
    return this.#overrides().get(this.keyOf(quest))?.x ?? quest.pos_x ?? 0;
  }

  #worldY(quest: Quest): number {
    return this.#overrides().get(this.keyOf(quest))?.y ?? quest.pos_y ?? 0;
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

  #hoverTargetId(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) return null;
    const nodeId = target.closest('[data-quest-id]')?.getAttribute('data-quest-id');
    if (nodeId) return nodeId;
    return target.closest('[data-quest-card]')?.getAttribute('data-quest-card') ?? null;
  }

  #typing(event: KeyboardEvent): boolean {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || !!target.closest('input, textarea, select');
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
    const radius = this.#screenNode() / 2;
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
    const radius = this.#screenNode() / 2;
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
    const radius = this.#screenNode() / 2;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    const head = Math.min(9 * this.zoom(), Math.max(0, length - radius - endGap));
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

  #edgeHitsView(edge: QuestEdge): boolean {
    const { width, height } = this.viewport();
    if (width === 0 || height === 0) return true;

    const minX = Math.min(edge.x1, edge.x2);
    const maxX = Math.max(edge.x1, edge.x2);
    const minY = Math.min(edge.y1, edge.y2);
    const maxY = Math.max(edge.y1, edge.y2);
    return maxX >= 0 && minX <= width && maxY >= 0 && minY <= height;
  }
}
