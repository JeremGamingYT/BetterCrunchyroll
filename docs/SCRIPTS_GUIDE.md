# 🎯 BetterCrunchyroll - Guide Complet des Scripts de Récupération API

## 📌 Vue d'ensemble

Ce guide explique comment utiliser les 3 scripts professionnels qui interrogent l'API Crunchyroll, testent les endpoints documentés et sauvegardent les données organizées dans le dossier `Data/`.

### Scripts Disponibles

| Script | Utilisation | Prérequis |
|--------|------------|----------|
| `test-crunchyroll-api.js` | ✅ Tester les APIs (getSeries/getRating) | Aucun |
| `fetch-crunchyroll-data-proxy.js` | ✅ Récupérer les données via proxy | Serveur Next.js (`npm run dev`) |
| `fetch-crunchyroll-data.js` | ⚠️ Non recommandé (Cloudflare bloque) | N/A |
| `extension/data-sync.js` | ✅ Synchroniser depuis l'extension | Extension chargée sur Crunchyroll |

---

## 🚀 Démarrage Rapide

### 1️⃣ Tester les APIs Crunchyroll

```bash
cd c:\Users\letil\Documents\CursorProjects\BetterCrunchyroll
node scripts/test-crunchyroll-api.js
```

**Ce que ça fait:**
- ✓ Teste l'authentification Crunchyroll (génère un token)
- ✓ Teste `getSeries.md` - Récupère les infos de série
- ✓ Teste `getRating.md` - Récupère les ratings utilisateur
- ✓ Affiche un résumé coloré

**Résultat attendu:** ✅ Tous les tests réussis (affichage des titre des séries)

---

### 2️⃣ Récupérer les Données (via Proxy)

**Prérequis:** Le serveur Next.js doit être en cours d'exécution

```bash
# Terminal 1: Démarrer le serveur
npm run dev

# Terminal 2: Récupérer les données
node scripts/fetch-crunchyroll-data-proxy.js
```

**Options disponibles:**

```bash
# Récupérer des séries spécifiques
node scripts/fetch-crunchyroll-data-proxy.js --series G0XHWM1JP,G1XHJV0G7

# Inclure les ratings utilisateur
node scripts/fetch-crunchyroll-data-proxy.js --rating --account-id YOUR_UUID

# Tester sans sauvegarder (dry-run)
node scripts/fetch-crunchyroll-data-proxy.js --dry-run

# Serveur proxy personnalisé
node scripts/fetch-crunchyroll-data-proxy.js --localhost http://votre-serveur:3000
```

**Résultat:** Les données sont sauvegardées dans `Data/series/` et `Data/rating-true/`

---

### 3️⃣ Synchroniser via l'Extension

Quand l'extension est chargée sur Crunchyroll:

```javascript
// Ouvrir la console (F12)
// Récupérer les infos du token
window.__BCR_DataSync__.getTokenInfo()

// Synchroniser les données
await window.__BCR_DataSync__.initialize(
    ['G0XHWM1JP', 'G1XHJV0G7'],
    {
        includeRatings: true,
        includeBrowse: false
    }
)
```

---

## 📚 Documentation Détaillée des Scripts

### 🧪 test-crunchyroll-api.js

**Fonction:** Valider les endpoints API Crunchyroll

**Endpoints testés:**
- `POST /auth/v1/token` - Génération de token anonyme
- `GET /content/v2/cms/series/{series_id}/` - Récupération des infos de série (getSeries.md)
- `GET /content-reviews/v3/user/{account_uuid}/rating/series/{content_id}` - Récupération des ratings (getRating.md)

**Exemple de sortie complète:**

```
╔════════════════════════════════════════════════════════════╗
║       BetterCrunchyroll - Test Suite API Crunchyroll       ║
╚════════════════════════════════════════════════════════════╝

Configuration:
  API Base: https://www.crunchyroll.com
  Test Series: G0XHWM1JP, G1XHJV0G7
  Timeout: 30000ms

╔════════════════════════════════════════════════════════════╗
║                 Étape 1: Authentification                  ║
╚════════════════════════════════════════════════════════════╝

[ℹ] Récupération du token Crunchyroll...
[✓] Token généré avec succès

╔════════════════════════════════════════════════════════════╗
║                 Étape 2: Test getSeries.md                 ║
╚════════════════════════════════════════════════════════════╝

[TEST] getSeries résultat pour G0XHWM1JP
{
  "status": 200,
  "title": "My Status as an Assassin Obviously Exceeds the Hero's"
}

[TEST] getSeries résultat pour G1XHJV0G7
{
  "status": 200,
  "title": "Anime Title"
}

╔════════════════════════════════════════════════════════════╗
║                 Étape 3: Test getRating.md                 ║
╚════════════════════════════════════════════════════════════╝

[✓] getSéries: 2/2
[✓] getRating: 1/2
```

