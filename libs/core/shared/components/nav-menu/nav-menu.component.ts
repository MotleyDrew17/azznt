import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

interface NavRoute {
  label: string;
  path: string;
  active: (path: string) => boolean;
}

@Component({
  selector: 'gm-nav-menu',
  imports: [RouterLink],
  templateUrl: './nav-menu.component.html',
  styleUrl: './nav-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class NavMenuComponent {
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);
  readonly path = signal(this.#path(this.router.url));
  readonly routes: NavRoute[] = [
    {
      label: 'Сюжетные линии',
      path: '/quest-tree',
      active: (path) => path === '/quest-tree' || path === '/editor',
    },
    {
      label: 'Навыки',
      path: '/skills',
      active: (path) => path === '/skills' || path.startsWith('/skill/'),
    },
    {
      label: 'Настройки',
      path: '/settings',
      active: (path) => path === '/settings' || path.startsWith('/settings/'),
    },
  ];

  constructor() {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.path.set(this.#path(this.router.url));
      this.open.set(false);
    });
  }

  toggle(): void {
    this.open.update((open) => !open);
  }

  isActive(route: NavRoute): boolean {
    return route.active(this.path());
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target;
    if (target instanceof Node && this.host.nativeElement.contains(target)) return;
    this.open.set(false);
  }

  #path(url: string): string {
    return url.split('?')[0].split('#')[0];
  }
}
