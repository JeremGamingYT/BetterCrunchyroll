# cr-dumper — Crunchyroll API dumper

Crunchyroll change ses routes ~1×/an (c'est ce qui a cassé la watchlist en v1.13.0 :
le segment `/discover/` retiré de l'ajout). Cet outil **capture les requêtes/API
réelles de Crunchyroll** et les **structure en un dossier propre et diffable**, pour
repérer les changements et mettre BetterCR à jour vite.

## ⭐ Méthode recommandée — `crawl.mjs` (totalement automatique)

Un crawler [Playwright](https://playwright.dev) : il pilote un vrai Chrome, **visite
tout seul toutes les pages** et capture **tout** au niveau réseau du navigateur (donc
aucun angle mort — il voit ce que `capture.js` ne voyait pas).

```bash
cd tools/cr-dumper
npm install            # installe Playwright (une fois)
node crawl.mjs         # 1re fois : connecte-toi quand la fenêtre s'ouvre, puis Entrée
node crawl.mjs         # ensuite : 100 % automatique (session persistante)
```

- **Login une seule fois** : le profil persiste dans `./.cr-profile` (jamais committé).
- Visite : accueil, populaires, nouveautés, A→Z, simulcasts, watchlist, historique,
  profils, préférences, recherche, news + une **fiche série** et une **page /watch**
  découvertes dynamiquement.
- Options : `--headless` · `--out <dir>` · `--locale fr` · **`--mutate`** (capture
  aussi l'ajout/retrait watchlist, *sans toucher ton compte* : il ajoute un titre
  **absent** de ta liste puis le retire).
- Résultat → `./api-dump/` (voir plus bas).

> Playwright tente d'utiliser ton Chrome installé (`channel: chrome`) ; sinon installe
> le navigateur : `npx playwright install chromium`.

## Méthodes de secours (sans Playwright)

**B. Export HAR** (zéro script) : DevTools → Network → *Preserve log*, navigue, puis
*Save all as HAR* → `node structure.mjs session.har`.

**C. `capture.js`** (console) : à coller dans la console DevTools **sur le Crunchyroll
natif, BetterCR désactivé**. ⚠️ Important : collé pendant que l'overlay BetterCR est
actif, il **n'enregistre rien** — les appels passent par le *monde isolé* du
content-script (invisible depuis la console) et l'overlay masque la page native. Une
fois sur le CR natif : navigue, puis `__crDump.save()` → `node structure.mjs cr-api-capture.json`.

## Résultat (`./api-dump/`)

```
api-dump/
  README.md                                  index : table par service
  _raw.json                                  liste fusionnée (machine)
  content/POST__content_v2_{id}_watchlist.md
  content/GET__content_v2_discover_browse.md
  accounts/GET__accounts_v1_me_profile.md
  …
```

Chaque fiche : méthode, host, params de requête, **forme du corps**, **forme de la
réponse** + échantillon tronqué.

## Garder BetterCR à jour

1. Commit un premier `api-dump/` (baseline) : `git add -f api-dump`.
2. Quand quelque chose casse (ex. `404 content.error.route_not_found`), relance
   `node crawl.mjs` (il **écrase** le dossier).
3. `git diff api-dump/` montre **exactement** ce que Crunchyroll a changé → corrige le
   endpoint dans `src/core/api/client.ts`.

## Vie privée

`.cr-profile/`, les HAR et `cr-api-capture.json` sont **gitignorés** (ils contiennent
ta session/token). Le capteur ne stocke jamais le header `Authorization` ; mais
`api-dump/` contient ton **UUID de compte** dans les URLs d'exemple — committe-le en
connaissance de cause.
