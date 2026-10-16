import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Quest, QuestPriority } from '../../../core/shared/classes/quest.class';

@Component({
  selector: 'gm-quest-node',
  templateUrl: './quest-node.component.html',
  styleUrl: './quest-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestNodeComponent {
  readonly QuestPriority = QuestPriority;
  readonly quest = input<Quest>();
  readonly nodeId = input('');
  readonly left = input(0);
  readonly top = input(0);
  readonly size = input(48);
  readonly shiftHeld = input(false);
  readonly grabbing = input(false);
  readonly selected = input(false);
  readonly priority = input(QuestPriority.Common);
  readonly completed = input(false);
  readonly available = input(true);
}
