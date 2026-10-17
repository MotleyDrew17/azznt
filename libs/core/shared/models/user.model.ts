import { readQuestSnapshots, QuestSnapshot } from './quest.model';
import { readSkillSnapshots, SkillSnapshot } from './skill.model';

export interface StorylineSnapshot {
  id: string;
  quests: QuestSnapshot[];
}

export interface UserFile {
  storylines: StorylineSnapshot[];
  skills: SkillSnapshot[];
  activeId?: string;
}

export function parseUserFile(text: string): UserFile | null {
  try {
    return readUserFile(JSON.parse(text));
  } catch {
    return null;
  }
}

// Проекты и навыки из одного сохранения
export function readUserFile(value: unknown): UserFile | null {
  if (!value || typeof value !== 'object') return null;
  const file = value as UserFile;
  if (!Array.isArray(file.storylines)) return null;
  const storylines: StorylineSnapshot[] = [];
  for (const item of file.storylines) {
    const storyline = readStoryline(item);
    if (!storyline) return null;
    storylines.push(storyline);
  }
  const ids = new Set(storylines.map((storyline) => storyline.id));
  if (ids.size !== storylines.length) return null;
  const activeId = typeof file.activeId === 'string' && ids.has(file.activeId) ? file.activeId : undefined;
  return {
    storylines,
    skills: readSkillSnapshots(file.skills),
    activeId,
  };
}

function readStoryline(value: unknown): StorylineSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const storyline = value as StorylineSnapshot;
  const quests = readQuestSnapshots(storyline.quests);
  if (typeof storyline.id !== 'string' || !storyline.id || !quests?.length) return null;
  return { id: storyline.id, quests };
}
