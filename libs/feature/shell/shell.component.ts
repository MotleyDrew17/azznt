import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonComponent } from '../../core/shared/components/button/button.component';
import { InputComponent } from '../../core/shared/components/input/input.component';
import { SelectComponent } from '../../core/shared/components/select/select.component';
import { HeaderComponent } from './header/header.component';
import { MenuComponent } from './menu/menu.component';

@Component({
  selector: 'gm-shell',
  imports: [RouterOutlet, HeaderComponent, MenuComponent, InputComponent, SelectComponent, ButtonComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {

}
