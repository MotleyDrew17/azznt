import { Quest, QuestPriority } from '../classes/quest.class';

export interface QuestRequiredSkill {
  skillId: string;
  level: number;
}

export interface CreateQuestData {
  name: string;
  description: string;
  priority?: QuestPriority;
  requiredSkills?: QuestRequiredSkill[] | null;
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
  priority?: QuestPriority;
  requiredSkills?: QuestRequiredSkill[];
  requiredSkill?: QuestRequiredSkill;
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
    && isOptionalPriority(quest.priority)
    && isOptionalRequiredSkills(quest.requiredSkills)
    && isRequiredSkill(quest.requiredSkill);
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