import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimeCard, { type Anime } from '../components/AnimeCard';
import PageLoader from '../components/PageLoader';
import { cacheService } from '../services/cacheService';
import './Simulcast.scss';

// Génère les 7 prochains jours
const generateDays = () => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push({
            name: dayNames[date.getDay()],
            date: date.getDate().toString().padStart(2, '0'),
            fullDate: date.toISOString().split('T')[0]
        });
    }
    return days;
};

const getCurrentSeasonalTag = (): string => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    let season: string;
    if (month >= 1 && month <= 3) season = 'winter';
    else if (month >= 4 && month <= 6) season = 'spring';
    else if (month >= 7 && month <= 9) season = 'summer';
    else season = 'fall';
    return `${season}-${year}`;
};

const Simulcast = () => {
    const navigate = useNavigate();
    const [days] = useState(generateDays());
    const [activeDay, setActiveDay] = useState(days[0].name);
    const [simulcastData, setSimulcastData] = useState<Record<string, Anime[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSimulcast();
    }, []);

    const loadSimulcast = async () => {
        try {
            // Vérifier le cache d'abord
            const cached = cacheService.get<Record<string, Anime[]>>('simulcast');
            if (cached && Object.keys(cached).length > 0) {
                console.log('[Simulcast] ✅ Using cached data');
                setSimulcastData(cached);
                setLoading(false);
                return;
            }

            const api = (window as any).crunchyAPI;
            if (!api) {
                console.error('[Simulcast] window.crunchyAPI not available');
                setLoading(false);
                return;
            }

            console.log('[Simulcast] Loading simulcast calendar...');
            const currentSeason = getCurrentSeasonalTag();
            console.log('[Simulcast] Current season tag:', currentSeason);

            // Récupérer les séries en cours de la saison actuelle
            // Utiliser is_simulcast=true dans les paramètres si possible
            const seasonalData = await api.browse({
                type: 'series',
                seasonal_tag: currentSeason,
                limit: 150 // Charger plus pour avoir assez après filtrage
            });

            if (!seasonalData?.data || seasonalData.data.length === 0) {
                console.warn('[Simulcast] No simulcast data');
                setLoading(false);
                return;
            }

            console.log(`[Simulcast] Fetched ${seasonalData.data.length} series total`);

            // Filtrer uniquement les simulcasts vrais (is_simulcast: true)
            const simulcastSeries = seasonalData.data.filter((series: any) => {
                const isSimulcast = series.series_metadata?.is_simulcast === true;

                // Vérifier aussi si le seasonal_tags contient la saison actuelle
                const seasonalTags = series.series_metadata?.seasonal_tags || [];
                const matchesSeason = seasonalTags.length === 0 || seasonalTags.includes(currentSeason);

                // Retourner true seulement si c'est un simulcast
                if (isSimulcast) {
                    console.log('[Simulcast] ✓', series.title, '- is_simulcast:', isSimulcast);
                }

                return isSimulcast && matchesSeason;
            });

            console.log(`[Simulcast] Filtered to ${simulcastSeries.length} simulcasts`);

            // Organiser par jour de la semaine
            // Note: Idéalement on utiliserait les dates de sortie réelles des épisodes
            const data: Record<string, Anime[]> = {
                'Sun': [],
                'Mon': [],
                'Tue': [],
                'Wed': [],
                'Thu': [],
                'Fri': [],
                'Sat': []
            };

            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            simulcastSeries.forEach((series: any, index: number) => {
                // Répartir les séries sur les jours (simulation - une vraie implémentation
                // utiliserait les schedules réels de Crunchyroll)
                const dayIndex = index % 7;
                const dayName = dayNames[dayIndex];

                data[dayName].push({
                    id: series.id,
                    title: series.title,
                    image: series.images?.poster_wide?.[0]?.[0]?.source || series.images?.poster_tall?.[0]?.[0]?.source || '',
                    episodes: `Simulcast`,
                    type: series.series_metadata?.is_dubbed && series.series_metadata?.is_subbed
                        ? 'Sub | Dub'
                        : series.series_metadata?.is_dubbed
                            ? 'Dub'
                            : 'Sub',
                    rating: series.rating?.average
                });
            });

            setSimulcastData(data);
            cacheService.set('simulcast', data, 30); // Cache de 30 minutes
            console.log(`[Simulcast] ✅ Organized ${simulcastSeries.length} simulcast series`);
        } catch (error) {
            console.error('[Simulcast] Error loading simulcast:', error);
        } finally {
            setLoading(false);
        }
    };

    const activeAnimes = simulcastData[activeDay] || [];

    if (loading) {
        return (
            <div className="simulcast-page">
                <Navbar />
                <PageLoader message="Chargement du calendrier Simulcast..." />
            </div>
        );
    }

    return (
        <div className="simulcast-page">
            <Navbar />
            <div className="bc-container">
                <div className="page-header">
                    <h1>Simulcast Calendar</h1>
                    <p>New episodes airing this week.</p>
                </div>

                <div className="calendar-nav">
                    {days.map(day => (
                        <button
                            key={day.name}
                            className={`day-tab ${activeDay === day.name ? 'active' : ''}`}
                            onClick={() => setActiveDay(day.name)}
                        >
                            <span className="day-name">{day.name}</span>
                            <span className="day-date">{day.date}</span>
                        </button>
                    ))}
                </div>

                <div className="calendar-grid">
                    {activeAnimes.length > 0 ? (
                        activeAnimes.map(anime => (
                            <AnimeCard
                                key={anime.id}
                                anime={anime}
                                onClick={(a) => navigate(`/series/${a.id}`)}
                            />
                        ))
                    ) : (
                        <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-secondary)' }}>
                            <h3>No episodes airing on this day</h3>
                            <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>Check another day for upcoming releases</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Simulcast;
