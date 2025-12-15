import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Character2Service, ParsedCharacter } from '../services/character2.service';
import { Character } from '../models/character.model';
import { trigger, transition, style, animate } from '@angular/animations';
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
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    CharacterCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('cardAnimation', [
      transition(':leave', [
        style({ opacity: 1, transform: 'scale(1)', height: '*' }),
        animate('300ms ease-out', style({ opacity: 0, transform: 'scale(0.8)', height: 0, margin: 0 }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  characterInput = '';
  characters: Character[] = [];
  loading = false;
  error = '';
  
  private readonly STORAGE_KEY = 'dnd-dashboard';

  constructor(private characterService: Character2Service) {}

  isDarkMode = true;
  showInput = true;

  ngOnInit() {
    this.loadTheme();
    this.loadSavedCharacters();
    this.refreshCharacters();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('dnd-dashboard-theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleInput() {
    this.showInput = !this.showInput;
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('dnd-dashboard-theme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    } else {
      // Check system preference
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }

  refreshCharacters() {
    this.characters.forEach(char => this.refreshCharacter(char.id));
  }

  refreshCharacter(id: number) {
    const charIndex = this.characters.findIndex(c => c.id === id);
    if (charIndex !== -1) {
      this.characters[charIndex].isLoading = true;
    }

    this.characterService.getCharacter(id.toString()).subscribe({
      next: (parsed: ParsedCharacter) => {
        const updated = this.mapParsedToCharacter(id.toString(), parsed);
        updated.isLoading = false;
        
        const index = this.characters.findIndex(c => c.id === id);
        if (index !== -1) {
          this.characters[index] = updated;
          this.saveCharacters();
        }
      },
      error: (err) => {
        console.error(`Failed to refresh character ${id}`, err);
        const index = this.characters.findIndex(c => c.id === id);
        if (index !== -1) {
          this.characters[index].isLoading = false;
        }
      }
    });
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
    const idStr = idMatch ? idMatch[1] : this.characterInput.trim();
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      this.showTemporaryError('Invalid Character ID');
      return;
    }

    if (this.characters.some(c => c.id === id)) {
      this.showTemporaryError('Character already added');
      return;
    }

    this.error = '';
    this.characterInput = '';

    // Add placeholder
    const placeholder: Character = {
      id: id,
      name: 'Loading...',
      race: { fullName: 'Loading...' },
      classes: [],
      hitPoints: { current: 0, max: 0, temp: 0 },
      armorClass: 0,
      stats: [],
      avatarUrl: '',
      senses: { perception: 10, investigation: 10, insight: 10, special: [] },
      speed: '',
      initiative: 0,
      isLoading: true
    };
    this.characters.push(placeholder);

    this.characterService.getCharacter(idStr).subscribe({
      next: (parsed: ParsedCharacter) => {
        const character: Character = this.mapParsedToCharacter(idStr, parsed);
        character.isLoading = false;
        
        const index = this.characters.findIndex(c => c.id === id);
        if (index !== -1) {
          this.characters[index] = character;
          this.saveCharacters();
        }
      },
      error: (err) => {
        console.error(err);
        let message = 'Failed to load character';
        if (err.status === 404) {
          message = 'Character not found, check the ID';
        } else if (err.status === 403) {
          message = 'Character not found, it may not be public';
        }
        this.showTemporaryError(message);
        // Remove placeholder
        const index = this.characters.indexOf(placeholder);
        if (index !== -1) {
          this.characters.splice(index, 1);
        }
      }
    });
  }

  private showTemporaryError(message: string) {
    this.error = message;
    setTimeout(() => {
      this.error = '';
    }, 2000);
  }

  private mapParsedToCharacter(id: string, parsed: ParsedCharacter): Character {
    return {
      id: parseInt(id, 10),
      name: parsed.name,
      race: { fullName: parsed.race },
      classes: parsed.classes.map(c => ({
        level: c.level,
        definition: { name: c.name },
        subclassDefinition: c.subclass ? { name: c.subclass } : undefined,
        isStartingClass: c.isStartingClass
      })),
      hitPoints: parsed.hp,
      armorClass: parsed.ac,
      speed: parsed.speed,
      initiative: parsed.initiative,
      avatarUrl: parsed.avatar,
      stats: [
        { id: 1, name: 'STR', value: parsed.stats.str },
        { id: 2, name: 'DEX', value: parsed.stats.dex },
        { id: 3, name: 'CON', value: parsed.stats.con },
        { id: 4, name: 'INT', value: parsed.stats.int },
        { id: 5, name: 'WIS', value: parsed.stats.wis },
        { id: 6, name: 'CHA', value: parsed.stats.cha }
      ],
      senses: parsed.senses
    };
  }

  removeCharacter(id: number) {
    this.characters = this.characters.filter(c => c.id !== id);
    this.saveCharacters();
  }

  trackById(index: number, item: Character): number {
    return item.id;
  }
}
