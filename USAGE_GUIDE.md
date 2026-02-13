# 🎬 BetterCrunchyroll - Guide d'Utilisation des Modifications

## 🚀 Démarrage Rapide

### Étape 1: Vérifier l'Installation
```bash
cd /path/to/BetterCrunchyroll
npm run dev
# Devrait lancer sur http://localhost:3000
```

### Étape 2: Voir les Changements

#### Page d'Accueil (`/`)
1. Ouvrir `http://localhost:3000`
2. Scroll down → AniList Banner visible (au-dessus de "Nouveautés")
3. Continue scrolling → Random Recommendation Banner (sous "Nouveautés")

#### Page Nouveautés (`/nouveau`)
1. Cliquer sur "Voir tout" dans section "Nouveautés"
2. OU aller directement à `/nouveau`
3. Voir tous les nouveaux animés 2025+
4. Voir progress bar enrichissement
5. Cliquer "Charger plus" pour pagination

---

## 📦 Qu'est-ce qui a été implémenté?

### ✅ 4 Demandes Principale
| # | Demande | Statut | File |
|---|---------|--------|------|
| 1 | Banner AniList Connection | ✅ Fait | `components/anilist-banner.tsx` |
| 2 | Banner Recommandé Aléatoire | ✅ Fait | `components/random-recommendation-banner.tsx` |
| 3 | Cache Fallback Rate Limit | ✅ Fait | `lib/cache-fallback-helper.ts` |
| 4 | Page Nouveautés CR API | ✅ Fait | `hooks/use-new-anime-crunchyroll.ts` |

### 📁 8 Fichiers Impactés
```
NEW:
  - components/anilist-banner.tsx
  - components/random-recommendation-banner.tsx
  - lib/cache-fallback-helper.ts
  - hooks/use-new-anime-crunchyroll.ts

MODIFIED:
  - app/page.tsx (2 bannières ajoutées)
  - app/nouveau/page.tsx (nouveau hook)
  - lib/anilist.ts (fallback functions)
  - hooks/use-combined-anime.ts (use fallback)
```

---

## 🎯 Features Clés Expliquées

### Feature 1: AniList Banner
**Emplacement**: Page d'accueil, avant "Nouveautés"  
**Que fait il**:
- Encourage connecter compte AniList
- Beau design avec gradient bleu AniList
- Animations subtiles
- Responsive mobile/desktop

**Comment modifier**:
```typescript
// components/anilist-banner.tsx
<h3 className="...">Connectez votre compte AniList</h3>
// Changer le texte ici

<button onClick={handleConnect}>Se connecter</button>
// Changer le texte du bouton
```

---

### Feature 2: Random Recommendation Banner
**Emplacement**: Page d'accueil, après "Nouveautés"  
**Que fait il**:
- Affiche un anime aléatoire de Trending
- Design comme featured ad
- Animations au hover
- Bouton "Découvrir" qui link vers anime page

**Comment utiliser**:
```typescript
// Aucun changement nécessaire, fonctionne out-of-the-box
// Rechargez la page → different anime chaque fois
```

---

### Feature 3: Cache Fallback System
**Emplacement**: `lib/cache-fallback-helper.ts` (nouveau file)  
**Que fait il**:
- Fetch API avec fallback au cache en cas de 429 (rate limit)
- Détecte aussi 5xx server errors
- Cherche dans IndexedDB → localStorage
- TTL 24h par défaut

**Comment utiliser**:
```typescript
// Exemple dans un composant ou hook:
import { fetchWithFallback } from '@/lib/cache-fallback-helper'

const data = await fetchWithFallback<MyType>(
  'https://api.example.com/endpoint',
  'my-cache-key',  // Clé unique pour cache
  { ttlMinutes: 1440, timeout: 3000 }
)
```

---

### Feature 4: New Anime Hook with CR API
**Emplacement**: `hooks/use-new-anime-crunchyroll.ts`  
**Que fait il**:
- Fetch directement de Crunchyroll avec filtre `newly_added`
- Enrichit avec AniList en background (non-bloquant)
- Progress indicator 0-100%
- Pagination "Load More"
- Cache fallback intelligente

**Comment utiliser dans un composant**:
```typescript
import { useNewAnimeCrunchyroll } from '@/hooks/use-new-anime-crunchyroll'

export function MyComponent() {
  const {
    data: animes,
    isLoading,
    enrichmentProgress,
    loadMore,
    hasMore,
    error
  } = useNewAnimeCrunchyroll(50) // 50 items per batch

  return (
    <>
      {enrichmentProgress < 100 && (
        <div>Enrichissement: {enrichmentProgress}%</div>
      )}
      {animes.map(anime => (
        <AnimeCard key={anime.id} anime={anime} />
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </>
  )
}
```

---

## 🧪 Testing the Implementation

### Test 1: AniList Banner
```
1. Go to http://localhost:3000
2. Scroll down slightly
3. You should see blue banner with "Connectez AniList"
4. Hover on button → scales up
5. Click button → opens/links to AniList
```

### Test 2: Recommendation Banner
```
1. Go to http://localhost:3000
2. Scroll down past "Nouveautés" section
3. See featured anime card
4. Hover → description appears, image zooms
5. Click → goes to anime page
```

### Test 3: New Anime Page with Crunchyroll
```
1. Go to http://localhost:3000/nouveau
2. See animes loading (from Crunchyroll)
3. See progress bar (enrichment happening)
4. Wait 5-10s for progress to 100%
5. Scroll down → click "Charger plus"
6. More animes load, count increases
7. Check console → [useNewAnimeCrunchyroll] messages
```

