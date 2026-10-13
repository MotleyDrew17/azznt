import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Quest } from '../../../core/shared/classes/quest.class';
import { DisabledDirective } from '../../../core/shared/directives/disabled.directive';

export enum QuestNodeState {
  Active = 'active',
  Completed = 'completed',
  Blocked = 'blocked',
}

@Component({
  selector: 'gm-quest-node',
  imports: [DisabledDirective],
  templateUrl: './quest-node.component.html',
  styleUrl: './quest-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestNodeComponent {
  readonly QuestNodeState = QuestNodeState;
  readonly quest = input<Quest>();
  readonly nodeId = input('');
  readonly left = input(0);
  readonly top = input(0);
  readonly size = input(48);
  readonly shiftHeld = input(false);
  readonly grabbing = input(false);
  readonly selected = input(false);
  readonly root = input(false);
  readonly state = input(QuestNodeState.Active);
}
