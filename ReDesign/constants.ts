import { AnimeDetails, Episode, NewsItem, NotificationItem } from './types';

export const DEMON_SLAYER_DATA: AnimeDetails = {
  id: 'demon-slayer',
  title: 'DEMON SLAYER',
  description: 'A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon slowly. Tanjiro sets out to become a demon slayer to avenge his family and cure his sister.',
  rating: 4.9,
  votes: 650,
  tags: ['Action', 'Supernatural', 'Historical', 'Shonen'],
  studio: 'Aniplex of America',
  maturityRating: 'PG-13',
  heroImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2670&auto=format&fit=crop',
  year: 2016,
  episodeCount: 26,
  seasons: [
    {
      id: 's1',
      title: 'Season 1',
      year: 2016,
      episodeCount: 26,
      episodes: [
        {
          id: 'e1',
          number: 1,
          title: 'Cruelty',
          description: 'It is the Taisho Period. Tanjiro Kamado is living a modest but blissful life in the mountains with his family...',
          thumbnailUrl: 'https://images.unsplash.com/photo-1621360841013-c768371e93cf?q=80&w=800&auto=format&fit=crop',
          isPremium: false,
          duration: 24,
          progress: 45
        },
        {
          id: 'e2',
          number: 2,
          title: 'Trainer Sakonji Urokodaki',
          description: 'Tanjiro and Nezuko head for Mt. Sagiri per Giyu Tomioka\'s instructions. On their way, they encounter...',
          thumbnailUrl: 'https://images.unsplash.com/photo-1607604276583-eef5f0b7e6b5?q=80&w=800&auto=format&fit=crop',
          isPremium: false,
          duration: 24
        },
        {
          id: 'e3',
          number: 3,
          title: 'Sabito and Makomo',
          description: 'Tanjiro begins his training under Urokodaki. He must descend the mountain while avoiding traps...',
          thumbnailUrl: 'https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?q=80&w=800&auto=format&fit=crop',
          isPremium: true,
          duration: 24
        },
        {
          id: 'e4',
          number: 4,
          title: 'Final Selection',
          description: 'To pass the Final Selection, one must survive for seven days on Mt. Fujikasane, where demons captured by...',
          thumbnailUrl: 'https://images.unsplash.com/photo-1580477667995-2b94f1b3731c?q=80&w=800&auto=format&fit=crop',
          isPremium: true,
          duration: 24
        },
         {
          id: 'e5',
          number: 5,
          title: 'My Own Steel',
          description: 'Tanjiro survives the seven days and returns to Urokodaki. He finally gets his own Nichirin Sword...',
          thumbnailUrl: 'https://images.unsplash.com/photo-1515536765-9b2a740fae94?q=80&w=800&auto=format&fit=crop',
          isPremium: true,
          duration: 24
        }
      ]
    },
    {
      id: 's2',
      title: 'Season 2',
      year: 2019,
      episodeCount: 18,
      episodes: []
    },
    {
      id: 's3',
      title: 'Season 3',
      year: 2021,
      episodeCount: 11,
      episodes: []
    },
    {
      id: 's4',
      title: 'Season 4',
      year: 2023,
      episodeCount: 12,
      episodes: []
    }
  ]
};

export const SOLO_LEVELING_DATA: AnimeDetails = {
  id: 'solo-leveling',
  title: 'SOLO LEVELING',
  description: 'In a world where hunters, humans who possess magical abilities, must battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.',
  rating: 4.8,
  votes: 820,
  tags: ['Action', 'Fantasy', 'Adventure'],
  studio: 'A-1 Pictures',
  maturityRating: 'TV-MA',
  heroImage: 'https://images.unsplash.com/photo-1620553942241-b03a86987397?q=80&w=2670&auto=format&fit=crop',
  year: 2024,
  episodeCount: 12,
  seasons: [
    {
       id: 'sl_s1',
       title: 'Season 1',
       year: 2024,
       episodeCount: 12,
       episodes: []
    }
  ]
};

export const KAIJU_NO8_DATA: AnimeDetails = {
  id: 'kaiju-no8',
  title: 'KAIJU NO. 8',
  description: 'Kafka Hibino always wanted to be part of the Defense Force, but he failed the entrance exam and now works cleaning up the mess left by Kaiju battles. But one day, he encounters a small Kaiju that changes his fate forever.',
  rating: 4.7,
  votes: 450,
  tags: ['Sci-Fi', 'Action', 'Monsters'],
  studio: 'Production I.G',
  maturityRating: 'TV-14',
  heroImage: 'https://images.unsplash.com/photo-1636955695926-0c937c29c113?q=80&w=2670&auto=format&fit=crop',
  year: 2024,
  episodeCount: 12,
  seasons: []
};

export const CAROUSEL_ITEMS = [
  DEMON_SLAYER_DATA,
  SOLO_LEVELING_DATA,
  KAIJU_NO8_DATA
];

// Mock Data for Discover Page

