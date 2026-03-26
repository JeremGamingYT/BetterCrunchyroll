---
mode: 'agent'
tools: ['codebase', 'editFiles', 'runCommands', 'fetch', 'search']
description: >
  BetterCrunchyroll — trois tâches de développement principales :
  (1) Auth guard Crunchyroll, (2) Intégration des lecteurs Improve-Crunchyroll & CrOptix,
  (3) Page d'accueil style Disney+.
---

# BetterCrunchyroll — Tâches principales

Tu travailles sur le projet **BetterCrunchyroll** (Next.js 14 App Router, TypeScript, Tailwind CSS, pnpm).
Lis d'abord les fichiers clés avant de modifier quoi que ce soit :
- `app/page.tsx` — page d'accueil
- `hooks/use-auth.ts` et `hooks/use-token.ts` — gestion d'auth
- `lib/token-manager.ts` — singleton de token Crunchyroll
- `components/hero-carousel.tsx`, `components/anime-section.tsx`, `components/anime-card.tsx`
- `extension/manifest.json`, `extension/content-script.js`, `extension/watch-ui.js`
- `app/watch/[id]/page.tsx` — page de lecture

---

## Tâche 1 — Authentification : vérification & redirection

**Objectif** : s'assurer que l'utilisateur est connecté à Crunchyroll avant d'accéder au contenu.  
Si ce n'est pas le cas, le rediriger vers la page officielle de connexion Crunchyroll.

### Règles à respecter

1. **Dans `lib/token-manager.ts`** : `isTokenValid()` retourne déjà `true/false`.  
   Utilise cette méthode pour déterminer si une session active existe.

2. **Guard sur la page d'accueil (`app/page.tsx`)** :
   - Côté client, appelle `useToken()` de `hooks/use-token.ts` pour obtenir `{ hasToken, isReady }`.
   - Quand `isReady === true` et `hasToken === false`, rediriger vers :
     ```
     https://www.crunchyroll.com/fr/login?redirect_url=https://www.crunchyroll.com
     ```
   - Affiche un `<LoadingScreen />` pendant que `isReady === false`.

3. **Guard sur la page de lecture (`app/watch/[id]/page.tsx`)** :
   - Applique la même logique : non connecté → redirection vers Crunchyroll login.
   - Affiche un état de chargement pendant la vérification.

4. **Composant réutilisable** : crée `components/auth-guard.tsx` qui encapsule cette logique.  
   Interface attendue :
   ```tsx
   <AuthGuard>{children}</AuthGuard>
   ```
   Ce composant wrap n'importe quelle page et gère la redirection automatiquement.

5. **Ne pas** supprimer la page interne `/connexion` — elle sert quand l'utilisateur
   veut se connecter manuellement via les identifiants Crunchyroll dans l'app.

### Critères de succès
- [ ] Un utilisateur sans token valide est redirigé vers `crunchyroll.com/login`
- [ ] Le composant `AuthGuard` est utilisé sur `app/page.tsx` et `app/watch/[id]/page.tsx`
- [ ] `pnpm build` passe sans erreur TypeScript

---

## Tâche 2 — Intégration du lecteur vidéo amélioré

**Objectif** : intégrer les fonctionnalités des deux extensions dans le lecteur de BetterCrunchyroll.

### Sources à intégrer

| Projet | URL | Licence | Fonctionnalités clés |
|--------|-----|---------|----------------------|
| Improve-Crunchyroll | https://github.com/ThomasTavernier/Improve-Crunchyroll | MIT | Lecteur agrandi, sélecteur de qualité, raccourcis clavier, navigation épisode suivant/précédent |
| CrOptix | https://github.com/stratumadev/croptix | AGPL-3.0 | Remplacement Katamari→Vilos, sélecteur de résolution, mode théâtre, PiP, vitesses de lecture |

> ⚠️ **CrOptix est sous licence AGPL-3.0** : tout code dérivé doit rester open-source
> et inclure l'attribution de copyright originale.

### Approche d'intégration

L'extension BetterCrunchyroll existe déjà dans `extension/`. **Pas besoin de recréer from scratch.**

1. **Télécharger** le code source de chaque repo (via `git clone` dans un dossier temporaire `tmp/`) :
   ```bash
   git clone https://github.com/ThomasTavernier/Improve-Crunchyroll tmp/improve-cr
   git clone https://github.com/stratumadev/croptix tmp/croptix
   ```

2. **Analyser** les fichiers pertinents avant d'intégrer :
   - `tmp/improve-cr/lib/` — logique du lecteur
   - `tmp/improve-cr/bin/` — scripts compilés
   - `tmp/croptix/src/` — source TypeScript
   - `tmp/croptix/static/` — patches Vilos

