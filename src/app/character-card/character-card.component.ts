import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

import { Character } from '../models/character.model';
import { CharacterSkillsComponent } from '../character-skills/character-skills.component';
import { CharacterStatsComponent } from '../character-stats/character-stats.component';
import { ViewMode } from '../dashboard/dashboard.component';

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [CharacterSkillsComponent, CharacterStatsComponent],
  templateUrl: './character-card.component.html',
  styleUrl: './character-card.component.scss',
})
export class CharacterCardComponent implements OnChanges {
  @Input() character!: Character;
  @Input() viewMode: ViewMode = 'card';
  @Output() deleteRequest = new EventEmitter<number>();
  @Output() refreshRequest = new EventEmitter<number>();

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
