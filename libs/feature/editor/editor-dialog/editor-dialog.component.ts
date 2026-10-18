import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { SelectComponent } from '../../../core/shared/components/select/select.component';
import { CheckboxComponent } from '../../../core/shared/components/checkbox/checkbox.component';
import { AutocompleteComponent } from '../../../core/shared/components/autocomplete/autocomplete.component';
import { CreateQuestData, QuestRequiredSkill, QuestStreakData } from '../../../core/shared/models/quest.model';
import { form, required, FormField } from '@angular/forms/signals';
import { ClearInputDirective } from '../../../core/shared/directives/clear-input.directive';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { HintDirective } from '../../../core/shared/directives/hint.directive';
import { GraphService } from '../../../core/shared/services/graph.service';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { SkillService } from '../../../core/shared/services/skill.service';
import { QUEST_PRIORITY_LABEL, QuestPriority } from '../../../core/shared/classes/quest.class';

export enum EditorDialogKind {
  Storyline = 'storyline',
  Quest = 'quest',
  Edit = 'edit',
  Relation = 'relation',
}

export type QuestRelation = 'previous' | 'next';

export interface EditorDialogData extends CreateQuestData {
  kind: EditorDialogKind;
  id?: string;
  anchorId?: string;
  relation?: QuestRelation;
}

interface SkillDraft {
  key: string;
  skillId: string | null;
  level: number;
}

