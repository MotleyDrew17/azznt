import { QuestSnapshot } from "../models/quest.model";
import { createsCycle } from "../services/graph.utils";
import { Exercise, Skill, startOfLocalDay } from "./skill.class";

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

export interface StreakDay {
  date_ms: number;
  was_done: boolean;
  must_be_done: number;
  done_count: number;
}

export class Streak {
  #id: string = '';
  #exercise: Exercise | null = null;
  #startedAtTimestamp: number = 0;
  #durationDays: number = 0;
  #mustBeDoneCount: number = 0;
  #mustBeDonePerDay: number = 1;

  constructor(exercise: Exercise, startedAtTimestamp: number, durationDays: number, mustBeDoneCount?: number, mustBeDonePerDay?: number) {
    this.#id = crypto.randomUUID();
    this.#exercise = exercise;
    this.#startedAtTimestamp = startedAtTimestamp;
    this.#durationDays = durationDays;
    this.#mustBeDoneCount = mustBeDoneCount || this.#durationDays;
    this.#mustBeDonePerDay = mustBeDonePerDay || 1;
  }

  get id(): string {
    return this.#id;
  }

  get exercise(): Exercise | null {
    return this.#exercise;
  }
  
  
  set exercise(exercise: Exercise) {
    this.#exercise = exercise;
  }

  get startedAtTimestamp(): number {
    return this.#startedAtTimestamp;
  }


  set startedAtTimestamp(startedAtTimestamp: number) {
    this.#startedAtTimestamp = startedAtTimestamp;
  }

  get durationDays(): number {
    return this.#durationDays;
  }

  get mustBeDoneCount(): number {
    return this.#mustBeDoneCount;
  }

  get mustBeDonePerDay(): number {
    return this.#mustBeDonePerDay;
  }

  set mustBeDoneCount(mustBeDoneCount: number) {
    this.#mustBeDoneCount = mustBeDoneCount;
  }

  set mustBeDonePerDay(mustBeDonePerDay: number) {
    this.#mustBeDonePerDay = mustBeDonePerDay;
  }

  // Дни всего срока, включая ещё не наступившие
  getStreakDays(): StreakDay[] {
    if (!this.#exercise || this.#startedAtTimestamp <= 0) return [];
    const today = startOfLocalDay(Date.now());
    const start = startOfLocalDay(this.#startedAtTimestamp);
    if (start > today) return [];

    const doneByDay = new Map<number, number>();
    for (const item of this.#exercise.getDoneHistory(start, Date.now())) {
      if (!item.was_done) continue;
      const day = startOfLocalDay(item.date_ms);
      doneByDay.set(day, (doneByDay.get(day) ?? 0) + 1);
    }

    const streakDays: StreakDay[] = [];
    const lastDay = new Date(start);
    lastDay.setDate(lastDay.getDate() + Math.max(this.#durationDays, 1) - 1);
    const end = lastDay.getTime();
    const cursor = new Date(start);
    while (cursor.getTime() <= end) {
      const date_ms = cursor.getTime();
      const done_count = doneByDay.get(date_ms) ?? 0;
      streakDays.push({
        date_ms,
        done_count,
        must_be_done: this.#mustBeDonePerDay,
        was_done: done_count >= this.#mustBeDonePerDay,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return streakDays;
  }

  isStreakCompleted(): boolean {
    const streakDays = this.getStreakDays();
    const completedDays = streakDays.filter(day => day.was_done).length;
    return completedDays >= this.#mustBeDoneCount;
  }

  // Срок серии уже прошёл
  isOver(): boolean {
    if (this.#startedAtTimestamp <= 0) return false;
    const start = startOfLocalDay(this.#startedAtTimestamp);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(this.#durationDays, 1) - 1);
    return startOfLocalDay(Date.now()) > end.getTime();
  }

}

export class Quest {
  #id: string = '';
  #children: Quest[] = [];
  #parents: Quest[] = [];
  #pos_x: number = 0;
  #pos_y: number = 0;
  #name: string = '';
  #description: string = '';
  #isCompleted: boolean = false;
  #pressedAt?: number;
  #ancestors: Quest[] = [];
  #layer: number | null = 0; // null - квест вне графа
  #isRoot: boolean = false;
  #zIndex: number = 0;
  #requiredSkills: { skill: Skill; level: number }[] = [];
  #priority: QuestPriority = QuestPriority.Common;
  #streak: Streak | null = null;
  #streakFailed = false;

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

  get streak(): Streak | null{
    return this.#streak;
  }

  set streak(streak: Streak | null){
    this.#streak = streak;
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

  get pressedAt(): number | undefined {
    return this.#pressedAt;
  }

  get streakDays(): StreakDay[] {
    return this.#streak?.getStreakDays() ?? [];
  }

  get isStreakStarted(): boolean {
    return this.#streak ? this.#streak.startedAtTimestamp > 0 : false;
  }

  get streakFailed(): boolean {
    return this.#streakFailed;
  }

  set streakFailed(streakFailed: boolean) {
    this.#streakFailed = streakFailed;
  }

  get isStreakSuccess(): boolean {
    return !!this.#streak && this.#isCompleted && !this.#streakFailed;
  }

  get isStreakFailed(): boolean {
    return !!this.#streak && this.#streakFailed;
  }

  get isStreakSettled(): boolean {
    return this.isStreakSuccess || this.isStreakFailed;
  }

  // Серия не закрывает путь к следующему квесту
  get opensPath(): boolean {
    return this.#isCompleted || this.#streak != null;
  }

  // Успех или провал серии. Оба исхода помечают квест выполненным
  syncStreak(): boolean {
    const streak = this.#streak;
    if (!streak || !this.isStreakStarted || this.isStreakSettled) return false;
    if (streak.isStreakCompleted()) {
      this.complete(true);
      return true;
    }
    if (streak.isOver()) {
      this.#streakFailed = true;
      this.complete(false);
      return true;
    }
    return false;
  }

  // Снять итог серии перед новым заходом
  clearStreakResult(): void {
    this.uncomplete();
    this.#streakFailed = false;
  }

  // Отметить выполненным. mark — только что нажали, стрелка подождёт вмятину
  complete(mark = false){
    this.#isCompleted = true;
    if (mark) this.#pressedAt = Date.now();
  }

  /**
   * Квест доступен, если выполнены предыдущие квесты и навыки. Серия путь не закрывает.
   * */
  get isAvailable(){
    const childrenDone = this.#children.every((child) => child.opensPath);
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

    // child удаляет у себя this из parents — приватным методом
    child.#detachParent(this.#id);

    return true;
  }

  // Снять выполнение
  uncomplete(){
    this.#isCompleted = false;
    this.#pressedAt = undefined;
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
      isCompleted: this.#isCompleted || undefined,
      streakFailed: this.#streakFailed || undefined,
      priority: this.#priority,
      requiredSkills: this.#requiredSkills.length
        ? this.#requiredSkills.map((item) => ({ skillId: item.skill.id, level: item.level }))
        : undefined,
      streak: this.#streak?.exercise ? {
        exerciseId: this.#streak.exercise.id,
        startedAt: this.#streak.startedAtTimestamp,
        durationDays: this.#streak.durationDays,
        mustBeDonePerDay: this.#streak.mustBeDonePerDay,
        mustBeDoneCount: this.#streak.mustBeDoneCount,
      } : undefined,
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

