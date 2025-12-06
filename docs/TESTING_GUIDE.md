# 🧪 Guide de test de l'API Crunchyroll

## ✅ L'API est maintenant automatiquement disponible !

Après avoir rechargé l'extension et visité Crunchyroll, l'API est automatiquement exposée dans la console.

## 🚀 Utilisation dans la console DevTools

### 1. Ouvrir la console
- Appuyez sur `F12` ou `Ctrl+Shift+I`
- Allez dans l'onglet "Console"

### 2. Afficher l'aide

```javascript
crunchyAPI.help()
```

### 3. Exemples rapides

```javascript
// Continue Watching (historique)
await crunchyAPI.continueWatching(10)

// Watchlist
await crunchyAPI.watchlist(10)

// Recommendations
await crunchyAPI.recommendations()

// Recherche
await crunchyAPI.search('naruto', 5)

// Up Next pour une série
await crunchyAPI.upNext('G0XHWM1JP')  // SPY x FAMILY

// Détails d'une série
await crunchyAPI.series('G0XHWM1JP')

// Lancer tous les tests
await crunchyAPI.testAll()

// Vider le cache
crunchyAPI.clearCache()

// Vérifier le token
await crunchyAPI.checkToken()
```

## 🎯 Commandes disponibles

| Commande | Description | Exemple |
|----------|-------------|---------|
| `crunchyAPI.continueWatching(limit)` | Historique de visionnage | `await crunchyAPI.continueWatching(5)` |
| `crunchyAPI.watchlist(limit)` | Liste de suivi | `await crunchyAPI.watchlist(10)` |
| `crunchyAPI.recommendations()` | Recommandations | `await crunchyAPI.recommendations()` |
| `crunchyAPI.upNext(seriesId)` | Prochain épisode | `await crunchyAPI.upNext('G0XHWM1JP')` |
| `crunchyAPI.search(query, limit)` | Recherche | `await crunchyAPI.search('one piece')` |
| `crunchyAPI.series(seriesId)` | Détails série | `await crunchyAPI.series('G0XHWM1JP')` |
| `crunchyAPI.testAll()` | Tous les tests | `await crunchyAPI.testAll()` |
| `crunchyAPI.clearCache()` | Vider cache | `crunchyAPI.clearCache()` |
| `crunchyAPI.checkToken()` | Voir token | `await crunchyAPI.checkToken()` |
| `crunchyAPI.help()` | Afficher l'aide | `crunchyAPI.help()` |

## 📊 Exemple de test complet

```javascript
// 1. Vérifier que l'API est disponible
console.log(crunchyAPI)

// 2. Tester Continue Watching
const history = await crunchyAPI.continueWatching(5)
console.log('Historique:', history)

// 3. Tester Watchlist
const watchlist = await crunchyAPI.watchlist(5)
console.log('Watchlist:', watchlist)

// 4. Tester Recommendations
const reco = await crunchyAPI.recommendations()
console.log('Recommendations:', reco)

// 5. Tester Search
const searchResults = await crunchyAPI.search('naruto', 3)
console.log('Résultats recherche:', searchResults)

// 6. Lancer tous les tests automatiquement
await crunchyAPI.testAll()
```

## 🔧 Accès direct à l'API

Si vous voulez accéder directement aux méthodes de l'API :

```javascript
// Accès bas niveau
const api = crunchyAPI.api

// Utilisation
await api.getContinueWatching(10)
await api.getWatchlist(10)
await api.getRecommendations()
```

## ⚠️ Erreurs courantes

### Erreur: "Cannot read property 'getContinueWatching' of undefined"

**Cause**: L'API n'est pas encore chargée  
**Solution**: Rechargez la page Crunchyroll

### Erreur: "ProfileId manquant"

**Cause**: Le token n'a pas de profileId  
**Solution**: Vérifiez le token avec `await crunchyAPI.checkToken()`

### Erreur: "HTTP 401 Unauthorized"

**Cause**: Le token a expiré  
**Solution**: Rafraîchissez la page Crunchyroll pour obtenir un nouveau token

## 📝 Notes

- Toutes les commandes sont asynchrones (utilisez `await`)
- Les résultats sont automatiquement loggés dans la console
- Le cache expire après 5 minutes
- Le token est automatiquement récupéré depuis le storage de l'extension

## 🎨 Build et test

1. Build l'extension :
   ```bash
   npm run build
   ```

2. Rechargez l'extension dans Chrome

3. Visitez https://www.crunchyroll.com

4. Ouvrez la console DevTools (`F12`)

5. Tapez `crunchyAPI.help()` pour commencer !

## 🚀 Prochaines étapes

Une fois que les tests passent :
1. ✅ Intégrer l'API dans les composants React
2. ✅ Remplacer les données mockées par les vraies données API
3. ✅ Implémenter le refresh automatique
4. ✅ Gérer le renouvellement du token
