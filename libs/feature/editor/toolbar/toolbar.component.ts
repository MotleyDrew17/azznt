import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogService } from '../dialog.service';
import { EditorDialogKind } from '../editor-dialog/editor-dialog.component';

@Component({
  selector: 'gm-toolbar',
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
