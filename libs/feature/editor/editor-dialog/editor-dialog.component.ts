import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { SelectComponent } from '../../../core/shared/components/select/select.component';
import { CreateQuestData } from '../../../core/shared/models/quest.model';
import { form, required, FormField } from '@angular/forms/signals';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { GraphService } from '../../../core/shared/services/graph.service';

export enum EditorDialogKind {
  Storyline = 'storyline',
  Quest = 'quest',
  Edit = 'edit',
  Relation = 'relation',
}

export type QuestRelation = 'previous' | 'next';

export interface EditorDialogData extends CreateQuestData {
  kind: EditorDialogKind;
  id?: string;
  anchorId?: string;
  relation?: QuestRelation;
}

const TITLES: Record<Exclude<EditorDialogKind, EditorDialogKind.Relation>, string> = {
  [EditorDialogKind.Storyline]: 'Новая сюжетная линия',
  [EditorDialogKind.Quest]: 'Создание квеста',
  [EditorDialogKind.Edit]: 'Редактирование',
};

@Component({
  selector: 'gm-editor-dialog',
  imports: [ButtonComponent, SelectComponent, DisabledDirective, FormField],
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
  relation = signal<QuestRelation>(this.data.relation ?? 'next');
  readonly relationOptions = ['Предыдущий', 'Следующий'];

  get title(): string {
    if (this.kind !== EditorDialogKind.Relation) return TITLES[this.kind];
    return this.relation() === 'previous' ? 'Предыдущий квест' : 'Следующий квест';
  }
  storylineModel = signal({ name: this.data.name, description: this.data.description })
  storylineForm = form(this.storylineModel, (fieldPath) => {
    required(fieldPath.name, {message: 'Название обязательно'})
  })

  close(): void {
    this.dialogRef.close();
  }

  relationLabel(): string {
    return this.relation() === 'previous' ? 'Предыдущий' : 'Следующий';
  }

  setRelation(label: string): void {
    this.relation.set(label === 'Предыдущий' ? 'previous' : 'next');
  }

  submit() {
    switch (this.kind) {
      case EditorDialogKind.Storyline:
        const questData: CreateQuestData = {
          name: this.storylineForm.name().value(),
          description: this.storylineForm.description().value(),
          pos_x: this.data.pos_x,
          pos_y: this.data.pos_y,
        };
        this.graphService.createQuest(questData, true);
        console.log(this.graphService.graph());
        this.close();
        break;
      case EditorDialogKind.Quest:
        this.graphService.createQuest({
          name: this.storylineForm.name().value(),
          description: this.storylineForm.description().value(),
          pos_x: this.data.pos_x,
          pos_y: this.data.pos_y,
        });
        this.close();
        break;
      case EditorDialogKind.Relation:
        const anchor = this.data.anchorId ? this.graphService.getQuestById(this.data.anchorId) : undefined;
        if (!anchor) break;
        this.graphService.createQuest({
          name: this.storylineForm.name().value(),
          description: this.storylineForm.description().value(),
          pos_x: this.data.pos_x,
          pos_y: this.data.pos_y,
          parent: this.relation() === 'previous' ? anchor : undefined,
          child: this.relation() === 'next' ? anchor : undefined,
        });
        this.close();
        break;
      case EditorDialogKind.Edit:
        if (!this.data.id) break;
        this.graphService.updateQuest(this.data.id, {
          name: this.storylineForm.name().value(),
          description: this.storylineForm.description().value(),
        });
        this.close();
        break;
    }
  }
}
