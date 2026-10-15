import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../core/shared/components/button/button.component';
import { SelectComponent } from '../../../core/shared/components/select/select.component';
import { CreateQuestData } from '../../../core/shared/models/quest.model';
import { form, required, FormField } from '@angular/forms/signals';
import { ClearInputDirective } from '../../../core/shared/directives/clear-input.directive';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';
import { GraphService } from '../../../core/shared/services/graph.service';
import { DialogService } from '../../../core/shared/services/dialog.service';

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
  imports: [ButtonComponent, SelectComponent, DisabledDirective, ClearInputDirective, FormField],
  templateUrl: './editor-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'dialog-host' },
})
export class EditorDialogComponent {
  private data = inject<EditorDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, EditorDialogData>);
  private graphService = inject(GraphService);
  private dialogService = inject(DialogService);

  readonly EditorDialogKind = EditorDialogKind;
  kind = this.data.kind;
  relation = signal<QuestRelation>(this.#initialRelation());

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

  get relationOptions(): string[] {
    return this.#anchorIsRoot() ? ['Предыдущий'] : ['Предыдущий', 'Следующий'];
  }

  relationLabel(): string {
    return this.relation() === 'previous' ? 'Предыдущий' : 'Следующий';
  }

  setRelation(label: string): void {
    if (this.#anchorIsRoot()) {
      this.relation.set('previous');
      return;
    }
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
        if (this.#createQuest(questData, true)) this.close();
        break;
      case EditorDialogKind.Quest:
        if (this.#createQuest({
          name: this.storylineForm.name().value(),
          description: this.storylineForm.description().value(),
          pos_x: this.data.pos_x,
          pos_y: this.data.pos_y,
        })) this.close();
        break;
      case EditorDialogKind.Relation:
        const anchor = this.data.anchorId ? this.graphService.getQuestById(this.data.anchorId) : undefined;
        const root = this.graphService.graph();
        if (!anchor || !root) break;
        const relation = this.#anchorIsRoot() ? 'previous' : this.relation();
        if (this.#createQuest({
          name: this.storylineForm.name().value(),
          description: this.storylineForm.description().value(),
          pos_x: this.data.pos_x,
          pos_y: this.data.pos_y,
          parent: relation === 'previous' ? anchor : root,
          child: relation === 'next' ? anchor : undefined,
        })) this.close();
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

  #createQuest(data: CreateQuestData, isNewGraph = false): boolean {
    const error = this.graphService.createQuest(data, isNewGraph);
    if (!error) return true;

    this.dialogService.openWarningDialog({
      title: 'Нельзя соединить',
      message: error,
    });
    return false;
  }

  #initialRelation(): QuestRelation {
    if (this.#anchorIsRoot()) return 'previous';
    return this.data.relation ?? 'next';
  }

  #anchorIsRoot(): boolean {
    const anchor = this.data.anchorId ? this.graphService.getQuestById(this.data.anchorId) : undefined;
    const root = this.graphService.graph();
    return !!anchor && !!root && (anchor.isRoot || anchor.id === root.id);
  }
}
