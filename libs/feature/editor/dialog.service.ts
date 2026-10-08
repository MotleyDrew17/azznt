import { inject, Injectable } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import {
  EditorDialogData,
  EditorDialogComponent,
} from './editor-dialog/editor-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialog = inject(Dialog);

  openEditorDialog(data: EditorDialogData) {
    return this.dialog.open<void, EditorDialogData>(EditorDialogComponent, {
      width: '440px',
      data,
    });
  }
}
