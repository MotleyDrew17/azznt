import { inject, Injectable, signal } from '@angular/core';
import { Exercise, Skill } from '../classes/skill.class';
import { CreateExerciseData, CreateSkillData, readSkillSnapshots } from '../models/skill.model';
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

  addLayer(id: string, levelScore: number): void {
    if (!Number.isInteger(levelScore) || levelScore <= 1) return;
    const skill = this.skills().find((item) => item.id === id);
    if (!skill) return;
    skill.addLayer(levelScore);
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  removeLayer(id: string, levelScore: number): void {
    if (levelScore <= 1) return;
    const skill = this.skills().find((item) => item.id === id);
    if (!skill) return;
    skill.removeLayer(levelScore);
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  removeExercise(exerciseId: string): void {
    const skill = this.skills().find((item) =>
      item.getLayers().some((layer) => layer.exercises.some((exercise) => exercise.id === exerciseId)),
    );
    if (!skill) return;
    const layer = skill.getLayers().find((item) => item.exercises.some((exercise) => exercise.id === exerciseId));
    const exercise = layer?.exercises.find((item) => item.id === exerciseId);
    if (!layer || !exercise) return;
    skill.removeExerciseFromLayer(layer.levelScore, exercise);
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
    const decayChanged = skills.some((skill, index) => skill.getDecayTimestamp() !== (stored[index]?.level?.decay?.freezed_till_ms ?? 0));
    const layersMissing = stored.some((skill) => !skill.layers);
    if (decayChanged || layersMissing) this.#save();
  }

  addExerciseToLayer(id: string, levelScore: number, data: CreateExerciseData): void {
    const skill = this.skills().find((item) => item.id === id);
    const level = skill?.getLevel();
    if (!skill || !level) return;
    const exercise = new Exercise(
      level,
      data.maxLevel,
      data.availableOnLevel,
      data.experience,
      data.isFreezingDecay,
      data.name,
      data.description,
    );
    skill.addExerciseToLayer(levelScore, exercise);
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  doExercise(skillId: string, exerciseId: string): void {
    const skill = this.skills().find((item) => item.id === skillId);
    if (!skill) return;
    skill.doExercise(exerciseId);
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  #save(): void {
    this.storage.local.set(SKILLS_KEY, this.skills().map((skill) => skill.toSnapshot()));
  }
}
