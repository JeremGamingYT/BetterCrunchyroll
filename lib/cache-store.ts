/**
 * Universal cache store supporting both localStorage and IndexedDB
 * Falls back gracefully if IndexedDB is unavailable
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class CacheStore {
  private dbName = 'BetterCrunchyrollDB'
  private storeName = 'cache'
  private isInitialized = false
  private db: IDBDatabase | null = null

  /**
   * Initialize IndexedDB (called automatically on first use)
   */
  async initDB(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return

    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, 1)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          this.db = request.result
          this.isInitialized = true
          resolve()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
            store.createIndex('expiresAt', 'expiresAt', { unique: false })
          }
        }
      })
    } catch (error) {
      console.warn('[CacheStore] IndexedDB initialization failed, will use localStorage only', error)
      this.isInitialized = true // Mark as initialized to avoid retrying
    }
  }

  /**
   * Set a cache entry
   */
  async set<T>(key: string, data: T, ttlMinutes: number = 60): Promise<void> {
    await this.initDB()

    const expiresAt = Date.now() + ttlMinutes * 60 * 1000
    const entry: CacheEntry<T> & { key: string } = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt,
    }

    // Try IndexedDB first
    if (this.db) {
      try {
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(this.storeName, 'readwrite')
          const store = transaction.objectStore(this.storeName)
          const request = store.put(entry)

          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve()
        })
      } catch (error) {
        console.warn('[CacheStore] IndexedDB set failed, falling back to localStorage', error)
      }
    }

    // Fall back to localStorage
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry))
    } catch (error) {
      console.warn('[CacheStore] localStorage set failed', error)
    }
  }

  /**
   * Get a cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    await this.initDB()

    const now = Date.now()

    // Try IndexedDB first
    if (this.db) {
      try {
        const data = await new Promise<T | null>((resolve, reject) => {
          const transaction = this.db!.transaction(this.storeName, 'readonly')
          const store = transaction.objectStore(this.storeName)
          const request = store.get(key)

          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const entry = request.result as CacheEntry<T> | undefined
            if (entry && entry.expiresAt > now) {
              resolve(entry.data)
            } else {
              resolve(null)
            }
          }
        })

        if (data !== null) return data
      } catch (error) {
        console.warn('[CacheStore] IndexedDB get failed, trying localStorage', error)
      }
    }

    // Fall back to localStorage
    try {
      const item = localStorage.getItem(`cache_${key}`)
      if (item) {
        const entry = JSON.parse(item) as CacheEntry<T>
        if (entry.expiresAt > now) {
          return entry.data
        } else {
          localStorage.removeItem(`cache_${key}`)
        }
      }
    } catch (error) {
      console.warn('[CacheStore] localStorage get failed', error)
    }

    return null
  }

  /**
   * Clear a specific cache entry
   */
  async clear(key: string): Promise<void> {
    await this.initDB()

    // Clear from IndexedDB
    if (this.db) {
      try {
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(this.storeName, 'readwrite')
          const store = transaction.objectStore(this.storeName)
          const request = store.delete(key)

          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve()
        })
      } catch (error) {
        console.warn('[CacheStore] IndexedDB clear failed', error)
      }
    }

    // Clear from localStorage
    try {
      localStorage.removeItem(`cache_${key}`)
    } catch (error) {
      console.warn('[CacheStore] localStorage clear failed', error)
    }
  }

  /**
   * Clear all expired entries
   */
  async clearExpired(): Promise<void> {
    await this.initDB()

    const now = Date.now()

    // Clear expired from IndexedDB
    if (this.db) {
      try {
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction(this.storeName, 'readwrite')
          const store = transaction.objectStore(this.storeName)
          const index = store.index('expiresAt')
          const range = IDBKeyRange.upperBound(now)
          const request = index.openCursor(range)

          request.onerror = () => reject(request.error)
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result
            if (cursor) {
              cursor.delete()
              cursor.continue()
            } else {
              resolve()
            }
          }
        })
      } catch (error) {
        console.warn('[CacheStore] IndexedDB clearExpired failed', error)
      }
    }

    // Clear expired from localStorage
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith('cache_')) {
          try {
            const item = localStorage.getItem(key)
            if (item) {
              const entry = JSON.parse(item) as { expiresAt: number }
              if (entry.expiresAt <= now) {
                localStorage.removeItem(key)
              }
            }
          } catch (error) {
            // Ignore parse errors
          }
        }
      })
    } catch (error) {
      console.warn('[CacheStore] localStorage clearExpired failed', error)
    }
  }
}

// Singleton instance
export const cacheStore = new CacheStore()
