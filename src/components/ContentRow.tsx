import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard, { type Anime } from './AnimeCard';
import './ContentRow.scss';

interface ContentRowProps {
    title: string;
    items: Anime[];
    onCardClick?: (anime: Anime) => void;
}

const ContentRow = ({ title, items, onCardClick }: ContentRowProps) => {
    const rowRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { current } = rowRef;
            const scrollAmount = direction === 'left' ? -current.offsetWidth * 0.8 : current.offsetWidth * 0.8;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="content-row">
            <div className="row-header bc-container">
                <h2>{title}</h2>
                <div className="controls">
                    <button onClick={() => scroll('left')} className="control-btn"><ChevronLeft size={24} /></button>
                    <button onClick={() => scroll('right')} className="control-btn"><ChevronRight size={24} /></button>
                </div>
            </div>

            <div className="row-container" ref={rowRef}>
                <div className="row-padding-start"></div>
                {items.map((item) => (
                    <div key={item.id} style={{ minWidth: '220px', width: '220px', marginRight: '1.5rem', flexShrink: 0 }}>
                        <AnimeCard anime={item} onClick={onCardClick} />
                    </div>
                ))}
                <div className="row-padding-end"></div>
            </div>
        </div>
    );
};

export default ContentRow;
