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

## Feuille de route

- **Phase 1 (faite)** : fondation, pipeline sans serveur, Accueil, Catalogue, Fiche série, Tweaks.
- **Phase 2** : Recherche avancée, Watchlist (compte), Continuer à regarder (playheads), Similaires.
- **Phase 3** : `/watch` — skin BetterCR sur le lecteur natif, skip intro/outro, sync playhead.
- **Phase 4** : login de secours, états d'erreur/vides, locale, page Paramètres, packaging Web Store.

> Interface non affiliée à Crunchyroll. Données via votre propre compte.
