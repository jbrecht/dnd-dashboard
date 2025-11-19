import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CharacterService } from '../services/character.service';
import { Character } from '../models/character.model';
import { CharacterCardComponent } from '../character-card/character-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    CharacterCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  characterUrl = '';
  character: Character | null = null;
  loading = false;
  error = '';

  constructor(private characterService: CharacterService) {}

  importCharacter() {
    if (!this.characterUrl) return;

    this.loading = true;
    this.error = '';
    this.character = null;

    this.characterService.getCharacter(this.characterUrl).subscribe({
      next: (char) => {
        this.character = char;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load character. Please check the URL.';
        this.loading = false;
      }
    });
  }
}
