
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  studioName?: string;
  hasOnboarded?: boolean;
  lastSpin?: number;
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
  visualStyle: string;
  boxImageUrl?: string;
  keywords?: string;
  colorScheme?: string[];
  toyFinish?: string;
  variationHint?: string;
  inspirationImages?: string[];
  rareTraits?: string;
  legendaryTraits?: string;
  characterDefinitions: {
    name: string;
    description: string;
    rarity: 'Common' | 'Rare' | 'Legendary';
    imageUrl?: string;
  }[];
}

export type AppView = 'login' | 'onboarding' | 'marketplace' | 'studio-initial' | 'studio-design' | 'opening' | 'collection' | 'tools' | 'manufacturing';

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
