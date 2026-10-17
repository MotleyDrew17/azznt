import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { DialogService } from '../../../core/shared/services/dialog.service';
import { GraphService } from '../../../core/shared/services/graph.service';
import { FieldMode } from '../../../core/shared/enums/field-mode.enum';
import { FieldModeService } from '../../../core/shared/services/field-mode.service';
import { SkillService } from '../../../core/shared/services/skill.service';
import { NavMenuComponent } from '../../../core/shared/components/nav-menu/nav-menu.component';
import { HintDirective } from '../../../core/shared/directives/hint.directive';

@Component({
  selector: 'gm-header',
  imports: [NavMenuComponent, HintDirective],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class HeaderComponent {
  readonly FieldMode = FieldMode;

  private fieldMode = inject(FieldModeService);
  private router = inject(Router);
  private graphService = inject(GraphService);
  private skillService = inject(SkillService);
  private dialogService = inject(DialogService);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('file');

  readonly mode = this.fieldMode.mode;

  readonly showMode = signal(this.#showsMode(this.router.url));
  readonly showTools = signal(this.#showsTools(this.router.url));
  readonly title = signal(this.#title(this.router.url));
  readonly canBack = signal(false);
  private history = [this.#path(this.router.url)];

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe((event) => {
      this.#remember(event.urlAfterRedirects);
      this.showMode.set(this.#showsMode(this.router.url));
      this.showTools.set(this.#showsTools(this.router.url));
      this.title.set(this.#title(this.router.url));
    });
  }

  back(): void {
    if (this.history.length < 2) return;
    this.history.pop();
    this.canBack.set(this.history.length > 1);
    void this.router.navigateByUrl(this.history[this.history.length - 1]);
  }

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

  #remember(url: string): void {
    const path = this.#path(url);
    if (this.history[this.history.length - 1] === path) return;
    this.history.push(path);
    this.canBack.set(true);
  }

  #showsMode(url: string): boolean {
    const path = this.#path(url);
    return path === '/quest-tree' || path === '/skills' || /^\/skill\/[^/]+$/.test(path);
  }

  #showsTools(url: string): boolean {
    const path = this.#path(url);
    return path === '/storylines' || path === '/quest-tree' || path === '/skills' || /^\/skill\/[^/]+$/.test(path);
  }

  #title(url: string): string {
    const path = this.#path(url);
    if (path === '/storylines') return 'Сюжетные линии';
    if (path === '/quest-tree' || path === '/editor') return 'Квесты';
    if (path === '/skills') return 'Навыки';
    if (path === '/settings') return 'Настройки';

    const skillId = path.match(/^\/skill\/([^/]+)/)?.[1];
    if (!skillId) return '';
    if (!this.skillService.skills().length) this.skillService.loadSkills();
    const name = this.skillService.skills().find((skill) => skill.id === skillId)?.name ?? '';
    return name ? `Навык - ${name}` : '';
  }

  #path(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  #rejectFile(message: string): void {
    this.dialogService.openWarningDialog({
      title: 'Нельзя загрузить',
      message,
    });
  }
}
