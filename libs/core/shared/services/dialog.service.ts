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
import { SkillDialogComponent } from '../../../feature/skills/skill-dialog/skill-dialog.component';
import { LayerDialogComponent } from '../../../feature/skills/layer-dialog/layer-dialog.component';
import { ExerciseDialogComponent } from '../../../feature/skills/exercise-dialog/exercise-dialog.component';
import { ExerciseDialogData, LayerDialogData, SkillDialogData } from '../models/skill.model';

export interface DialogSize {
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
}

const DEFAULT_DIALOG_WIDTH = '440px';
const DEFAULT_DIALOG_MAX_WIDTH = 'calc(100vw - 32px)';
const DEFAULT_DIALOG_MAX_HEIGHT = 'min(640px, calc(100dvh - 32px))';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialog = inject(Dialog);

  openEditorDialog(data: EditorDialogData, size?: DialogSize) {
    return this.dialog.open<void, EditorDialogData>(EditorDialogComponent, {
      ...this.#size(size),
      data,
    });
  }

  openConfirmDialog(data: ConfirmDialogData = {}, size?: DialogSize) {
    return this.dialog.open<void, ConfirmDialogData>(ConfirmDialogComponent, {
      ...this.#size(size),
      data,
    });
  }

  openWarningDialog(data: WarningDialogData = {}, size?: DialogSize) {
    return this.dialog.open<void, WarningDialogData>(WarningDialogComponent, {
      ...this.#size(size),
      data,
    });
  }

  openSkillDialog(data: SkillDialogData, size?: DialogSize) {
    return this.dialog.open<void, SkillDialogData>(SkillDialogComponent, {
      ...this.#size(size),
      data,
    });
  }

  openExerciseDialog(data: ExerciseDialogData, size?: DialogSize) {
    return this.dialog.open<void, ExerciseDialogData>(ExerciseDialogComponent, {
      ...this.#size(size),
      data,
    });
  }

  openLayerDialog(data: LayerDialogData, size?: DialogSize) {
    return this.dialog.open<void, LayerDialogData>(LayerDialogComponent, {
      ...this.#size(size ?? { width: '360px' }),
      data,
    });
  }

  #size(size?: DialogSize) {
    return {
      panelClass: 'dialog-panel',
      width: size?.width ?? DEFAULT_DIALOG_WIDTH,
      maxWidth: size?.maxWidth ?? DEFAULT_DIALOG_MAX_WIDTH,
      maxHeight: size?.maxHeight ?? DEFAULT_DIALOG_MAX_HEIGHT,
      ...(size?.height ? { height: size.height } : {}),
      ...(size?.minWidth ? { minWidth: size.minWidth } : {}),
      ...(size?.minHeight ? { minHeight: size.minHeight } : {}),
    };
  }
}
