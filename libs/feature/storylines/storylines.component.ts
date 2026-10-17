import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StorylineSnapshot } from '../../core/shared/models/user.model';
import { DialogService } from '../../core/shared/services/dialog.service';
import { GraphService } from '../../core/shared/services/graph.service';
import { UserService } from '../../core/shared/services/user.service';
import { StorylineComponent } from './storyline/storyline.component';

@Component({
  selector: 'gm-storylines',
  imports: [StorylineComponent],
  templateUrl: './storylines.component.html',
  styleUrl: './storylines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorylinesComponent {
  private router = inject(Router);
  private graphService = inject(GraphService);
  private dialogService = inject(DialogService);
  private user = inject(UserService);

  readonly storylines = this.user.storylines;

  // Пустой редактор, новая линия создаётся там
  create(): void {
    this.graphService.openEmpty();
    void this.router.navigateByUrl('/quest-tree');
  }

  // Открыть проект
  open(id: string): void {
    this.graphService.openStoryline(id);
    void this.router.navigateByUrl('/quest-tree');
  }

  // Удалить проект
  remove(storyline: StorylineSnapshot): void {
    const name = this.title(storyline);
    this.dialogService.openConfirmDialog({
      title: 'Удалить сюжетную линию',
      message: `«${name}» будет удалена.`,
      okLabel: 'Удалить',
      onOk: () => this.graphService.removeStoryline(storyline.id),
    });
  }

  // Название из корневого квеста
  title(storyline: StorylineSnapshot): string {
    const root = storyline.quests.find((quest) => quest.isRoot) ?? storyline.quests[0];
    const name = root?.name.trim();
    return name || 'Без названия';
  }
}
