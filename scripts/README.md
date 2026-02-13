# 📊 Scripts de Récupération Crunchyroll Professionnels

> Extension BetterCrunchyroll - Suite de scripts professionnels pour interroger l'API Crunchyroll et organiser les données

## 🎯 Objectif

Créer une solution **professionnelle et complète** pour:
- ✅ Tester les endpoints documentés (`getSeries.md` / `getRating.md`)
- ✅ Récupérer les données de Crunchyroll
- ✅ Organiser les données dans le dossier `Data/`
- ✅ Synchroniser depuis l'extension du navigateur

## 📦 Contenu

### Scripts Principaux

```
scripts/
├── test-crunchyroll-api.js              # 🧪 Tests des APIs
├── fetch-crunchyroll-data-proxy.js      # 📥 Récupération via proxy (RECOMMANDÉ)
└── fetch-crunchyroll-data.js            # ⚠️ Version directe (bloquée par Cloudflare)

extension/
├── data-sync.js                          # 🌐 Synchronisation navigateur
├── content-script.js                     # Modifié pour charger data-sync.js
└── manifest.json                         # Inclut data-sync.js

docs/
├── SCRIPTS_GUIDE.md                      # 📚 Guide complet
├── API_DATA_FETCHER.md                   # Documentation détaillée
└── API_DOCUMENTATION.md                  # Endpoints disponibles
```

## 🚀 Utilisation Rapide

### 1. Tester les APIs

```bash
node scripts/test-crunchyroll-api.js
```

### 2. Récupérer les données

```bash
# Démarrer le serveur (terminal 1)
npm run dev

# Exécuter le script (terminal 2)
node scripts/fetch-crunchyroll-data-proxy.js
```

### 3. Synchroniser depuis l'extension

```javascript
// Console (F12) sur Crunchyroll
await window.__BCR_DataSync__.initialize(['G0XHWM1JP'])
```

## 📋 Endpoints Testés

Exactement comme documenté:

### getSeries.md
```http
GET /content/v2/cms/series/${series_id}/
Authorization: Bearer ${TOKEN}
```
- Récupère les infos complètes de série
- Titre, description, images, saisons
- Sauvegardé dans `Data/series/{id}/series.json`

### getRating.md
```http
GET /content-reviews/v3/user/${account_uuid}/rating/series/${content_id}
Authorization: Bearer ${TOKEN}
```
- Récupère le rating utilisateur
- Note, date de création/modification
- Sauvegardé dans `Data/rating-true/{id}.json`

## 🗂️ Structure des Données

Après exécution, vous obtenez:

```
Data/
├── series/
│   ├── G0XHWM1JP/
│   │   ├── series.json                     ✓ Info complète
│   │   └── seasons/                        (optionnel)
│   ├── G1XHJV0G7/
│   │   └── series.json
│   └── ...
├── rating-true/
│   ├── G0XHWM1JP.json                      ✓ Rating utilisateur
│   ├── G1XHJV0G7.json
│   └── ...
└── index.json                              ✓ Index global
```

## 🔑 Caractéristiques

### ✨ Features

- **Authentification Automatique** - Génère les tokens automatiquement
- **Gestion d'Erreurs Robuste** - Continue même si une requête échoue
- **Logging Coloré** - Sortie facile à lire et à suivre
- **Mode Dry-Run** - Testez sans sauvegarder
- **Rispetto des Limitations** - Délais entre requêtes (respect des API)
- **Sauvegarde Organizée** - Structure claire et accessible

### 📊 Logging Professionnel

```
[✓] Série récupérée: G0XHWM1JP
[ℹ] Récupération de la série: G1XHJV0G7
[⚠] Rating non disponible: G1XHJV0G7
[✗] Erreur lors de la récupération: Timeout
```

## 🔧 Options de Ligne de Commande

### fetch-crunchyroll-data-proxy.js

```bash
# Séries spécifiques
--series G0XHWM1JP,G1XHJV0G7

# Inclure les ratings
--rating

# Account UUID (pour les ratings)
--account-id a1b2c3d4-e5f6-4g7h-8i9j

# Serveur proxy personnalisé
--localhost http://votre-serveur:3000

# Tester sans sauvegarder
--dry-run
```

## 📚 Documentation Complète

Pour plus de détails, consultez:
- **[SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)** - Guide d'utilisation complet
- **[API_DATA_FETCHER.md](API_DATA_FETCHER.md)** - Documentation détaillée
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Spécifications API

