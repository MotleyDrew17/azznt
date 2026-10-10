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
  readonly listVersion = signal(0);
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
    if (data.pos_x !== undefined) quest.pos_x = data.pos_x;
    if (data.pos_y !== undefined) quest.pos_y = data.pos_y;
    if(data.child) {
      quest.addChild(data.child);
    }

    if(data.parent) {
      quest.addParent(data.parent);
    }
    this.#questsMap[quest.id] = quest;
    if(isNewGraph) {
      quest.isRoot = true;
      this.#graph = quest;
      this.graph.set(this.#graph);
    }
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
    return quest;
  }

  updateQuest(id: string, data: Pick<CreateQuestData, 'name' | 'description'>): void {
    const quest = this.#questsMap[id];
    if (!quest) return;

    quest.name = data.name;
    quest.description = data.description;
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
  }

  removeQuest(id: string): void {
    const quest = this.#questsMap[id];
    if (!quest) return;

    [...quest.parents].forEach((parent) => quest.removeParent(parent.id));
    [...quest.children].forEach((child) => quest.removeChild(child.id));
    delete this.#questsMap[id];

    if (this.#graph?.id === id) {
      this.#graph = this.questsList[0];
      this.graph.set(this.#graph);
    }
    if (this.selectedQuestId() === id) {
      this.selectedQuestId.set(null);
    }
    this.listVersion.update((version) => version + 1);
    this.saveGraphToStorage();
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
      this.#questsMap[quest.id] = quest;
    });
    snapshot.forEach(snapshot => {
      const quest = this.#questsMap[snapshot.id];
      if(quest){
        quest.parents = snapshot.parents?.map(parentId => this.#questsMap[parentId]) || [];
        quest.children = snapshot.children?.map(childId => this.#questsMap[childId]) || [];
      }
    });
    return this.#questsMap[snapshot[0].id];
  }

}
