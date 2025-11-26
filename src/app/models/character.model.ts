export interface Character {
  id: number;
  name: string;
  classes: CharacterClass[];
  race: { fullName: string };
  hitPoints: { current: number; max: number; temp: number };
  stats: AbilityStats[];
  avatarUrl: string;
  armorClass: number;
  senses: {
    perception: number;
    investigation: number;
    insight: number;
    special: string[];
  };
  isLoading?: boolean;
}

export interface CharacterClass {
  level: number;
  definition: { name: string };
  isStartingClass: boolean;
}

export interface AbilityStats {
  id: number;
  name?: string; // Helper for mapping
  value: number;
}
