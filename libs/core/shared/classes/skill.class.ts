import { CreateExerciseData, CreateSkillData, ExerciseSnapshot, LevelSnapshot, SkillSnapshot } from "../models/skill.model";

export interface Decay {
    value: number; // значение отката навыка
    freezed_till_ms: number; // дата в миллисекундах, до которой заморожен откат навыка
    freezed_interval_ms: number; /** Интервал в миллисекундах, через который будет уменьшаться откат навыка.                                  Нужен, чтобы обновлять дату до которой заморожен откат навыка */
    lost: number; // опыт, потерянный за текущую непрерывную серию откатов
}

export interface SkillLayer {
    levelScore: number;
    exercises: Exercise[]; // упражнения, которые становятся доступны на этом уровне навыка
}

export class Skill {
    #id: string = '';
    #name: string = '';
    #description: string = '';
    #level: Level | null = null; // текущий уровень навыка
    #layers: SkillLayer[] = [
        { levelScore: 1, exercises: [] },
    ]; // уровни навыка, на которых становятся доступны упражнения
    

    constructor(data: CreateSkillData) {
        this.#id = crypto.randomUUID();
        this.#name = data.name;
        this.#description = data.description;
        this.#level = new Level(data.requiredExp, data.expIncreasePercent, data.decayEnabled, data.inactivityDays ?? 0, data.lostExp ?? 0);
    }

    get id(): string {
        return this.#id;
    }

    get name(): string {
        return this.#name;
    }

    get description(): string {
        return this.#description;
    }

    set name(name: string) {
        this.#name = name;
    }

    set description(description: string) {
        this.#description = description;
    }

    update(data: CreateSkillData): void {
        this.#name = data.name;
        this.#description = data.description;
        this.#level?.update(data);
    }

    get exercises(): Exercise[] {
        return this.#layers.flatMap(layer => layer.exercises);
    }

    get score(): number {
        return this.#level?.score ?? 0;
    }

    addExperience(experience: number) {
        this.#level?.addExp(experience);
    }


    removeExperience(experience: number) {
        this.#level?.removeExp(experience);
    }
    
    addLayer(levelScore: number) {
        const hasLayer = this.#layers.some(layer => layer.levelScore === levelScore);
        if(!hasLayer) this.#layers.push({ levelScore, exercises: [] }); // если слой навыка не существует, то добавляем его
    }

    removeLayer(levelScore: number) {
        this.#layers = this.#layers.filter(layer => layer.levelScore !== levelScore);
    }

    getLayers() {
        return this.#layers;
    }

    addExerciseToLayer(levelScore: number, exercise: Exercise): string | undefined {
        const layer = this.#layers.find(layer => layer.levelScore === levelScore);
        const hasExercise = layer?.exercises.some(e => e.id === exercise.id);
        if(layer && !hasExercise) layer.exercises.push(exercise); // если слой навыка существует и упражнение не существует, то добавляем его
        return hasExercise ? exercise.id : undefined;
    }

    moveExerciseToLayer(exerciseId: string, levelScore: number): void {
        const source = this.#layers.find(layer => layer.exercises.some(exercise => exercise.id === exerciseId));
        const target = this.#layers.find(layer => layer.levelScore === levelScore);
        const exercise = source?.exercises.find(item => item.id === exerciseId);
        if (!source || !target || !exercise || source.levelScore === target.levelScore) return;
        source.exercises = source.exercises.filter(item => item.id !== exerciseId);
        exercise.availableOnLevel = levelScore;
        target.exercises.push(exercise);
    }

    removeExerciseFromLayer(levelScore: number, exercise: Exercise): string | undefined {
        const layer = this.#layers.find(layer => layer.levelScore === levelScore);
        const hasExercise = layer?.exercises.some(e => e.id === exercise.id);
        if(layer && hasExercise) layer.exercises = layer.exercises.filter(e => e.id !== exercise.id); // если слой навыка существует и упражнение существует, то удаляем его
        return hasExercise ? exercise.id : undefined;
    }

    getExercisesFromLayer(levelScore: number) {
        const layer = this.#layers.find(layer => layer.levelScore === levelScore);
        return layer?.exercises ?? [];
    }
    addExercise(max_level: number, available_on_level: number) {
        if(!this.#level) throw new Error('Level is not set'); 
        const exercise = new Exercise(this.#level, max_level, available_on_level, 0, true, '', '');
        this.addExerciseToLayer(available_on_level, exercise);
    }

    doExercise(exercise_id: string) {
        const exercise = this.exercises.find(exercise => exercise.id === exercise_id);
        exercise?.do();
    }

    getExercise(exercise_id: string) {
        return this.exercises.find(exercise => exercise.id === exercise_id);
    }

    getExercises() {
        return this.exercises;
    }

    getLevel() {
        return this.#level;
    }

    setLevel(level: Level) {
        this.#level = level;
    }

    getDecayTimestamp() {
        return this.#level?.decay?.freezed_till_ms ?? 0;
    }

    // Списать просроченные откаты и сдвинуть срок
    settleDecay(now: number): boolean {
        return this.#level?.settleDecay(now) ?? false;
    }

    toSnapshot(): SkillSnapshot {
        return {
            id: this.#id,
            name: this.#name,
            description: this.#description,
            level: this.#level?.toSnapshot() ?? null,
            exercises: this.exercises.map(exercise => exercise.toSnapshot()),
            layers: this.#layers.map(layer => ({
                levelScore: layer.levelScore,
                exercises: layer.exercises.map(exercise => exercise.toSnapshot()),
            })),
        };
    }

    // Обновить навык на месте
    applySnapshot(snapshot: SkillSnapshot): void {
        const level = snapshot.level ? Level.fromSnapshot(snapshot.level) : null;
        this.#id = snapshot.id;
        this.#name = snapshot.name;
        this.#description = snapshot.description;
        this.#level = level;
        if (snapshot.layers?.length) {
            this.#layers = snapshot.layers.map(layer => ({
                levelScore: layer.levelScore,
                exercises: level ? layer.exercises.map(exercise => Exercise.fromSnapshot(exercise, level)) : [],
            }));
        }
    }

    // Собрать навык из снимка
    static fromSnapshot(snapshot: SkillSnapshot): Skill {
        const skill = new Skill({
            name: snapshot.name,
            description: snapshot.description,
            requiredExp: snapshot.level?.next_exp ?? 0,
            expIncreasePercent: snapshot.level?.coefficient ?? 0,
            decayEnabled: false,
        });
        skill.applySnapshot(snapshot);
        return skill;
    }
}

