import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './SearchModal.scss';
import { type Anime } from './AnimeCard';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAnime?: (anime: Anime) => void;
}

const mockResults: Anime[] = [
    { id: 1, title: "Jujutsu Kaisen", image: "https://images6.alphacoders.com/133/1330235.png", episodes: "Season 2", type: "Sub | Dub" },
    { id: 2, title: "Demon Slayer", image: "https://images.alphacoders.com/132/1328678.jpeg", episodes: "Season 4", type: "Sub | Dub" },
    { id: 3, title: "Chainsaw Man", image: "https://images.alphacoders.com/128/1289138.jpg", episodes: "Season 1", type: "Sub | Dub" },
    { id: 4, title: "One Piece", image: "https://images.alphacoders.com/134/1346537.jpeg", episodes: "1000+ Episodes", type: "Sub | Dub" },
];

const SearchModal = ({ isOpen, onClose, onSelectAnime }: SearchModalProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Anime[]>([]);

    const handleSearch = (value: string) => {
        setQuery(value);
        if (value.length > 0) {
            setResults(mockResults.filter(anime =>
                anime.title.toLowerCase().includes(value.toLowerCase())
            ));
        } else {
            setResults([]);
        }
    };

    const handleSelect = (anime: Anime) => {
        onSelectAnime?.(anime);
        onClose();
        setQuery('');
        setResults([]);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="search-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="search-modal"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className="search-input-wrapper">
                            <Search className="search-icon" size={24} />
                            <input
                                type="text"
                                placeholder="Search anime..."
                                value={query}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoFocus
                                className="search-input"
                            />
                            <button onClick={onClose} className="close-search">
                                <X size={24} />
                            </button>
                        </div>

                        {results.length > 0 && (
                            <div className="search-results">
                                {results.map(anime => (
                                    <div
                                        key={anime.id}
                                        className="result-item"
                                        onClick={() => handleSelect(anime)}
                                    >
                                        <img src={anime.image} alt={anime.title} />
                                        <div className="result-info">
                                            <h4>{anime.title}</h4>
                                            <p>{anime.episodes}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {query.length > 0 && results.length === 0 && (
                            <div className="no-results">
                                <p>No results found for "{query}"</p>
                            </div>
                        )}

                        {query.length === 0 && (
                            <div className="search-suggestions">
                                <h3>Popular Searches</h3>
                                <div className="suggestions-list">
                                    {mockResults.map(anime => (
                                        <button
                                            key={anime.id}
                                            className="suggestion-tag"
                                            onClick={() => handleSearch(anime.title)}
                                        >
                                            {anime.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SearchModal;
