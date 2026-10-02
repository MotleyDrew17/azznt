import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {EditorComponent} from '../../libs/feature/editor/editor.component';
import {HeaderComponent} from '../../libs/feature/header/header.component';
import {ToolbarComponent} from '../../libs/feature/toolbar/toolbar.component';
import {MenuComponent} from '../../libs/feature/menu/menu.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EditorComponent, HeaderComponent, ToolbarComponent, MenuComponent],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'azznt';
}
