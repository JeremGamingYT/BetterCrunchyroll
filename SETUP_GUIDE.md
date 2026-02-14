# 🔧 Guide d'Installation & Configuration

## 📦 Installation des dépendances

Toutes les dépendances utilisées sont déjà dans votre `package.json`. Aucune nouvelle dépendance n'a été ajoutée.

```bash
pnpm install  # ou npm install / yarn install
```

---

## 🔐 Configuration des Variables d'Environnement

### Fichier: `.env.local`

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes:

```env
# =====================================================
# CRUNCHYROLL API CREDENTIALS
# =====================================================

# Client ID pour Crunchyroll API (obligatoire)
CRUNCHYROLL_CLIENT_ID=your_client_id_here

# Client Secret pour Crunchyroll API (obligatoire)  
CRUNCHYROLL_CLIENT_SECRET=your_client_secret_here

# =====================================================
# OPTIONNEL - Configuration additionnelle
# =====================================================

# Pour debug: Affiche les logs des tokens
DEBUG_TOKENS=false

# Base URL de votre app (pour redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Où obtenir les credentials Crunchyroll?

1. **Via l'extension:** Si vous utilisez l'extension Crunchyroll, les tokens y sont interceptés
2. **Registering OAuth app:** Vous pouvez enregistrer une application OAuth sur le portail Crunchyroll
3. **Documentation:** Voir `/documentation/EtpAccountAuth/` pour les endpoints OAuth

---

## ▶️ Démarrage du projet

### Mode Développement

```bash
# Démarrer le serveur dev
pnpm dev

# Accès à l'application
# http://localhost:3000
```

### Mode Production

```bash
# Build
pnpm build

# Start
pnpm start
```

---

## 🧪 Tests des Nouvelles Fonctionnalités

### Test 1: Page d'Authentification ✅

**URL:** http://localhost:3000/connexion

**Scénario 1 - Connexion réussie:**
1. Allez à `/connexion`
2. Entrez vos credentials Crunchyroll réels
3. Cliquez "Se connecter"
4. ✅ Devrait rediriger vers `/` (page d'accueil)
5. Token devrait être stocké dans localStorage

**Debug:**
```javascript
// Console browser
localStorage.getItem('bcr_auth_token')  // Voir le token
localStorage.getItem('bcr_auth_user')   // Voir l'user
```

**Scénario 2 - Erreur d'authentification:**
1. Entrez credentials invalides
2. ✅ Message d'erreur devrait s'afficher
3. Pas de redirect

---

### Test 2: Banner AniList ✅

**URL:** http://localhost:3000

**Vérifications:**
- [ ] Banner visible entre "Notre sélection" et "Nouveautés"
- [ ] Design revisité avec gradient et blobs animés
- [ ] Bouton "Se connecter" clickable
- [ ] Au survol: shadow augmente, éléments smooth
- [ ] Responsive sur mobile (restack verticalement)

---

### Test 3: Banner Random Recommendation ✅

**URL:** http://localhost:3000

**Vérifications:**
- [ ] Banner visible entre "Nouveautés" et "Populaires"
- [ ] Affiche un animé aléatoire avec image
- [ ] Au clic: redirige vers `/watch/{crunchyrollId}` (PAS vers Crunchyroll.com!)
- [ ] Au survol du texte: description fade in
- [ ] Bouton "Regarder" avec Play icon
- [ ] Score et genres visibles
- [ ] Mobile: image adaptée

**Test de la redirection:**
```javascript
// À la place du clic, vérifiez l'URL générée
// Au lieu d'aller sur crunchyroll.com, elle devrait être /watch/{id}
```

---

### Test 4: Scrollbar Personnalisée ✅

**Où la voir:** N'importe quelle page avec du contenu scrollable

**Vérifications:**
- [ ] Scrollbar visible et orange/jaune
- [ ] Largeur ~12px (pas trop fine)
- [ ] Au survol: couleur change
- [ ] Track background sombre
- [ ] Fonctionne au scroll manuel (mouse wheel + drag)

**Navigateurs testés:**
- ✅ Chrome/Edge (Webkit)
- ✅ Safari (Webkit)
- ⚠️ Firefox (scrollbar-width: thin, pas de custom couleur)

---

### Test 5: Auto-Refresh du Token ⏰

**Setup:**
1. Connectez-vous à `/connexion`
2. Ouvrez DevTools (F12) → Console
3. Placez un breakpoint ou utilisez le code ci-dessous

**Script de test:**
```javascript
// Dans la console, attendez le refresh automatique
setInterval(() => {
  const token = localStorage.getItem('bcr_auth_token')
  if (token) {
    const data = JSON.parse(token)
    const expiresIn = data.expires_at - Date.now()
    console.log(`Token expiry in: ${(expiresIn / 1000).toFixed(0)}s`)
  }
}, 10000)

