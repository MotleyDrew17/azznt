import { Quest, QuestPriority } from '../classes/quest.class';

export interface QuestRequiredSkill {
  skillId: string;
  level: number;
}

export interface QuestStreakData {
  exerciseId: string;
  durationDays: number;
  mustBeDonePerDay: number;
  mustBeDoneCount: number;
  startedAt?: number;
}

export interface QuestRewardSkillData {
  skillId: string;
  experience: number;
}

export interface QuestRewardData {
  id: string;
  name: string;
  description: string;
  is_exp: boolean;
  isTaken?: boolean;
  skills?: QuestRewardSkillData[];
}

export interface CreateQuestData {
  name: string;
  description: string;
  priority?: QuestPriority;
  requiredSkills?: QuestRequiredSkill[] | null;
  streak?: QuestStreakData | null;
  rewards?: QuestRewardData[] | null;
  parent?: Quest;
  child?: Quest;
  pos_x?: number;
  pos_y?: number;
}

export interface QuestSnapshot {
  id: string;
  name: string;
  description: string;
  parents?: string[];
  children?: string[];
  pos_x: number;
  pos_y: number;
  zIndex: number;
  layer: number | null;
  isRoot: boolean;
  isCompleted?: boolean;
  streakFailed?: boolean;
  priority?: QuestPriority;
  requiredSkills?: QuestRequiredSkill[];
  requiredSkill?: QuestRequiredSkill;
  streak?: QuestStreakData;
  rewards?: QuestRewardData[];
}

export function parseQuestSnapshots(text: string): QuestSnapshot[] | null {
  try {
    return readQuestSnapshots(JSON.parse(text));
  } catch {
    return null;
  }
}

// Список квестов из уже разобранного JSON
export function readQuestSnapshots(value: unknown): QuestSnapshot[] | null {
  if (!Array.isArray(value) || !value.every(isQuestSnapshot)) return null;
  if (!linksResolve(value)) return null;
  return value.map((quest) => ({
    ...quest,
    requiredSkills: quest.requiredSkills ?? (quest.requiredSkill ? [quest.requiredSkill] : undefined),
  }));
}

function isQuestSnapshot(value: unknown): value is QuestSnapshot {
  if (!value || typeof value !== 'object') return false;
  const quest = value as QuestSnapshot;
  return typeof quest.id === 'string'
    && quest.id.length > 0
    && typeof quest.name === 'string'
    && typeof quest.description === 'string'
    && isIdList(quest.parents)
    && isIdList(quest.children)
    && Number.isFinite(quest.pos_x)
    && Number.isFinite(quest.pos_y)
    && Number.isFinite(quest.zIndex)
    && (quest.layer === null || Number.isFinite(quest.layer))
    && typeof quest.isRoot === 'boolean'
    && (quest.isCompleted === undefined || typeof quest.isCompleted === 'boolean')
    && (quest.streakFailed === undefined || typeof quest.streakFailed === 'boolean')
    && isOptionalPriority(quest.priority)
    && isOptionalRequiredSkills(quest.requiredSkills)
    && isRequiredSkill(quest.requiredSkill)
    && isStreak(quest.streak)
    && isRewards(quest.rewards);
}

function isOptionalPriority(value: unknown): value is QuestPriority | undefined {
  return value === undefined
    || (typeof value === 'number'
      && Number.isInteger(value)
      && value >= QuestPriority.Common
      && value <= QuestPriority.Main);
}

function isRequiredSkill(value: unknown): value is QuestRequiredSkill | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const skill = value as QuestRequiredSkill;
  return typeof skill.skillId === 'string'
    && skill.skillId.length > 0
    && Number.isInteger(skill.level)
    && skill.level >= 1;
}

function isOptionalRequiredSkills(value: unknown): value is QuestRequiredSkill[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((item) => isRequiredSkill(item) && item !== undefined));
}

function isStreak(value: unknown): value is QuestStreakData | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const streak = value as QuestStreakData;
  return typeof streak.exerciseId === 'string'
    && streak.exerciseId.length > 0
    && Number.isInteger(streak.durationDays)
    && streak.durationDays >= 1
    && Number.isInteger(streak.mustBeDonePerDay)
    && streak.mustBeDonePerDay >= 1
    && Number.isInteger(streak.mustBeDoneCount)
    && streak.mustBeDoneCount >= 1
    && (streak.startedAt === undefined || Number.isFinite(streak.startedAt));
}

function isRewards(value: unknown): value is QuestRewardData[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every(isReward));
}

function isReward(value: unknown): value is QuestRewardData {
  if (!value || typeof value !== 'object') return false;
  const reward = value as QuestRewardData;
  return typeof reward.id === 'string'
    && reward.id.length > 0
    && typeof reward.name === 'string'
    && typeof reward.description === 'string'
    && typeof reward.is_exp === 'boolean'
    && (reward.isTaken === undefined || typeof reward.isTaken === 'boolean')
    && isRewardSkills(reward.skills);
}

function isRewardSkills(value: unknown): value is QuestRewardSkillData[] | undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const skill = item as QuestRewardSkillData;
    return typeof skill.skillId === 'string'
      && skill.skillId.length > 0
      && Number.isFinite(skill.experience)
      && skill.experience > 0;
  });
}

function isIdList(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

function linksResolve(quests: QuestSnapshot[]): boolean {
  const ids = new Set(quests.map((quest) => quest.id));
  if (ids.size !== quests.length) return false;
  if (quests.length > 0 && !quests.some((quest) => quest.isRoot)) return false;

  return quests.every((quest) =>
    [...(quest.parents ?? []), ...(quest.children ?? [])].every((id) => ids.has(id)),
  );
}