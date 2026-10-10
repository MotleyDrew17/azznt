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