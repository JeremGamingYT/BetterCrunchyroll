import crunchyrollAPI from '../services/crunchyrollApi';

/**
 * Retourne l'instance de l'API Crunchyroll la plus fiable disponible.
 * - Utilise en priorité window.crunchyAPI.api (l'instance réelle)
 * - Sinon, si window.crunchyAPI expose directement des méthodes (getSeries, browse...), on l'utilise
 * - Sinon, fallback sur l'instance importée
 */
export const getCrunchyApi = () => {
    if (typeof window !== 'undefined' && (window as any).crunchyAPI) {
        const globalApi = (window as any).crunchyAPI;
        if (globalApi.api) {
            return globalApi.api;
        }
        if (globalApi.getSeries || globalApi.getSeriesWithSeasons || globalApi.browse) {
            return globalApi;
        }
    }
    return crunchyrollAPI;
};

/**
 * S'assure que l'API est initialisée avant de lancer les appels.
 */
export const ensureCrunchyApi = async (force = false) => {
    const api = getCrunchyApi();

    if (typeof api.initialize === 'function') {
        const ready = await api.initialize(force);
        if (!ready) {
            throw new Error('Crunchyroll API non initialisée');
        }
    }

    return api;
};
