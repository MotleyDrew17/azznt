import { SkillDialogKind } from '../enums/skill-dialog-kind.enum';

export interface CreateSkillData {
  name: string;
  description: string;
  requiredExp: number;
  expIncreasePercent: number;
  decayEnabled: boolean;
  inactivityDays?: number;
  lostExp?: number;
}

export interface SkillDialogData {
  kind: SkillDialogKind;
  id?: string;
}

export interface DecaySnapshot {
  value: number;
  freezed_till_ms: number;
  freezed_interval_ms: number;
}

export interface LevelSnapshot {
  score: number;
  current_exp: number;
  next_exp: number;
  prev_exp: number;
  coefficient: number;
  decay: DecaySnapshot | null;
}

export interface ExerciseSnapshot {
  id: string;
  name: string;
  description: string;
  experience: number;
  maxLevel: number;
  is_freezing_decay: boolean;
  available_on_level: number;
}

export interface SkillSnapshot {
  id: string;
  name: string;
  description: string;
  level: LevelSnapshot | null;
  exercises: ExerciseSnapshot[];
}

export function readSkillSnapshots(value: unknown): SkillSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isSkillSnapshot);
}

export function parseSkillSnapshot(text: string): SkillSnapshot | null {
  try {
    const data: unknown = JSON.parse(text);
    if (!isSkillSnapshot(data)) return null;
    return data;
  } catch {
    return null;
  }
}

function isSkillSnapshot(value: unknown): value is SkillSnapshot {
  if (!value || typeof value !== 'object') return false;
  const skill = value as SkillSnapshot;
  if (!Array.isArray(skill.exercises) || !skill.exercises.every(isExerciseSnapshot)) return false;
  const ids = new Set(skill.exercises.map((exercise) => exercise.id));
  return typeof skill.id === 'string'
    && skill.id.length > 0
    && typeof skill.name === 'string'
    && typeof skill.description === 'string'
    && (skill.level === null || isLevelSnapshot(skill.level))
    && ids.size === skill.exercises.length
    && (skill.level !== null || skill.exercises.length === 0);
}

function isLevelSnapshot(value: unknown): value is LevelSnapshot {
  if (!value || typeof value !== 'object') return false;
  const level = value as LevelSnapshot;
  return isFiniteNumber(level.score)
    && isFiniteNumber(level.current_exp)
    && isFiniteNumber(level.next_exp)
    && isFiniteNumber(level.prev_exp)
    && isFiniteNumber(level.coefficient)
    && (level.decay === null || isDecaySnapshot(level.decay));
}

function isDecaySnapshot(value: unknown): value is DecaySnapshot {
  if (!value || typeof value !== 'object') return false;
  const decay = value as DecaySnapshot;
  return isFiniteNumber(decay.value)
    && isFiniteNumber(decay.freezed_till_ms)
    && isFiniteNumber(decay.freezed_interval_ms);
}

function isExerciseSnapshot(value: unknown): value is ExerciseSnapshot {
  if (!value || typeof value !== 'object') return false;
  const exercise = value as ExerciseSnapshot;
  return typeof exercise.id === 'string'
    && exercise.id.length > 0
    && typeof exercise.name === 'string'
    && typeof exercise.description === 'string'
    && isFiniteNumber(exercise.experience)
    && isFiniteNumber(exercise.maxLevel)
    && typeof exercise.is_freezing_decay === 'boolean'
    && isFiniteNumber(exercise.available_on_level);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
