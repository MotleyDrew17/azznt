import { inject, Injectable, signal } from '@angular/core';
import {Quest, QUEST_CYCLE_ERROR} from '../classes/quest.class';
import { CreateQuestData, parseQuestSnapshots, QuestRequiredSkill, QuestSnapshot } from '../models/quest.model';
import { Skill } from '../classes/skill.class';
import { UserService } from './user.service';
import { SkillService } from './skill.service';
import { parseUserFile } from '../models/user.model';
import { hasCycle } from './graph.utils';

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  #questsMap: Record<string, Quest> = {};
  #graph: Quest | undefined;
  #zIndex = 1;
  graph = signal<Quest | undefined>(undefined);
  readonly listVersion = signal(0);
  selectedQuestId = signal<string | null>(null);
  // Запрос центрировать карту на квесте. tick нужен, чтобы повторный выбор того же квеста тоже сдвигал карту.
  readonly focusRequest = signal<{ id: string; tick: number } | null>(null);
  #focusTick = 0;
  #storylineId?: string;
  private user = inject(UserService);
  private skillService = inject(SkillService);

  constructor() {
    if (!this.skillService.skills().length) this.skillService.loadSkills();
    this.#restoreActive();
  }

  get questsList(): Quest[]{
    return Object.values(this.#questsMap);
  }

  getQuestById(id: string): Quest | undefined{
    return this.#questsMap[id];
  }

  selectQuest(id: string | null): void {
    this.selectedQuestId.set(id);
  }

  // Выбрать квест и попросить карту встать на него
  focusQuest(id: string): void {
    this.selectQuest(id);
    this.focusRequest.set({ id, tick: ++this.#focusTick });
  }

  createQuest(data: CreateQuestData, isNewGraph: boolean = false): string | null {
    const quest = new Quest();
    quest.name = data.name;
    quest.description = data.description;
    if (data.priority !== undefined) quest.priority = data.priority;
    this.#applyRequiredSkills(quest, data.requiredSkills);
    if (data.pos_x !== undefined) quest.pos_x = data.pos_x;
    if (data.pos_y !== undefined) quest.pos_y = data.pos_y;
    const cyclicBefore = hasCycle(this.questsList);
    if (data.child) {
      const error = quest.addChild(data.child);
      if (error) return error;
    }

    if (data.parent) {
      const error = quest.addParent(data.parent);
      if (error) {
        if (data.child) quest.removeChild(data.child.id);
        return error;
      }
    }
    if (!cyclicBefore && hasCycle([quest, ...this.questsList])) {
      if (data.parent) quest.removeParent(data.parent.id);
      if (data.child) quest.removeChild(data.child.id);
      return QUEST_CYCLE_ERROR;
    }
    quest.zIndex = this.#zIndex++;
    this.#questsMap[quest.id] = quest;
    if(isNewGraph) {
      quest.isRoot = true;
      this.#graph = quest;
      this.graph.set(this.#graph);
      this.#storylineId = crypto.randomUUID();
    }
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
    return null;
  }

  // Отметить квест выполненным
  completeQuest(id: string): void {
    const quest = this.#questsMap[id];
    if (!quest || quest.isCompleted || !quest.isAvailable) return;
    quest.complete(true);
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
  }

  // Снять выполнение квеста
  resetCompletedQuest(id: string): void {
    const quest = this.#questsMap[id];
    if (!quest || !quest.isCompleted) return;
    quest.uncomplete();
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
  }

  updateQuest(id: string, data: Pick<CreateQuestData, 'name' | 'description' | 'priority' | 'requiredSkills'>): void {
    const quest = this.#questsMap[id];
    if (!quest) return;

    quest.name = data.name;
    quest.description = data.description;
    if (data.priority !== undefined) quest.priority = data.priority;
    this.#applyRequiredSkills(quest, data.requiredSkills);
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
  }

  linkQuests(childId: string, parentId: string): string | null {
    const child = this.#questsMap[childId];
    const parent = this.#questsMap[parentId];
    if (!child || !parent || child.getParentById(parentId)) return null;

    const cyclicBefore = hasCycle(this.questsList);
    const error = child.addParent(parent);
    if (error) return error;
    if (!cyclicBefore && hasCycle(this.questsList)) {
      child.removeParent(parent.id);
      return QUEST_CYCLE_ERROR;
    }

    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
    return null;
  }

  removeQuest(id: string): void {
    const quest = this.#questsMap[id];
    const root = this.#graph;
    if (!quest || !root || quest.isRoot || quest.id === root.id) return;

    const freed = [...quest.children].filter((child) =>
      child.parents.every((parent) => parent.id === quest.id),
    );

    [...quest.parents].forEach((parent) => quest.removeParent(parent.id));
    [...quest.children].forEach((child) => quest.removeChild(child.id));
    delete this.#questsMap[id];

    for (const child of freed) {
      if (child.id === root.id || child.isRoot || child.parents.length > 0) continue;
      child.addParent(root);
    }

    if (this.#graph?.id === id) {
      this.#graph = this.questsList[0];
      this.graph.set(this.#graph);
    }
    if (this.selectedQuestId() === id) {
      this.selectedQuestId.set(null);
    }
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
  }

  createEmptyQuest(){
    if(!this.#graph) return
    const quest = new Quest();
    this.#questsMap[quest.id] = quest;
    return quest;
  }

  copyQuest(quest: Quest){
    const copy = new Quest();
    copy.name = quest.name;
    copy.description = quest.description;
    copy.priority = quest.priority;
    copy.requiredSkills = quest.requiredSkills.map((item) => ({ skill: item.skill, level: item.level }));
    this.#questsMap[copy.id] = copy;
    return copy;
  }

  // Открыть сохранённую сюжетную линию
  openStoryline(id: string): void {
    const storyline = this.user.storylines().find((item) => item.id === id);
    if (!storyline) return;
    this.#storylineId = id;
    this.#loadQuests(storyline.quests);
    this.user.activate(id);
  }

  // Открыть редактор без проекта
  openEmpty(): void {
    this.#storylineId = undefined;
    this.#loadQuests([]);
    this.user.clearActive();
  }

  // Удалить сюжетную линию
  removeStoryline(id: string): void {
    this.user.removeStoryline(id);
    if (this.#storylineId !== id) return;
    this.#storylineId = undefined;
    this.#loadQuests([]);
  }

  saveGraphToStorage(){
    if (!this.#graph) return;
    if (!this.#storylineId) this.#storylineId = crypto.randomUUID();
    this.user.upsert(this.#storylineId, this.createGraphSnapshot());
  }

  graphFileName(): string {
    return 'user.gm';
  }

  toGraphFile(): string {
    return this.user.toFile();
  }

  // Загрузить файл пользователя. Старый файл квестов добавляется отдельным проектом
  loadGraphFile(text: string): string | null {
    const file = parseUserFile(text);
    if (file) {
      this.user.replace(file);
      this.skillService.loadSkills();
      this.#storylineId = undefined;
      this.#restoreActive();
      return null;
    }
    const quests = parseQuestSnapshots(text);
    if (!quests) return 'Файл не похож на сохранение.';
    this.#storylineId = crypto.randomUUID();
    this.#loadQuests(quests);
    this.saveGraphToStorage();
    return null;
  }

  // Вернуть активный проект после загрузки
  #restoreActive(): void {
    const id = this.user.activeId;
    const storyline = id ? this.user.storylines().find((item) => item.id === id) : undefined;
    if (!storyline) {
      this.#storylineId = undefined;
      this.#loadQuests([]);
      return;
    }
    this.#storylineId = storyline.id;
    this.#loadQuests(storyline.quests);
  }

  // Поставить квесты на поле
  #loadQuests(snapshot: QuestSnapshot[]): void {
    this.#questsMap = {};
    this.selectedQuestId.set(null);
    this.focusRequest.set(null);
    if (snapshot.length === 0) {
      this.#graph = undefined;
      this.graph.set(undefined);
      this.#zIndex = 1;
      this.listVersion.update((version) => version + 1);
      return;
    }
    this.extractGraphFromSnapshot(snapshot);
    const root = this.questsList.find((quest) => quest.isRoot) ?? this.questsList[0];
    this.#graph = root;
    this.graph.set(root);
    const maxZ = this.questsList.reduce((max, quest) => Math.max(max, quest.zIndex), 0);
    this.#zIndex = maxZ + 1;
    this.listVersion.update((version) => version + 1);
  }

  createGraphSnapshot(): QuestSnapshot[] {
   return this.questsList.map(quest => quest.toSnapshot());
  }

  #applyRequiredSkills(quest: Quest, required: QuestRequiredSkill[] | null | undefined): void {
    quest.requiredSkills = this.#resolveRequiredSkills(required ?? []);
  }

  #resolveRequiredSkills(required: QuestRequiredSkill[]): { skill: Skill; level: number }[] {
    return required.flatMap((item) => {
      const skill = this.skillService.skills().find((entry) => entry.id === item.skillId);
      return skill ? [{ skill, level: item.level }] : [];
    });
  }

  extractGraphFromSnapshot(snapshot: QuestSnapshot[]): Quest {
    snapshot.forEach(snapshot => {
      const quest = new Quest();
      quest.id = snapshot.id;
      quest.name = snapshot.name;
      quest.description = snapshot.description;
      quest.pos_x = snapshot.pos_x;
      quest.pos_y = snapshot.pos_y;
      quest.zIndex = snapshot.zIndex;
      quest.layer = snapshot.layer;
      quest.isRoot = snapshot.isRoot;
      if (snapshot.priority !== undefined) quest.priority = snapshot.priority;
      if (snapshot.isCompleted) quest.complete();
      const required = snapshot.requiredSkills ?? (snapshot.requiredSkill ? [snapshot.requiredSkill] : []);
      quest.requiredSkills = this.#resolveRequiredSkills(required);
      this.#questsMap[quest.id] = quest;
    });
    snapshot.forEach(snapshot => {
      const quest = this.#questsMap[snapshot.id];
      if(quest){
        quest.parents = snapshot.parents?.map(parentId => this.#questsMap[parentId]) || [];
        quest.children = snapshot.children?.map(childId => this.#questsMap[childId]) || [];
      }
    });
    return this.#questsMap[snapshot[0].id];
  }

}
