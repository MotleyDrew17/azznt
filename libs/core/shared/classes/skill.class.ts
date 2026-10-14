import { CreateSkillData, ExerciseSnapshot, LevelSnapshot, SkillSnapshot } from "../models/skill.model";

export interface Decay {
    value: number; // значение отката навыка
    freezed_till_ms: number; // дата в миллисекундах, до которой заморожен откат навыка
    freezed_interval_ms: number; /** Интервал в миллисекундах, через который будет уменьшаться откат навыка.                                  Нужен, чтобы обновлять дату до которой заморожен откат навыка */ 
}

export class Skill {
    #id: string = '';
    #name: string = '';
    #description: string = '';
    #level: Level | null = null; // текущий уровень навыка
    #exercises: Exercise[] = []; // упражнения, которые нужно выполнить для прокачки навыка
    

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

    get exercises(): Exercise[] {
        return this.#exercises;
    }

    addExercise(max_level: number, available_on_level: number) {
        if(!this.#level) throw new Error('Level is not set'); 
        const exercise = new Exercise(this.#level, max_level, available_on_level);
        this.#exercises.push(exercise);
    }

    doExercise(exercise_id: string) {
        const exercise = this.#exercises.find(exercise => exercise.id === exercise_id);
        exercise?.do();
    }

    getExercise(exercise_id: string) {
        return this.#exercises.find(exercise => exercise.id === exercise_id);
    }

    getExercises() {
        return this.#exercises;
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
            exercises: this.#exercises.map(exercise => exercise.toSnapshot()),
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
        skill.#exercises = level ? snapshot.exercises.map(exercise => Exercise.fromSnapshot(exercise, level)) : [];
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

    constructor(level: Level, max_level: number, available_on_level: number) {
        this.#id = crypto.randomUUID();
        this.#level = level;
        this.#maxLevel = max_level;
        this.#available_on_level = available_on_level;
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

    get maxLevel(): number {
        return this.#maxLevel;
    }

    set maxLevel(maxLevel: number) {
        this.#maxLevel = maxLevel;
    }

    isAvailable(current_level: number) {
        return current_level >= this.#available_on_level;
    }

    do() {
        if(!this.#level) throw new Error('Level is not set');
        if(this.#is_freezing_decay) {
           this.#level.freezeDecay();
        }
        if (this.#level.score < this.#maxLevel) {
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
        const exercise = new Exercise(level, snapshot.maxLevel, snapshot.available_on_level);
        exercise.#id = snapshot.id;
        exercise.#name = snapshot.name;
        exercise.#description = snapshot.description;
        exercise.#experience = snapshot.experience;
        exercise.#is_freezing_decay = snapshot.is_freezing_decay;
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
        this.#decay = {
            value: lostExp,
            freezed_till_ms: 0,
            freezed_interval_ms: inactivityDays * 24 * 60 * 60 * 1000,
        };
      }

    }

    get score(): number {
        return this.#score;
    }

    get current_exp(): number {
        return this.#current_exp;
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
        return level;
    }
    
}