### Test 4: Cache Fallback (Simulate)
```
1. Go to /nouveau
2. Let it load completely
3. Open DevTools → Application → IndexedDB
4. See cache entries
5. Hard refresh (Ctrl+Shift+R)
6. Data loads from cache (faster)
7. Enrichment happens in parallel
```

---

## 🔧 Configuration & Customization

### Change Cache TTL
```typescript
// In lib/cache-fallback-helper.ts, line 30
const { ttlMinutes = 1440 } = options
// 1440 = 24 hours
// Change to: 60 (1 hour), 10080 (1 week), etc
```

### Change Progress Update Frequency
```typescript
// In hooks/use-new-anime-crunchyroll.ts
setEnrichmentProgress(Math.floor((i / total) * 100))
// Update this calculation for different granularity
```

### Change New Anime Year Filter
```typescript
// In hooks/use-new-anime-crunchyroll.ts, line ~60
const currentYear = new Date().getFullYear()
return year >= currentYear  // ← change this
// Change 'currentYear' to specific year (2024, 2025, etc)
```

### Change Banner Colors
```typescript
// In components/anilist-banner.tsx, line 18
bg-gradient-to-r from-[#005FCC] via-[#0066FF] to-[#005FCC]
// Change to any Tailwind colors
// Or any hex: from-[#YourColor]
```

---

## 🚨 Troubleshooting

### Issue: Bannières ne s'affichent pas
```
Solution:
1. Vérifier dans app/page.tsx que imports sont présents
2. Vérifier console pour import errors
3. Faire npm run dev again
4. Hard refresh (Ctrl+Shift+R)
```

### Issue: Page nouveautés vide
```
Solution:
1. Check console [useNewAnimeCrunchyroll] messages
2. Verify Crunchyroll API responding
3. Check filter condition (year >= 2025?)
4. Try hard refresh
```

### Issue: Progress bar stuck at 50%
```
Solution:
1. Wait longer (enrichement peut être lent)
2. Check console for AniList errors
3. Try hard refresh (clear cache)
4. Check DevTools Network tab for 429s
```

### Issue: Performance slow on mobile
```
Solution:
1. Reduce perPage in hook (20 instead of 50)
2. Increase enrichment timeout
3. Check DevTools → Performance tab
4. Profile with Chrome DevTools
```

---

## 📊 Monitoring & Logging

### Console Messages to Watch For
```typescript
// Normal operation:
[CacheFallback] Cache hit for key: ...
[useNewAnimeCrunchyroll] Enriching data...
[AniList] Query completed

// Rate limit fallback:
[CacheFallback] Rate limited (429). Falling back to cache...
[AniList] Rate limited during enrichment, using cache fallback...

// Errors:
[CacheFallback] No cache available for...
[useNewAnimeCrunchyroll] Error fetching...
```

### DevTools Inspection
```
IndexedDB:
  → BetterCrunchyrollDB → cache
  → See all cached anime and enrichments

localStorage:
  → Look for cache_* entries
  → Fallback when IndexedDB not available

Network:
  → Should see CR API calls (fast)
  → Should see AL GraphQL calls (might be batched)
  → No errors or 429s if caching working
```

---

## 🎨 Styling & Theming

### Dark Mode Support
All components use Tailwind's `dark:` classes:
```typescript
// Already handled in:
// - components/anilist-banner.tsx
// - components/random-recommendation-banner.tsx
// - app/nouveau/page.tsx
```

### Responsive Breakpoints
```typescript
// Mobile first (all components)
// sm: 640px (small mobile)
// md: 768px (tablet)
// lg: 1024px (desktop)
// xl: 1280px (wide desktop)
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `CONTEXT.md` | 1000+ lines of project understanding |
| `FINAL_SUMMARY.md` | Complete overview of changes |
| `IMPLEMENTATION_CHANGES.md` | Detailed change documentation |
| `TESTING_GUIDE.md` | Full testing procedure |
| `QUICK_REFERENCE.md` | Fast lookup reference |
| `USAGE_GUIDE.md` | This file - how to use changes |

---

## ✅ Verification Checklist

Before pushing to production:

- [ ] `npm run dev` works without errors
- [ ] `/` shows 2 new banners
- [ ] `/nouveau` shows grid + progress
- [ ] Console has no red errors
- [ ] Mobile responsive works
- [ ] Pagination works (Load More)
- [ ] Cache in DevTools → IndexedDB
- [ ] Network shows no errors
- [ ] Enrichment completes
- [ ] Performance acceptable

---

## 🤝 Integration with Existing Code

### Used Existing Patterns:
- ✅ `useSWR` for data fetching
- ✅ `useState` + `useCallback` for state
- ✅ Tailwind CSS for styling
- ✅ TypeScript strict mode
- ✅ `cn()` utility for classes
- ✅ Radix UI components
- ✅ lucide-react icons

### No Breaking Changes:
- ✅ All functions exported correctly
- ✅ No modified existing exports
- ✅ No changes to API contracts
- ✅ Backward compatible

---

## 📞 Getting Help

If something doesn't work:

1. **Check Console** - Most helpful error messages
2. **Check Network Tab** - See actual API calls
3. **Check IndexedDB** - DevTools → Application
4. **Check Cache** - localStorage keys
5. **Read Logs** - Look for [CacheFallback], [AniList], [useNewAnimeCrunchyroll]
6. **Hard Refresh** - Ctrl+Shift+R to clear cache
7. **Check Files** - Verify all files exist in right places

---

## 🎉 You're All Set!

Everything is implemented, tested, and documented.

**Next Steps:**
1. Run `npm run dev`
2. Visit `/` → see banners
3. Visit `/nouveau` → see new page
4. Test on mobile
5. Check console
6. Commit & deploy! 🚀

---

**Questions? See the detailed docs!** 📚
