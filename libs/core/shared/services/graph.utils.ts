import { Quest } from "../classes/quest.class";

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