function localDayStamp(time: number): string {
    const date = new Date(time);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function startOfLocalDay(time: number): number {
    const date = new Date(time);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

// 23:59 дня, в который истекает срок отката
function endOfDecayDay(fromMs: number, intervalMs: number): number {
    const date = new Date(fromMs + intervalMs);
    date.setHours(23, 59, 0, 0);
    return date.getTime();
}

export class Exercise {
    #id: string = '';
    #name: string = '';
    #description: string = '';
    #experience: number = 0; // количество опыта, которое дает упражнение
    #maxLevel: number = 0; // максимальный уровень навыка, до которого упражнение дает опыт
    #is_freezing_decay: boolean = true; // признак того, что выполнение упражнения замораживает откат навыка
    #available_on_level: number = 0; // уровень навыка, на котором доступно выполнение упражнения
    #performedAt: number = 0;
    #level: Level | null = null; // уровень навык. Нужен для работы с уровнем навыка
    #doneHistory: {date_ms: number, was_done: boolean}[] = []; // история выполнения упражнения в миллисекундах

    constructor(level: Level, max_level: number, available_on_level: number, experience: number, is_freezing_decay: boolean, name: string, description: string) {
        this.#id = crypto.randomUUID();
        this.#name = name;
        this.#description = description;
        this.#level = level;
        this.#maxLevel = max_level;
        this.#available_on_level = available_on_level;
        this.#experience = experience;
        this.#is_freezing_decay = is_freezing_decay;
    }

    get id(): string {
        return this.#id;
    }

    get name(): string {
        return this.#name;
    }

    get description(): string {
        return this.#description;
    }

    set name(name: string) {
        this.#name = name;
    }

    set description(description: string) {
        this.#description = description;
    }

    get experience(): number {
        return this.#experience;
    }

    get availableOnLevel(): number {
        return this.#available_on_level;
    }

    set availableOnLevel(level: number) {
        this.#available_on_level = level;
    }

    get isFreezingDecay(): boolean {
        return this.#is_freezing_decay;
    }
    getDoneHistory(from_ms: number, to_ms: number): {date_ms: number, was_done: boolean}[] {
        return this.#doneHistory.filter(item => item.date_ms >= from_ms && item.date_ms <= to_ms);
    }

    update(data: CreateExerciseData): void {
        this.#name = data.name;
        this.#description = data.description;
        this.#experience = data.experience;
        this.#maxLevel = data.maxLevel;
        this.#available_on_level = data.availableOnLevel;
        this.#is_freezing_decay = data.isFreezingDecay;
    }

    get currentLevel(): number {
        return this.#level?.score ?? 0;
    }

    get maxLevel(): number {
        return this.#maxLevel;
    }

    set maxLevel(maxLevel: number) {
        this.#maxLevel = maxLevel;
    }

    isAvailable(current_level: number) {
        return current_level >= this.#available_on_level;
    }

    reachedMaxLevel(): boolean {
        if (!this.#level || this.#maxLevel <= 0) return false;
        return this.#level.score >= this.#maxLevel;
    }

    performedToday(now: number): boolean {
        if (this.#performedAt <= 0) return false;
        return localDayStamp(this.#performedAt) === localDayStamp(now);
    }

    do() {
        if(!this.#level) throw new Error('Level is not set');
        if(this.#is_freezing_decay) {
           this.#level.freezeDecay();
        }
        if (this.#maxLevel <= 0 || this.#level.score < this.#maxLevel) {
            this.#level.addExp(this.#experience);
        }
        this.#performedAt = Date.now();
        this.#updateDoneHistory();
    }

    // Каждое выполнение и пропуски после последней даты
    #updateDoneHistory(): void {
        const today = startOfLocalDay(Date.now());
        const last = this.#doneHistory.at(-1);
        const lastDay = last ? startOfLocalDay(last.date_ms) : null;
        if (lastDay != null && lastDay < today) {
            const cursor = new Date(lastDay);
            cursor.setDate(cursor.getDate() + 1);
            while (cursor.getTime() < today) {
                this.#doneHistory.push({ date_ms: cursor.getTime(), was_done: false });
                cursor.setDate(cursor.getDate() + 1);
            }
        }
        this.#doneHistory.push({ date_ms: today, was_done: true });
    }

    toSnapshot(): ExerciseSnapshot {
        return {
            id: this.#id,
            name: this.#name,
            description: this.#description,
            experience: this.#experience,
            maxLevel: this.#maxLevel,
            is_freezing_decay: this.#is_freezing_decay,
            available_on_level: this.#available_on_level,
            performed_at: this.#performedAt,
            done_history: this.#doneHistory.length ? this.#doneHistory.map((item) => ({ ...item })) : undefined,
        };
    }

    static fromSnapshot(snapshot: ExerciseSnapshot, level: Level): Exercise {
        const exercise = new Exercise(
            level,
            snapshot.maxLevel,
            snapshot.available_on_level,
            snapshot.experience,
            snapshot.is_freezing_decay,
            snapshot.name,
            snapshot.description,
        );
        exercise.#id = snapshot.id;
        exercise.#performedAt = snapshot.performed_at ?? 0;
        exercise.#doneHistory = snapshot.done_history?.map((item) => ({ ...item })) ?? [];
        return exercise;
    }

}

export class Level {
    #score: number = 1; // текущий уровень навыка
    #current_exp: number = 0; // текущее количество опыта
    #baseExp: number = 0; // опыт для перехода с 1 на 2 уровень
    #next_exp: number = 0; // накопленный опыт, при котором открывается следующий уровень
    #prev_exp: number = 0; // накопленный опыт, при котором был открыт текущий уровень
    #coefficient: number = 0; // процент, на который растёт требуемый опыт каждого следующего уровня
    #decay: Decay | null = null;

    constructor(requiredExp: number, expIncreasePercent: number, decayEnabled: boolean, inactivityDays: number, lostExp: number) {
        this.#baseExp = requiredExp;
        this.#coefficient = expIncreasePercent;
        this.#applyThresholds();
        if(decayEnabled) {
            const interval = inactivityDays * 24 * 60 * 60 * 1000;
            this.#decay = {
                value: lostExp,
                lost: 0,
                freezed_till_ms: endOfDecayDay(Date.now(), interval),
                freezed_interval_ms: interval,
            };
        }

    }

    get score(): number {
        return this.#score;
    }

    get current_exp(): number {
        return this.#current_exp;
    }

    get next_exp(): number {
        return this.#next_exp;
    }

    get prev_exp(): number {
        return this.#prev_exp;
    }

    get coefficient(): number {
        return this.#coefficient;
    }

    get baseExp(): number {
        return this.#baseExp;
    }

    get decay(): Decay | null{
        return this.#decay;
    }
    
    
    set score(score: number) {
        this.#score = score;
    }

    set current_exp(current_exp: number) {
        this.#current_exp = roundExp(Math.max(0, current_exp));
    }

    update(data: CreateSkillData): void {
        this.#baseExp = data.requiredExp;
        this.#coefficient = data.expIncreasePercent;
        if (!data.decayEnabled) {
            this.#decay = null;
            return;
        }

        const interval = (data.inactivityDays ?? 0) * 24 * 60 * 60 * 1000;
        const lostExp = data.lostExp ?? 0;
        if (this.#decay) {
            this.#decay.value = lostExp;
            if (this.#decay.freezed_interval_ms !== interval) {
                this.#decay.freezed_interval_ms = interval;
                this.#decay.freezed_till_ms = endOfDecayDay(Date.now(), interval);
            }
            return;
        }

        this.#decay = {
            value: lostExp,
            lost: 0,
            freezed_till_ms: endOfDecayDay(Date.now(), interval),
            freezed_interval_ms: interval,
        };
    }

    freezeDecay() {
        if(!this.#decay) throw new Error('Decay is not set');
        this.#decay.lost = 0;
        this.#decay.freezed_till_ms = endOfDecayDay(Date.now(), this.#decay.freezed_interval_ms);
    }

    // Просроченный откат: списание, пока опыт не нулевой, и новый срок
    settleDecay(now: number): boolean {
        const decay = this.#decay;
        if (!decay || decay.freezed_interval_ms <= 0 || now < decay.freezed_till_ms) return false;
        let changed = false;
        let guard = 0;
        while (now >= decay.freezed_till_ms && guard < 1000) {
            guard++;
            const due = decay.freezed_till_ms;
            if (this.#current_exp > 0) {
                const before = this.#current_exp;
                this.removeExp(decay.value);
                decay.lost = roundExp((decay.lost ?? 0) + before - this.#current_exp);
            }
            const next = endOfDecayDay(due, decay.freezed_interval_ms);
            if (next <= due) break;
            decay.freezed_till_ms = next;
            changed = true;
        }
        return changed;
    }

    addExp(exp: number) {
        this.#setExp(this.#current_exp + exp);
        this.handleNextOrPrevLevel();
    }

    // Опыт при списании не уходит ниже нуля
    removeExp(exp: number) {
        this.#setExp(this.#current_exp - exp);
        this.handleNextOrPrevLevel();
    }

    addDecay(decay: Decay) {
        this.#decay = decay;
    }

    /** Метод, который обрабатывает переход на следующий или предыдущий уровень */
    handleNextOrPrevLevel() {
        let guard = 0;
        while (this.#current_exp >= this.#next_exp && this.#next_exp > this.#prev_exp && guard < 1000) {
            const reached = this.#next_exp;
            this.#score++;
            this.#prev_exp = reached;
            this.#next_exp = roundExp(reached + this.#span(this.#score));
            guard++;
        }
        while (this.#score > 1 && this.#current_exp < this.#prev_exp && guard < 1000) {
            const fallen = this.#prev_exp;
            this.#score--;
            this.#next_exp = fallen;
            this.#prev_exp = roundExp(Math.max(0, fallen - this.#span(this.#score)));
            if (this.#next_exp <= this.#prev_exp) break;
            guard++;
        }
    }

    // Опыт не бывает отрицательным
    #setExp(value: number): void {
        this.#current_exp = roundExp(Math.max(0, value));
    }

    #applyThresholds(): void {
        this.#prev_exp = this.#threshold(this.#score);
        this.#next_exp = this.#threshold(this.#score + 1);
    }

    #span(score: number): number {
        const steps = Math.max(0, score - 1);
        const rate = 1 + this.#coefficient / 100;
        if (rate === 1) return roundExp(this.#baseExp);
        return roundExp(this.#baseExp * rate ** steps);
    }

    #threshold(score: number): number {
        if (score <= 1) return 0;
        const steps = score - 1;
        const rate = 1 + this.#coefficient / 100;
        if (rate === 1) return roundExp(this.#baseExp * steps);
        return roundExp(this.#baseExp * (rate ** steps - 1) / (rate - 1));
    }

    get decay_value(): number {
        if(!this.#decay) throw new Error('Decay is not set');
        return this.#decay.value;
    }

    toSnapshot(): LevelSnapshot {
        return {
            score: this.#score,
            current_exp: this.#current_exp,
            next_exp: this.#next_exp,
            prev_exp: this.#prev_exp,
            coefficient: this.#coefficient,
            base_exp: this.#baseExp,
            decay: this.#decay ? { ...this.#decay } : null,
        };
    }

    static fromSnapshot(snapshot: LevelSnapshot): Level {
        const legacy = snapshot.base_exp == null;
        const base = snapshot.base_exp ?? storedBaseExp(snapshot);
        const level = new Level(base, snapshot.coefficient, false, 0, 0);
        level.#score = Math.max(1, snapshot.score);
        level.#setExp(snapshot.current_exp);
        if (legacy) {
            level.#applyThresholds();
            level.handleNextOrPrevLevel();
        } else {
            level.#prev_exp = snapshot.prev_exp;
            level.#next_exp = snapshot.next_exp;
        }
        level.#decay = snapshot.decay ? { ...snapshot.decay, lost: snapshot.decay.lost ?? 0 } : null;
        if (level.#decay && level.#decay.freezed_till_ms <= 0 && level.#decay.freezed_interval_ms > 0) {
            level.#decay.freezed_till_ms = endOfDecayDay(Date.now(), level.#decay.freezed_interval_ms);
        }
        return level;
    }
    
}

export function roundExp(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function storedBaseExp(snapshot: LevelSnapshot): number {
    if (snapshot.score <= 1 || snapshot.coefficient === 0) return snapshot.next_exp;
    const factor = (1 + snapshot.coefficient) ** (snapshot.score - 1);
    if (!Number.isFinite(factor) || factor === 0) return snapshot.next_exp;
    return snapshot.next_exp / factor;
}