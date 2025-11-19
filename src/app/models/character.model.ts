export interface Character {
  id: number;
  name: string;
  classes: CharacterClass[];
  race: { fullName: string };
  baseHitPoints: number;
  stats: AbilityStats[];
  avatarUrl: string;
  // Add more fields as we discover the JSON structure
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
