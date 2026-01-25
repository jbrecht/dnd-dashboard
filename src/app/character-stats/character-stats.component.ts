import { Component, input, output } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Character } from '../models/character.model';

@Component({
    selector: 'app-character-stats',
    imports: [
        MatCardModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatListModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ],
    templateUrl: './character-stats.component.html',
    styleUrl: './character-stats.component.scss'
})
export class CharacterStatsComponent {
  readonly character = input.required<Character>();
  readonly deleteRequest = output<number>();
  readonly refreshRequest = output<number>();
  readonly showSkillsRequest = output<void>();

  get totalLevel(): number {
    return this.character().classes.reduce((acc, curr) => acc + curr.level, 0);
  }

  getModifier(value: number): number {
    return Math.floor((value - 10) / 2);
  }

  getModifierString(value: number): string {
    const mod = this.getModifier(value);
    return mod > 0 ? `+${mod}` : `${mod}`;
  }

  get hpStatus(): string {
    const character = this.character();
    if (!character.hitPoints.max) return 'healthy';
    const pct = character.hitPoints.current / character.hitPoints.max;
    if (pct < 0.1) return 'critical';
    if (pct < 0.5) return 'bloodied';
    return 'healthy';
  }

  delete() {
    this.deleteRequest.emit(this.character().id);
  }

  refresh() {
    this.refreshRequest.emit(this.character().id);
  }

  showSkills() {
    // TODO: The 'emit' function requires a mandatory void argument
    this.showSkillsRequest.emit();
  }

  getClassTooltip(cls: any): string {
    const subclassName = cls.subclassDefinition ? ` (${cls.subclassDefinition.name})` : '';
    return `${cls.definition.name}${subclassName} ${cls.level}`;
  }
}
