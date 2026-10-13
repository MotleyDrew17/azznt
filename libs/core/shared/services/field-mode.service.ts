import { Injectable, signal } from '@angular/core';
import { FieldMode } from '../enums/field-mode.enum';

@Injectable({
  providedIn: 'root',
})
export class FieldModeService {
  readonly mode = signal(FieldMode.Editor);

  setMode(mode: FieldMode): void {
    this.mode.set(mode);
  }

  toggle(): void {
    this.mode.set(this.mode() === FieldMode.Editor ? FieldMode.View : FieldMode.Editor);
  }
}
