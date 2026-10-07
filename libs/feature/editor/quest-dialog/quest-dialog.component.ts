import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { Quest } from '../../../core/shared/classes/quest.class';
import { form, required, FormField } from '@angular/forms/signals';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';

export enum EditorDialogKind {
  Storyline = 'storyline',
  Quest = 'quest',
  Edit = 'edit',
}

export interface EditorDialogData {
  kind: EditorDialogKind;
  name: string;
  description: string;
  parent?: Quest;
  child?: Quest;
}

const TITLES: Record<EditorDialogKind, string> = {
  [EditorDialogKind.Storyline]: 'Новая сюжетная линия',
  [EditorDialogKind.Quest]: 'Создание квеста',
  [EditorDialogKind.Edit]: 'Редактирование',
};

@Component({
  selector: 'app-quest-dialog',
  imports: [ButtonComponent, DisabledDirective, FormField],
  templateUrl: './quest-dialog.component.html',
  styleUrl: './quest-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class QuestDialogComponent {
  private data = inject<EditorDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, EditorDialogData>);

  readonly EditorDialogKind = EditorDialogKind;
  kind = this.data.kind;
  title = TITLES[this.kind];
  storylineModel = signal({name: '', description: ''})
  storylineForm = form(this.storylineModel, (fieldPath) => {
    required(fieldPath.name, {message: 'Название обязательно'})
  })

  close(): void {
    this.dialogRef.close();
  }
}
