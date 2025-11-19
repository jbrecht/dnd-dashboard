import { Component, OnInit } from '@angular/core';
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
  characterUrl = '';
  characters: Character[] = [];
  loading = false;
  error = '';
  
  private readonly STORAGE_KEY = 'dnd-dashboard';

  constructor(private characterService: CharacterService) {}

  ngOnInit() {
    this.loadSavedCharacters();
  }

  loadSavedCharacters() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const urls = JSON.parse(saved) as string[];
        urls.forEach(url => this.fetchCharacter(url, false));
      } catch (e) {
        console.error('Failed to parse saved characters', e);
      }
    }
  }

  importCharacter() {
    if (!this.characterUrl) return;
    this.fetchCharacter(this.characterUrl, true);
  }

  fetchCharacter(url: string, save: boolean) {
    this.loading = true;
    this.error = '';

    this.characterService.getCharacter(url).subscribe({
      next: (data) => {
        if (this.characters.some(c => c.id === data.id)) {
           this.error = 'Character already added.';
           this.loading = false;
           return;
        }

        this.characters.push(data);
        if (save) {
          this.saveCharacterUrl(url);
          this.characterUrl = '';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load character. Please check the URL and try again.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  saveCharacterUrl(url: string) {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    let urls: string[] = saved ? JSON.parse(saved) : [];
    if (!urls.includes(url)) {
      urls.push(url);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(urls));
    }
  }

  removeCharacter(characterId: number) {
    this.characters = this.characters.filter(c => c.id !== characterId);
    this.removeUrlFromStorage(characterId);
  }

  removeUrlFromStorage(characterId: number) {
     const saved = localStorage.getItem(this.STORAGE_KEY);
     if (saved) {
       let urls = JSON.parse(saved) as string[];
       urls = urls.filter(url => {
         const id = this.characterService.extractId(url);
         return id !== characterId.toString();
       });
       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(urls));
     }
  }
}
