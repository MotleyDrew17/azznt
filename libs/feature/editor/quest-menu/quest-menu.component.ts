import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Quest, QUEST_PRIORITY_LABEL, QuestPriority } from '../../../core/shared/classes/quest.class';
import { AutocompleteComponent } from '../../../core/shared/components/autocomplete/autocomplete.component';
import { CheckboxComponent } from '../../../core/shared/components/checkbox/checkbox.component';
import { SelectComponent } from '../../../core/shared/components/select/select.component';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { FieldMode } from '../../../core/shared/enums/field-mode.enum';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { FieldModeService } from '../../../core/shared/services/field-mode.service';
import { GraphService } from '../../../core/shared/services/graph.service';
import { SkillService } from '../../../core/shared/services/skill.service';
import { EditorDialogKind } from '../editor-dialog/editor-dialog.component';

const ANY_PRIORITY = 'Любой';
const SORT_BY_NAME = 'По алфавиту';
const SORT_BY_PRIORITY = 'По приоритету';

@Component({
  selector: 'gm-quest-menu',
  imports: [AutocompleteComponent, CheckboxComponent, SelectComponent, DisabledDirective, RouterLink],
  templateUrl: './quest-menu.component.html',
  styleUrl: './quest-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestMenuComponent {
  private graphService = inject(GraphService);
  private dialogService = inject(DialogService);
  private skillService = inject(SkillService);
  private fieldMode = inject(FieldModeService);

  readonly priorityOptions = [ANY_PRIORITY, ...Object.values(QUEST_PRIORITY_LABEL)];
  readonly sortOptions = [SORT_BY_NAME, SORT_BY_PRIORITY];
  readonly collapsed = signal(false);
  readonly filtersOpen = signal(false);
  readonly query = signal('');
  readonly sort = signal(SORT_BY_NAME);
  readonly pickedId = signal<string | null>(null);
  readonly expanded = signal(new Set<string>());
  readonly availableOnly = signal(false);
  readonly completedOnly = signal(false);
  readonly blockedOnly = signal(false);
  readonly priority = signal<QuestPriority | null>(null);
  readonly skillQuery = signal('');
  readonly skillId = signal<string | null>(null);
  // Награда, фильтр позже
  readonly reward = signal(false);

  readonly editor = computed(() => this.fieldMode.mode() === FieldMode.Editor);
  // Есть выбранный фильтр, кроме пустого поиска
  readonly filtersActive = computed(() =>
    this.availableOnly() || this.completedOnly() || this.blockedOnly() || this.reward() || this.priority() != null || !!this.skillId(),
  );
  readonly skillOptions = computed(() => this.skillService.skills().map((skill) => ({ id: skill.id, label: skill.name })));
  readonly prioritySelected = computed(() => {
    const priority = this.priority();
    return priority == null ? ANY_PRIORITY : QUEST_PRIORITY_LABEL[priority];
  });
  readonly quests = computed(() => {
    this.graphService.listVersion();
    this.skillService.skills();
    const root = this.graphService.graph();
    if (!root) return [];
    return this.graphService.questsList;
  });
  // Сколько квестов видно в списке
  readonly countLabel = computed(() => {
    const total = this.quests().length;
    const shown = this.filtered().length;
    if (shown === total) return `Квестов: ${total}`;
    return `${shown} из ${total}`;
  });
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    const priority = this.priority();
    const skillId = this.skillId();
    const available = this.availableOnly();
    const completed = this.completedOnly();
    const blocked = this.blockedOnly();
    const byStatus = available || completed || blocked;
    const sort = this.sort();
    return this.quests().filter((quest) => {
      const name = quest.name.trim().toLowerCase();
      if (query && !name.includes(query)) return false;
      if (priority != null && quest.priority !== priority) return false;
      if (skillId && !quest.requiredSkills.some((item) => item.skill.id === skillId)) return false;
      if (!byStatus) return true;
      if (completed && quest.isCompleted) return true;
      if (available && quest.isAvailable && !quest.isCompleted) return true;
      if (blocked && !quest.isAvailable && !quest.isCompleted) return true;
      return false;
    }).sort((a, b) => {
      if (sort === SORT_BY_PRIORITY && a.priority !== b.priority) return b.priority - a.priority;
      return this.#title(a).localeCompare(this.#title(b), 'ru', { sensitivity: 'base' });
    });
  });

  constructor() {
    if (!this.skillService.skills().length) this.skillService.loadSkills();
    effect(() => {
      const query = this.skillQuery().trim();
      const id = this.skillId();
      if (!id) return;
      const skill = this.skillService.skills().find((item) => item.id === id);
      if (!skill || skill.name !== query) this.skillId.set(null);
    });
  }

  // Свернуть или развернуть меню
  toggleMenu(): void {
    const collapsed = !this.collapsed();
    this.collapsed.set(collapsed);
    if (collapsed) this.filtersOpen.set(false);
  }

  // Панель фильтров
  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  // Строка, у которой видна лупа
  pick(quest: Quest): void {
    this.pickedId.set(quest.id);
  }

  // Центрировать карту и выбрать квест
  showOnMap(quest: Quest): void {
    this.graphService.focusQuest(quest.id);
  }

  // Раскрыть подсказку квеста
  toggleDetails(quest: Quest): void {
    const next = new Set(this.expanded());
    if (next.has(quest.id)) next.delete(quest.id);
    else next.add(quest.id);
    this.expanded.set(next);
  }

  // Редактировать квест
  edit(quest: Quest): void {
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Edit,
      id: quest.id,
      name: quest.name,
      description: quest.description,
      priority: quest.priority,
    });
  }

  // Удалить квест
  remove(quest: Quest): void {
    if (quest.isRoot) return;
    const id = quest.id;
    this.dialogService.openConfirmDialog({
      title: 'Удалить квест',
      message: 'Квест будет удалён.',
      okLabel: 'Удалить',
      onOk: () => this.graphService.removeQuest(id),
    });
  }

  // Отметить квест выполненным
  complete(quest: Quest): void {
    this.graphService.completeQuest(quest.id);
  }

  // Снять выполнение квеста
  reset(quest: Quest): void {
    this.graphService.resetCompletedQuest(quest.id);
  }

  // Сортировка списка
  setSort(label: string): void {
    this.sort.set(label === SORT_BY_PRIORITY ? SORT_BY_PRIORITY : SORT_BY_NAME);
  }

  // Фильтр приоритета
  setPriority(label: string): void {
    if (label === ANY_PRIORITY) {
      this.priority.set(null);
      return;
    }
    const match = (Object.entries(QUEST_PRIORITY_LABEL) as [string, string][]).find(([, text]) => text === label);
    if (!match) return;
    this.priority.set(Number(match[0]) as QuestPriority);
  }

  // Фильтр по выбранному навыку
  pickSkill(id: string): void {
    this.skillId.set(id);
  }

  // Подпись приоритета
  priorityLabel(priority: QuestPriority): string {
    return QUEST_PRIORITY_LABEL[priority];
  }

  // Цвет приоритета
  priorityAccent(priority: QuestPriority): string {
    const name = QuestPriority[priority];
    if (typeof name !== 'string') return 'var(--color-quest-common)';
    return `var(--color-quest-${name.toLowerCase()})`;
  }

  onQuery(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.query.set(target.value);
  }

  // Название в списке
  #title(quest: Quest): string {
    return quest.name.trim() || 'Без названия';
  }
}
