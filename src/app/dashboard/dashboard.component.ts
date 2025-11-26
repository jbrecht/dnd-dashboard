import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Character2Service, ParsedCharacter } from '../services/character2.service';
import { Character } from '../models/character.model';
import { CharacterCardComponent } from '../character-card/character-card.component';

interface CachedCharacter {
  input: string;
  character: Character;
  lastUpdated: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    CharacterCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  characterInput = '';
  characters: Character[] = [];
  loading = false;
  error = '';
  
  private readonly STORAGE_KEY = 'dnd-dashboard';

  constructor(private characterService: Character2Service) {}

  ngOnInit() {
    this.loadSavedCharacters();
  }

  loadSavedCharacters() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out expired cache (24h)
        const now = Date.now();
        this.characters = parsed
          .filter((c: CachedCharacter) => now - c.lastUpdated < 24 * 60 * 60 * 1000)
          .map((c: CachedCharacter) => c.character);
      } catch (e) {
        console.error('Failed to load saved characters', e);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  saveCharacters() {
    const cache: CachedCharacter[] = this.characters.map(c => ({
      input: c.id.toString(),
      character: c,
      lastUpdated: Date.now()
    }));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
  }

  importCharacter() {
    if (!this.characterInput.trim()) return;

    // Extract ID if full URL is pasted
    const idMatch = this.characterInput.match(/\/characters?\/(\d+)/);
    const id = idMatch ? idMatch[1] : this.characterInput.trim();

    if (this.characters.some(c => c.id.toString() === id)) {
      this.error = 'Character already added';
      return;
    }

    this.loading = true;
    this.error = '';

    this.characterService.getCharacter(id).subscribe({
      next: (parsed: ParsedCharacter) => {
        const character: Character = this.mapParsedToCharacter(id, parsed);
        this.characters.push(character);
        this.saveCharacters();
        this.characterInput = '';
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = err.message || 'Failed to load character';
        this.loading = false;
      }
    });
  }

  private mapParsedToCharacter(id: string, parsed: ParsedCharacter): Character {
    return {
      id: parseInt(id, 10),
      name: parsed.name,
      race: { fullName: parsed.race },
      classes: [{
        level: parsed.level,
        definition: { name: 'Total Level' },
        isStartingClass: true
      }],
      hitPoints: parsed.hp.max,
      avatarUrl: parsed.avatar,
      stats: [
        { id: 1, name: 'STR', value: parsed.stats.str },
        { id: 2, name: 'DEX', value: parsed.stats.dex },
        { id: 3, name: 'CON', value: parsed.stats.con },
        { id: 4, name: 'INT', value: parsed.stats.int },
        { id: 5, name: 'WIS', value: parsed.stats.wis },
        { id: 6, name: 'CHA', value: parsed.stats.cha }
      ]
    };
  }

  removeCharacter(id: number) {
    this.characters = this.characters.filter(c => c.id !== id);
    this.saveCharacters();
  }
}
