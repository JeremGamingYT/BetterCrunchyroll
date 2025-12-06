/* eslint-disable @typescript-eslint/no-explicit-any */
import crunchyrollAPI from './crunchyrollApi.js';

/**
 * Service to collect all Crunchyroll data and save it locally
 * Mimics a crawler/scraper
 */
class DataCollector {
    constructor() {
        this.isRunning = false;
        this.collectedSeries = new Set();
        this.collectedSeasons = new Set();
        this.totalFilesSaved = 0;
    }

    /**
     * Start the collection process
     */
    async startCollection() {
        if (this.isRunning) {
            console.warn('⚠️ Data collection already running');
            return;
        }
        this.isRunning = true;
        this.totalFilesSaved = 0;
        this.collectedSeries.clear();
        console.log('🚀 Starting Data Collection...');
        console.log('files will be saved to your Downloads folder in "BetterCrunchyroll/"');

        try {
            const initialized = await crunchyrollAPI.initialize();
            if (!initialized) throw new Error("Failed to initialize API");

            // 1. Account & Watchlist
            console.log('1️⃣ Collecting Account & Watchlist...');
            await this.collectAccount();
            const watchlistIds = await this.collectWatchlist();

            // 2. History
            console.log('2️⃣ Collecting History...');
            const historyIds = await this.collectHistory();

            // 3. Browse (Popular/Simulcast)
            console.log('3️⃣ Collecting Discover/Browse Data...');
            const browseIds = await this.collectBrowse();

            // Merge all IDs
            const allSeriesIds = new Set([...watchlistIds, ...historyIds, ...browseIds]);
            console.log(`📋 Found ${allSeriesIds.size} unique series to process`);

            // 4. Process each series
            let processed = 0;
            for (const seriesId of allSeriesIds) {
                processed++;
                console.log(`⏳ Processing Series ${processed}/${allSeriesIds.size} (${seriesId})...`);
                await this.collectSeries(seriesId);
                // Delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 800));
            }

            // 5. Generate Index
            console.log('5️⃣ Generating Index...');
            await this.generateIndex(allSeriesIds);

            console.log(`✅ Data Collection Complete! Saved ${this.totalFilesSaved} files.`);
            console.log('📂 Please move the "BetterCrunchyroll" folder from Downloads to your project "data" directory.');

        } catch (error) {
            console.error('❌ Data Collection Failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async saveFile(path, data) {
        // Send to content script -> background -> chrome.downloads
        window.postMessage({
            type: 'SAVE_FILE_REQUEST',
            path: path,
            data: data,
            source: 'crunchyroll-interceptor'
        }, '*');
        this.totalFilesSaved++;
    }

    async collectAccount() {
        try {
            // Try explicit fetch first, fallback to session
            const profile = JSON.parse(sessionStorage.getItem('crunchyroll_profile') || '{}');
            await this.saveFile(`account/profile.json`, profile);

            // If we have an ID, maybe fetch custom lists?
            if (crunchyrollAPI.profileId) {
                // Not standard API method yet, but conceptually consistent
            }
        } catch (e) { console.error('Error collecting account', e); }
    }

    async collectWatchlist() {
        const ids = new Set();
        try {
            const data = await crunchyrollAPI.getWatchlist(100);
            if (data) {
                await this.saveFile('watchlist/watchlist.json', data);
                data.data?.forEach((item) => {
                    const id = item.panel?.episode_metadata?.series_id || item.id;
                    if (id && item.type !== 'episode') ids.add(id);
                    if (item.panel?.episode_metadata?.series_id) ids.add(item.panel.episode_metadata.series_id);
                });
            }
        } catch (e) {
            console.error('Error collecting watchlist', e);
        }
        return ids;
    }

    async collectHistory() {
        const ids = new Set();
        try {
            const data = await crunchyrollAPI.getContinueWatching(100);
            if (data) {
                await this.saveFile('history/history.json', data);
                data.data?.forEach((item) => {
                    const id = item.panel?.episode_metadata?.series_id || item.id;
                    if (id) ids.add(id);
                });
            }
        } catch (e) {
            console.error('Error collecting history', e);
        }
        return ids;
    }

    async collectBrowse() {
        const ids = new Set();
        try {
            // New
            const newData = await crunchyrollAPI.browse({ limit: 50 });
            if (newData) await this.saveFile('browse/all.json', newData);
            newData?.data?.forEach((i) => ids.add(i.id));

            // Popular (Sort by popularity if supported, or just default browse usually is popular)
            // Using different sort params if the API supports it
            const popularData = await crunchyrollAPI.browse({ limit: 50, sort: 'popularity' });
            if (popularData) await this.saveFile('browse/popular.json', popularData);
            popularData?.data?.forEach((i) => ids.add(i.id));

        } catch (e) {
            console.error('Error collecting browse data', e);
        }
        return ids;
    }

    async collectSeries(seriesId) {
        if (this.collectedSeries.has(seriesId)) return;

        try {
            // Get Series Info
            const seriesData = await crunchyrollAPI.getSeries(seriesId);
            if (seriesData) {
                // Sometimes it returns a list, sometimes single object depending on endpoint nuances
                // API method returns list usually with one item if searching by ID
                const seriesObj = Array.isArray(seriesData.data) ? seriesData.data[0] : seriesData.data;
                const finalId = seriesObj?.id || seriesId;

                await this.saveFile(`series/${finalId}/series.json`, seriesData);

                // Get Seasons
                const seasonsData = await crunchyrollAPI.getSeasons(finalId);
                if (seasonsData) {
                    await this.saveFile(`series/${finalId}/seasons.json`, seasonsData);

                    // Get Episodes for each season
                    if (seasonsData.data) {
                        for (const season of seasonsData.data) {
                            await this.collectSeason(finalId, season.id);
                            await new Promise(r => setTimeout(r, 200));
                        }
                    }
                }
            }
            this.collectedSeries.add(seriesId);
        } catch (e) {
            console.error(`Failed to collect series ${seriesId}`, e);
        }
    }

    async collectSeason(seriesId, seasonId) {
        try {
            const episodesData = await crunchyrollAPI.getEpisodes(seasonId);
            if (episodesData) {
                await this.saveFile(`series/${seriesId}/seasons/season_${seasonId}.json`, episodesData);
            }
        } catch (e) {
            console.error(`Failed to collect season ${seasonId}`, e);
        }
    }

    async generateIndex(seriesIds) {
        const index = {
            generatedAt: new Date().toISOString(),
            totalSeries: seriesIds.size,
            seriesIds: Array.from(seriesIds)
        };
        await this.saveFile('index.json', index);
    }
}

export const dataCollector = new DataCollector();
export default dataCollector;
