import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Character } from '../models/character.model';

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatChipsModule,
    MatListModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './character-card.component.html',
  styleUrl: './character-card.component.scss'
})
export class CharacterCardComponent {
  @Input() character!: Character;
  @Output() deleteRequest = new EventEmitter<number>();

  get totalLevel(): number {
    return this.character.classes.reduce((acc, curr) => acc + curr.level, 0);
  }

  getModifier(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  delete() {
    this.deleteRequest.emit(this.character.id);
  }
}
