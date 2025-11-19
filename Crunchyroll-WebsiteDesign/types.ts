export interface Episode {
  id: string;
  number: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  progress?: number; // Percentage 0-100
}

export interface Season {
  id: string;
  title: string;
  episodes: Episode[];
}

export interface AnimeDetails {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  rating: number;
  votes: number;
  year: number;
  studio: string;
  totalEpisodes: number;
  contentRating: string;
  tags: string[];
  backgroundImage: string;
  seasons: Season[];
}

export enum ChatRole {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}