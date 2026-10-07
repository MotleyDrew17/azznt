import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogService } from '../dialog.service';
import { EditorDialogKind } from '../quest-dialog/quest-dialog.component';

@Component({
  selector: 'app-toolbar',
  imports: [],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ToolbarComponent {
  private dialogService = inject(DialogService);

  openQuestDialog(): void {
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Quest,
      name: '',
      description: '',
    });
  }
}
