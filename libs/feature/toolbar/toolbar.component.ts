import { Component } from '@angular/core';
import {Dialog, DialogRef} from '@angular/cdk/dialog';

@Component({
  selector: 'app-toolbar',
  imports: [],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  standalone: true
})
export class ToolbarComponent {
  constructor(private dialogRef: DialogRef, private dialog: Dialog) {
  }

  openQuestDialog(){
    // this.dialog.open()
  }
}
