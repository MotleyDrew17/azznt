import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { GraphService } from '../../core/shared/services/graph.service';
import { DialogService } from './dialog.service';
import { EditorDialogKind } from './editor-dialog/editor-dialog.component';
import { WorkFieldComponent } from './work-field/work-field.component';

@Component({
  selector: 'gm-editor',
  templateUrl: './editor.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './editor.component.scss',
  imports: [WorkFieldComponent]
})
export class EditorComponent {
  private dialogService = inject(DialogService);
  private host = inject(ElementRef<HTMLElement>);
  graphService = inject(GraphService);
  graph = this.graphService.graph;
  #nodeSize = 48;

  openStorylineDialog(): void {
    const center = this.#fieldCenter();
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Storyline,
      name: '',
      description: '',
      pos_x: center.x,
      pos_y: center.y,
    });
  }

  openQuestDialog(): void {
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Quest,
      name: '',
      description: '',
    });
  }

  #fieldCenter(): { x: number; y: number } {
    const field = this.host.nativeElement;
    return {
      x: Math.max(0, (field.clientWidth - this.#nodeSize) / 2),
      y: Math.max(0, (field.clientHeight - this.#nodeSize) / 2),
    };
  }

  openEditQuestDialog(): void {
    this.dialogService.openEditorDialog({
      kind: EditorDialogKind.Edit,
      name: '',
      description: '',
    });
  }
}
