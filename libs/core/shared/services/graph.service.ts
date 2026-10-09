import { inject, Injectable, signal } from '@angular/core';
import {Quest} from '../classes/quest.class';
import { CreateQuestData, QuestSnapshot } from '../models/quest.model';
import { StorageService } from './storage.service';
import { dfs } from './graph.utils';

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  #questsMap: Record<string, Quest> = {};
  #graph: Quest | undefined;
  #zIndex = 1;
  graph = signal<Quest | undefined>(undefined);
  selectedQuestId = signal<string | null>(null);
  storageService = inject(StorageService);

  constructor() {
    this.#initGraphFromStorage();
    this.graph.set(this.#graph);
  }

  get questsList(): Quest[]{
    return Object.values(this.#questsMap);
  }

  getQuestById(id: string): Quest | undefined{
    return this.#questsMap[id];
  }

  selectQuest(id: string | null): void {
    this.selectedQuestId.set(id);
  }

  createQuest(data: CreateQuestData, isNewGraph: boolean = false): Quest{
    const quest = new Quest();
    quest.zIndex = this.#zIndex++;
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
    this.saveGraphToStorage();
    return quest;
  }

  removeQuest(id: string){
    const quest = this.#questsMap[id];
    quest.parents.forEach((parent: Quest) => {
      parent.removeChild(id);
    })
    if (this.selectedQuestId() === id) {
      this.selectedQuestId.set(null);
    }
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

  saveGraphToStorage(){
    const graphSnapshot = this.createGraphSnapshot();
    this.storageService.local.set('graph', graphSnapshot);
  }

  #initGraphFromStorage(){
    const graphSnapshot = this.storageService.local.get<QuestSnapshot[]>('graph');
    if(graphSnapshot){
      const graph = this.extractGraphFromSnapshot(graphSnapshot);
      this.#graph = graph;
      this.graph.set(this.#graph);
    }
  }

  createGraphSnapshot(): QuestSnapshot[] {
   return this.questsList.map(quest => quest.toSnapshot());
  }

  extractGraphFromSnapshot(snapshot: QuestSnapshot[]): Quest {
    const questsMap: Record<string, Quest> = {};
    snapshot.forEach(snapshot => {
      const quest = new Quest();
      quest.id = snapshot.id;
      quest.name = snapshot.name;
      quest.description = snapshot.description;
      quest.pos_x = snapshot.pos_x;
      quest.pos_y = snapshot.pos_y;
      quest.zIndex = snapshot.zIndex;
      quest.layer = snapshot.layer;
      quest.isRoot = snapshot.isRoot;
      questsMap[quest.id] = quest;
    });
    snapshot.forEach(snapshot => {
      const quest = questsMap[snapshot.id];
      if(quest){
        quest.parents = snapshot.parents?.map(parentId => questsMap[parentId]) || [];
        quest.children = snapshot.children?.map(childId => questsMap[childId]) || [];
      }
    });
    return questsMap[snapshot[0].id];
  }

}
