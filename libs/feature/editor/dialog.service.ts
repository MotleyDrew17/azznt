import { inject, Injectable } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import {
  EditorDialogData,
  QuestDialogComponent,
} from './quest-dialog/quest-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialog = inject(Dialog);

  openEditorDialog(data: EditorDialogData) {
    return this.dialog.open<void, EditorDialogData>(QuestDialogComponent, {
      width: '440px',
      data,
    });
  }
}