## ⚙️ Prérequis

### Pour test-crunchyroll-api.js
- ✅ Node.js (aucune dépendance externe)

### Pour fetch-crunchyroll-data-proxy.js
- ✅ Node.js
- ✅ Serveur Next.js en cours d'exécution (`npm run dev`)
- ✅ Port 3000 accessible

### Pour extension/data-sync.js
- ✅ Extension chargée sur Crunchyroll
- ✅ Token intercepté avec succès
- ✅ Serveur proxy accessible (optionnel)

## 🎯 Cas d'Utilisation

### 1. Valider l'Infrastructure
```bash
node scripts/test-crunchyroll-api.js
```
Confirme que les APIs répondent et que les credentials sont corrects.

### 2. Récupération Programmée
```bash
# Ajouter à un cronjob (Linux/Mac)
0 12 * * * cd /path/to/project && node scripts/fetch-crunchyroll-data-proxy.js

# Ou tâche planifiée (Windows)
# Task Scheduler: exécute le script quotidiennement
```

### 3. Sauvegarde Régulière
```bash
# Backup des données
npm run backup  # ajouter ce script à package.json
```

### 4. Synchronisation en Temps Réel
```javascript
// Dans l'extension, depuis la console Crunchyroll
setInterval(async () => {
    await window.__BCR_DataSync__.initialize(['G0XHWM1JP'])
}, 300000)  // Chaque 5 minutes
```

## 📊 Performance

Temps estimés:
- **1 série** - 1-2 secondes
- **10 séries** - 5-8 secondes  
- **100 séries** - 30-50 secondes

Incluant les délais de respect des limites API.

## 🔒 Sécurité

### Tokens
- ✅ Générés dynamiquement ou interceptés
- ✅ Pas stockés en dur dans le code
- ✅ Invalidés automatiquement

### Données
- ✅ Sauvegardées localement dans `Data/`
- ✅ Pas d'upload cloud
- ✅ Propriété locale de l'utilisateur

### API
- ✅ Requêtes valides et authentifiées
- ✅ Respect des limites de débit
- ✅ User-Agent correct

## 🐛 Troubleshooting

**Q: "Server is not running"**  
A: Exécutez `npm run dev` dans un autre terminal

**Q: "HTTP 403 - Cloudflare"**  
A: Utilisez `fetch-crunchyroll-data-proxy.js` (pas direct)

**Q: "Token not intercepted"**  
A: Assurez-vous que l'extension est chargée et que vous êtes sur Crunchyroll.com

**Q: "Request timeout"**  
A: Augmentez le timeout dans la configuration du script

## 🎓 Apprentissage

Ces scripts démontrent:
- Authentification API
- Gestion des erreurs
- Sauvegarde de fichiers
- Logging professionnel
- Gestion des requêtes HTTP/HTTPS
- Structure de données JavaScript/JSON

## 📈 Fonctionnalités Futures

Possibilités d'améliorations:
- [ ] Requêtes parallèles (pour plus de vitesse)
- [ ] Base de données (au lieu de fichiers JSON)
- [ ] Dashboard web pour visualiser les données
- [ ] Notifications automatiques
- [ ] Intégration avec Discord/Telegram

## 📄 Fichiers Modifiés

### extension/content-script.js
Ajout du chargement de `data-sync.js`
```javascript
function injectDataSyncScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('data-sync.js');
    // ...
}
injectDataSyncScript();
```

### extension/manifest.json
Inclut `data-sync.js` dans les ressources web accessibles (via `*.js`)

## 🤝 Contributions

Pour améliorer les scripts:
1. Testez d'abord avec `test-crunchyroll-api.js`
2. Modifiez le script souhaité
3. Exécutez avec `--dry-run` pour vérifier
4. Validez les données dans `Data/`

## 📞 Support

Si un script ne fonctionne pas:

1. **Vérifier les prérequis** - Node.js, serveur en cours d'exécution
2. **Lancer le test** - `node scripts/test-crunchyroll-api.js`
3. **Vérifier les logs** - Les messages d'erreur sont explicites
4. **Consulter la documentation** - SCRIPTS_GUIDE.md

## 📜 Licence

Partie de BetterCrunchyroll - Utilisation personnelle uniquement

---

**Dernière mise à jour:** Février 2026  
**Version:** 1.0.0  
**Status:** ✅ Production-Ready

