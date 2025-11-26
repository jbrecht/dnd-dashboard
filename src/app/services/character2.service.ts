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
  senses: {
    perception: number;
    investigation: number;
    insight: number;
    special: string[];
  };
}

interface DDBModifier {
  entityId: number;
  type: string;
  subType: string;
  value?: number;
}

interface DDBCharacterData {
  overrideStats: { id: number; value: number }[];
  stats: { id: number; value: number }[];
  bonusStats: { id: number; value: number }[];
  modifiers: {
    race: DDBModifier[];
    class: DDBModifier[];
    background: DDBModifier[];
    feat: DDBModifier[];
    item: DDBModifier[];
    condition: DDBModifier[];
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
    const getStat = (id: number) => {
      const override = data.overrideStats.find(s => s.id === id)?.value;
      if (override) return override;

      const base = data.stats.find(s => s.id === id)?.value || 10;
      const userBonus = data.bonusStats.find(s => s.id === id)?.value || 0;

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
    let ac = 10 + stats.dexMod;
    const bodyArmor = data.inventory.find(i => 
      i.equipped && i.definition.filterType === 'Armor' && [1, 2, 3].includes(i.definition.armorTypeId || 0)
    );
    const shield = data.inventory.find(i => 
      i.equipped && i.definition.filterType === 'Armor' && i.definition.armorTypeId === 4
    );

    if (bodyArmor) {
      const armorBase = bodyArmor.definition.armorClass || 10;
      const type = bodyArmor.definition.armorTypeId;
      if (type === 1) ac = armorBase + stats.dexMod;
      else if (type === 2) ac = armorBase + Math.min(stats.dexMod, 2);
      else if (type === 3) ac = armorBase;
    }

    if (shield) ac += (shield.definition.armorClass || 2);

    // --- 4. Senses Calculation ---
    // Proficiency Bonus: ceil(level / 4) + 1
    const proficiencyBonus = Math.ceil(totalLevel / 4) + 1;

    const getAllModifiers = () => {
      return [
        ...(data.modifiers.race || []),
        ...(data.modifiers.class || []),
        ...(data.modifiers.background || []),
        ...(data.modifiers.feat || []),
        ...(data.modifiers.item || []),
        ...(data.modifiers.condition || [])
      ];
    };

    const allModifiers = getAllModifiers();

    const getSkillScore = (skillName: string, abilityMod: number) => {
      // 1. Base: 10 + Mod
      let score = 10 + abilityMod;

      // 2. Proficiency / Expertise
      // Look for 'proficiency' or 'expertise' type with subType matching skill (e.g., 'perception')
      // Note: DDB uses 'perception', 'investigation', 'insight' as subTypes usually.
      // Sometimes subType is 'perception-skill' or just 'perception'.
      
      const skillSlug = skillName.toLowerCase().replace(' ', '-'); // e.g. 'perception'
      
      const proficiency = allModifiers.find(m => 
        m.type === 'proficiency' && m.subType === skillSlug
      );
      
      const expertise = allModifiers.find(m => 
        m.type === 'expertise' && m.subType === skillSlug
      );

      if (expertise) {
        score += (proficiencyBonus * 2);
      } else if (proficiency) {
        score += proficiencyBonus;
      }

      // 3. Bonuses
      // type: 'bonus', subType: 'perception' (or 'passive-perception')
      const bonuses = allModifiers
        .filter(m => m.type === 'bonus' && (m.subType === skillSlug || m.subType === `passive-${skillSlug}`))
        .reduce((acc, m) => acc + (m.value || 0), 0);
      
      score += bonuses;

      return score;
    };

    const senses = {
      perception: getSkillScore('perception', stats.wisMod),
      investigation: getSkillScore('investigation', stats.intMod),
      insight: getSkillScore('insight', stats.wisMod),
      special: [] as string[]
    };

    // Special Senses (Darkvision, etc.)
    // Look for type: 'sense'
    const specialSenses = allModifiers
      .filter(m => m.type === 'sense')
      .map(m => {
        // Usually subType is the sense name (e.g., 'darkvision')
        // We might need to format it nicely.
        const name = m.subType.charAt(0).toUpperCase() + m.subType.slice(1);
        const value = m.value ? ` ${m.value} ft.` : '';
        return `${name}${value}`;
      });
    
    // Deduplicate
    senses.special = [...new Set(specialSenses)];

    // --- 5. Final Object ---
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
      stats: stats,
      senses: senses
    };
  }
}
