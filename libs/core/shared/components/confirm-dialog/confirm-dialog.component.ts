import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../button/button.component';

export interface ConfirmDialogData {
  title?: string;
  message?: string;
  okLabel?: string;
  cancelLabel?: string;
  onOk?: () => void;
  onCancel?: () => void;
}

@Component({
  selector: 'gm-confirm-dialog',
  imports: [ButtonComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private data = inject<ConfirmDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, ConfirmDialogData>);

  title = this.data.title ?? '';
  message = this.data.message ?? '';
  okLabel = this.data.okLabel ?? 'Ок';
  cancelLabel = this.data.cancelLabel ?? 'Отмена';

  ok(): void {
    this.#run(this.data.onOk);
  }

  cancel(): void {
    this.#run(this.data.onCancel);
  }

  #run(callback?: () => void): void {
    callback?.();
    this.dialogRef.close();
  }
}