3. **Dans `extension/watch-ui.js`** — intégrer :
   - Raccourcis clavier (←/→ seek 10s, espace pause, `n` épisode suivant, `p` précédent, `f` fullscreen)
   - Sélecteur de résolution/qualité visible à l'écran
   - Mode théâtre (masquer l'UI autour du player)
   - Vitesses de lecture : 0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×
   - Picture-in-Picture via l'API Web standard `requestPictureInPicture()`

4. **Dans `extension/content-script.js`** — ajouter si nécessaire :
   - Patch pour forcer le lecteur Vilos si disponible (depuis CrOptix)
   - Agrandissement automatique du player (depuis Improve-Crunchyroll)

5. **Dans `extension/manifest.json`** — vérifier que les permissions nécessaires sont présentes
   (`storage`, `tabs`, éventuellement `activeTab`).

6. **Nettoyer** `tmp/` après intégration.

### Critères de succès
- [ ] Les raccourcis clavier fonctionnent sur `crunchyroll.com/fr/watch/*`
- [ ] Un sélecteur de résolution est visible dans l'UI du player
- [ ] Le mode théâtre masque le header/sidebar Crunchyroll
- [ ] Les vitesses de lecture sont accessibles
- [ ] Le PiP fonctionne via un bouton ou raccourci
- [ ] Aucune régression sur les fonctionnalités existantes de l'extension
- [ ] Attribution des licences MIT et AGPL-3.0 dans les en-têtes de fichiers concernés

---

## Tâche 3 — Page d'accueil style Disney+

**Objectif** : refactoriser `app/page.tsx` et les composants associés pour reproduire
une mise en page proche de celle de Disney+ (captures d'écran fournies par l'utilisateur).

### Structure cible de la page

```
┌─────────────────────────────────────────────────────────┐
│  HERO BANNER PLEIN ÉCRAN                                │
│  (titre + métadonnées + bouton DÉTAILS + indicateurs)   │
│  [bouton mute/unmute en haut à droite]                  │
├─────────────────────────────────────────────────────────┤
│  Section : "Recommandés pour vous"                      │
│  → Cartes portrait (ratio 2:3), scroll horizontal      │
│  → Badges de genre/année superposés                    │
├─────────────────────────────────────────────────────────┤
│  Section : "Continuer à regarder"                       │
│  → Cartes paysage (ratio 16:9) avec barre de progrès   │
│  → Overlay "Il reste X min"                            │
├─────────────────────────────────────────────────────────┤
│  Section : "Ajouts récents"                             │
│  → Cartes portrait avec badge "Nouveau"                 │
├─────────────────────────────────────────────────────────┤
│  Section : "Vous aimerez peut-être aussi"               │
│  → Cartes portrait standard                             │
└─────────────────────────────────────────────────────────┘
```

### Détails d'implémentation

#### Hero Banner (`components/hero-carousel.tsx`)
- Plein écran sans marges, image/vidéo de fond en `object-fit: cover`
- Overlay gradient : `linear-gradient(to right, rgba(0,0,0,0.8) 0%, transparent 60%)`
- Overlay gradient bas : `linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)`
- Titre plein écran (grand, bold, bas-gauche)
- Métadonnées : badge rating (TV-MA/TV-14/PG), année, genres séparés par `•`
- Bouton "DÉTAILS" : blanc, border solide, px-6 py-2, sans fond coloré
- Bouton mute : en haut à droite, icône SVG, fond semi-transparent
- Indicateurs de slide (points) centrés en bas
- Logo de plateforme (ex. Disney+, Hulu) en bas à droite quand applicable

#### Cartes portrait (`components/anime-card.tsx`)
- Ratio 2:3 (width: `w-40 md:w-48`, aspect-ratio: `aspect-[2/3]`)
- `object-fit: cover`, `border-radius: 8px`
- Overlay au survol : assombrissement + bouton play centré
- Titre en bas avec gradient, taille `text-sm font-medium`
- Badges : rating (TV-MA, etc.), année, genres en `text-xs text-gray-400`

#### Cartes paysage pour "Continuer à regarder" (`components/continue-watching.tsx`)
- Ratio 16:9
- Barre de progression en bas : hauteur `3px`, couleur orange `#F47521`
- Overlay texte en bas à gauche : "Il reste X min" en `text-xs text-gray-300`
- Badge de plateforme en haut à gauche (si applicable)

#### Sections horizontales scrollables
- `flex gap-4 overflow-x-auto scroll-smooth pb-2`
- Masquer la scrollbar CSS : `scrollbar-hide` (class Tailwind ou custom)
- Titre de section : `text-xl font-bold text-white mb-3`

#### Couleurs globales (à vérifier dans `app/globals.css`)
- Fond principal : `#0D0D0D` (pas de blanc pur)
- Texte principal : `#FFFFFF`
- Texte secondaire : `#9CA3AF` (gray-400)
- Accent orange Crunchyroll : `#F47521`

### Critères de succès
- [ ] La page ressemble visuellement aux captures d'écran Disney+ fournies
- [ ] Le hero banner prend toute la hauteur viewport sur desktop
- [ ] Les sections sont scrollables horizontalement sans scrollbar visible
- [ ] Les cartes portrait ont le bon ratio 2:3
- [ ] Les cartes "Continuer à regarder" affichent la barre de progression
- [ ] `pnpm build` passe sans erreur TypeScript ni erreur de lint

---

## Instructions générales pour l'agent

1. **Toujours lire un fichier avant de le modifier.**
2. **pnpm** est le gestionnaire de paquets (jamais npm ou yarn).
3. **Valider** avec `pnpm build` après chaque tâche.
4. **Ne pas sur-ingéniérer** : modifie uniquement ce qui est nécessaire.
5. **Commit atomique par tâche** si git est utilisé.
6. Si une dépendance manque, l'installer via `pnpm add <pkg>`.
7. En cas de conflit entre fonctionnalités existantes et nouvelles, **préserver l'existant** et étendre.
