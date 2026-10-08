import { inject, Injectable, signal } from '@angular/core';
import {Quest} from '../classes/quest.class';
import { CreateQuestData } from '../models/quest.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  #questsMap: Record<string, Quest> = {};
  #graph: Quest | undefined;
  graph = signal<Quest | undefined>(undefined);
  storageService = inject(StorageService);

  constructor() {
    this.#initGraphFromStorage();
    this.graph.set(this.#graph);
  }

  createQuest(data: CreateQuestData, isNewGraph: boolean = false): Quest{
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
    if(isNewGraph) {
      this.#graph = quest;
      this.graph.set(this.#graph);
    }
    return quest;
  }

  removeQuest(id: string){
    const quest = this.#questsMap[id];
    quest.parents.forEach((parent: Quest) => {
      parent.removeChild(id);
    })
  }

  createEmptyQuest(){
    if(!this.#graph) return
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

  #initGraphFromStorage(){
    const graph = this.storageService.local.get<Quest>('graph');
    if(graph){
      this.#graph = graph;
    }
  }
}
