import { QuestSnapshot } from "../models/quest.model";
import { createsCycle } from "../services/graph.utils";
import { Skill } from "./skill.class";

export const QUEST_CYCLE_ERROR = 'Такая связь замкнёт цикл.';

export enum QuestPriority {
  Common,
  Uncommon,
  Notable,
  Epic,
  Mythic,
  Legendary,
  Main,
}

export const QUEST_PRIORITY_LABEL: Record<QuestPriority, string> = {
  [QuestPriority.Common]: 'Обычный',
  [QuestPriority.Uncommon]: 'Необычный',
  [QuestPriority.Notable]: 'Примечательный',
  [QuestPriority.Epic]: 'Эпический',
  [QuestPriority.Mythic]: 'Мифический',
  [QuestPriority.Legendary]: 'Легендарный',
  [QuestPriority.Main]: 'Главный',
};

export class Quest {
  #id: string = '';
  #children: Quest[] = [];
  #parents: Quest[] = [];
  #pos_x: number = 0;
  #pos_y: number = 0;
  #name: string = '';
  #description: string = '';
  #isCompleted: boolean = false;
  #ancestors: Quest[] = [];
  #layer: number | null = 0; // null - квест вне графа
  #isRoot: boolean = false;
  #zIndex: number = 0;
  #requiredSkills: { skill: Skill; level: number }[] = [];
  #priority: QuestPriority = QuestPriority.Common;

  constructor() {
    this.#id = crypto.randomUUID();
  }

  get isRoot(): boolean{
    return this.#isRoot;
  }

  set isRoot(isRoot: boolean){
    this.#isRoot = isRoot;
  }

  get parents(): Quest[] {
    return this.#parents;
  }

  set parents(parents: Quest[]){
    this.#parents = parents;
  }

  get children(): Quest[] {
    return this.#children;
  }

  set children(children: Quest[]){
    this.#children = children;
  }

  get ancestors(): Quest[]{
    return this.#ancestors;
  }

  get id(): string {
    return this.#id;
  }

  set id(id: string){
    this.#id = id;
  }

  get name(){
    return this.#name;
  }

  set name(name: string){
    this.#name = name;
  }

  get description(){
    return this.#description;
  }

  set description(description: string){
    this.#description = description;
  }

  get layer(): number | null{
    return this.#layer;
  }

  set layer(layer: number | null){
    this.#layer = layer;
  }

  get pos_x(): number{
    return this.#pos_x;
  }

  set pos_x(pos_x: number){
    this.#pos_x = pos_x;
  }

  get pos_y(): number{
    return this.#pos_y;
  }

  set pos_y(pos_y: number){
    this.#pos_y = pos_y;
  }

  get zIndex(): number{
    return this.#zIndex;
  }

  set zIndex(zIndex: number){
    this.#zIndex = zIndex;
  }

  get priority(): QuestPriority{
    return this.#priority;
  }

  set priority(priority: QuestPriority){
    this.#priority = priority;
  }

  get requiredSkills(): { skill: Skill; level: number }[] {
    return this.#requiredSkills;
  }

  set requiredSkills(skills: { skill: Skill; level: number }[]) {
    this.#requiredSkills = skills;
  }

  get isCompleted(): boolean{
    return this.#isCompleted;
  }

  complete(){
    this.#isCompleted = true;
  }

  /**
   * Квест доступен, если выполнены все предквесты и каждый требуемый навык достиг своего уровня.
   * */
  get isAvailable(){
    const childrenDone = this.#children.every((child) => child.isCompleted);
    const skillsReady = this.#requiredSkills.every((item) => item.skill.score >= item.level);
    return childrenDone && skillsReady;
  }

  getParentById(id: string): Quest | undefined{
    return this.#parents.find((parent) => parent.id === id);
  }

  getChildById(id: string): Quest | undefined{
    return this.#children.find((child) => child.id === id);
  }

  addParent(parent: Quest): string | null {
    if (createsCycle(this, parent)) return QUEST_CYCLE_ERROR;

    this.#addParent(parent);
    parent.#addChild(this);
    return null;
  }

  addChild(child: Quest): string | null {
    if (createsCycle(child, this)) return QUEST_CYCLE_ERROR;

    this.#addChild(child);
    child.#addParent(this);
    return null;
  }

  removeParent(id: string): boolean {
    const parent = this.#detachParent(id);
    if (!parent) return false;

    // parent удаляет у себя this из children — приватным методом!
    parent.#detachChild(this.#id);

    return true;
  }

  removeChild(id: string): boolean {
    const child = this.#detachChild(id);
    if (!child) return false;

    // child удаляет у себя this из parents — приватным методом!
    child.#detachParent(this.#id);

    return true;
  }

  toSnapshot(): QuestSnapshot {
    return {
      id: this.#id,
      name: this.#name,
      description: this.#description,
      parents: this.#parents.map(parent => parent.id),
      children: this.#children.map(child => child.id),
      pos_x: this.#pos_x,
      pos_y: this.#pos_y,
      zIndex: this.#zIndex,
      layer: this.#layer,
      isRoot: this.#isRoot,
      priority: this.#priority,
      requiredSkills: this.#requiredSkills.length
        ? this.#requiredSkills.map((item) => ({ skillId: item.skill.id, level: item.level }))
        : undefined,
    };
  }

  #addParent(parent: Quest) {
    this.#parents.push(parent);
    this.#ancestors = [...parent.ancestors, ...this.parents];
  }

  #addChild(child: Quest) {
    this.#children.push(child);
  }

  #detachParent(id: string): Quest | undefined {
    const idx = this.#parents.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.#ancestors = [...this.ancestors, ...this.parents];
    return this.#parents.splice(idx, 1)[0];
  }

  #detachChild(id: string): Quest | undefined {
    const idx = this.#children.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    return this.#children.splice(idx, 1)[0];
  }

}

