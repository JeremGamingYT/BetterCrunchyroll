import { AnimeDetails } from './types';

export const DEMON_SLAYER_DATA: AnimeDetails = {
  id: 'demon-slayer-01',
  title: 'DEMON SLAYER',
  subtitle: "You're watching Anime",
  description: 'A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon slowly. Tanjiro sets out to become a demon slayer to avenge his family and cure his sister.',
  rating: 4.9,
  votes: 650,
  year: 2016,
  studio: 'Aniplex of America',
  totalEpisodes: 26,
  contentRating: 'PG-13',
  tags: ['Action', 'Supernatural', 'Historical'],
  // Using a visually similar placeholder since we can't use real copyrighted assets
  backgroundImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2670&auto=format&fit=crop', 
  seasons: [
    {
      id: 's1',
      title: 'Season 1',
      episodes: [
        {
          id: 'ep1',
          number: 1,
          title: 'Cruelty',
          description: 'It is the Taisho Period. Tanjiro Kamado is living a modest but blissful life in the mountains with his family...',
          thumbnail: 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&w=600&q=80',
          duration: '24m',
          progress: 45
        },
        {
          id: 'ep2',
          number: 2,
          title: 'Trainer Sakonji Urokodaki',
          description: 'Tanjiro and Nezuko head for Mt. Sagiri per Giyu Tomioka\'s instructions. On their way, they encounter a demon...',
          thumbnail: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=600&q=80',
          duration: '24m'
        },
        {
          id: 'ep3',
          number: 3,
          title: 'Sabito and Makomo',
          description: 'Tanjiro begins his training with Sakonji Urokodaki. He descends the mountain repeatedly, avoiding traps...',
          thumbnail: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80',
          duration: '24m'
        },
        {
          id: 'ep4',
          number: 4,
          title: 'Final Selection',
          description: 'To pass the Final Selection, one must survive for seven days on Mt. Fujikasane, where demons captured by Slayer...',
          thumbnail: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?auto=format&fit=crop&w=600&q=80',
          duration: '24m'
        },
         {
          id: 'ep5',
          number: 5,
          title: 'My Own Steel',
          description: 'After surviving the Final Selection, Tanjiro returns to Urokodaki waiting for him. He gets his own sword...',
          thumbnail: 'https://images.unsplash.com/photo-1620559612395-6f2494dc614e?auto=format&fit=crop&w=600&q=80',
          duration: '24m'
        }
      ]
    },
    {
      id: 's2',
      title: 'Season 2',
      episodes: []
    },
    {
      id: 's3',
      title: 'Season 3',
      episodes: []
    },
    {
      id: 's4',
      title: 'Season 4',
      episodes: []
    }
  ]
};
