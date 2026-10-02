export class Quest {
  #id: string = '';
  #children: Quest[] = [];
  #parents: Quest[] = [];
  #pos_left: number = 0;
  #pos_right: number = 0;
  #name: string = '';
  #description: string = '';
  #isCompleted: boolean = false;
  #ancestors: Quest[] = [];

  constructor() {
    this.#id = crypto.randomUUID();
  }

  get parents(): Quest[] {
    return this.#parents;
  }

  get ancestors(): Quest[]{
    return this.#ancestors;
  }

  get id(): string {
    return this.#id;
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

  /**
   * Пока на первой версии квест доступен, если у него выполнены все предквесты
   * В дальнейшем доступность квеста также будет зависить от навыка
   * */
  get isAvailable(){
    return this.parents.every((parent) => parent.#isCompleted)
  }

  getParentById(id: string): Quest | undefined{
    return this.#parents.find((parent) => parent.id === id);
  }

  getChildById(id: string): Quest | undefined{
    return this.#children.find((child) => child.id === id);
  }

  addParent(parent: Quest) {
    this.#addParent(parent);
    parent.#addChild(this)
  }

  addChild(child: Quest) {
    this.#addChild(child);
    child.#addParent(this);
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

