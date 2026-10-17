import { inject, Injectable, signal } from '@angular/core';
import { QuestSnapshot, readQuestSnapshots } from '../models/quest.model';
import { readSkillSnapshots, SkillSnapshot } from '../models/skill.model';
import { StorylineSnapshot, UserFile, readUserFile } from '../models/user.model';
import { StorageService } from './storage.service';

const USER_KEY = 'user';
const GRAPH_KEY = 'graph';
const SKILLS_KEY = 'skills';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private storage = inject(StorageService);

  readonly storylines = signal<StorylineSnapshot[]>([]);
  #skills: SkillSnapshot[] = [];
  #activeId?: string;

  constructor() {
    this.#load();
  }

  get activeId(): string | undefined {
    return this.#activeId;
  }

  skills(): SkillSnapshot[] {
    return this.#skills;
  }

  // Сохранить навыки в общее хранилище
  setSkills(skills: SkillSnapshot[]): void {
    this.#skills = skills;
    this.#write();
  }

  // Записать открытую сюжетную линию и оставить её активной
  upsert(id: string, quests: QuestSnapshot[]): void {
    const list = this.storylines().slice();
    const index = list.findIndex((storyline) => storyline.id === id);
    const storyline = { id, quests };
    if (index === -1) list.push(storyline);
    else list[index] = storyline;
    this.storylines.set(list);
    this.#activeId = id;
    this.#write();
  }

  // Удалить сюжетную линию
  removeStoryline(id: string): void {
    this.storylines.update((list) => list.filter((storyline) => storyline.id !== id));
    if (this.#activeId === id) this.#activeId = undefined;
    this.#write();
  }

  // Запомнить открытую сюжетную линию
  activate(id: string): void {
    if (this.#activeId === id) return;
    if (!this.storylines().some((storyline) => storyline.id === id)) return;
    this.#activeId = id;
    this.#write();
  }

  // Открыть пустой редактор, проекты не трогать
  clearActive(): void {
    if (!this.#activeId) return;
    this.#activeId = undefined;
    this.#write();
  }

  // Подменить всё сохранение файлом пользователя
  replace(file: UserFile): void {
    this.storylines.set(file.storylines);
    this.#skills = file.skills;
    this.#activeId = file.activeId;
    this.#write();
  }

  // Файл пользователя
  toFile(): string {
    return JSON.stringify(this.#file());
  }

  // Поднять сохранение из хранилища или из старых ключей
  #load(): void {
    const stored = readUserFile(this.storage.local.get(USER_KEY));
    if (stored) {
      this.#apply(stored);
      return;
    }
    const quests = readQuestSnapshots(this.storage.local.get(GRAPH_KEY));
    const skills = readSkillSnapshots(this.storage.local.get(SKILLS_KEY));
    if (!quests?.length && !skills.length) return;
    const id = crypto.randomUUID();
    this.storylines.set(quests?.length ? [{ id, quests }] : []);
    this.#skills = skills;
    this.#activeId = quests?.length ? id : undefined;
    this.#write();
    this.storage.local.remove(GRAPH_KEY);
    this.storage.local.remove(SKILLS_KEY);
  }

  // Разобрать файл в память
  #apply(file: UserFile): void {
    this.storylines.set(file.storylines);
    this.#skills = file.skills;
    this.#activeId = file.activeId;
  }

  // Текущий файл пользователя
  #file(): UserFile {
    return {
      storylines: this.storylines(),
      skills: this.#skills,
      activeId: this.#activeId,
    };
  }

  // Записать файл в хранилище
  #write(): void {
    this.storage.local.set(USER_KEY, this.#file());
  }
}
