import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../button/button.component';

export interface WarningDialogData {
  title?: string;
  message?: string;
  okLabel?: string;
}

@Component({
  selector: 'gm-warning-dialog',
  imports: [ButtonComponent],
  templateUrl: './warning-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog-host' },
})
export class WarningDialogComponent {
  private data = inject<WarningDialogData>(DIALOG_DATA);
  private dialogRef = inject(DialogRef<void, WarningDialogData>);

  title = this.data.title ?? '';
  message = this.data.message ?? '';
  okLabel = this.data.okLabel ?? 'Ок';

  close(): void {
    this.dialogRef.close();
  }
}