export const RESUME_WATCHING: Episode[] = [
  {
    id: 'rw1',
    number: 12,
    title: 'The Boar Bares its Fangs',
    description: 'Tanjiro continues his journey...',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542259681-d2cc60223579?q=80&w=800&auto=format&fit=crop',
    isPremium: false,
    duration: 24,
    progress: 85
  },
  {
    id: 'rw2',
    number: 5,
    title: 'Curse Womb Must Die -II-',
    description: 'Itadori faces a special grade curse.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620553942241-b03a86987397?q=80&w=800&auto=format&fit=crop',
    isPremium: true,
    duration: 24,
    progress: 30
  },
  {
    id: 'rw3',
    number: 3,
    title: 'Episode 3',
    description: 'A peaceful day in the guild.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1560972550-aba3456b5564?q=80&w=800&auto=format&fit=crop',
    isPremium: false,
    duration: 24,
    progress: 10
  }
];

export const RECOMMENDED_ANIME: AnimeDetails[] = [
  {
    id: 'haikyu',
    title: 'Haikyu!!',
    description: 'Shoyo Hinata joins the Karasuno High School volleyball team.',
    rating: 4.8,
    votes: 1200,
    tags: ['Sports', 'Shonen', 'Drama'],
    studio: 'Production I.G',
    maturityRating: 'TV-14',
    heroImage: 'https://images.unsplash.com/photo-1623697503473-f1b345250c42?q=80&w=600&auto=format&fit=crop',
    seasons: []
  },
  {
    id: 'jjk',
    title: 'JUJUTSU KAISEN',
    description: 'A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself.',
    rating: 4.9,
    votes: 2500,
    tags: ['Action', 'Supernatural', 'Dark Fantasy'],
    studio: 'MAPPA',
    maturityRating: 'TV-MA',
    heroImage: 'https://images.unsplash.com/photo-1536096119648-26f2b3b36130?q=80&w=600&auto=format&fit=crop',
    seasons: []
  },
  {
    id: 'spyxfamily',
    title: 'SPY x FAMILY',
    description: 'A spy on a mission to create a fake family finds out his daughter is a telepath.',
    rating: 4.9,
    votes: 1800,
    tags: ['Comedy', 'Action', 'Slice of Life'],
    studio: 'Wit Studio',
    maturityRating: 'TV-14',
    heroImage: 'https://images.unsplash.com/photo-1557255807-99ddcb1f4b7f?q=80&w=600&auto=format&fit=crop',
    seasons: []
  },
  {
    id: 'campfire',
    title: 'Campfire Cooking',
    description: 'Transported to another world with the skill of online grocery shopping.',
    rating: 4.5,
    votes: 300,
    tags: ['Isekai', 'Cooking', 'Fantasy'],
    studio: 'MAPPA',
    maturityRating: 'TV-14',
    heroImage: 'https://images.unsplash.com/photo-1533745848184-3db07256e163?q=80&w=600&auto=format&fit=crop',
    seasons: []
  },
  {
    id: 'frieren',
    title: 'Frieren',
    description: 'The elf mage Frieren takes a journey to retrace the steps of her past adventure.',
    rating: 5.0,
    votes: 900,
    tags: ['Fantasy', 'Adventure', 'Drama'],
    studio: 'Madhouse',
    maturityRating: 'TV-14',
    heroImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    seasons: []
  }
];

export const TRENDING_ANIME: AnimeDetails[] = [
  {
    id: 'onepiece',
    title: 'One Piece',
    description: 'Monkey D. Luffy sails the seas to find the One Piece.',
    rating: 4.9,
    votes: 5000,
    tags: ['Action', 'Adventure', 'Pirates'],
    studio: 'Toei Animation',
    maturityRating: 'TV-14',
    heroImage: 'https://images.unsplash.com/photo-1524946274118-e7680e33ccc5?q=80&w=600&auto=format&fit=crop',
    seasons: []
  },
  {
    id: 'chainsaw',
    title: 'Chainsaw Man',
    description: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita.',
    rating: 4.7,
    votes: 2200,
    tags: ['Action', 'Gore', 'Supernatural'],
    studio: 'MAPPA',
    maturityRating: 'TV-MA',
    heroImage: 'https://images.unsplash.com/photo-1509606647148-89b0624a295c?q=80&w=600&auto=format&fit=crop',
    seasons: []
  },
  {
    id: 'bluelock',
    title: 'BLUE LOCK',
    description: 'Japan needs a revolutionary striker to win the World Cup.',
    rating: 4.6,
    votes: 1500,
    tags: ['Sports', 'Psychological'],
    studio: '8bit',
    maturityRating: 'TV-14',
    heroImage: 'https://images.unsplash.com/photo-1517137879134-48acfbe3be13?q=80&w=600&auto=format&fit=crop',
    seasons: []
  }
];

// Collections for New Pages

export const NEW_RELEASES = [
  SOLO_LEVELING_DATA,
  KAIJU_NO8_DATA,
  ...RECOMMENDED_ANIME.slice(3),
  DEMON_SLAYER_DATA,
  ...TRENDING_ANIME.slice(1)
];

export const POPULAR_ANIME = [
  DEMON_SLAYER_DATA,
  ...TRENDING_ANIME,
  ...RECOMMENDED_ANIME.slice(0, 3),
  SOLO_LEVELING_DATA
];

