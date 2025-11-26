export interface Character {
  id: number;
  name: string;
  classes: CharacterClass[];
  race: { fullName: string };
  hitPoints: { current: number; max: number; temp: number };
  stats: AbilityStats[];
  avatarUrl: string;
  isLoading?: boolean;
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
