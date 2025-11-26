import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatProgressSpinnerModule,
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
  @Output() refreshRequest = new EventEmitter<number>();

  get totalLevel(): number {
    return this.character.classes.reduce((acc, curr) => acc + curr.level, 0);
  }

  getModifier(value: number): number {
    return Math.floor((value - 10) / 2);
  }

  getModifierString(value: number): string {
    const mod = this.getModifier(value);
    return mod > 0 ? `+${mod}` : `${mod}`;
  }

  get hpStatus(): string {
    if (!this.character.hitPoints.max) return 'healthy';
    const pct = this.character.hitPoints.current / this.character.hitPoints.max;
    if (pct < 0.1) return 'critical';
    if (pct < 0.5) return 'bloodied';
    return 'healthy';
  }

  delete() {
    this.deleteRequest.emit(this.character.id);
  }

  refresh() {
    this.refreshRequest.emit(this.character.id);
  }
}
