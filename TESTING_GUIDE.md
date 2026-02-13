# 🧪 Guide de Test & Validation

## ✅ Checklist de Validation

### 1️⃣ Page d'Accueil (`/`)

#### AniList Banner
- [ ] **Visibilité**: Banner visible AU-DESSUS de "Nouveautés"
- [ ] **Design**: 
  - [ ] Gradient bleu AniList visible
  - [ ] Texte blanc lisible
  - [ ] Bouton blanc avec texte bleu
  - [ ] Arrondir correct (rounded-2xl)
- [ ] **Animations**:
  - [ ] Fond animé (pulse subtil)
  - [ ] Hover: bouton scale
  - [ ] Transitions fluides
- [ ] **Responsive**:
  - [ ] Mobile: Layout vertical, texte adapté
  - [ ] Desktop: Layout horizontal, bouton à droite
  - [ ] Tablette: Intermédiaire correct
- [ ] **Fonctionnalité**: Clic sur bouton → ouvre lien (ou prépare OAuth)

#### Random Recommendation Banner
- [ ] **Visibilité**: Banner visible SOUS "Nouveautés"
- [ ] **Contenu**:
  - [ ] Image d'anime en background
  - [ ] Titre de l'anime affiché
  - [ ] Badge "Recommandé pour toi" visible
  - [ ] Score (star) affichée
  - [ ] Genres visibles
  - [ ] Description courte visible au hover
- [ ] **Design**:
  - [ ] Overlay sombre correct
  - [ ] Contraste texte OK
  - [ ] Badge jaune visible
  - [ ] Bouton "Découvrir" positionné
- [ ] **Animations**:
  - [ ] Fade in au chargement
  - [ ] Hover: image zoome légèrement
  - [ ] Description apparaît au hover
- [ ] **Responsive**:
  - [ ] Mobile: Full width, buttons adapté
  - [ ] Desktop: Proportions correctes
- [ ] **Fonctionnalité**: Clic → navigue vers page anime

### 2️⃣ Page Nouveautés (`/nouveau`)

#### Hook en Action
- [ ] **Chargement initial**: Spinner affiché
- [ ] **Données affichées**: Animés chargés rapidement (de Crunchyroll)
- [ ] **Enrichissement**:
  - [ ] Progress bar apparaît
  - [ ] % augmente jusqu'à 100%
  - [ ] S'arrête quand enrichissement terminé
- [ ] **Grille d'animés**: Affichée et scrollable
- [ ] **Pagination**:
  - [ ] Bouton "Charger plus" visible
  - [ ] Compte des animés affichés correct
  - [ ] Clic → charge plus d'animés
  - [ ] Au bout → message "Tous les X animés chargés"

#### Filtrage
- [ ] **Année**: Uniquement 2025+ affichés
  - [ ] Vérifier les dates des animés
  - [ ] Pas d'anciens animés
- [ ] **Source**: Tous de Crunchyroll
  - [ ] Vérifier `crunchyrollId` present
  - [ ] Liens vers Crunchyroll corrects

#### Responsive
- [ ] Mobile (xs): 2 colonnes
- [ ] Petit mobile (sm): 3 colonnes  
- [ ] Tablette (md): 4 colonnes
- [ ] Desktop (lg): 5 colonnes
- [ ] Large desktop (xl): 6 colonnes
- [ ] Spacing adapté

### 3️⃣ Gestion des Erreurs

#### Rate Limiting AniList
- [ ] **Scénario A**: AniList répond normalement
  - [ ] Enrichissement fonctionne
  - [ ] Progress bar de 0 → 100
  - [ ] Données enrichies affichées (genres, images, etc.)

- [ ] **Scénario B**: Simuler rate limit
  - [ ] Ajouter un délai artificiel ou commenter fetch AniList
  - [ ] Vérifier que les données CR brutes sont affichées
  - [ ] Aucune erreur dans console
  - [ ] Progress bar continue

- [ ] **Scénario C**: Cache dispo (deuxième refresh)
  - [ ] Page recharge
  - [ ] Les données enrichies reviennent du cache
  - [ ] Plus rapide que première fois

#### Gestion d'Erreurs
- [ ] Erreur réseau: Message erreur affiché
- [ ] Clic "Rafraîchir": Page recharge proprement
- [ ] Console: Pas d'erreurs React (warnings OK)

### 4️⃣ Performance

