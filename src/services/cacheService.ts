/**
 * Service de cache pour stocker les données API dans localStorage
 * Évite de bombarder l'API Crunchyroll avec trop de requêtes
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresIn: number; // en millisecondes
}

class CacheService {
    private prefix = 'crunchyroll_cache_';

    /**
     * Stocke des données dans le cache
     */
    set<T>(key: string, data: T, expiresInMinutes: number = 60): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresIn: expiresInMinutes * 60 * 1000
        };

        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(entry));
            console.log(`[Cache] ✅ Stored: ${key} (expires in ${expiresInMinutes}min)`);
        } catch (error) {
            console.error(`[Cache] ❌ Failed to store ${key}:`, error);
            // Si le localStorage est plein, on nettoie les anciennes entrées
            this.cleanup();
        }
    }

    /**
     * Récupère des données du cache si elles sont encore valides
     */
    get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) {
                console.log(`[Cache] ⚠️ Miss: ${key} (not found)`);
                return null;
            }

            const entry: CacheEntry<T> = JSON.parse(item);
            const now = Date.now();
            const age = now - entry.timestamp;

            if (age > entry.expiresIn) {
                console.log(`[Cache] ⏰ Expired: ${key} (age: ${Math.round(age / 1000 / 60)}min)`);
                this.delete(key);
                return null;
            }

            const remainingMinutes = Math.round((entry.expiresIn - age) / 1000 / 60);
            console.log(`[Cache] ✅ Hit: ${key} (expires in ${remainingMinutes}min)`);
            return entry.data;
        } catch (error) {
            console.error(`[Cache] ❌ Failed to get ${key}:`, error);
            return null;
        }
    }

    /**
     * Vérifie si une clé existe et est valide
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Supprime une entrée du cache
     */
    delete(key: string): void {
        localStorage.removeItem(this.prefix + key);
        console.log(`[Cache] 🗑️ Deleted: ${key}`);
    }

    /**
     * Nettoie les entrées expirées
     */
    cleanup(): void {
        console.log('[Cache] 🧹 Cleaning up expired entries...');
        const keys = Object.keys(localStorage);
        let cleaned = 0;

        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                const shortKey = key.replace(this.prefix, '');
                if (!this.has(shortKey)) {
                    cleaned++;
                }
            }
        });

        console.log(`[Cache] ✅ Cleaned ${cleaned} expired entries`);
    }

    /**
     * Vide tout le cache
     */
    clear(): void {
        console.log('[Cache] 🗑️ Clearing all cache...');
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
        console.log('[Cache] ✅ Cache cleared');
    }

    /**
     * Obtient la taille du cache en Ko
     */
    getSize(): number {
        let size = 0;
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                const item = localStorage.getItem(key);
                if (item) {
                    size += item.length;
                }
            }
        });
        return Math.round(size / 1024); // En Ko
    }

    /**
     * Affiche les statistiques du cache
     */
    stats(): void {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
        const size = this.getSize();
        console.log(`[Cache] 📊 Stats: ${keys.length} entries, ${size} Ko`);
    }
}

// Instance singleton
export const cacheService = new CacheService();

// Nettoie le cache au démarrage
cacheService.cleanup();
