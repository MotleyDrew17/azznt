import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'gm-select',
  imports: [],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  standalone: true
})
export class SelectComponent {
  @Input() options = [
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
  @Input() selected: string | null = null;
  @Input() placeholder = 'Не выбрано';
  @Input() controlId?: string;
  @Output() selectedChange = new EventEmitter<string>();

  open = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.open = !this.open;
  }

  choose(option: string): void {
    this.selected = option;
    this.selectedChange.emit(option);
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