export interface SimulcastItem {
  time: string;
  anime: AnimeDetails;
}

export const SIMULCAST_SCHEDULE: Record<string, SimulcastItem[]> = {
  'MONDAY': [
    { time: '09:30 AM', anime: RECOMMENDED_ANIME[3] }, // Campfire
    { time: '11:00 AM', anime: TRENDING_ANIME[2] }, // Blue Lock
  ],
  'TUESDAY': [
    { time: '10:00 AM', anime: TRENDING_ANIME[1] }, // Chainsaw Man
  ],
  'WEDNESDAY': [
    { time: '02:00 PM', anime: KAIJU_NO8_DATA },
    { time: '04:30 PM', anime: RECOMMENDED_ANIME[0] }, // Haikyu
  ],
  'THURSDAY': [
    { time: '12:00 PM', anime: RECOMMENDED_ANIME[2] }, // Spy x Family
    { time: '05:00 PM', anime: RECOMMENDED_ANIME[1] }, // JJK
  ],
  'FRIDAY': [
    { time: '09:00 AM', anime: DEMON_SLAYER_DATA },
    { time: '01:00 PM', anime: RECOMMENDED_ANIME[4] }, // Frieren
  ],
  'SATURDAY': [
    { time: '08:30 AM', anime: SOLO_LEVELING_DATA },
    { time: '11:00 AM', anime: TRENDING_ANIME[0] }, // One Piece
  ],
  'SUNDAY': [
    { time: '10:00 AM', anime: RECOMMENDED_ANIME[0] },
    { time: '03:00 PM', anime: TRENDING_ANIME[2] },
  ]
};

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'n1',
    title: 'Demon Slayer Season 4 Finale Announced',
    excerpt: 'The final episode of the Hashira Training Arc will be an hour-long special broadcast, promising an explosive conclusion to the season.',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    date: '2 hours ago',
    category: 'Anime',
    author: 'Hiroshi Tanaka'
  },
  {
    id: 'n2',
    title: 'Solo Leveling: Arise Game Release Date Set',
    excerpt: 'Netmarble has officially confirmed the global release date for the highly anticipated action RPG based on the hit manhwa.',
    imageUrl: 'https://images.unsplash.com/photo-1620553942241-b03a86987397?q=80&w=800&auto=format&fit=crop',
    date: '5 hours ago',
    category: 'Gaming',
    author: 'Sarah Jenkins'
  },
  {
    id: 'n3',
    title: 'Kaiju No. 8 Anime Adaptation Breaks Streaming Records',
    excerpt: 'The debut episode of Kaiju No. 8 has surpassed 10 million views across all platforms within the first 24 hours.',
    imageUrl: 'https://images.unsplash.com/photo-1636955695926-0c937c29c113?q=80&w=800&auto=format&fit=crop',
    date: '1 day ago',
    category: 'Business',
    author: 'TechDaily'
  },
  {
    id: 'n4',
    title: 'New One Piece Movie "Red" Blu-ray Details',
    excerpt: 'Special limited edition box set includes exclusive art cards, a behind-the-scenes documentary, and interviews with the cast.',
    imageUrl: 'https://images.unsplash.com/photo-1524946274118-e7680e33ccc5?q=80&w=800&auto=format&fit=crop',
    date: '1 day ago',
    category: 'Merchandise',
    author: 'AnimeCorner'
  },
  {
    id: 'n5',
    title: 'Chainsaw Man Manga Returns from Hiatus',
    excerpt: 'Tatsuki Fujimoto is back with a new chapter next week, continuing Denji\'s chaotic high school life.',
    imageUrl: 'https://images.unsplash.com/photo-1509606647148-89b0624a295c?q=80&w=800&auto=format&fit=crop',
    date: '2 days ago',
    category: 'Manga',
    author: 'MangaPlus'
  },
  {
    id: 'n6',
    title: 'Crunchyroll Expo 2024 Tickets On Sale Now',
    excerpt: 'Grab your badges for the biggest anime convention of the year, featuring special guests from your favorite studios.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    date: '3 days ago',
    category: 'Events',
    author: 'Events Team'
  }
];

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif1',
    title: 'New Episode Available',
    message: 'Demon Slayer Season 4 Episode 2 is now available to watch.',
    time: '10 minutes ago',
    isRead: false,
    type: 'new_episode',
    imageUrl: 'https://images.unsplash.com/photo-1621360841013-c768371e93cf?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'notif2',
    title: 'System Update',
    message: 'We have updated our privacy policy. Please review the changes.',
    time: '1 hour ago',
    isRead: true,
    type: 'system'
  },
  {
    id: 'notif3',
    title: 'Recommended for You',
    message: 'Based on your history, you might like "Solo Leveling".',
    time: '2 hours ago',
    isRead: true,
    type: 'recommendation',
    imageUrl: 'https://images.unsplash.com/photo-1620553942241-b03a86987397?q=80&w=800&auto=format&fit=crop'
  },
   {
    id: 'notif4',
    title: 'Premium Offer',
    message: 'Get 30% off your annual subscription if you upgrade today!',
    time: '1 day ago',
    isRead: true,
    type: 'offer'
  }
];