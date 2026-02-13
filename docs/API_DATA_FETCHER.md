# BetterCrunchyroll - API Data Fetcher

Guide complet pour utiliser les scripts de récupération des données Crunchyroll.

## 📋 Contenu

- **Scripts principaux:**
  - `fetch-crunchyroll-data.js` - Script Node.js pour récupérer les données localement
  - `test-crunchyroll-api.js` - Script de test complet des APIs
  - `extension/data-sync.js` - Script de synchronisation dans le navigateur

- **Documentation API:**
  - `documentation/EtpContent/GET/getSeries.md` - Endpoint pour récupérer les infos de série
  - `documentation/EtpContentReviews/GET/getRating.md` - Endpoint pour récupérer les ratings

## 🚀 Utilisation Rapide

### Option 1: Récupération via Node.js (Recommandé)

```bash
# Installation (si nécessaire)
npm install

# Test des APIs (récupère quelques séries de test)
node scripts/test-crunchyroll-api.js

# Récupération des données (utilise les séries existantes dans Data/series/)
node scripts/fetch-crunchyroll-data.js

# Avec options personnalisées
node scripts/fetch-crunchyroll-data.js --series G0XHWM1JP,G1XHJV0G7 --rating --account-id YOUR_ACCOUNT_UUID

# Simulation (dry-run)
node scripts/fetch-crunchyroll-data.js --dry-run
```

### Option 2: Synchronisation dans le Navigateur

1. Charger l'extension sur Crunchyroll
2. Attendre que le token soit intercepté
3. Ouvrir la console du navigateur (F12)
4. Exécuter:

```javascript
// Récupérer les informations du token
window.__BCR_DataSync__.getTokenInfo()

// Récupérer les infos de débogage
window.__BCR_DataSync__.debug()

// Synchroniser les données (remplacer les IDs)
await window.__BCR_DataSync__.initialize(
    ['G0XHWM1JP', 'G1XHJV0G7'],
    {
        includeRatings: true,
        includeBrowse: true
    }
)
```

## 📚 Documentation des Scripts

### fetch-crunchyroll-data.js

Script professionnel Node.js qui interroge l'API Crunchyroll et sauvegarde les données.

**Features:**
- ✅ Authentification automatique via Crunchyroll
- ✅ Récupération des informations de série (getSeries)
- ✅ Récupération des ratings utilisateur (getRating)
- ✅ Sauvegarde organisée dans le dossier Data/
- ✅ Gestion des erreurs robuste
- ✅ Logging détaillé et coloré
- ✅ Mode dry-run pour tester

**Structure des fichiers sauvegardés:**

```
Data/
├── series/
│   └── {SERIES_ID}/
│       ├── series.json       # Informations de la série
│       └── seasons/          # Données des saisons (optionnel)
├── rating-true/
│   └── {CONTENT_ID}.json     # Ratings utilisateur
└── index.json                # Index général
```

**Exemples de fichier series.json:**

```json
{
  "total": 1,
  "data": [
    {
      "id": "G0XHWM1JP",
      "channel_id": "crunchyroll",
      "title": "My Status as an Assassin Obviously Exceeds the Hero's",
      "description": "...",
      "images": { ... },
      "...": "..."
    }
  ],
  "metadata": {
    "timestamp": "2025-12-06T12:34:56.789Z",
    "source": "crunchyroll-api",
    "endpoint": "/content/v2/cms/series/G0XHWM1JP/"
  }
}
```

### test-crunchyroll-api.js

Script de test qui valide les endpoints documentés dans:
- `documentation/EtpContent/GET/getSeries.md`
- `documentation/EtpContentReviews/GET/getRating.md`

**Features:**
- ✅ Test complet des endpoints API
- ✅ Génération de token
- ✅ Vérification des réponses
- ✅ Logging détaillé et coloré
- ✅ Gestion des erreurs

**Ce que le test fait:**

1. **Authentification** - Récupère un token valide
2. **getSeries** - Teste la récupération des infos de série
3. **getRating** - Teste la récupération des ratings
4. **Résumé** - Affiche les résultats

**Exemple de sortie:**

```
╔════════════════════════════════════════════════════════╗
║  Étape 1: Authentification                            ║
╚════════════════════════════════════════════════════════╝

[ℹ] Token généré avec succès

╔════════════════════════════════════════════════════════╗
║  Étape 2: Test getSeries.md                           ║
╚════════════════════════════════════════════════════════╝

[TEST] getSeries résultat pour G0XHWM1JP
{
  "status": 200,
  "dataKeys": ["data"],
  "title": "My Status as an Assassin Obviously Exceeds the Hero's",
  "description": "Akira Oda et toute sa classe..."
}
```

### data-sync.js (Extension)

Script injecté dans le navigateur pour synchroniser les données via l'extension.

**Features:**
- ✅ Utilise le token intercepté par l'extension
- ✅ API publique accessible via `window.__BCR_DataSync__`
- ✅ Récupération des séries, ratings, et page de navigation
- ✅ Gestion des timeouts et erreurs
- ✅ Logging détaillé

**Méthodes publiques:**