**Cas d'usage:**
- ✅ Valider que les APIs Crunchyroll fonctionnent
- ✅ Vérifier les credentials
- ✅ Tester avant de déployer
- ✅ Reporter les problèmes API

---

### 📥 fetch-crunchyroll-data-proxy.js

**Fonction:** Récupérer les données Crunchyroll via le serveur proxy Next.js

**Structure des données sauvegardées:**

```
Data/
├── series/
│   ├── G0XHWM1JP/
│   │   ├── series.json         # Infos de la série
│   │   └── seasons/            # (optionnel)
│   ├── G1XHJV0G7/
│   │   └── series.json
│   └── ...
├── rating-true/
│   ├── G0XHWM1JP.json          # Rating utilisateur
│   ├── G1XHJV0G7.json
│   └── ...
└── index.json                   # Index général
```

**Contenu exemple de `Data/series/G0XHWM1JP/series.json`:**

```json
{
  "total": 1,
  "data": [
    {
      "id": "G0XHWM1JP",
      "title": "My Status as an Assassin Obviously Exceeds the Hero's",
      "description": "Akira Oda et toute sa classe...",
      "season_tags": ["fall-2025"],
      "images": {...},
      "is_mature": false,
      "channel_id": "crunchyroll"
    }
  ],
  "metadata": {
    "timestamp": "2025-12-06T12:34:56.789Z",
    "source": "crunchyroll-api",
    "endpoint": "/content/v2/cms/series/G0XHWM1JP/"
  }
}
```

**Options détaillées:**

| Option | Exemple | Effet |
|--------|---------|-------|
| `--series` | `G0XHWM1JP,G1XHJV0G7` | Séries à récupérer |
| `--rating` | (flag) | Inclure les ratings |
| `--account-id` | `a1b2c3d4-...` | UUID pour l'authentification |
| `--localhost` | `http://localhost:3000` | Serveur proxy |
| `--dry-run` | (flag) | Simuler sans sauvegarder |

**Cas d'usage:**
- ✅ Sauvegarder les infos de série
- ✅ Exporter les ratings utilisateur
- ✅ Automatiser la récupération (cronjob)
- ✅ Créer des sauvegardes

---

### 🌐 extension/data-sync.js

**Fonction:** Synchroniser les données depuis le navigateur (via extension)

**Méthodes publiques:**

```javascript
// 1. Initialiser la synchronisation
await window.__BCR_DataSync__.initialize(
    ['G0XHWM1JP', 'G1XHJV0G7'],  // IDs de séries
    {
        includeRatings: true,
        includeBrowse: false,
        waitForToken: 10000
    }
)

// 2. Vérifier le token
window.__BCR_DataSync__.getTokenInfo()
// → { hasToken: true, accountId: "...", isValid: true, expiresAt: Date }

// 3. Infos de débogage
window.__BCR_DataSync__.debug()
```

**Avantages:**
- ✅ Utilise le token intercepté (déjà authentifié)
- ✅ Contourne Cloudflare automatiquement
- ✅ Récupère les ratings utilisateur
- ✅ Temps réel

**Limitations:**
- ❌ Nécessite que l'extension soit active sur Crunchyroll
- ❌ Requiert que le serveur proxy soit accessible

---

## 🔐 Authentification & Sécurité

### Méthode 1: Token Anonyme (test-crunchyroll-api.js)

```http
POST /auth/v1/token
Authorization: Basic [CREDENTIALS_ENCODED]
ETP-Anonymous-ID: [RANDOM_32_HEX]
Content-Type: application/x-www-form-urlencoded
body: grant_type=client_id
```

✅ Pas besoin de login  
❌ Limité en fonctionnalités (pas de ratings personnels)

### Méthode 2: Proxy Next.js (fetch-crunchyroll-data-proxy.js)

```http
GET /api/crunchyroll?endpoint=/content/v2/cms/series/...
```

Le serveur génère un token anonyme et proxie la requête  
✅ Simple et sécurisé  
✅ Cache du token côté serveur

### Méthode 3: Token Intercepté (extension)

L'extension intercepte le token lors de la connexion utilisateur  
✅ Accès complet (ratings, profil, watchlist)  
✅ Authentifié automatiquement  
❌ Nécessite que l'utilisateur soit connecté

---

## 📋 Endpoints Documentés

