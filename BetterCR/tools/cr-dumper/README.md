# cr-dumper — Crunchyroll API capturer + structurer

Crunchyroll change ses routes ~1×/an (c'est ce qui a cassé la watchlist en v1.13.0).
Cet outil **capture tout seul** les requêtes/API que Crunchyroll utilise pendant que
tu navigues, puis les **structure en un dossier propre et diffable** pour repérer
les changements et mettre BetterCR à jour vite.

Deux fichiers, aucun build :

- **`capture.js`** — un capteur à coller dans la console DevTools (s'exécute dans la page).
- **`structure.mjs`** — un script Node qui transforme la capture en `api-dump/`.

---

## Méthode A — capteur (recommandée : inclut les *formes* de réponse)

1. Ouvre **https://www.crunchyroll.com** connecté, puis la console (**F12 → Console**).
2. Colle tout le contenu de **`capture.js`** et valide. Il affiche `capturing…`.
3. **Navigue pour tout exercer** : accueil, une fiche série, une page `/watch`, recherche,
   **ajoute/retire un anime de la watchlist**, ouvre les paramètres, l'historique, etc.
   (Il persiste en `localStorage` → survit aux rechargements.)
4. Vérifie : `__crDump.stats()` — puis exporte : `__crDump.save()` → télécharge `cr-api-capture.json`.
5. Structure :
   ```bash
   node structure.mjs ~/Downloads/cr-api-capture.json
   ```

## Méthode B — export HAR (zéro script en page)

1. **F12 → Network**, coche *Preserve log*, navigue pour tout exercer.
2. Clic droit dans la liste → **Save all as HAR** (ou l'icône d'export) → `session.har`.
3. ```bash
   node structure.mjs session.har
   ```

> `capture.js` est plus propre (filtré + formes de requête/réponse) ; le HAR est plus
> lourd mais ne demande aucun collage. Les deux marchent.

---

## Résultat (`./api-dump/`)

```
api-dump/
  README.md                     index : table par service (content, accounts, auth…)
  _raw.json                     liste fusionnée, lisible par machine
  content/POST__content_v2_{id}_watchlist.md
  content/GET__content_v2_discover_browse.md
  accounts/GET__accounts_v1_me_profile.md
  …
```

Chaque fiche d'endpoint contient : méthode, host, paramètres de requête, **forme du
corps de requête**, **forme de la réponse** + un échantillon tronqué.

## Garder BetterCR à jour

1. Commit un premier `api-dump/`.
2. Plus tard (ou quand quelque chose casse), recapture et relance `structure.mjs` (il
   **écrase** le dossier).
3. `git diff api-dump/` montre **exactement** ce que Crunchyroll a changé (route, params,
   forme) → tu corriges le endpoint correspondant dans `src/core/api/client.ts`.

## Vie privée

La capture filtre **uniquement** les API Crunchyroll (analytics/pubs/static ignorés) et
réduit les corps à des **formes** clé/type. Mais les URLs d'exemple contiennent ton UUID
de compte — ne partage pas le fichier ni `api-dump/` à l'aveugle, et ne committe pas de
token. (Le capteur ne stocke jamais les headers `Authorization`.)
