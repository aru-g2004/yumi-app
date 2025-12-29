
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Legendary';
  imageUrl: string;
  videoUrl?: string;
  theme: string;
  themeId: string;
  themeCreatorId?: string;
  obtainedAt: number;
  count?: number;
}

export interface CollectionTheme {
  id: string;
  name: string;
  description: string;
  visualStyle: string; // Describes the global aesthetic (e.g. "matte pastel", "translucent neon")
  boxImageUrl?: string; // Generated packaging art
  characterDefinitions: {
    name: string;
    description: string;
    rarity: 'Common' | 'Rare' | 'Legendary';
    imageUrl?: string;
  }[];
}

export type AppView = 'login' | 'lobby' | 'theme-select' | 'opening' | 'collection' | 'tools' | 'mini-game' | 'manufacturing' | 'marketplace';

export interface AppState {
  coins: number;
  collection: Character[];
  currentTheme: CollectionTheme | null;
  activeCharacter: Character | null;
  user: User | null;
  generatedThemes: string[];
  themeHistory: CollectionTheme[];
  publicThemes: any[];
}
