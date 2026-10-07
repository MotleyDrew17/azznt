import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TextButtonDirective } from '../../core/shared/directives/text-button.directive';
import { GraphService } from '../../core/shared/services/graph.service';
import { DialogService } from './dialog.service';
import { EditorDialogKind } from './quest-dialog/quest-dialog.component';

@Component({
  selector: 'app-editor',
  imports: [TextButtonDirective],
  templateUrl: './editor.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './editor.component.scss'
})
export class EditorComponent {
  private dialogService = inject(DialogService);
  graphService = inject(GraphService);
  graph = this.graphService.graph;

  openStorylineDialog(): void {
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Storyline,
      name: '',
      description: '',
    });
  }

  openQuestDialog(): void {
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Quest,
      name: '',
      description: '',
    });
  }

  openEditQuestDialog(): void {
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Edit,
      name: '',
      description: '',
    });
  }
}