### getSeries.md

```http
GET /content/v2/cms/series/${series_id}/
Authorization: Bearer ${TOKEN}
```

**Champs retournés:**
- `id`, `title`, `description`
- `images`, `season_tags`, `channel_id`
- `is_mature`, `maturity_ratings`

### getRating.md

```http
GET /content-reviews/v3/user/${account_uuid}/rating/series/${content_id}
Authorization: Bearer ${TOKEN}
```

**Réponse:**
- `rating` - Note (1-10) ou `null`
- `created_at` - Date de création
- `modified_at` - Dernière modification

---

## 🎯 Cas d'Usage Réels

### 1. Synchroniser automatiquement chaque jour

```bash
# Windows Task Scheduler
# Créer une tâche qui exécute:
node C:\...\scripts\fetch-crunchyroll-data-proxy.js
```

### 2. Exporter les données pour un tableau de bord

```bash
node scripts/fetch-crunchyroll-data-proxy.js --series G0XHWM1JP,G1XHJV0G7
# Récupère et sauvegarde dans Data/series/
```

### 3. Valider l'infrastructure

```bash
node scripts/test-crunchyroll-api.js
# Confirms APIs are working
```

### 4. Backup régulier

```bash
# Copier le dossier Data/
cp -r Data/ Data_backup_$(date +%Y-%m-%d)
```

---

## 🔧 Troubleshooting

### Erreur: "Module not found"

```bash
npm install
cd c:\Users\letil\Documents\CursorProjects\BetterCrunchyroll
```

### Erreur: "Server is not running"

```bash
# Terminal 1
npm run dev
# Attendre le message "ready - started server on..."

# Terminal 2
node scripts/fetch-crunchyroll-data-proxy.js
```

### Erreur: "HTTP 403 - Cloudflare"

L'API directe est bloquée par Cloudflare. Solutions:
- ✅ Utiliser `fetch-crunchyroll-data-proxy.js` (via le serveur Next.js)
- ✅ Utiliser l'extension sur le navigateur
- ❌ `fetch-crunchyroll-data.js` ne fonctionne pas seul

### Erreur: "Invalid JSON response"

```bash
# Vérifier que le serveur proxy fonctionne
curl http://localhost:3000/api/crunchyroll?endpoint=/content/v2/cms/series/G0XHWM1JP/

# Augmenter le timeout
# Éditer le script et modifier CONFIG.timeout
```

### Erreur: "Rating non disponible"

Certains contenus n'ont pas de rating. C'est normal! Le script continue les autres.

---

## 📊 Logging & Débogage

### Logs Colorés

- 🟢 `[✓]` - Succès
- 🔵 `[ℹ]` - Information
- 🟡 `[⚠]` - Avertissement
- 🔴 `[✗]` - Erreur

### Activer le mode verbose

```javascript
// Dans le navigateur (extension)
window.__BCR_DataSync__.debug()
```

---

## 📈 Performance

### Temps de récupération (approximatif)

| Script | 1 série | 10 séries | 100 séries |
|--------|---------|----------|-----------|
| test-crunchyroll-api.js | 2-3s | 10-15s | N/A |
| fetch-crunchyroll-data-proxy.js | 1-2s | 5-8s | 30-50s |
| data-sync.js | 1-2s | 5-8s | 30-50s |

### Optimisations

- Délai entre requêtes: 300-500ms (respecte les limites Crunchyroll)
- Cache du token côté serveur (50 minutes)
- Requêtes parallèles possibles avec modification

---

## 📝 Résumé des Commandes

```bash
# 1. Tester les APIs
node scripts/test-crunchyroll-api.js

# 2. Récupérer les données (via proxy)
npm run dev  # Terminal 1
node scripts/fetch-crunchyroll-data-proxy.js  # Terminal 2

# 3. Récupérer avec options
node scripts/fetch-crunchyroll-data-proxy.js --series G0XHWM1JP --dry-run

# 4. Depuis l'extension (Console F12 sur Crunchyroll)
await window.__BCR_DataSync__.initialize(['G0XHWM1JP'])
```

---

## 🔗 Références

- API Documentation: `docs/API_DOCUMENTATION.md`
- getSeries: `documentation/EtpContent/GET/getSeries.md`
- getRating: `documentation/EtpContentReviews/GET/getRating.md`
- Extension: `extension/manifest.json`

---

## 📞 Support

Pour les problèmes:
1. Vérifier les logs
2. Exécuter `test-crunchyroll-api.js`
3. Vérifier l'etat du serveur (`npm run dev`)
4. Consulter les documentations API

