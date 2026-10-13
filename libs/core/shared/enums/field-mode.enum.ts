export enum FieldMode {
  Editor = 'editor',
  View = 'view',
}

export enum FieldAction {
  Pan = 'pan',
  Zoom = 'zoom',
  MoveQuest = 'moveQuest',
  LinkQuest = 'linkQuest',
  AddQuest = 'addQuest',
  EditQuest = 'editQuest',
  DeleteQuest = 'deleteQuest',
  CreateQuest = 'createQuest',
  PinCard = 'pinCard',
}

const FIELD_ACTIONS: Record<FieldMode, ReadonlySet<FieldAction>> = {
  [FieldMode.Editor]: new Set([
    FieldAction.Pan,
    FieldAction.Zoom,
    FieldAction.MoveQuest,
    FieldAction.LinkQuest,
    FieldAction.AddQuest,
    FieldAction.EditQuest,
    FieldAction.DeleteQuest,
    FieldAction.CreateQuest,
  ]),
  [FieldMode.View]: new Set([
    FieldAction.Pan,
    FieldAction.Zoom,
    FieldAction.PinCard,
  ]),
};

export function modeAllows(mode: FieldMode, action: FieldAction): boolean {
  return FIELD_ACTIONS[mode].has(action);
}