// Vérifiez aussi le TokenManager
import { tokenManager } from '@/lib/token-manager'
tokenManager.getToken() // Devrait retourner token valide
```

**Comportement attendu:**
- Token expire en ~5 minutes (par défaut Crunchyroll)
- ~1 minute avant expiry (buffer 4 min): TokenManager appelle `/api/auth`
- ✅ Nouveau token reçu et stocké
- Pas d'interruption utilisateur

---

### Test 6: Page Simulcast Améliorée ✅

**URL:** http://localhost:3000/simulcast

**Vérifications:**
- [ ] Hero section avec blobs animés
- [ ] Boutons grad/calendrier avec bon styling
- [ ] Filtres jour uniquement en mode calendrier
- [ ] Bouton "Crunchyroll uniquement" avec bon style
- [ ] Stats card avec icone horloge
- [ ] Grid view: affiche anime cards (2 colonnes mobile, 6 desktop)
- [ ] Schedule view: groupe par jour avec heure
- [ ] Empty state: emoji + message si aucun anime
- [ ] Loading state si données pas chargées

---

## 🔍 Vérifications de Sécurité

### Tokens ne doivent JAMAIS être exposés

```javascript
// ❌ BAD - Ne faites pas ceci:
console.log('Token:', token)
sessionStorage.setItem('token', token)  // Trop visible
window.globalToken = token  // Évitable

// ✅ GOOD - Même en production:
// Token stocké à localStorage avec structure protégée
// Token jamais loggé en production
// Token passé uniquement via headers Authorization
```

### Check des Headers API

```bash
# Vérifiez les headers dans Network tab DevTools
# Chaque requête vers Crunchyroll devrait avoir:
# Authorization: Bearer {token}
```

---

## 🐛 Debugging Courants

### Issue 1: "No valid token available" error

**Diagnosis:**
```javascript
// Console check:
localStorage.getItem('bcr_auth_token')           // Null?
localStorage.getItem('bcr_crunchyroll_token')    // Null?
window.__BCR_TOKEN__                             // Extension token?
```

**Solutions:**
- [ ] Vérifiez que `/api/auth` retourne un token (Network tab)
- [ ] Vérifiez que CRUNCHYROLL_CLIENT_SECRET est correct (.env.local)
- [ ] Vérifiez que vous êtes connecté ou que l'extension est active
- [ ] Clear localStorage: `localStorage.clear()` + reload

---

### Issue 2: Token Refresh Loop

**Symptom:** Beaucoup de requêtes POST `/api/auth`

**Diagnosis:**
```javascript
// Vérifiez la réponse du token
fetch('/api/auth', {
  method: 'POST',
  body: JSON.stringify({ method: 'refresh', refresh_token: 'xxx' })
}).then(r => r.json()).then(console.log)
```

**Solutions:**
- [ ] Vérifiez que `refresh_token` existe et est valide
- [ ] Vérifiez la durée de vie du refresh token (parfois expiré)
- [ ] Vérifiez que Crunchyroll API est accessible

---

### Issue 3: Banner Styling Off

**Symptom:** Banners ne ressemblent pas à la doc

**Solutions:**
- [ ] Clear cache browser: `Ctrl+Shift+Delete` ou similaire
- [ ] Rebuild CSS: `pnpm build` ou `pnpm dev` fresh
- [ ] Vérifiez que Tailwind est compilé: `npm run build`

---

## 📋 Checklist Avant Deployment

- [ ] `.env.local` configuré avec vrai CRUNCHYROLL_CLIENT_ID/SECRET
- [ ] Testé `/connexion` avec compte réel
- [ ] Testé auto-refresh token après 4+ minutes
- [ ] Testé navigateurs: Chrome, Firefox, Safari
- [ ] Testé mobile responsive avec DevTools
- [ ] Testé scrollbar visible et fonctionnelle
- [ ] Pas de `console.error` ou `console.warn` en console
- [ ] Banners affichent correctement
- [ ] Page simulcast charge sans erreur
- [ ] localStorage pas plein (clear si besoin)

---

## 🚀 Préparation Production

### Variables d'env Production (.env.production)

```env
# HTTPS must be enabled
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Crunchyroll credentials (même que dev, ou account prod)
CRUNCHYROLL_CLIENT_ID=prod_client_id
CRUNCHYROLL_CLIENT_SECRET=prod_secret

# Disable debug
DEBUG_TOKENS=false
```

### Sécurité Checklist

- [ ] Tokens jamais hardcodés
- [ ] HTTPS en place
- [ ] CORS headers correctement configurés
- [ ] Rate limiting sur `/api/auth` si possibel
- [ ] Logs sans tokens sensibles
- [ ] localStorage encryption layer considérée

---

## 📞 Support & Questions

Pour les erreurs spécifiques:
1. Vérifiez `/documentation/EtpAccountAuth/` pour les endpoints
2. Vérifiez `/documentation/Token/example_of_request.md` pour headers
3. Consultez les logs Network (DevTools F12)
4. Vérifiez que Crunchyroll API est accessible (status page)

---

**Vous êtes tous prêts! 🎉 Démarrez le serveur et testez!**

```bash
pnpm dev
```

Puis acédez à:
- 🏠 Accueil: http://localhost:3000
- 🔐 Connexion: http://localhost:3000/connexion
- 📺 Simulcast: http://localhost:3000/simulcast
