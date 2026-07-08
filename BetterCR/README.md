# BetterCR

Extension Chrome (Manifest V3, **TypeScript, sans backend**) qui refond l'interface de
**crunchyroll.com** avec le design **BetterCR**, alimenté par la **vraie API Crunchyroll**
(en remplacement du mock/AniList d'origine).

L'app React est entièrement **embarquée dans l'extension** : aucun serveur à lancer.

> **Transparence** : oui, BetterCR est en grande partie *vibe-codé* (développé avec l'aide de l'IA),
> mais **supervisé, relu, testé et maintenu par un humain développeur**. Chaque version passe par un
> build, du lint et un audit (sécurité, code mort, permissions minimales) avant publication. L'IA
> accélère ; les décisions et la qualité restent humaines, et tout est open-source donc vérifiable.

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
- ▶️ **Page Lecteur** repensée autour du lecteur natif (infos, *À suivre*, **commentaires**),
  avec contrôles teintés à ta couleur d'accent (les boutons de saut natifs de Crunchyroll sont conservés).
- 💬 **Commentaires** par animé (avatars, réponses, édition/suppression, temps réel, filtre FR/EN).
- 🔔 **Notifications** : réponses à tes commentaires + nouveaux épisodes du jour.
- 🗓️ **Sorties à venir** (AniList) par période.
- 🌐 **FR / EN**, couleur d'accent, animations, anti-spoiler — tout dans **Profil → Préférences**.
- 🧩 **Menu d'extension** (popup) : activer/désactiver en 1 clic + détecteur de mise à jour.
- 🛟 **Résilience** : *kill switch* intelligent — si Crunchyroll change sa structure, BetterCR s'efface
  au profit du site natif (drapeau distant `health.json` + auto-détection des pannes d'API + reprise auto),
  pour ne jamais laisser un site cassé.

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
├─ popup/      menu d'extension (activer/désactiver + détecteur de mise à jour)
├─ injected/   intercepteur de token (contexte page)
├─ background/ service worker (règle DNR + vérif. des mises à jour)
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

### v1.14.0

- 👥 **Profils multiples** : page « Qui regarde ? » avant l'accueil (comptes multi-profils), sélecteur de profil dans le menu avatar, et une page **« Gérer les profils » intégrée** — création avec choix parmi les 67 avatars officiels, renommage, changement d'avatar, suppression (confirmation en 2 temps) et bascule réelle de session (grant `profile_id`, endpoints documentés).
- ⭐ **Notes en étoiles sur les fiches** : note 1–5 interactive synchronisée au vrai compte Crunchyroll (`content-reviews/v3`), avec moyenne et nombre de votes de la communauté.
- 🎨 **Nouvelle identité visuelle « éditorial anime »** : sections numérotées façon sommaire de magazine (`01`, `02`… en numéraux au trait), filets structurels, colonne katakana verticale et trame *halftone* manga sur le hero, badges et CTA à coin coupé, ombres « print » sur les cartes, métadonnées façon fiche technique, grain photographique — plus transitions de page, cascade du hero et micro-interactions raffinées.
- ⚡ **Optimisations FPS** : `content-visibility` sur les rangées/footer hors écran, décodage d'images asynchrone, suppression d'une couche GPU permanente (`will-change`), aurora en `steps()` (~96 % de compositions en moins), flous réduits (header, badges) — même rendu, nettement plus fluide.
- 🌍 **Doublage adapté à la langue** : la rangée d'accueil « VF » devient « Doublés en `<ta langue>` » dans les 10 langues, chips DUB/SUB localisés partout (VF/VOSTFR, DUB/SUB, 吹替/字幕…), et les titres très longs du carousel réduisent leur taille automatiquement.
- 🔗 **Pages officielles accessibles** : les liens du footer (Premium, CGU, confidentialité…) ouvrent les vraies pages Crunchyroll via un contournement *à usage unique* (`?bcr=native`) impossible à laisser bloqué.
- 🧭 **Confort** : bouton retour-en-haut, raccourci `/` ou `Ctrl+K` vers la Recherche, filtres de recherche *sticky* en panneau de verre, compteurs de titres sur les pages grilles, page Paramètres relevée (carte système, avatar à double anneau, trame manga).

### v1.13.1

- 🌍 **Correctif langue forcée en français** ([#18](https://github.com/JeremGamingYT/BetterCrunchyroll/issues/18)) : l'extension démarrait toujours en français, quelle que soit la langue du navigateur, sans aucun moyen de la changer. Elle détecte désormais la langue du navigateur au premier lancement (repli sûr sur l'anglais si elle n'est pas supportée).
- 🗣️ **Support natif de 10 langues** pour l'interface BetterCR (le *redesign*) : français, anglais, espagnol, portugais, allemand, italien, arabe (RTL), russe, japonais, hindi — la même liste que Crunchyroll propose déjà pour l'audio/les sous-titres.
- 🎛️ **Nouveaux menus déroulants** : les listes de langues (Paramètres, pied de page, connexion) et les filtres de la page Recherche utilisaient le `<select>` natif du navigateur, dont la popup s'affichait en texte clair sur fond blanc — quasi illisible sur le thème sombre. Remplacés par un composant déroulant maison, lisible et cohérent avec le thème.
- 🔎 **Recherche simplifiée** : les boutons « VF » / « VOSTFR » sont remplacés par un seul filtre « Audio » (Tous / VF / VOSTFR), cohérent avec les autres filtres.

### v1.13.0

- **Kill switch intelligent (résilience)** : drapeau distant `health.json` (pause manuelle + version minimale, *fail-open*), auto-détection des pannes d'API Crunchyroll (≥3 endpoints de lecture distincts ; les mutations sont ignorées pour éviter les faux positifs) avec **reprise automatique**, repli gracieux vers le Crunchyroll natif + bandeau d'info, statut dans le popup. Le skin du lecteur est protégé par un *fail-safe* (laisse le lecteur natif intact si CR change son DOM).
- **Fix watchlist** : ajout/retrait de nouveau synchronisés au compte Crunchyroll — CR a retiré le segment `/discover/` de la route d'ajout (`POST /content/v2/{account}/watchlist`). Diagnostics : le statut + le message d'erreur exact de l'API CR sont désormais loggés.
- **Outil de maintenance** : `tools/cr-dumper/` capture et structure automatiquement les requêtes/API de Crunchyroll pour suivre ses changements (voir `tools/cr-dumper/README.md`).

### v1.12.2

- 🌐 **Écrans d'erreur / vide traduits** : ils s'affichaient en français pour tout le monde
  (sur l'accueil, la fiche, les grilles, etc.) — désormais correctement en FR/EN.
- 🔖 **Fiche série** : l'icône Watchlist devient un **signet** (au lieu de la coche bizarre).
- 🧭 **404** : le bouton « Rechercher un titre » mène enfin à la **page Recherche**.
- 📋 **Watchlist** : le compteur et l'état vide suivent l'**onglet actif** (Récent / Favoris),
  et le libellé « Récent » est traduit.
- 🗓️ « ép. » (Sorties à venir) et « Charger plus » (grilles) **traduits**.
- ✨ **Animations d'entrée réactivées** : la classe interne n'était jamais posée, donc le
  réglage « Animations » ne faisait rien ; il est maintenant fonctionnel. + styles d'état
  manquants (bouton d'ajout du Hero, cloche de notifications).

### v1.12.1

- ⚡ **Écran de chargement instantané** : un splash BetterCR (logo + spinner) s'affiche dès
  l'ouverture de l'overlay (directement dans l'`index.html`, avant même le JS), ce qui **couvre le
  flash de Crunchyroll** au démarrage ; il est remplacé par l'app une fois prête.
- 🚀 **Accueil plus rapide** : le flux d'accueil (rangées du catalogue) est mis en cache **3 min**,
  donc un rechargement ou un retour à l'accueil est quasi-instantané. Le « Continuer à regarder »
  reste **live** (aucune progression périmée).

### v1.12.0

- 🔔 **Bannière de mise à jour dans le site** : quand une nouvelle version est disponible, un
  bandeau apparaît directement dans l'overlay BetterCR (plus seulement dans le popup de l'icône),
  avec un bouton **Mettre à jour** (ouvre les *releases*) et une croix pour l'ignorer. Il lit le
  cache rempli par le *background* (aucune requête réseau en plus), se met à jour **en direct**, et
  ne réapparaît plus une fois la version ignorée.

### v1.11.0

- 🧹 **Passe qualité pré-lancement** (audit NASA Power-of-Ten + Google TS Style) : suppression de
  tout le **code mort** (composants/hooks/exports/types inutilisés), **déduplication** (helper
  `relTime` partagé, icône `eyeOff` dédoublée), **zéro warning** TypeScript & ESLint.
- 🔐 **Permissions réduites** : retrait des `host_permissions` non utilisées
  (`static`/`cr-play-service`/`beta-api.crunchyroll.com`) et de la permission `activeTab` — surface
  d'autorisations minimale (mieux pour la confiance + le Chrome Web Store).
- 🌐 **Correctifs i18n** : « Continuer à regarder » et les badges des cartes
  (**NEW/SIMULCAST**, durées) s'affichent désormais correctement en anglais.
- ➕ **Hero** : le bouton d'ajout à la **watchlist** (sur la bannière d'accueil) est maintenant
  fonctionnel.
- ⚡ **Mises à jour** : la vérification de version ne part plus à chaque réveil du service worker
  (évite tout risque de *rate-limit* GitHub).

### v1.10.4

- 🔇 **Correctif audio (vraie cause)** : en quittant la page Lecteur via la navigation interne
  (Accueil, header/footer…), le lecteur natif est désormais **bien arrêté**. Le `pushState`
  mettait à jour la référence d'URL lui-même, si bien que le démontage du lecteur — et donc la
  mise en pause — ne se déclenchait jamais. La navigation re-synchronise maintenant l'overlay,
  et toutes les balises média sont mises en pause au départ.

### v1.10.3

- 📏 **Barre de progression affinée** : la couleur d'accent n'est appliquée qu'à la **fine piste**
  native (et plus à toute la zone de clic), donc la barre n'est plus épaisse.
- 🖼️ **Aperçus arrondis** : les vignettes de prévisualisation (au survol de la barre) ont des
  coins arrondis.
- ⏭️ **Plus de double « Passer l'intro »** : Crunchyroll propose déjà ses boutons de saut natifs —
  on garde **les siens** et on a retiré celui que BetterCR ajoutait (qui faisait doublon).

### v1.10.2

- 🎛️ **Contrôles du lecteur aux couleurs de BetterCR** : la **barre de progression**, le pouce, le
  curseur de volume et le **survol des boutons** du lecteur natif reprennent ta **couleur d'accent**
  (ciblage des vrais contrôles Crunchyroll : `timeline-slider`, `data-testid`…). Le lecteur reste
  le lecteur natif — seul son style est ajusté.
- 🔇 **Correctif audio** : le lecteur se met en **pause** quand tu quittes la page Lecteur (fini le
  son de l'épisode qui continue après avoir cliqué sur « Accueil » ou une autre page).

### v1.10.1

- 🎬 **Lecteur habillé** : le lecteur natif de Crunchyroll est désormais **encadré** pour matcher
  le design (coins arrondis, ombre profonde, et un **liseré à ta couleur d'accent** qui se
  synchronise avec les Paramètres). Le lecteur n'est jamais remplacé — seulement stylisé autour.

### v1.10.0

- 🧩 **Menu d'extension** : un clic sur l'icône BetterCR ouvre un popup avec un interrupteur
  **Activer / Désactiver** (en direct, sans recharger — quand c'est off, Crunchyroll s'affiche
  normalement), la version installée, et des liens (code source, signaler un bug).
- 🔔 **Détecteur de mise à jour** : l'extension vérifie les *releases* GitHub et affiche une
  **pastille sur l'icône** + un bouton **Télécharger** dans le menu quand une nouvelle version
  est disponible. *(Une build chargée en local ne peut pas s'auto-installer — c'est réservé au
  Chrome Web Store — donc c'est une détection + invitation à mettre à jour.)*

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
- **Phase 5 — faite** : kill switch intelligent (résilience aux changements de Crunchyroll) + outil de capture/structuration d'API (`tools/cr-dumper`).
- **Ensuite** : contrôles custom du lecteur (skip intro/outro, sync playhead), packaging Web Store.

> Interface non affiliée à Crunchyroll. Données via votre propre compte.