function positiveInt(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

const TITLES: Record<Exclude<EditorDialogKind, EditorDialogKind.Relation>, string> = {
  [EditorDialogKind.Storyline]: 'Новая сюжетная линия',
  [EditorDialogKind.Quest]: 'Создание квеста',
  [EditorDialogKind.Edit]: 'Редактирование',
};

@Component({
  selector: 'gm-editor-dialog',
  imports: [ButtonComponent, SelectComponent, CheckboxComponent, AutocompleteComponent, DisabledDirective, ClearInputDirective, HintDirective, FormField],
  templateUrl: './editor-dialog.component.html',
  styleUrl: './editor-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'dialog-host' },
})
export class EditorDialogComponent {
  private data = inject<EditorDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, EditorDialogData>);
  private graphService = inject(GraphService);
  private dialogService = inject(DialogService);
  private skillService = inject(SkillService);

  readonly EditorDialogKind = EditorDialogKind;
  readonly priorityOptions = Object.values(QUEST_PRIORITY_LABEL);
  kind = this.data.kind;
  relation = signal<QuestRelation>(this.#initialRelation());
  priority = signal<QuestPriority>(this.data.priority ?? QuestPriority.Common);
  requireSkill = signal(false);
  skillDrafts = signal<SkillDraft[]>([]);
  streakOn = signal(false);
  exerciseId = signal<string | null>(null);
  exerciseQuery = signal('');
  durationDays = signal(1);
  perDay = signal(1);
  successDays = signal(1);
  private streakStartedAt: number | undefined;
  private skills = computed(() => this.skillService.skills());
  readonly skillInvalid = computed(() => {
    if (!this.requireSkill()) return false;
    const rows = this.skillDrafts();
    if (!rows.length) return true;
    return rows.some((row) => !row.skillId || !Number.isInteger(row.level) || row.level < 1);
  });
  readonly skillError = computed(() => {
    if (!this.requireSkill() || !this.skillDrafts().length || !this.skillInvalid()) return '';
    return 'Выберите навык и укажите уровень';
  });
  // Можно ли добавить ещё строку навыка
  readonly canAddSkill = computed(() => this.skillDrafts().length < this.skills().length);
  readonly exerciseOptions = computed(() => this.skills().flatMap((skill) =>
    skill.exercises.map((exercise) => ({
      id: exercise.id,
      label: `${exercise.name.trim() || 'Без названия'} (${skill.name})`,
    })),
  ));
  readonly streakInvalid = computed(() => {
    if (!this.streakOn()) return false;
    return !this.exerciseId()
      || !positiveInt(this.durationDays())
      || !positiveInt(this.perDay())
      || !positiveInt(this.successDays())
      || this.successDays() > this.durationDays();
  });
  readonly streakError = computed(() => {
    if (!this.streakOn() || !this.streakInvalid()) return '';
    if (!this.exerciseId()) return 'Выберите упражнение';
    if (!positiveInt(this.durationDays()) || !positiveInt(this.perDay()) || !positiveInt(this.successDays())) {
      return 'Укажите целые числа больше нуля';
    }
    return 'Успешных дней не может быть больше длительности';
  });

  get title(): string {
    if (this.kind !== EditorDialogKind.Relation) return TITLES[this.kind];
    return this.relation() === 'previous' ? 'Предыдущий квест' : 'Следующий квест';
  }
  storylineModel = signal({ name: this.data.name, description: this.data.description })
  storylineForm = form(this.storylineModel, (fieldPath) => {
    required(fieldPath.name, {message: 'Название обязательно'})
  })

  constructor() {
    if (!this.skillService.skills().length) this.skillService.loadSkills();
    const quest = this.data.id ? this.graphService.getQuestById(this.data.id) : undefined;
    this.skillDrafts.set((quest?.requiredSkills ?? []).map((item) => ({
      key: crypto.randomUUID(),
      skillId: item.skill.id,
      level: item.level,
    })));
    this.requireSkill.set(this.skillDrafts().length > 0);
    const streak = quest?.streak;
    const exercise = streak?.exercise;
    if (streak && exercise) {
      this.streakOn.set(true);
      this.exerciseId.set(exercise.id);
      const skillName = this.skills().find((skill) => skill.getExercise(exercise.id))?.name;
      const exerciseName = exercise.name.trim() || 'Без названия';
      this.exerciseQuery.set(skillName ? `${exerciseName} (${skillName})` : exerciseName);
      this.durationDays.set(streak.durationDays);
      this.perDay.set(streak.mustBeDonePerDay);
      this.successDays.set(streak.mustBeDoneCount);
      this.streakStartedAt = streak.startedAtTimestamp;
    }
    effect(() => {
      const id = this.exerciseId();
      if (!id || !this.streakOn()) return;
      const label = this.exerciseOptions().find((option) => option.id === id)?.label;
      if (label !== this.exerciseQuery().trim()) this.exerciseId.set(null);
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  get relationOptions(): string[] {
    return this.#anchorIsRoot() ? ['Предыдущий'] : ['Предыдущий', 'Следующий'];
  }

  relationLabel(): string {
    return this.relation() === 'previous' ? 'Предыдущий' : 'Следующий';
  }

  priorityLabel(): string {
    return QUEST_PRIORITY_LABEL[this.priority()];
  }

  setPriority(label: string): void {
    const match = (Object.entries(QUEST_PRIORITY_LABEL) as [string, string][])
      .find(([, text]) => text === label);
    if (!match) return;
    this.priority.set(Number(match[0]) as QuestPriority);
  }

  // Навыки, которые ещё можно выбрать в этой строке
  skillOptions(row: SkillDraft): string[] {
    const taken = new Set(this.skillDrafts().filter((item) => item.key !== row.key && item.skillId).map((item) => item.skillId));
    return this.skills()
      .filter((skill) => skill.id === row.skillId || !taken.has(skill.id))
      .map((skill) => skill.name);
  }

  // Название выбранного навыка
  skillLabel(row: SkillDraft): string | null {
    if (!row.skillId) return null;
    return this.skills().find((skill) => skill.id === row.skillId)?.name ?? null;
  }

  // Уровень не задан
  levelInvalid(row: SkillDraft): boolean {
    return !Number.isInteger(row.level) || row.level < 1;
  }

  // Пустая строка навыка
  addSkill(): void {
    this.skillDrafts.update((rows) => [...rows, { key: crypto.randomUUID(), skillId: null, level: 1 }]);
  }

  // Удалить строку навыка
  removeSkill(key: string): void {
    this.skillDrafts.update((rows) => rows.filter((row) => row.key !== key));
  }

  // Выбрать навык в строке
  setSkill(key: string, name: string): void {
    const taken = new Set(this.skillDrafts().filter((row) => row.key !== key).map((row) => row.skillId));
    const skill = this.skills().find((item) => item.name === name && !taken.has(item.id));
    if (!skill) return;
    this.skillDrafts.update((rows) => rows.map((row) => row.key === key ? { ...row, skillId: skill.id } : row));
  }

  // Уровень навыка в строке
  setSkillLevel(key: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const level = Number(target.value);
    this.skillDrafts.update((rows) => rows.map((row) => row.key === key ? { ...row, level } : row));
  }

  // Число из поля серии
  setStreakNumber(field: 'duration' | 'perDay' | 'success', event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number(target.value);
    if (field === 'duration') this.durationDays.set(value);
    else if (field === 'perDay') this.perDay.set(value);
    else this.successDays.set(value);
  }

  // Целое число дней или выполнений
  isPositiveDay(value: number): boolean {
    return positiveInt(value);
  }

  setRelation(label: string): void {
    if (this.#anchorIsRoot()) {
      this.relation.set('previous');
      return;
    }
    this.relation.set(label === 'Предыдущий' ? 'previous' : 'next');
  }

  submit() {
    if (this.skillInvalid() || this.streakInvalid()) return;
    const fields = this.#questFields();
    switch (this.kind) {
      case EditorDialogKind.Storyline:
        if (this.#createQuest(fields, true)) this.close();
        break;
      case EditorDialogKind.Quest:
        if (this.#createQuest(fields)) this.close();
        break;
      case EditorDialogKind.Relation:
        const anchor = this.data.anchorId ? this.graphService.getQuestById(this.data.anchorId) : undefined;
        const root = this.graphService.graph();
        if (!anchor || !root) break;
        const relation = this.#anchorIsRoot() ? 'previous' : this.relation();
        if (this.#createQuest({
          ...fields,
          parent: relation === 'previous' ? anchor : root,
          child: relation === 'next' ? anchor : undefined,
        })) this.close();
        break;
      case EditorDialogKind.Edit:
        if (!this.data.id) break;
        this.graphService.updateQuest(this.data.id, fields);
        this.close();
        break;
    }
  }

  // Поля квеста из формы
  #questFields(): CreateQuestData {
    return {
      name: this.storylineForm.name().value(),
      description: this.storylineForm.description().value(),
      priority: this.priority(),
      requiredSkills: this.#requiredSkills(),
      streak: this.#streakData(),
      pos_x: this.data.pos_x,
      pos_y: this.data.pos_y,
    };
  }

  // Серия, если чекбокс включён
  #streakData(): QuestStreakData | null {
    const exerciseId = this.exerciseId();
    if (!this.streakOn() || !exerciseId) return null;
    return {
      exerciseId,
      durationDays: this.durationDays(),
      mustBeDonePerDay: this.perDay(),
      mustBeDoneCount: this.successDays(),
      startedAt: this.streakStartedAt,
    };
  }

  // Навыки для сохранения
  #requiredSkills(): QuestRequiredSkill[] {
    if (!this.requireSkill()) return [];
    return this.skillDrafts()
      .filter((row): row is SkillDraft & { skillId: string } => !!row.skillId && Number.isInteger(row.level) && row.level >= 1)
      .map((row) => ({ skillId: row.skillId, level: row.level }));
  }

  #createQuest(data: CreateQuestData, isNewGraph = false): boolean {
    const error = this.graphService.createQuest(data, isNewGraph);
    if (!error) return true;

    this.dialogService.openWarningDialog({
      title: 'Нельзя соединить',
      message: error,
    });
    return false;
  }

  #initialRelation(): QuestRelation {
    if (this.#anchorIsRoot()) return 'previous';
    return this.data.relation ?? 'next';
  }

  #anchorIsRoot(): boolean {
    const anchor = this.data.anchorId ? this.graphService.getQuestById(this.data.anchorId) : undefined;
    const root = this.graphService.graph();
    return !!anchor && !!root && (anchor.isRoot || anchor.id === root.id);
  }
}
