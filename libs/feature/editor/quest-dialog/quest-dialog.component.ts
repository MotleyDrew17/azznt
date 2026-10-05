import { Component, inject } from '@angular/core';
import { CreateQuestData } from '../../../core/shared/models/quest.model';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-quest-dialog',
  imports: [],
  templateUrl: './quest-dialog.component.html',
  styleUrl: './quest-dialog.component.scss'
})
export class QuestDialogComponent {
  data = inject<CreateQuestData>(DIALOG_DATA)
  private dialogRef = inject(DialogRef<CreateQuestData>);
}
