
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
  obtainedAt: number;
}

export interface CollectionTheme {
  id: string;
  name: string;
  description: string;
  characterDefinitions: {
    name: string;
    description: string;
    rarity: 'Common' | 'Rare' | 'Legendary';
    imageUrl?: string; // Preview image for the series list
  }[];
}

export type AppView = 'login' | 'lobby' | 'theme-select' | 'opening' | 'collection' | 'tools' | 'mini-game';

export interface AppState {
  coins: number;
  collection: Character[];
  currentTheme: CollectionTheme | null;
  activeCharacter: Character | null;
  user: User | null;
}
