import { Component, OnChanges, SimpleChanges, input, output } from '@angular/core';

import { Character } from '../models/character.model';
import { CharacterSkillsComponent } from '../character-skills/character-skills.component';
import { CharacterStatsComponent } from '../character-stats/character-stats.component';
import { ViewMode, StatDisplayMode } from '../models/ui.models';

@Component({
  selector: 'app-character-card',
  imports: [CharacterSkillsComponent, CharacterStatsComponent],
  templateUrl: './character-card.component.html',
  styleUrl: './character-card.component.scss',
})
export class CharacterCardComponent implements OnChanges {
  readonly character = input.required<Character>();
  readonly viewMode = input<ViewMode>('card');
  readonly statDisplayMode = input<StatDisplayMode>('value-top');
  readonly deleteRequest = output<number>();
  readonly refreshRequest = output<number>();

  currentMode: ViewMode = 'card';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['viewMode']) {
      this.currentMode = changes['viewMode'].currentValue;
    }
  }

  switchToSkills() {
    this.currentMode = 'skills';
  }

  switchToStats() {
    this.currentMode = 'card';
  }

  onDelete(id: number) {
    this.deleteRequest.emit(id);
  }

  onRefresh(id: number) {
    this.refreshRequest.emit(id);
  }
}
