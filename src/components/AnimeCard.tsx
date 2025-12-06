import { Play } from 'lucide-react';
import './AnimeCard.scss';

export interface Anime {
    id: string | number;
    title: string;
    image: string;
    episodes?: string;
    type?: string;
    progress?: number;
    rating?: string;
}

interface AnimeCardProps {
    anime: Anime;
    onClick?: (anime: Anime) => void;
}

const AnimeCard = ({ anime, onClick }: AnimeCardProps) => {
    return (
        <div className="anime-card" onClick={() => onClick?.(anime)}>
            <div className="card-image">
                <img src={anime.image} alt={anime.title} loading="lazy" />
                <div className="card-overlay">
                    <button className="play-btn"><Play fill="currentColor" size={20} /></button>
                </div>
                {anime.type && <span className="card-badge">{anime.type}</span>}
            </div>
            <div className="card-info">
                {anime.rating && (
                    <div className="rating-badge">
                        <svg className="cr-logo" width="20" height="20" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 0C44.77 0 0 44.77 0 100C0 155.23 44.77 200 100 200C155.23 200 200 155.23 200 100C200 44.77 155.23 0 100 0ZM143.85 143.85C123.08 164.62 88.46 164.62 67.69 143.85C46.92 123.08 46.92 88.46 67.69 67.69L100 35.38L132.31 67.69C153.08 88.46 153.08 123.08 132.31 143.85L143.85 143.85Z" fill="currentColor" />
                        </svg>
                        <span className="rating-value">{anime.rating}</span>
                    </div>
                )}
                <h3>{anime.title}</h3>
                {anime.episodes && <p className="subtitle">{anime.episodes}</p>}
            </div>
        </div>
    );
};

export default AnimeCard;
