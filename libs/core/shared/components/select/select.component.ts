import { Component, ElementRef, HostListener } from '@angular/core';

@Component({
  selector: 'app-select',
  imports: [],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  standalone: true
})
export class SelectComponent {
  readonly options = [
    'Полуночный зал',
    'Звёздная гавань',
    'Пыльный склеп',
    'Моховой тракт',
    'Бронзовая кузня',
    'Сиреневый архив',
    'Золотой перевал',
    'Чернильный двор',
    'Тихая крипта',
    'Северная застава',
  ];

  selected: string | null = null;
  open = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.open = !this.open;
  }

  choose(option: string): void {
    this.selected = option;
    this.open = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open = false;
  }
}
