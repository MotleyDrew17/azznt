import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { GraphService } from '../../../core/shared/services/graph.service';
import { FieldMode } from '../../../core/shared/enums/field-mode.enum';
import { FieldModeService } from '../../../core/shared/services/field-mode.service';

@Component({
  selector: 'gm-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class HeaderComponent {
  readonly FieldMode = FieldMode;

  private fieldMode = inject(FieldModeService);
  private graphService = inject(GraphService);
  private dialogService = inject(DialogService);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('file');

  readonly mode = this.fieldMode.mode;

  toggleMode(): void {
    this.fieldMode.toggle();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  download(): void {
    const file = new Blob([this.graphService.toGraphFile()], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.graphService.graphFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  openFile(): void {
    const input = this.fileInput()?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

  loadFile(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gm')) {
      this.#rejectFile('Нужен файл формата .gm.');
      return;
    }

    void file.text().then((text) => {
      const error = this.graphService.loadGraphFile(text);
      if (error) this.#rejectFile(error);
    });
  }

  #rejectFile(message: string): void {
    this.dialogService.openWarningDialog({
      title: 'Нельзя загрузить',
      message,
    });
  }
}
