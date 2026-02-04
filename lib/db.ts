import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface BetterCrunchyrollDB extends DBSchema {
    animeCache: {
        key: string;
        value: {
            data: any;
            timestamp: number;
            version: number;
        };
    };
    keyval: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'better-crunchyroll-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BetterCrunchyrollDB>> | null = null;

function getDB() {
    if (!dbPromise && typeof window !== 'undefined') {
        dbPromise = openDB<BetterCrunchyrollDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('animeCache')) {
                    db.createObjectStore('animeCache', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('keyval')) {
                    db.createObjectStore('keyval', { keyPath: 'key' });
                }
            },
        });
    }
    return dbPromise;
}

export async function getCacheItem<T>(key: string): Promise<T | null> {
    const db = await getDB();
    if (!db) return null;
    const entry = await db.get('animeCache', key);
    return entry ? (entry as any) : null;
}

export async function setCacheItem<T>(key: string, value: any): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.put('animeCache', { key, ...value });
}

export async function clearCacheItem(key: string): Promise<void> {
    const db = await getDB();
    if (!db) return;
    await db.delete('animeCache', key);
}

export async function getAllCacheKeys(): Promise<string[]> {
    const db = await getDB();
    if (!db) return [];
    return db.getAllKeys('animeCache');
}