```javascript
// Initialiser la synchronisation
await window.__BCR_DataSync__.initialize(
    seriesIds,      // string[] - IDs de séries
    options         // object - options
)

// Récupérer les infos du token
window.__BCR_DataSync__.getTokenInfo()

// Obtenir les infos de débogage
window.__BCR_DataSync__.debug()
```

**Options pour initialize():**

```javascript
{
    waitForToken: 10000,        // Temps d'attente du token (ms)
    includeRatings: true,       // Récupérer les ratings
    includeBrowse: false,       // Récupérer la page de navigation
    browseOptions: {
        sortBy: 'popularity',
        limit: 50
    }
}
```

## 🔐 Authentification

### Méthode Node.js (fetch-crunchyroll-data.js)

Le script génère automatiquement un token via:
```http
POST /auth/v1/token
Authorization: Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=
Content-Type: application/x-www-form-urlencoded
body: grant_type=client_id
```

### Méthode Navigateur (extension)

L'extension intercepte automatiquement le token lors de l'authentification Crunchyroll via:
1. `injected-script.js` - Intercepts `/auth/v1/token` responses
2. Stocke le token dans `window.__BCR_TOKEN__`
3. `data-sync.js` - Utilise ce token pour les requêtes

## 📊 Endpoints Testés

### getSeries.md
```http
GET /content/v2/cms/series/${series_id}/
Authorization: Bearer ${TOKEN}
```

**Réponse:**
```json
{
  "data": {
    "id": "G0XHWM1JP",
    "title": "...",
    "description": "...",
    "images": { ... },
    "seasons": [ ... ]
  }
}
```

### getRating.md
```http
GET /content-reviews/v3/user/${account_uuid}/rating/series/${content_id}
Authorization: Bearer ${TOKEN}
```

**Réponse:**
```json
{
  "rating": 8,
  "created_at": "2025-12-06T12:34:56Z"
}
```

ou

```json
{
  "rating": null  // Pas de rating
}
```

## 🔍 Débogage

### Vérifier l'état de l'extension

```javascript
// Dans la console du navigateur (F12)
window.__BCR_CHECK_TOKEN__()
window.__BCR_DataSync__.debug()
```

### Logs du script Node.js

Les logs sont colorés et incluent:
- ✓ Opérations réussies (vert)
- ⚠ Avertissements (jaune)
- ℹ Informations (bleu)
- ✗ Erreurs (rouge)

### HTTP Headers utilisés

```javascript
{
    'Authorization': 'Bearer {TOKEN}',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'ETP-Anonymous-ID': '{GENERATED_ID}'
}
```

## ⚙️ Configuration

### Variables d'environnement

Aucune requise (tout est automatique), mais vous pouvez customiser:

**fetch-crunchyroll-data.js:**
```javascript
CONFIG.crunchyrollApi = 'https://www.crunchyroll.com'
CONFIG.dataDir = path.join(__dirname, '../Data')
CONFIG.timeout = 30000
```

**data-sync.js:**
```javascript
CONFIG.apiBase = 'http://localhost:3000/api/crunchyroll'
CONFIG.waitForToken = 10000
CONFIG.requestTimeout = 30000
```

## 🐛 Troubleshooting

### "Token non reçu"
- Vérifier que l'extension est chargée
- Attendre le chargement complet de Crunchyroll
- Vérifier en console: `window.__BCR_TOKEN__`

### "HTTP 401 Unauthorized"
- Le token est expiré ou invalide
- Rafraîchir la page Crunchyroll pour obtenir un nouveau token
- Exécuter le script Node.js (génère automatiquement un token)

### "Request timeout"
- Vérifier la connexion internet
- Vérifier que l'API Crunchyroll est accessible
- Augmenter le timeout: `CONFIG.timeout = 60000`

### "Invalid JSON response"
- L'API peut retourner du HTML au lieu de JSON
- Vérifier l'authentification
- Vérifier les headers des requêtes

## 📝 Exemples Complets

### Récupérer une série spécifique

```bash
node scripts/fetch-crunchyroll-data.js --series G0XHWM1JP
```

### Récupérer plusieurs séries avec ratings

```bash
node scripts/fetch-crunchyroll-data.js \
  --series G0XHWM1JP,G1XHJV0G7,G1XHJVWXG \
  --rating \
  --account-id a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p
```

### Tester les APIs

```bash
node scripts/test-crunchyroll-api.js
```

### Synchroniser depuis le navigateur

```javascript
// F12 sur Crunchyroll
const result = await window.__BCR_DataSync__.initialize(
    ['G0XHWM1JP', 'G1XHJV0G7'],
    {
        includeRatings: true,
        includeBrowse: true,
        waitForToken: 15000
    }
)
console.log(result)
```

## 🎯 Cas d'Utilisation

1. **Synchronisation Automatique** - Exécuter `fetch-crunchyroll-data.js` via cron
2. **Validation API** - Exécuter `test-crunchyroll-api.js` régulièrement
3. **Données en Temps Réel** - Utiliser `data-sync.js` dans l'extension
4. **Backup Régulier** - Sauvegarder Data/ folder

## 📄 Licence

Partie de BetterCrunchyroll Extension - Utilisation personnelle uniquement

---

Pour plus d'informations, consultez:
- API Documentation: `documentation/EtpContent/GET/getSeries.md`
- Rating API: `documentation/EtpContentReviews/GET/getRating.md`
