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

    // Calculate stats first as they are needed for HP (CON mod)
    const stats = charData.stats.map((s: any) => ({
      id: s.id,
      name: statNames[s.id] || 'UNK',
      value: this.getStatTotal(s.id, charData)
    }));

    const conStat = stats.find((s: any) => s.id === 3)?.value || 10;

    return {
      id: charData.id,
      name: charData.name,
      classes: charData.classes,
      race: charData.race,
      hitPoints: this.getCalculatedHP(charData, conStat),
      stats: stats,
      avatarUrl: charData.avatarUrl || charData.decorations?.avatarUrl
    };
  }

  private getStatTotal(statId: number, charData: any): number {
    // 1. Base
    const baseStat = charData.stats.find((s: any) => s.id === statId)?.value || 10;

    // 2. Overrides (if any, return immediately)
    const override = charData.overrideStats.find((s: any) => s.id === statId)?.value;
    if (override !== null && override !== undefined) return override;

    // 3. Bonuses from bonusStats
    const bonusStat = charData.bonusStats.find((s: any) => s.id === statId)?.value || 0;

    // 4. Modifiers
    let modifierTotal = 0;
    const statSubTypes: {[key: number]: string} = {
      1: 'strength-score', 2: 'dexterity-score', 3: 'constitution-score',
      4: 'intelligence-score', 5: 'wisdom-score', 6: 'charisma-score'
    };
    const targetSubType = statSubTypes[statId];

    if (charData.modifiers) {
      Object.values(charData.modifiers).forEach((modList: any) => {
        if (Array.isArray(modList)) {
          modList.forEach((mod: any) => {
            if (mod.type === 'bonus' && mod.subType === targetSubType) {
              modifierTotal += mod.value || 0;
            }
          });
        }
      });
    }

    return baseStat + bonusStat + modifierTotal;
  }

  private getCalculatedHP(charData: any, conTotal: number): number {
    // 1. Base HP (sum of class fixed/rolled HP)
    let totalHP = charData.baseHitPoints || 0;

    // 2. Override HP
    if (charData.overrideHitPoints !== null && charData.overrideHitPoints !== undefined) {
      return charData.overrideHitPoints;
    }

    // 3. Bonus HP (flat bonus)
    totalHP += charData.bonusHitPoints || 0;

    // 4. CON Modifier * Level
    const conMod = Math.floor((conTotal - 10) / 2);
    const level = charData.classes.reduce((acc: number, cls: any) => acc + cls.level, 0);
    totalHP += (conMod * level);

    // 5. Modifiers (e.g. Draconic Resilience, Dwarven Toughness, Tough Feat)
    if (charData.modifiers) {
      Object.values(charData.modifiers).forEach((modList: any) => {
        if (Array.isArray(modList)) {
          modList.forEach((mod: any) => {
            if (mod.type === 'bonus' && mod.subType === 'hit-points-per-level') {
               totalHP += (mod.value || 0) * level;
            }
          });
        }
      });
    }

    return totalHP;
  }
}
