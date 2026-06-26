# cr-dumper — Crunchyroll API dumper

Crunchyroll change ses routes ~1×/an (c'est ce qui a cassé la watchlist en v1.13.0 :
le segment `/discover/` retiré de l'ajout). Cet outil capture les requêtes/API
**réelles** de Crunchyroll et les structure en un dossier propre et **diffable**.

> ⚠️ Crunchyroll est derrière **Cloudflare** : un navigateur lancé « à neuf » par un
> robot se fait bloquer. Toutes les méthodes ci-dessous utilisent donc **ton vrai
> Chrome** (déjà validé par Cloudflare + connecté).

---

## ✅ Méthode A — « Copy all as fetch » (la plus simple, anti-Cloudflare, zéro fichier)

100 % ton Chrome, navigation manuelle → aucun blocage CF. Aucune dépendance (juste Node).

1. Dans **ton Chrome**, **DevTools (F12) → onglet Network**, coche **Preserve log**.
2. Navigue pour tout exercer : accueil, une série, une page /watch, recherche,
   **watchlist (ajoute/retire)**, historique, paramètres…
3. Clic droit dans la liste des requêtes → **Copy all as fetch** (tu sais déjà faire 😉).
4. ```bash
   cd ~/Documents/BetterCR/tools/cr-dumper
   pbpaste | node structure.mjs        # lit le presse-papier — aucun fichier à gérer
   ```
→ génère `api-dump/`.

> Variante fichier (inclut aussi les **réponses**) : clic droit → **Save all as HAR with
> content** → `node structure.mjs session.har`. (« Copy all as fetch » ne capte que les
> requêtes ; ça suffit pour cartographier routes + params + corps.)

## ⚙️ Méthode B — automatique, branchée sur TON Chrome (CDP)

Le crawler se connecte à ton Chrome **déjà ouvert** (donc déjà passé Cloudflare) au
lieu d'en lancer un neuf, puis visite les pages tout seul.

1. **Quitte Chrome complètement** (Cmd+Q).
2. Relance-le avec le port de debug (garde ton profil → connecté + CF validé) :
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222
   ```
3. Dans ce Chrome, ouvre crunchyroll.com une fois (résous le CF si demandé).
4. ```bash
   cd tools/cr-dumper
   npm install          # Playwright (une fois)
   node crawl.mjs --cdp
   ```
Il ouvre un **nouvel onglet dans ton Chrome**, visite toutes les pages, capture, puis
ferme juste cet onglet. Options : `--out <dir>` · `--locale fr` · `--mutate` (ajout/retrait
watchlist, sans toucher ton compte).

> Si une page redéclenche Cloudflare, résous-la dans l'onglet visible : c'est ton vrai
> Chrome, donc une seule fois suffit.

## 🩹 Méthode C — capteur console (dépannage)

`capture.js` à coller dans la console DevTools, **sur le Crunchyroll natif avec BetterCR
désactivé** (popup → off). ⚠️ Avec l'overlay actif il **n'enregistre rien** : les appels
passent par le *monde isolé* du content-script (invisible depuis la console). Sur le CR
natif : navigue, puis `__crDump.save()` → `node structure.mjs cr-api-capture.json`.

---

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
Chaque fiche : méthode, host, params, **forme du corps de requête**, **forme de la
réponse** + échantillon tronqué.

## Garder BetterCR à jour

1. Commit un premier `api-dump/` (baseline) : `git add -f api-dump`.
2. Quand quelque chose casse (`404 content.error.route_not_found`), recapture (A ou B).
3. `git diff api-dump/` montre **exactement** ce que Crunchyroll a changé → corrige le
   endpoint dans `src/core/api/client.ts`.

## Vie privée

`.cr-profile/`, les `*.har` et `cr-api-capture.json` sont **gitignorés** (session/token).
`api-dump/` contient ton **UUID de compte** dans les URLs d'exemple — committe-le en
connaissance de cause (`git add -f api-dump`).
