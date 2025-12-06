import { X, Play, Bookmark, Share2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AnimeDetail.scss';

interface AnimeDetailProps {
    isOpen: boolean;
    onClose: () => void;
    anime: {
        title: string;
        image: string;
        description: string;
        tags: string[];
        rating: number;
        episodes: string;
    } | null;
}

const AnimeDetail = ({ isOpen, onClose, anime }: AnimeDetailProps) => {
    if (!anime) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="anime-detail-modal"
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>

                        <div className="modal-header">
                            <img src={anime.image} alt={anime.title} className="header-image" />
                            <div className="header-overlay"></div>
                            <div className="header-content">
                                <h2>{anime.title}</h2>
                                <div className="meta">
                                    <div className="rating">
                                        <Star fill="var(--color-primary)" color="var(--color-primary)" size={18} />
                                        <span>{anime.rating}/10</span>
                                    </div>
                                    <span className="episodes">{anime.episodes}</span>
                                </div>
                                <div className="tags">
                                    {anime.tags.map(tag => (
                                        <span key={tag} className="tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-body">
                            <p className="description">{anime.description}</p>

                            <div className="actions">
                                <button className="btn-primary">
                                    <Play fill="currentColor" size={20} /> Watch Now
                                </button>
                                <button className="btn-secondary">
                                    <Bookmark size={20} /> Add to List
                                </button>
                                <button className="btn-icon">
                                    <Share2 size={20} />
                                </button>
                            </div>

                            <div className="episodes-list">
                                <h3>Episodes</h3>
                                <div className="episodes-grid">
                                    {[1, 2, 3, 4, 5, 6].map(ep => (
                                        <div key={ep} className="episode-card">
                                            <div className="episode-thumbnail">
                                                <img src={anime.image} alt={`Episode ${ep}`} />
                                                <div className="play-overlay">
                                                    <Play fill="currentColor" size={24} />
                                                </div>
                                            </div>
                                            <div className="episode-info">
                                                <h4>Episode {ep}</h4>
                                                <p>24 min</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AnimeDetail;
