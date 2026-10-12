import { inject, Injectable } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import {
  EditorDialogData,
  EditorDialogComponent,
} from '../../../feature/editor/editor-dialog/editor-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../components/confirm-dialog/confirm-dialog.component';
import {
  WarningDialogComponent,
  WarningDialogData,
} from '../components/warning-dialog/warning-dialog.component';

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

  openConfirmDialog(data: ConfirmDialogData = {}) {
    return this.dialog.open<void, ConfirmDialogData>(ConfirmDialogComponent, {
      width: '440px',
      data,
    });
  }

  openWarningDialog(data: WarningDialogData = {}) {
    return this.dialog.open<void, WarningDialogData>(WarningDialogComponent, {
      width: '440px',
      data,
    });
  }
}
