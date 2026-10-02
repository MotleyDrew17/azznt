import {Quest} from '../classes/quest.class';

export interface CreateQuestData{
  name: string,
  description: string,
  parent?: Quest
  child?: Quest
}