#### Temps de Chargement
- [ ] **Crunchyroll data**: < 1s
- [ ] **UI interactive**: < 2s (peut attendre enrichissement)
- [ ] **Enrichissement complet**: < 10s
- [ ] **Pagination**: < 2s par load

#### Memory & Cache
- [ ] Console Network: Pas de requêtes dupliquées
- [ ] DevTools: Cache-store working (IndexedDB)
- [ ] localStorage: Pas de bloat excessif
- [ ] Memory usage: Stable

### 5️⃣ Intégration Globale

#### Autres Pages
- [ ] **`/populaire`**: Fonctionne toujours (comparaison, validation de pattern)
- [ ] **`/simulcast`**: Fonctionne toujours
- [ ] **`/search`**: Ne doit pas être affectée
- [ ] **`/anime/[id]`**: Ne doit pas être affectée

#### Navigation
- [ ] **Links**: "Voir tout" sur section → page `/nouveau`
- [ ] **Back button**: Fonctionne correctement
- [ ] **Bookmarking**: Fonctionne (watchlist integration)

## 🚀 Procédure de Test Complète

### Setup
```bash
# 1. Assurer que npm run dev fonctionne
npm run dev

# 2. Naviguer vers http://localhost:3000
# 3. Ouvrir DevTools (F12)
```

### Test 1: Banner AniList
```
1. Accueil (/)
2. Chercher toi le dégradé bleu AniList
3. Hover sur banner → animations
4. Clic bouton → lien externe
```

### Test 2: Random Recommendation
```
1. Accueil (/)
2. Scroll vers basse de "Nouveautés"
3. Voir featured anime card
4. Hover → description apparaît
5. Clic → navigue vers anime
```

### Test 3: Page Nouveautés
```
1. Go /nouveau
2. Attendre chargement
3. Voir progress bar enrichissement
4. Vérifier animés sont 2025+
5. Scroll down, clic "Charger plus"
6. Vérifier compte m'à j
```

### Test 4: Rate Limit Simulation
```
1. DevTools → Network → throttle (pour simuler lenteur)
2. Ou hardcoder une failure dans anilist.ts temporairement
3. Vérifier fallback fonctionne
4. Check console pour logs
```

## 📋 Checkpoints Clés

**Avant de pousser en production:**

- [ ] Toutes les sections visuées visibles
- [ ] Pas de console errors (warnings OK)
- [ ] Mobile responsive fonctionne
- [ ] Enrichissement se termine sans erreur
- [ ] Cache fallback testé
- [ ] Pagination working
- [ ] Links correct
- [ ] Animations smooth

## 🐛 Debugging Tips

Si quelque chose ne fonctionne pas:

### Banner AniList n'apparaît pas
```typescript
// Check dans DevTools
- Page source → chercher "anilist-banner"
- Console → filtrer "AniList"
- Vérifier import dans app/page.tsx
```

### Random Recommendation vide
```typescript
// Causes possibles:
- useTrendingAnime retourne pas de données
- Image ne charge pas (CORS?)
- Check console pour erreurs image
```

### Page Nouveautés ne charge rien
```typescript
// Check:
1. useNewAnimeCrunchyroll hook s'exécute?
2. Crunchyroll API répond?
3. Filter année fonctionne?
4. Check logs dans DevTools
```

### Enrichissement n'avance pas
```typescript
// Check:
1. AniList API accessible?
2. Rate limited? (check 429)
3. Cache-store fonctionne?
4. Console pour logs [AniList]
```

## 📊 Success Criteria

✅ **Succès** si:
- [X] Bannières visibles et belles
- [X] Données Crunchyroll affichées rapide
- [X] Enrichissement fonctionne ou fallback
- [X] Pas de UI breaks
- [X] Responsive OK
- [X] Performance acceptable

❌ **Problème** si:
- [ ] Bannières manquantes ou mal positionnées
- [ ] Layout cassé sur mobile
- [ ] Enrichissement échoue sans fallback
- [ ] Erreurs console
- [ ] Performance dégradée
- [ ] Links cassées

## 📞 Support

Si vous trouvez des issues:

1. **Check console** pour erreurs/warnings
2. **Vérifier NetworkTab** pour requêtes API
3. **Tester rate limit** manuellement
4. **Vérifier cache** dans DevTools → Application → IndexedDB
5. **Reload hard** (Ctrl+Shift+R)

---

Happy Testing! 🎬✨
