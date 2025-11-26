import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map } from 'rxjs';

export interface ParsedCharacter {
  name: string;
  race: string;
  level: number;
  avatar: string;
  hp: { current: number; max: number; temp: number };
  ac: number;
  classes: { name: string; level: number; isStartingClass: boolean }[];
  stats: {
    str: number; strMod: number;
    dex: number; dexMod: number;
    con: number; conMod: number;
    int: number; intMod: number;
    wis: number; wisMod: number;
    cha: number; chaMod: number;
  };
}

interface DDBModifier {
  entityId: number;
  type: string;
  value?: number;
}

interface DDBCharacterData {
  overrideStats: { id: number; value: number }[];
  stats: { id: number; value: number }[];
  bonusStats: { id: number; value: number }[];
  modifiers: {
    race: DDBModifier[];
    class: DDBModifier[];
    feat: DDBModifier[];
    item: DDBModifier[];
  };
  baseHitPoints: number;
  bonusHitPoints: number;
  removedHitPoints: number;
  temporaryHitPoints: number;
  inventory: any[];
  frameAvatarUrl: string;
  avatarUrl: string;
  classes: { level: number; definition: { name: string }; isStartingClass: boolean }[];
  name: string;
  race: { fullName: string };
  decorations?: { avatarUrl: string };
}

@Injectable({
  providedIn: 'root'
})
export class Character2Service {
  private http = inject(HttpClient);

  getCharacter(characterId: string): Observable<ParsedCharacter> {
    const targetUrl = `https://character-service.dndbeyond.com/character/v5/character/${characterId}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    return this.http.get<any>(proxyUrl).pipe(
      map(response => {
        if (!response || !response.data) {
          throw new Error("Invalid Data Structure");
        }
        return this.parseCharacter(response.data);
      })
    );
  }

  private parseCharacter(data: DDBCharacterData): ParsedCharacter {
    
    // --- 1. Attributes (Stats) Calculation ---
    // Formula: Base + User Bonus + (Race + Class + Feat + Item Modifiers)
    // UNLESS an Override exists (Set score).

    const getStat = (id: number) => {
      // 1. Check for Set Score Override first (e.g. Belt of Giant Strength)
      // Note: Usually overrides in DDB are strict replacements if they exist and are > 0
      const override = data.overrideStats.find(s => s.id === id)?.value;
      if (override) return override;

      // 2. Base (Rolled/Point Buy)
      const base = data.stats.find(s => s.id === id)?.value || 10;
      
      // 3. User Manual Bonus (from "Abilities" tab)
      const userBonus = data.bonusStats.find(s => s.id === id)?.value || 0;

      // 4. Modifiers (Race, Class, Feat, Item)
      // We search for type "bonus" and entityId matching the stat ID
      const sumModifiers = (group: DDBModifier[]) => {
        if (!group) return 0;
        return group
          .filter(m => m.entityId === id && m.type === 'bonus')
          .reduce((acc, m) => acc + (m.value || 0), 0);
      };

      const racialMod = sumModifiers(data.modifiers.race);
      const classMod = sumModifiers(data.modifiers.class);
      const featMod = sumModifiers(data.modifiers.feat);
      const itemMod = sumModifiers(data.modifiers.item);

      return base + userBonus + racialMod + classMod + featMod + itemMod;
    };

    const getMod = (val: number) => Math.floor((val - 10) / 2);

    const stats = {
      str: getStat(1), strMod: 0,
      dex: getStat(2), dexMod: 0,
      con: getStat(3), conMod: 0,
      int: getStat(4), intMod: 0,
      wis: getStat(5), wisMod: 0,
      cha: getStat(6), chaMod: 0,
    };

    // Calc Mods
    stats.strMod = getMod(stats.str);
    stats.dexMod = getMod(stats.dex);
    stats.conMod = getMod(stats.con);
    stats.intMod = getMod(stats.int);
    stats.wisMod = getMod(stats.wis);
    stats.chaMod = getMod(stats.cha);

    // --- 2. Hit Points ---
    const totalLevel = data.classes.reduce((sum, cls) => sum + cls.level, 0);
    const maxHp = (data.baseHitPoints || 0) + (data.bonusHitPoints || 0) + (stats.conMod * totalLevel);
    const currentHp = maxHp - (data.removedHitPoints || 0);
    const tempHp = data.temporaryHitPoints || 0;

    // --- 3. Armor Class ---
    let ac = 10 + stats.dexMod; // Default

    // Simple Inventory Checks
    const bodyArmor = data.inventory.find(i => 
      i.equipped && i.definition.filterType === 'Armor' && [1, 2, 3].includes(i.definition.armorTypeId || 0)
    );
    const shield = data.inventory.find(i => 
      i.equipped && i.definition.filterType === 'Armor' && i.definition.armorTypeId === 4
    );

    if (bodyArmor) {
      const armorBase = bodyArmor.definition.armorClass || 10;
      const type = bodyArmor.definition.armorTypeId;
      if (type === 1) ac = armorBase + stats.dexMod; // Light
      else if (type === 2) ac = armorBase + Math.min(stats.dexMod, 2); // Medium
      else if (type === 3) ac = armorBase; // Heavy
    }

    if (shield) ac += (shield.definition.armorClass || 2);

    // --- 4. Final Object ---
    const avatar = data.avatarUrl || data.decorations?.avatarUrl || 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';

    const classes = data.classes.map(cls => ({
      name: cls.definition.name,
      level: cls.level,
      isStartingClass: cls.isStartingClass
    }));

    return {
      name: data.name,
      race: data.race.fullName,
      level: totalLevel,
      avatar: avatar,
      hp: { current: currentHp, max: maxHp, temp: tempHp },
      ac: ac,
      classes: classes,
      stats: stats
    };
  }
}
