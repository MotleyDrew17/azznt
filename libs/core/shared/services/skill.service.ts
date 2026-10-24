import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Exercise, Skill } from '../classes/skill.class';
import { CreateExerciseData, CreateSkillData } from '../models/skill.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class SkillService {
  private user = inject(UserService);

  readonly skills = signal<Skill[]>([]);
  readonly now = signal(Date.now());
  readonly exerciseDone = signal<{ skillId: string; count: number } | null>(null);

  constructor() {
    const timer = window.setInterval(() => {
      this.now.set(Date.now());
      this.#settleDecay();
    }, 60_000);
    inject(DestroyRef).onDestroy(() => window.clearInterval(timer));
  }

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

  // Загрузить навыки из сохранения
  loadSkills(): void {
    const stored = this.user.skills();
    // Уже загруженные навыки обновляются на месте
    const current = new Map(this.skills().map((skill) => [skill.id, skill]));
    const skills = stored.map((snapshot) => {
      const existing = current.get(snapshot.id);
      if (!existing) return Skill.fromSnapshot(snapshot);
      existing.applySnapshot(snapshot);
      return existing;
    });
    const now = Date.now();
    for (const skill of skills) skill.settleDecay(now);
    this.skills.set(skills);
    const decayChanged = skills.some((skill, index) => skill.getDecayTimestamp() !== (stored[index]?.level?.decay?.freezed_till_ms ?? 0));
    const layersMissing = stored.some((skill) => !skill.layers);
    const thresholdsChanged = skills.some((skill, index) => {
      const level = skill.getLevel();
      const saved = stored[index]?.level;
      if (!level || !saved) return false;
      return saved.base_exp == null || saved.score !== level.score || saved.next_exp !== level.next_exp || saved.prev_exp !== level.prev_exp;
    });
    if (decayChanged || layersMissing || thresholdsChanged) this.#save();
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

  moveExercise(skillId: string, exerciseId: string, levelScore: number): void {
    const skill = this.skills().find((item) => item.id === skillId);
    if (!skill) return;
    skill.moveExerciseToLayer(exerciseId, levelScore);
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  updateExercise(skillId: string, exerciseId: string, data: CreateExerciseData): void {
    const exercise = this.skills().find((item) => item.id === skillId)?.getExercise(exerciseId);
    if (!exercise) return;
    exercise.update(data);
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  doExercise(skillId: string, exerciseId: string): number {
    const skill = this.skills().find((item) => item.id === skillId);
    const exercise = skill?.getExercise(exerciseId);
    if (!skill || !exercise) return 0;
    const gained = exercise.reachedMaxLevel() ? 0 : exercise.experience;
    skill.doExercise(exerciseId);
    this.skills.update((skills) => [...skills]);
    this.#save();
    this.exerciseDone.update((done) => ({ skillId, count: (done?.count ?? 0) + 1 }));
    return gained;
  }

  // Сохранить навыки после награды опытом
  persist(): void {
    this.skills.update((skills) => [...skills]);
    this.#save();
  }

  #save(): void {
    this.user.setSkills(this.skills().map((skill) => skill.toSnapshot()));
  }

  #settleDecay(): void {
    const now = Date.now();
    const changed = this.skills().some((skill) => skill.settleDecay(now));
    if (!changed) return;
    this.skills.update((skills) => [...skills]);
    this.#save();
  }
}
