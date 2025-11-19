import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Character } from '../models/character.model';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  private baseUrl = 'https://www.dndbeyond.com/character/';

  constructor(private http: HttpClient) { }

  getCharacter(url: string): Observable<Character> {
    const characterId = this.extractId(url);
    if (!characterId) {
      throw new Error('Invalid DnD Beyond URL');
    }

    // Use relative URL to trigger the proxy
    const jsonUrl = `/character/${characterId}/json`;
    return this.http.get<any>(jsonUrl).pipe(
      map(response => this.mapToCharacter(response))
    );
  }

  public extractId(url: string): string | null {
    const match = url.match(/\/characters?\/(\d+)/);
    return match ? match[1] : null;
  }

  private mapToCharacter(data: any): Character {
    const charData = data.character || data;
    const statNames: {[key: number]: string} = {
      1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA'
    };

    return {
      id: charData.id,
      name: charData.name,
      classes: charData.classes,
      race: charData.race,
      baseHitPoints: charData.baseHitPoints,
      stats: charData.stats.map((s: any) => ({
        id: s.id,
        name: statNames[s.id] || 'UNK',
        value: s.value !== null ? s.value : 10 // Fallback, though usually present
      })),
      avatarUrl: charData.avatarUrl || charData.decorations?.avatarUrl
    };
  }
}
