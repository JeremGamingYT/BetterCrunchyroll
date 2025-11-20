export interface Episode {
  id: string;
  number: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  isPremium: boolean;
  duration: number; // in minutes
  progress?: number; // percentage 0-100
}

export interface Season {
  id: string;
  title: string;
  year: number;
  episodeCount: number;
  episodes: Episode[];
}

export interface AnimeDetails {
  id: string;
  title: string;
  description: string;
  rating: number; // 0-5
  votes: number;
  tags: string[];
  studio: string;
  maturityRating: string;
  heroImage: string;
  logoImage?: string;
  seasons: Season[];
  year?: number;
  episodeCount?: number;
}

// AniList API Types
export interface AniListMedia {
  title: {
    romaji: string;
    english: string;
    native: string;
  };
  description: string;
  coverImage: {
    large: string;
    extraLarge: string;
  };
  bannerImage: string;
  averageScore: number;
  episodes: number;
  status: string;
  genres: string[];
  studios: {
    nodes: Array<{ name: string }>;
  };
  staff: {
    nodes: Array<{
      name: { full: string };
      primaryOccupations: string[];
    }>;
  };
  startDate: {
    year: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  date: string;
  category: string;
  author?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'new_episode' | 'system' | 'offer' | 'recommendation';
  imageUrl?: string;
}