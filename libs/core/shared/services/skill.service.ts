import { inject, Injectable, signal } from '@angular/core';
import { Skill } from '../classes/skill.class';
import { CreateSkillData, readSkillSnapshots } from '../models/skill.model';
import { StorageService } from './storage.service';

const SKILLS_KEY = 'skills';

@Injectable({
  providedIn: 'root',
})
export class SkillService {
  private storage = inject(StorageService);

  readonly skills = signal<Skill[]>([]);

  addSkill(data: CreateSkillData): Skill {
    const skill = new Skill(data);
    this.skills.update((skills) => [...skills, skill]);
    this.#save();
    return skill;
  }

  updateSkill(id: string, data: CreateSkillData): void {
    const skill = this.skills().find((item) => item.id === id);
    if (!skill) return;
    skill.update(data);
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  removeSkill(id: string): void {
    const skills = this.skills().filter((skill) => skill.id !== id);
    if (skills.length === this.skills().length) return;
    this.skills.set(skills);
    this.#save();
  }

  loadSkills(): void {
    const stored = readSkillSnapshots(this.storage.local.get(SKILLS_KEY));
    const skills = stored.map((snapshot) => Skill.fromSnapshot(snapshot));
    this.skills.set(skills);
    if (skills.some((skill, index) => skill.getDecayTimestamp() !== (stored[index]?.level?.decay?.freezed_till_ms ?? 0))) {
      this.#save();
    }
  }

  #save(): void {
    this.storage.local.set(SKILLS_KEY, this.skills().map((skill) => skill.toSnapshot()));
  }
}
