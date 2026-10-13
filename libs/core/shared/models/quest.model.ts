import { Quest } from '../classes/quest.class';

export interface CreateQuestData {
  name: string;
  description: string;
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
}

export function parseQuestSnapshots(text: string): QuestSnapshot[] | null {
  try {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data) || !data.every(isQuestSnapshot)) return null;
    if (!linksResolve(data)) return null;
    return data;
  } catch {
    return null;
  }
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
    && typeof quest.isRoot === 'boolean';
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