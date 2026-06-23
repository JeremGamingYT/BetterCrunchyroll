# BetterCR

Extension Chrome (Manifest V3, **TypeScript, sans backend**) qui refond l'interface de
**crunchyroll.com** avec le design **BetterCR**, alimenté par la **vraie API Crunchyroll**
(en remplacement du mock/AniList d'origine).

L'app React est entièrement **embarquée dans l'extension** : aucun serveur à lancer.

---

## Comment ça marche

```
crunchyroll.com (onglet)
 ├─ injected-script  (contexte PAGE)  → intercepte le token Bearer (/auth/v1/token)
 ├─ content-script   (contexte isolé) → overlay iframe + pont postMessage + routeur d'URL
 │     └─ <iframe src="chrome-extension://…/src/app/index.html">  ← l'app BetterCR (React/TS)
 │           └─ appelle l'API CR via postMessage → content-script (qui détient le token)
 ├─ background       (service worker) → neutralise la CSP frame-src (DNR) pour l'iframe
 └─ /watch : pas d'overlay → lecteur natif Crunchyroll (DRM) conservé
```

- **Pas de serveur** : l'iframe charge un fichier statique via `chrome.runtime.getURL`.
- **Auth transparente** : on réutilise la session Crunchyroll déjà connectée (token intercepté).
  Un login email/mot de passe de secours existe (proxy `AUTH_REQUEST`).
- **CORS** : l'iframe (`chrome-extension://`) ne peut pas appeler l'API CR directement ;
  tout passe par le content-script (origine page) avec `Bearer` + cookies.
- **Lecture vidéo** : les flux Crunchyroll sont protégés par DRM Widevine, donc la page
  `/watch` garde le **lecteur natif** (un lecteur custom ne pourrait pas les lire).

## Installation (développement)

```bash
npm install
npm run build        # produit dist/ (extension MV3 complète)
```

1. Ouvrir `chrome://extensions`
2. Activer le **Mode développeur**
3. **Charger l'extension non empaquetée** → sélectionner le dossier `dist/`
4. Aller sur https://www.crunchyroll.com **en étant connecté**

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | Build watch + HMR (CRXJS) |
| `npm run build` | `tsc --noEmit` puis build de production dans `dist/` |
| `npm run typecheck` | Vérification de types stricte |
| `npm run lint` | ESLint + Prettier (vérification) |
| `npm run lint:fix` | Corrige ESLint + Prettier |
| `npm run package` | Zippe `dist/` en `bettercr-vX.Y.Z.zip` |

## Structure

```
src/
├─ app/        SPA React (UI BetterCR portée en TS)
│  ├─ pages/        HomePage · GridPage · DetailPage · WatchlistPage
│  ├─ components/   Header · Hero · Row · PosterCard · ContinueCard · SearchOverlay · …
│  ├─ tweaks/       Panneau d'apparence (accent / taille des cartes / animations)
│  ├─ hooks/ · lib/ · styles/  (CSS extrait verbatim du design d'origine)
├─ core/       Couche API Crunchyroll (sans dépendance au DOM)
│  ├─ api/          transport postMessage · client typé · erreurs
│  ├─ schemas/      validation zod des réponses CR (tolérante)
│  ├─ mappers/      DTO Crunchyroll → modèles de vue
│  └─ models/       types de vue (Series, Episode, Season…)
├─ content/    content-script (overlay, pont, token store, proxy API, auth)
├─ injected/   intercepteur de token (contexte page)
├─ background/ service worker (règle DNR)
└─ shared/     contrat de messages typé · routing · config · Result
```

## Qualité (NASA / Google)

- TypeScript **strict** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`…), **zéro `any`**.
- Contrat `postMessage` entièrement typé (unions discriminées), erreurs explicites (`Result`).
- Validation **zod** à la frontière API ; les items invalides sont ignorés, pas de crash.
- Modules à responsabilité unique, fonctions courtes, attentes bornées (timeouts).
- ESLint (typescript-eslint) + Prettier, alias de chemins (`@app`, `@core`, `@shared`…).

## Journal des versions

### v1.4.0

- 💬 **Commentaires sur la page Lecteur**, par animé, signés de ton pseudo Crunchyroll,
  **sans connexion**. Backend **gratuit et serverless** : une petite API Vercel + Upstash
  Redis (free tier) — voir [`server/`](server/). Tant que `COMMENTS_API` (dans
  `src/shared/config.ts`) est vide, la section affiche « bientôt disponible » ; une fois le
  serveur déployé et l'URL renseignée, les commentaires s'affichent et se postent en direct
  (`src/core/api/comments.ts` + `CommentsSection`). Anti-spam : longueur limitée + débit par IP.

### v1.3.0

- ▶️ **Page « Lecteur » (`/watch`) repensée.** Le DOM Crunchyroll est remplacé par la
  vraie page BetterCR (Header, thème, **infos d'épisode**, liste **« À suivre »** avec les
  vrais épisodes de la saison, Footer) — tout en **conservant le lecteur natif Bitmovin**
  (Widevine/DRM intact). Le `<video>` natif n'est jamais remplacé : il est positionné
  par-dessus le slot `.player` de la page (`src/content/watch-skin.ts`), avec ses
  contrôles natifs. Nouvelle `WatchPage` (`src/app/pages/WatchPage.tsx`) + route `watch`
  câblée ; données via `getEpisodeInfo` + `getSeasonEpisodes`.

### v1.2.3

- 📃 **Watchlist complète.** La page n'affichait que ~48 favoris : elle est désormais
  **paginée** (jusqu'à 400 entrées) → tous tes animés sauvegardés s'affichent.
- 🔖 **Bouton watchlist des cartes réellement fonctionnel.** Il ne faisait qu'un
  toggle visuel local : il appelle maintenant l'API Crunchyroll (`addToWatchlist`/
  `removeFromWatchlist`) via un **store de watchlist partagé** — cartes, page Watchlist
  et fiche série restent synchronisées, avec mise à jour optimiste.
- 🆔 `getWatchlistIds` renvoyait des ids d'épisodes → corrigé en ids de **séries**
  (sinon l'état coché était toujours faux). `getObjects` est désormais **chunké**
  (50 ids/requête) pour résoudre des centaines d'entrées sans dépasser la taille d'URL.
- 🧰 Les mutations (add/remove) qui répondent 200/204 sans corps ne sont plus
  considérées comme des échecs.

### v1.2.2

- 📊 **Statistiques enfin réelles.** La requête watch-history renvoyait `400`
  (`page=0` est rejeté par l'API — `invalid_value`). Corrigé : la 1ʳᵉ page omet `page`,
  la pagination est 1-indexée. **Épisodes vus** = `total` exact de l'historique,
  **Heures** estimées via la durée moyenne, **Favoris** = total réel de la watchlist,
  **Animés suivis** = séries distinctes (scan borné).
- 🖼️ **Images & titres des favoris réparés.** Les entrées de la watchlist sont des
  *épisodes* (vignette + titre d'épisode, sans `poster_tall`) : chaque entrée est
  désormais résolue vers sa **série** (`series_id` → `getObjects`) → vraie affiche +
  titre de série, dédoublonné par série.
- ▶️ **« Continuer à regarder »** scanne une fenêtre plus large de l'historique
  (les épisodes les plus récents sont souvent déjà terminés).
- 🔑 **Grant cookie fiabilisé** : ajout de `device_id`/`device_type` (le grant
  `etp_rt_cookie` renvoyait 400 sans eux) → token proactif sans dépendre de
  l'interception passive.
- 🧹 GIF mort (404) de l'écran de connexion remplacé.

### v1.2.1

- 🔑 **Statistiques & « Continuer à regarder » réparées à la racine.** L'`account_id`
  nécessaire aux requêtes liées au compte (historique, watchlist, stats) n'était pas
  toujours résolu : un token chargé sans `account_id` (interception passive / entrée
  persistée) court-circuitait les appels **sans même les envoyer** (d'où le « 0 partout »).
  Il est désormais **décodé directement depuis le JWT du token** (`scopes.cr.acc_id`), donc
  toujours disponible dès qu'une session existe — les requêtes partent enfin et les chiffres
  réels s'affichent.

### v1.2.0

- 🔗 **Liens du pied de page réparés** : Open-source/GitHub, FAQ, **État des services**
  (`status.crunchyroll.com`), À propos, Communauté, Abonnement, Conditions, Confidentialité,
  Cookies — tous ouverts dans un nouvel onglet via le content-script (les `<a target="_blank">`
  ne s'ouvraient pas depuis l'iframe `chrome-extension://`). Toutes ces destinations pointent
  vers les **vraies pages Crunchyroll**.
- 🎭 **« Parcourir par genre »** : chaque carte affiche désormais une affiche **réellement issue
  du genre** (titre le plus populaire de la catégorie) au lieu de l'artwork éditorial générique
  de Crunchyroll, souvent hors-sujet. Le clic ouvre le catalogue filtré par ce genre.
- ▶️ **« Continuer à regarder »** fiabilisé sur l'accueil (retris pour absorber la course au
  token au premier affichage).
- 📊 **Statistiques du profil fiabilisées** : fini le « 0 partout ». Elles sont récupérées à
  l'ouverture des **Paramètres** (token déjà chaud) avec retris et un état de chargement `…`.
- 🧹 **Pied de page nettoyé** : sans « Recrutement » ni « Appareils ».

### v1.1.0

- Accueil : rangée **Continuer à regarder** + section **Parcourir par genre** (catégories réelles).
- Pied de page avec vrais liens Crunchyroll ; lien open-source vers le dépôt GitHub.
- **Statistiques** reconstruites depuis l'historique de visionnage du compte.

## Feuille de route

- **Phase 1 (faite)** : fondation, pipeline sans serveur, Accueil, Catalogue, Fiche série, Tweaks.
- **Phase 2** : Recherche avancée, Watchlist (compte), Continuer à regarder (playheads), Similaires.
- **Phase 3** : `/watch` — skin BetterCR sur le lecteur natif, skip intro/outro, sync playhead.
- **Phase 4** : login de secours, états d'erreur/vides, locale, page Paramètres, packaging Web Store.

> Interface non affiliée à Crunchyroll. Données via votre propre compte.
