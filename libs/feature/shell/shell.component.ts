import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'gm-shell',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './shell.component.scss'
})
export class ShellComponent {

}
