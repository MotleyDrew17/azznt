import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { CreateQuestData } from '../../../core/shared/models/quest.model';
import { form, required, FormField } from '@angular/forms/signals';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { GraphService } from '../../../core/shared/services/graph.service';

export enum EditorDialogKind {
  Storyline = 'storyline',
  Quest = 'quest',
  Edit = 'edit',
}

export interface EditorDialogData extends CreateQuestData {
  kind: EditorDialogKind;
}

const TITLES: Record<EditorDialogKind, string> = {
  [EditorDialogKind.Storyline]: 'Новая сюжетная линия',
  [EditorDialogKind.Quest]: 'Создание квеста',
  [EditorDialogKind.Edit]: 'Редактирование',
};

@Component({
  selector: 'gm-editor-dialog',
  imports: [ButtonComponent, DisabledDirective, FormField],
  templateUrl: './editor-dialog.component.html',
  styleUrl: './editor-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class EditorDialogComponent {
  private data = inject<EditorDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, EditorDialogData>);
  private graphService = inject(GraphService);

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

  submit() {
    switch (this.kind) {
      case EditorDialogKind.Storyline:
        const questData: CreateQuestData = {
          name: this.storylineForm.name().value(),
          description: this.storylineForm.description().value(),
        };
        this.graphService.createQuest(questData, true);
        console.log(this.graphService.graph());
        this.close();
        break;
      case EditorDialogKind.Quest:
        break;
      case EditorDialogKind.Edit:
    }
  }
}
