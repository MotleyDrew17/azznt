import { CreateSkillData, ExerciseSnapshot, LevelSnapshot, SkillSnapshot } from "../models/skill.model";

export interface Decay {
    value: number; // значение отката навыка
    freezed_till_ms: number; // дата в миллисекундах, до которой заморожен откат навыка
    freezed_interval_ms: number; /** Интервал в миллисекундах, через который будет уменьшаться откат навыка.                                  Нужен, чтобы обновлять дату до которой заморожен откат навыка */ 
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

    static fromSnapshot(snapshot: SkillSnapshot): Skill {
        const level = snapshot.level ? Level.fromSnapshot(snapshot.level) : null;
        const skill = new Skill({
            name: snapshot.name,
            description: snapshot.description,
            requiredExp: snapshot.level?.next_exp ?? 0,
            expIncreasePercent: snapshot.level?.coefficient ?? 0,
            decayEnabled: false,
        });
        skill.#id = snapshot.id;
        skill.#level = level;
        if (snapshot.layers?.length) {
            skill.#layers = snapshot.layers.map(layer => ({
                levelScore: layer.levelScore,
                exercises: level ? layer.exercises.map(exercise => Exercise.fromSnapshot(exercise, level)) : [],
            }));
        }
        return skill;
    }
}

export class Exercise {
    #id: string = '';
    #name: string = '';
    #description: string = '';
    #experience: number = 0; // количество опыта, которое дает упражнение
    #maxLevel: number = 0; // максимальный уровень навыка, до которого упражнение дает опыт
    #is_freezing_decay: boolean = true; // признак того, что выполнение упражнения замораживает откат навыка
    #available_on_level: number = 0; // уровень навыка, на котором доступно выполнение упражнения
    #level: Level | null = null; // уровень навык. Нужен для работы с уровнем навыка

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

    do() {
        if(!this.#level) throw new Error('Level is not set');
        if(this.#is_freezing_decay) {
           this.#level.freezeDecay();
        }
        if (this.#maxLevel <= 0 || this.#level.score < this.#maxLevel) {
            this.#level.addExp(this.#experience);
        }
        
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
        return exercise;
    }

}

export class Level {
    #score: number = 1; // текущий уровень навыка
    #current_exp: number = 0; // текущее количество опыта
    #next_exp: number = 0; // количество опыта, необходимое для следующего уровня
    #prev_exp: number = 0; // количество опыта, необходимое для предыдущего уровня
    #coefficient: number = 1.1; // коэффициент, на который умножается количество опыта, необходимое для следующего уровня
    #decay: Decay | null = null;

    constructor(requiredExp: number, expIncreasePercent: number, decayEnabled: boolean, inactivityDays: number, lostExp: number) {
        this.#next_exp = requiredExp;
        this.#coefficient = expIncreasePercent;
        if(decayEnabled) {
            const interval = inactivityDays * 24 * 60 * 60 * 1000;
            this.#decay = {
                value: lostExp,
                freezed_till_ms: Date.now() + interval,
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

    get coefficient(): number {
        return this.#coefficient;
    }

    get decay(): Decay | null{
        return this.#decay;
    }
    
    
    set score(score: number) {
        this.#score = score;
    }

    set current_exp(current_exp: number) {
        this.#current_exp = current_exp;
    }

    update(data: CreateSkillData): void {
        this.#next_exp = data.requiredExp;
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
                this.#decay.freezed_till_ms = Date.now() + interval;
            }
            return;
        }

        this.#decay = {
            value: lostExp,
            freezed_till_ms: Date.now() + interval,
            freezed_interval_ms: interval,
        };
    }

    freezeDecay() {
        if(!this.#decay) throw new Error('Decay is not set');
        this.#decay.freezed_till_ms = Date.now() + this.#decay.freezed_interval_ms; // увеличиваем дату до которой заморожен откат навыка на интервал
    }

    addExp(exp: number) {
        this.#current_exp += exp;
        this.handleNextOrPrevLevel();
    }

    removeExp(exp: number) {
        this.#current_exp -= exp;
        this.handleNextOrPrevLevel();
    }

    addDecay(decay: Decay) {
        this.#decay = decay;
    }

    /** Метод, который обрабатывает переход на следующий или предыдущий уровень */
    handleNextOrPrevLevel() {
        if(this.#current_exp >= this.#next_exp) { // если текущее количество опыта больше или равно количеству опыта, необходимого для следующего уровня
            this.#score++; // переход на следующий уровень
            this.#prev_exp = this.#next_exp; // предыдущее количество опыта становится равным количеству опыта, необходимого для того уровня, на котором находились до перехода
            this.#next_exp = this.#next_exp + (this.#next_exp * this.#coefficient); // увеличиваем количество опыта, необходимого для следующего уровня
        } else if(this.#current_exp < this.#prev_exp) { // если текущее количество опыта меньше количества опыта, необходимого для предыдущего уровня
            this.#score--; // переход на предыдущий уровень
            this.#next_exp = this.#prev_exp; // следующее количество опыта становится равным количеству опыта, необходимого для предыдущего уровня
            this.#prev_exp = this.#prev_exp - (this.#prev_exp * this.#coefficient); // уменьшаем количество опыта, необходимого для следующего уровня
        }
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
            decay: this.#decay ? { ...this.#decay } : null,
        };
    }

    static fromSnapshot(snapshot: LevelSnapshot): Level {
        const level = new Level(snapshot.next_exp, snapshot.coefficient, false, 0, 0);
        level.#score = snapshot.score;
        level.#current_exp = snapshot.current_exp;
        level.#prev_exp = snapshot.prev_exp;
        level.#decay = snapshot.decay ? { ...snapshot.decay } : null;
        if (level.#decay && level.#decay.freezed_till_ms <= 0 && level.#decay.freezed_interval_ms > 0) {
            level.#decay.freezed_till_ms = Date.now() + level.#decay.freezed_interval_ms;
        }
        return level;
    }
    
}