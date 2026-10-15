import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DialogService } from '../../core/shared/services/dialog.service';
import { SkillService } from '../../core/shared/services/skill.service';
import { SkillDialogKind } from '../../core/shared/enums/skill-dialog-kind.enum';
import { Skill } from '../../core/shared/classes/skill.class';
import { AutocompleteComponent } from '../../core/shared/components/autocomplete/autocomplete.component';
import { SkillItemComponent } from './skill-item/skill-item.component';

const SLOT = 168;
const LOOP_FROM = 4;

const VISIBLE_RANGES = [
  { width: 2100, count: 9 },
  { width: 1500, count: 7 },
  { width: 1280, count: 5 },
  { width: 900, count: 4 },
];

interface SkillSlide {
  key: number;
  skill: Skill;
  transform: string;
  opacity: number;
  zIndex: number;
  active: boolean;
}

@Component({
  selector: 'gm-skills',
  imports: [SkillItemComponent, AutocompleteComponent],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsComponent implements OnInit {
  private dialogService = inject(DialogService);
  private skillService = inject(SkillService);
  private cursor = signal(0);
  private moving = signal(false);
  private animId = 0;
  private frame = 0;
  private dragging = false;
  private pointerId = -1;
  private startX = 0;
  private startCursor = 0;
  private target = 0;
  private stage = viewChild<ElementRef<HTMLElement>>('stage');
  private stageWidth = signal(0);

  readonly skills = this.skillService.skills;
  readonly blockClick = signal(false);
  readonly slides = computed(() => this.#slides());
  readonly canPrev = computed(() => this.#canStep(-1));
  readonly canNext = computed(() => this.#canStep(1));
  readonly searchOptions = computed(() => this.skills().map((skill) => ({ id: skill.id, label: skill.name })));
  readonly centerSkill = computed(() => {
    const list = this.skills();
    const count = list.length;
    if (!count) return null;
    const raw = this.moving() && !this.dragging ? this.target : Math.round(this.cursor());
    const index = this.#loops() ? mod(raw, count) : Math.min(Math.max(raw, 0), count - 1);
    return list[index] ?? null;
  });
  query = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.animId += 1;
      cancelAnimationFrame(this.frame);
    });

    effect(() => {
      const count = this.skills().length;
      if (count === 0 || this.#loops()) return;
      const edge = count - 1;
      if (this.cursor() <= edge) return;
      this.cursor.set(edge);
      this.target = edge;
    });

    effect((onCleanup) => {
      const element = this.stage()?.nativeElement;
      if (!element) return;
      const observer = new ResizeObserver(() => this.stageWidth.set(element.clientWidth));
      observer.observe(element);
      this.stageWidth.set(element.clientWidth);
      onCleanup(() => observer.disconnect());
    });

    let seenId: string | null = null;
    let seenName = '';
    effect(() => {
      this.skills();
      const skill = this.centerSkill();
      const id = skill?.id ?? null;
      const name = skill?.name ?? '';
      if (seenId === null && id !== null) {
        seenId = id;
        seenName = name;
        return;
      }
      if (seenId === null || (seenId === id && seenName === name)) return;
      seenId = id;
      seenName = name;
      this.query.set(name);
    });
  }

  ngOnInit(): void {
    this.skillService.loadSkills();
  }

  openSkillDialog(): void {
    this.dialogService.openSkillDialog({ kind: SkillDialogKind.New });
  }

  showSkill(id: string): void {
    const list = this.skills();
    const count = list.length;
    const index = list.findIndex((skill) => skill.id === id);
    if (index < 0 || !count) return;
    if (!this.#loops()) {
      this.target = index;
      this.#animateTo(index);
      return;
    }
    const current = Math.round(this.cursor());
    let delta = index - mod(current, count);
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    this.target = current + delta;
    this.#animateTo(this.target);
  }

  step(direction: number): void {
    if (!this.#canStep(direction)) return;
    const base = this.moving() ? this.target : Math.round(this.cursor());
    this.target = this.#limit(base + direction);
    this.#animateTo(this.target);
  }

  onPointerDown(event: PointerEvent): void {
    if (this.skills().length < 2 || event.button !== 0) return;
    const stage = event.currentTarget;
    if (!(stage instanceof HTMLElement)) return;
    this.animId += 1;
    cancelAnimationFrame(this.frame);
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startCursor = this.cursor();
    if (this.moving()) this.blockClick.set(true);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.startX;
    if (Math.abs(dx) < 6) return;
    const stage = event.currentTarget;
    if (stage instanceof HTMLElement && !stage.hasPointerCapture(event.pointerId)) {
      stage.setPointerCapture(event.pointerId);
    }
    this.moving.set(true);
    this.blockClick.set(true);
    this.cursor.set(this.#limit(this.startCursor - dx / this.#layout().slot));
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    this.dragging = false;
    if (!this.blockClick() && !this.moving()) return;
    this.target = this.#limit(Math.round(this.cursor()));
    this.#animateTo(this.target);
    setTimeout(() => this.blockClick.set(false));
  }

  #slides(): SkillSlide[] {
    const list = this.skills();
    const count = list.length;
    if (!count) return [];
    if (count === 1) {
      return [{
        key: 0,
        skill: list[0],
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1,
        zIndex: 2,
        active: true,
      }];
    }

    const cursor = this.cursor();
    const base = Math.floor(cursor);
    const settled = !this.moving();
    const { left, right, slot } = this.#layout();
    const loop = this.#loops();
    const reachLeft = left + 1;
    const reachRight = right + 1;
    const slides: SkillSlide[] = [];
    const seen = new Set<number>();
    const order = [0];
    for (let step = 1; step <= Math.max(reachLeft, reachRight); step++) {
      if (step <= reachLeft) order.push(-step);
      if (step <= reachRight) order.push(step);
    }

    for (const slotIndex of order) {
      const logical = base + slotIndex;
      if (!loop && (logical < 0 || logical >= count)) continue;
      const offset = logical - cursor;
      const index = loop ? mod(logical, count) : logical;
      if (seen.has(index)) continue;
      seen.add(index);
      const distance = Math.abs(offset);
      const limit = offset < 0 ? left : right;
      slides.push({
        key: logical,
        skill: list[index],
        transform: `translate(-50%, -50%) translateX(${offset * slot}px) scale(${scaleOf(distance)})`,
        opacity: distance <= limit ? 1 : distance >= limit + 0.8 ? 0 : 1 - (distance - limit) / 0.8,
        zIndex: Math.round(40 - distance * 8),
        active: settled && distance < 0.01,
      });
    }
    return slides;
  }

  #layout(): { left: number; right: number; slot: number } {
    const count = this.skills().length;
    if (count < 2) return { left: 0, right: 0, slot: SLOT };
    const extra = Math.max(0, Math.min(visibleCount(this.stageWidth()), count) - 1);
    const left = Math.floor(extra / 2);
    const right = extra - left;
    return { left, right, slot: SLOT };
  }

  #loops(): boolean {
    const count = this.skills().length;
    if (count < LOOP_FROM) return false;
    const { left, right } = this.#layout();
    return count > left + right + 1;
  }

  #canStep(direction: number): boolean {
    const count = this.skills().length;
    if (count < 2) return false;
    if (this.#loops()) return true;
    const base = this.moving() && !this.dragging ? this.target : Math.round(this.cursor());
    const next = base + direction;
    return next >= 0 && next < count;
  }

  #limit(value: number): number {
    const count = this.skills().length;
    if (this.#loops()) return value;
    return Math.min(Math.max(value, 0), Math.max(0, count - 1));
  }

  #animateTo(target: number): void {
    const gen = ++this.animId;
    const from = this.cursor();
    const delta = target - from;
    if (delta === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.cursor.set(target);
      this.moving.set(false);
      return;
    }

    this.moving.set(true);
    const duration = Math.min(720, 340 * Math.abs(delta));
    const start = performance.now();
    const tick = (now: number) => {
      if (gen !== this.animId) return;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      this.cursor.set(from + delta * eased);
      if (progress < 1) {
        this.frame = requestAnimationFrame(tick);
        return;
      }
      this.cursor.set(target);
      this.moving.set(false);
    };
    this.frame = requestAnimationFrame(tick);
  }
}

function mod(value: number, count: number): number {
  return ((value % count) + count) % count;
}

function visibleCount(width: number): number {
  for (const range of VISIBLE_RANGES) {
    if (width >= range.width) return range.count;
  }
  return 3;
}

function scaleOf(distance: number): number {
  if (distance <= 1) return 1 - distance * 0.38;
  return Math.max(0.4, 0.62 - (distance - 1) * 0.12);
}
