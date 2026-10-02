import { Injectable } from '@angular/core';
import {Quest} from '../classes/quest.class';
import {CreateQuestData} from '../models/quest.model';

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  #questsMap: Record<string, Quest> = {};
  graph: Quest | undefined;

  constructor() {}

  createQuest(data: CreateQuestData): Quest{
    const quest = new Quest();
    quest.name = data.name;
    quest.description = data.description;
    if(data.child) {
      quest.addChild(data.child);
    }

    if(data.parent) {
      quest.addParent(data.parent);
    }
    this.#questsMap[quest.id] = quest;
    return quest;
  }

  removeQuest(id: string){
    const quest = this.#questsMap[id];
    quest.parents.forEach((parent: Quest) => {
      parent.removeChild(id);
    })
  }

  createEmptyQuest(){
    if(!this.graph) return
    const quest = new Quest();
    this.#questsMap[quest.id] = quest;
    return quest;
  }

  copyQuest(quest: Quest){
    const copy = new Quest();
    copy.name = quest.name;
    copy.description = quest.description;
    this.#questsMap[copy.id] = copy;
    return copy;
  }
}
