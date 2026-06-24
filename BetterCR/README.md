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
 └─ /watch : overlay BetterCR (Header · infos · épisodes · commentaires · Footer)
             + lecteur natif Bitmovin (DRM) repositionné par-dessus le slot
```

- **Pas de serveur (cœur)** : l'iframe charge un fichier statique via `chrome.runtime.getURL`.
  Seuls les **commentaires** utilisent un petit backend serverless **optionnel** et gratuit (`server/`).
- **Auth transparente** : on réutilise la session Crunchyroll déjà connectée (token intercepté).
  Un login email/mot de passe de secours existe (proxy `AUTH_REQUEST`).
- **CORS** : l'iframe (`chrome-extension://`) ne peut pas appeler l'API CR directement ;
  tout passe par le content-script (origine page) avec `Bearer` + cookies.
- **Lecture vidéo** : les flux Crunchyroll sont protégés par DRM Widevine. La page `/watch`
  conserve donc le **lecteur natif Bitmovin** (un lecteur custom ne pourrait pas les lire) :
  il est simplement **repositionné** dans la page BetterCR, jamais remplacé.

## Fonctionnalités

- 🏠 **Accueil** : héros, *Continuer à regarder*, *Populaires*, *Top 10*, *Parcourir par genre*.
- 🗂️ **Catalogue** : Séries / Films / Simulcast (pagination), recherche, fiche série + saisons/épisodes.
- 🎭 **Fiche série** enrichie via **AniList** (bannière, score, genres, studios) + **anti-spoiler**
  (épisodes non vus floutés tant qu'ils ne sont pas regardés, via les playheads).
- ❤️ **Watchlist** synchronisée avec ton compte (marque-page en 1 clic sur chaque carte) ;
  **Paramètres** avec statistiques réelles (épisodes, heures, favoris, séries).
- ▶️ **Page Lecteur** repensée autour du lecteur natif (infos, *À suivre*, **commentaires**,
  bouton **Passer l'intro / le générique**).
- 💬 **Commentaires** par animé (avatars, réponses, édition/suppression, temps réel, filtre FR/EN).
- 🔔 **Notifications** : réponses à tes commentaires + nouveaux épisodes du jour.
- 🗓️ **Sorties à venir** (AniList) par période.
- 🌐 **FR / EN**, thème + **Tweaks** (accent, taille des cartes, animations, anti-spoiler).

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
│  ├─ pages/        HomePage · GridPage · DetailPage · WatchlistPage · WatchPage ·
│  │                UpcomingPage · SettingsPage · CategoryPage · AuthPage · NotFoundPage
│  ├─ components/   Header · Hero · Row · PosterCard · CommentsSection ·
│  │                NotificationsPanel · SearchOverlay · …
│  ├─ tweaks/       Panneau d'apparence (accent / taille des cartes / animations)
│  ├─ hooks/ · lib/ · styles/  (CSS extrait verbatim du design d'origine)
├─ core/       Couche API (sans dépendance au DOM)
│  ├─ api/          transport postMessage · client CR typé · comments · notifications · erreurs
│  ├─ providers/    Enrichissement avec bascule auto : AniList → MyAnimeList (Jikan) → Kitsu
│  ├─ schemas/      validation zod des réponses CR (tolérante)
│  ├─ mappers/ · models/   DTO → modèles de vue
├─ content/    content-script (overlay, pont, token store, proxy API, auth, watch-skin)
├─ injected/   intercepteur de token (contexte page)
├─ background/ service worker (règle DNR)
└─ shared/     contrat de messages typé · routing · config · Result

server/         API commentaires serverless (Vercel + Upstash Redis) — optionnelle, gratuite
```

## Qualité (NASA / Google)

- TypeScript **strict** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`…), **zéro `any`**.
- Contrat `postMessage` entièrement typé (unions discriminées), erreurs explicites (`Result`).
- Validation **zod** à la frontière API ; les items invalides sont ignorés, pas de crash.
- Modules à responsabilité unique, fonctions courtes, attentes bornées (timeouts).
- ESLint (typescript-eslint) + Prettier, alias de chemins (`@app`, `@core`, `@shared`…).

## Journal des versions

### v1.9.1

- 🔒 **Maintenance sécurité** : mise à jour des dépendances de build pour résoudre les
  alertes Dependabot — **Vite 6.4.3** (corrige des *path traversal* + le bypass `server.fs.deny`),
  **esbuild ≥ 0.25**, **rollup** corrigé, et passage de `@crxjs/vite-plugin` à la **stable 2.7.0**.
  `npm audit` : **0 vulnérabilité**. (Outils de développement uniquement — non embarqués dans
  l'extension ; aucun changement de comportement.)

### v1.9.0

- ⚙️ **Apparence déplacée dans les Paramètres** : le bouton flottant « Apparence » est retiré ;
  langue de l'interface, **couleur d'accent**, animations et anti-spoiler sont désormais dans
  **Profil → Préférences**. La taille des cartes n'est plus modifiable.
- 🔧 **Vraies préférences Crunchyroll** : la **langue audio** et la **langue des sous-titres**
  préférées de ton compte sont lues et **modifiables** (via `/accounts/v1/me/profile`), donc
  synchronisées sur tous tes appareils.
- 🔖 **Bouton watchlist des cartes** : même icône (signet) dans les deux états — rempli quand
  l'animé est dans ta liste, contour sinon (fini la coche).
- ▶️ **Page Lecteur** : la **description de l'épisode** est affichée, et l'**espace commentaires**
  est remonté **juste sous le titre et la description** (présentation façon YouTube).

### v1.8.1

- 🧭 **Découvertes** : les rangées sont alignées sur le titre de la page (fini la double
  gouttière qui les décalait trop à droite).
- ▶️ **Lecteur** : le lecteur natif ne recouvre plus le **header** quand on scrolle (il glisse
  dessous), et il s'efface le temps qu'un **menu/notifications** du header est ouvert.
- 🔗 **URL** : l'adresse reflète désormais **toutes** les pages — fini l'URL bloquée sur
  `/series/…` après être revenu à l'Accueil.

### v1.8.0

- ⏭️ **Passer l'intro / le récap / le générique** : un bouton apparaît sur le lecteur
  natif aux bons moments (d'après les marqueurs *skip-events* de Crunchyroll) ; un clic
  saute le segment. Purement additif — le lecteur DRM n'est jamais modifié, et rien ne
  s'affiche si l'épisode n'a pas de marqueurs.

### v1.7.1

- 🧭 **Découvertes** : le titre de la première rangée ne chevauche plus l'en-tête.
- ▶️ **Lecteur** : le titre de la série (en couleur) est cliquable → retour à la fiche.

### v1.7.0

- 📊 **Statistiques enrichies** (Profil) : **heures regardées ce mois-ci**, **genres préférés**
  (calculés depuis tes séries les plus vues), **série de jours d'affilée** (*streak*) et
  **Top 10 de tes séries** (cliquables).
- 🌐 **Secours multi-API intelligent** : si **AniList** est indisponible ou limité (429), BetterCR
  bascule automatiquement vers **MyAnimeList (Jikan)** puis **Kitsu** pour l'enrichissement (méta,
  jaquettes, scores, genres), les tendances et les sorties à venir. Un fournisseur en échec est
  **mis au banc** quelques instants (puis re-testé), et les échecs ne sont jamais mis en cache.

### v1.6.0

- 💬 **Commentaires par épisode** (au lieu de par série) : chaque épisode a son fil.
- 🙈 **Masquage anti-spoiler** : le fil reste caché tant que l'épisode n'a pas été regardé
  (détecté via le *playhead*) — un bouton « Afficher quand même » permet de passer outre.
- 🧹 **Espace borné** : expiration automatique après **30 jours**, listes plafonnées, et
  **éviction intelligente** (les fils les plus vieux et les moins consultés partent en premier)
  quand la base grossit.
- 🛡️ **Modération communautaire intelligente** : **signalement**, **score de confiance caché**,
  **auto-masquage** au-delà de N signalements (seuil abaissé pour les comptes peu fiables),
  **shadow-ban** côté serveur (les trolls voient encore leurs messages, plus personne d'autre —
  non contournable via devtools), et **cooldown anti-spam** par utilisateur.
- 🔒 **Mots masqués** : filtre personnel local (privé, par appareil) pour cacher des commentaires.
- 🔐 **Sécurité** : l'`uid` propriétaire n'est plus renvoyé aux autres clients (un booléen `mine`
  est résolu côté serveur), ce qui empêche l'usurpation d'identité.

### v1.5.0

- 🧭 **Page « Découvertes »** (+ section « voir plus » sur l'accueil et bouton **Découvrir** dans
  le header) avec des rangées **personnalisées** : *Parce que tu regardes …* (séries similaires à
  ta dernière vue), *Animes courts à finir ce soir*, *Pépites sous-cotées*, *Simulcasts populaires*,
  *Films anime*.
- 🔎 **Vraie page de Recherche avancée** (l'icône loupe y mène) avec filtres **genre · saison ·
  année · format (séries/films) · VF · VOSTFR · tri** + pagination « charger plus ».

### v1.4.0

- 💬 **Commentaires sur la page Lecteur** (par animé, signés de ton pseudo Crunchyroll, **sans
  connexion**) : **avatars**, **réponses** en fils, **édition / suppression** de tes propres
  commentaires (« Commentaire supprimé » s'affiche quelques secondes puis disparaît), **temps
  réel** (rafraîchissement automatique), et un **filtre anti-insultes** bilingue FR/EN
  (variantes leetspeak / abréviations). Backend **gratuit & serverless** (Vercel + Upstash
  Redis, free tier) dans [`server/`](server/), activé via `COMMENTS_API` (`src/shared/config.ts`) ;
  vide → la section affiche « bientôt disponible ». Anti-spam : longueur limitée + débit par IP.
- 🔔 **Centre de notifications** (cloche dans le header, avec pastille) : **réponses à tes
  commentaires** (avec **réponse directe** depuis la cloche) + **nouveaux épisodes du jour**
  (clic → lecture).
- 🗓️ **Page « Sorties à venir »** (via **AniList**) + bouton dédié dans le header : les animés
  annoncés, en sections claires — *Prochains mois* / *L'année prochaine* / *Plus tard*.

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

- **Phase 1 — faite** : fondation, pipeline sans serveur, Accueil, Catalogue, Fiche série, Tweaks.
- **Phase 2 — faite** : Watchlist (compte), Continuer à regarder (playheads), recherche, stats, anti-spoiler.
- **Phase 3 — faite** : page `/watch` BetterCR autour du lecteur natif (infos, *À suivre*, commentaires).
- **Phase 4 — faite** : commentaires (backend serverless gratuit), centre de notifications, *Sorties à venir* (AniList), login de secours, i18n FR/EN.
- **Ensuite** : contrôles custom du lecteur (skip intro/outro, sync playhead), packaging Web Store.

> Interface non affiliée à Crunchyroll. Données via votre propre compte.
