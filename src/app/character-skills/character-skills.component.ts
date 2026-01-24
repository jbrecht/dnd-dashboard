import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Character, Skill } from '../models/character.model';

@Component({
  selector: 'app-character-skills',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatListModule, MatTooltipModule],
  templateUrl: './character-skills.component.html',
  styleUrls: ['./character-skills.component.scss'],
})
export class CharacterSkillsComponent {
  @Input() character!: Character;
  @Output() back = new EventEmitter<void>();

  getModifierString(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  getProficiencyIcon(proficiency: string): string {
    switch (proficiency) {
      case 'expert':
        return 'stars'; // double proficiency
      case 'proficient':
        return 'circle'; // single proficiency
      default:
        return 'radio_button_unchecked'; // none
    }
  }

  getProficiencyClass(proficiency: string): string {
    return proficiency === 'none' ? 'skill-none' : `skill-${proficiency}`;
  }
}
