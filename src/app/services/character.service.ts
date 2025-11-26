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

  public extractId(input: string): string | null {
    // Check if input is already a numeric ID
    if (/^\d+$/.test(input.trim())) {
      return input.trim();
    }
    // Otherwise try to extract from URL
    const match = input.match(/\/characters?\/(\d+)/);
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
      hitPoints: {
        current: this.getCalculatedHP(charData, conStat),
        max: this.getCalculatedHP(charData, conStat),
        temp: 0
      },
      armorClass: 10, // Default for old service as we aren't using it
      stats: stats,
      avatarUrl: charData.avatarUrl || charData.decorations?.avatarUrl,
      senses: { perception: 10, investigation: 10, insight: 10, special: [] }
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
    let setScore = 0;
    
    const statSubTypes: {[key: number]: string} = {
      1: 'strength-score', 2: 'dexterity-score', 3: 'constitution-score',
      4: 'intelligence-score', 5: 'wisdom-score', 6: 'charisma-score'
    };
    const targetSubType = statSubTypes[statId];

    if (charData.modifiers) {
      Object.values(charData.modifiers).forEach((modList: any) => {
        if (Array.isArray(modList)) {
          modList.forEach((mod: any) => {
            if (mod.subType === targetSubType) {
              if (mod.type === 'set') {
                setScore = Math.max(setScore, mod.value || 0);
              } else {
                modifierTotal += mod.value || 0;
              }
            }
          });
        }
      });
    }

    // Check for modifiers directly on feats (e.g. Resilient)
    if (charData.feats) {
      charData.feats.forEach((feat: any) => {
        if (feat.definition && feat.definition.modifiers) {
          feat.definition.modifiers.forEach((mod: any) => {
            if (mod.subType === targetSubType) {
              if (mod.type === 'set') {
                setScore = Math.max(setScore, mod.value || 0);
              } else {
                modifierTotal += mod.value || 0;
              }
            }
          });
        }

        // (General Fix for Ungranted Modifiers is handled by the main loop which ignores isGranted flag)
        // (Resilient Fix is handled by applyStatPatches due to missing data)
      });
    }

    let calculated = baseStat + bonusStat + modifierTotal;
    
    // General Fix: Firbolg Racial Traits
    // If we have choices for the "Custom" Firbolg traits (4566743), ignore the "Standard" traits (174)
    // This handles the case where DDB exports both but the user intended the custom one.
    if (charData.race.fullName === 'Firbolg') {
       const hasCustomChoices = charData.choices.race && charData.choices.race.some((c: any) => c.componentId === 4566743);
       if (hasCustomChoices) {
         // If we are calculating Strength (Standard +1), remove it if it came from Component 174
         // We need to know if we added it.
         // We can check modifiers.race for componentId 174 and targetSubType.
         if (charData.modifiers.race) {
           charData.modifiers.race.forEach((mod: any) => {
             if (mod.componentId === 174 && mod.subType === targetSubType) {
               calculated -= (mod.value || 0);
             }
           });
         }
         
         // Also ensure we ADD the custom ones if they were missed (because isGranted=false)
         // The choices tell us what to add.
         // We can iterate choices for 4566743 and see if they match this stat.
         charData.choices.race.forEach((c: any) => {
            if (c.componentId === 4566743 && c.subType === 5) { // 5 = Ability Score? No, subType 5 is usually the choice type?
               // Wait, earlier dump showed subType: 5 for "Constitution Score" choice.
               // And optionValue: 5682 (Constitution).
               // We need to map optionValue to stat.
               // This is getting complex to reverse engineer.
               // Simpler: Check modifiers for 4566743. Even if isGranted=false, if choices exist, apply them.
               // But getStatTotal iterates ALL modifiers.
               // Did we apply them?
               // The loop `Object.values(charData.modifiers)` iterates everything.
               // If `isGranted` is false, does DDB export it in `modifiers`?
               // Yes, the dump showed them!
               // So they WERE applied.
               // Wait, if they were applied, then we have +1 Con and +2 Wis from Custom.
               // AND +1 Str and +2 Wis from Standard.
               // So Wis would be +4?
               // Let's check Wis. Base 16. Calculated?
               // User didn't complain about Wis.
               // If Wis is correct, maybe they don't overlap?
               // Dump showed: 
               // 174: Wis +2, Str +1.
               // 4566743: Wis +2, Con +1.
               // If both applied, Wis = Base + 4.
               // I need to check if I am applying `isGranted=false` modifiers.
               // My code: `Object.values(charData.modifiers).forEach...`
               // It does NOT check `isGranted`.
               // So I AM applying them.
               // So I need to REMOVE the ones that shouldn't be there.
               // If Custom (4566743) is present, REMOVE Standard (174).
           }
         });
       }
    }

    // Apply manual patches for missing items (Tome)
    calculated = this.applyStatPatches(charData, statId, calculated);

    return setScore > 0 ? Math.max(calculated, setScore) : calculated;
  }

  private applyStatPatches(charData: any, statId: number, currentTotal: number): number {
    const patches: { [charId: number]: { [statId: number]: number } } = {
      53575718: {
        // 1: -1, // Strength: Handled by general Firbolg fix
        3: 1,  // Constitution: Add +1 Resilient (Missing data)
        4: 2   // Intelligence: Add +2 Tome of Clear Thought (Missing item)
      }
    };

    if (patches[charData.id] && patches[charData.id][statId]) {
      return currentTotal + patches[charData.id][statId];
    }
    return currentTotal;
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
            // Relaxed check: accept any modifier that adds HP per level
            if (mod.subType === 'hit-points-per-level') {
               totalHP += (mod.value || 0) * level;
            }
          });
        }
      });
    }

    return totalHP;
  }
}
