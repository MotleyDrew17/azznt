import { Quest } from "../classes/quest.class";

export function createsCycle(child: Quest, parent: Quest): boolean {
  if (!child || !parent || child === parent) return true;

  return reaches(parent, child, (quest) => quest.parents)
    || reaches(child, parent, (quest) => quest.children);
}

export function hasCycle(quests: readonly Quest[]): boolean {
  const outgoing = new Map<Quest, Quest[]>();
  const add = (from: Quest | undefined, to: Quest | undefined) => {
    if (!from || !to) return;
    const list = outgoing.get(from) ?? [];
    if (!list.includes(to)) list.push(to);
    outgoing.set(from, list);
    if (!outgoing.has(to)) outgoing.set(to, []);
  };

  for (const quest of quests) {
    if (!outgoing.has(quest)) outgoing.set(quest, []);
    for (const parent of quest.parents) add(quest, parent);
    for (const child of quest.children) add(child, quest);
  }

  const visiting = new Set<Quest>();
  const visited = new Set<Quest>();
  const walk = (quest: Quest): boolean => {
    if (visited.has(quest)) return false;
    if (visiting.has(quest)) return true;

    visiting.add(quest);
    for (const next of outgoing.get(quest) ?? []) {
      if (walk(next)) return true;
    }
    visiting.delete(quest);
    visited.add(quest);
    return false;
  };

  for (const quest of outgoing.keys()) {
    if (walk(quest)) return true;
  }
  return false;
}

function reaches(start: Quest, target: Quest, next: (quest: Quest) => readonly (Quest | undefined)[]): boolean {
  const visited = new Set<Quest>();
  const stack: Quest[] = [start];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    for (const quest of next(current)) {
      if (!quest || visited.has(quest)) continue;
      if (quest === target) return true;
      stack.push(quest);
    }
  }

  return false;
}

export function dfs(graph: Quest, callback: (quest: Quest) => void) {
  const visited: Set<Quest> = new Set();
  const stack: Quest[] = [graph];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current && !visited.has(current)) {
      visited.add(current);
      callback(current);
      stack.push(...(current?.children || []));
    }
  }
}

function calcLayer(quest: Quest,){
    const parent = quest.parents[0];
    if(quest.isRoot) quest.layer = 0;
    else if(!parent) quest.layer = 0;
    else if(parent?.layer || parent?.layer === 0) {
        const maxParentLayer = Math.max(...quest.parents.map(parent => parent.layer ?? -1))
        quest.layer = maxParentLayer + 1;
    }
}

export function calcLayers(graph: Quest): void {
    dfs(graph, (quest: Quest) => calcLayer(quest));
}

export function getNodesByLayers(graph: Quest): {indexInLayer: Map<string, number>, layers: Quest[][]} {
    const indexInLayer = new Map<string, number>();
    const layers: Quest[][] = [];;
    dfs(graph, (quest: Quest) => {
        if(quest.layer !== null) {
            layers[quest.layer] = layers[quest.layer] || [];
            layers[quest.layer].push(quest);
            indexInLayer.set(quest.id, layers[quest.layer].length - 1);
        }
    });
    return {layers, indexInLayer};
}

function barycenter(id: string, adj: Map<string, string[]>){
    const neighbors = adj.get(id) || [];
}
