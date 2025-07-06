# BetterCrunchy – Extension Chrome

> Une refonte moderne, élégante et ultra-pratique de l’expérience Crunchyroll.

---

## Sommaire
1. [Présentation](#présentation)
2. [Fonctionnalités clés](#fonctionnalités-clés)
3. [Détail des améliorations](#détail-des-améliorations)
4. [Personnalisation](#personnalisation)
5. [Installation](#installation)
6. [Développement](#développement)
7. [Roadmap](#roadmap)
8. [Crédits & licence](#crédits--licence)

---

## Présentation
**BetterCrunchy** transforme l’interface web de Crunchyroll en lui apportant un design plus actuel basé sur le *glass-morphism*, des animations fluides et une série d’outils pratiques pensés pour les binge-watchers.

![BetterCrunchy screenshot](./assets/screenshot.png)

---

## Fonctionnalités clés
| Catégorie | Fonction | Description |
|-----------|----------|-------------|
| **Interface** | Design *glass* & thème sombre | Arrière-plan dégradé, cartes translucides, coins arrondis & ombres douces. |
| | Accent dynamique | Couleur d’accent modifiable dans les options → cascade sur tous les éléments clés (boutons, barres de progression, spinner, etc.). |
| | Animation de survol | Cartes, bannières, liens footer : légère élévation + éclaircissement. |
| | Header auto-hide | Masque automatiquement la barre de navigation au scroll pour maximiser l’espace. |
| | Scrollbar custom | Barre fine 10 px + poignée colorée à l’accent. |
| **Cartes** | Suppression du shine | Retrait de l’effet « shine » original des *browse cards*. |
| | Cartes élargies | *Playable / browse cards* élargies (190 px) pour une meilleure visibilité. |
| | Hover simplifié | Masque titres & boutons superflus, recentre le rating & meta. |
| | Bouton « Plus d’options » masqué | Déclencheur supprimé pour un look épuré. |
| **Watchlist & actions** | Boutons colorés | `continue-watching`, `up-next`, `watchlist-cta`, `add/remove-watchlist`, `custom-list`, `share`, `hero-more` → tous recolorés. |
| **Vidéo** | PiP intégré | Bouton ⧉ natif dans la barre de contrôle + raccourci `Ctrl + P`. |
| | Auto-Skip | Saut automatique d’intro/outro & bouton *Skip* auto-click (option). |
| | Auto-Next | Lecture automatique de l’épisode suivant avec compte à rebours (option). |
| | Barre de progression | Couleurs accent (progress, buffer, knob). |
| | Spinner de chargement | Cercle animé recoloré à l’accent. |
| | Coins arrondis | Lecteur HTML5 & contrôles vidéo. |
| **Simulcast Calendar** | Thème dédié | Header translucide, fond sombre, cartes jour en glass-morphisme, boutons mode recolorés. |
| | Affiches arrondies | `.poster-image`, miniatures & popover. |
| **Navigation** | Footer animé | Hover accentué sur tous les liens. |
| | Menu utilisateur | Fond #121317, coins arrondis & verre dépoli. |
| **Performance** | Injection sélective | Extension désactivée sur `store.crunchyroll.com` & `help.crunchyroll.com`. |

---

## Détail des améliorations
### Style global
* Variables CSS `--cr-*` pour rayon, ombres, accent, etc.  
* Arrière-plan sombre dégradé en pseudo-élément `body::before` (z-index -1).  
* Typeface *Inter* chargée depuis Google Fonts.

### Cartes & listes
* Coins arrondis (`var(--cr-radius)`), ombre légère & hover *lift*.  
* Retrait de la brillance (*shine*) et du zoom trop marqué.  
* Boutons Play/Add masqués pour un aperçu plus clean.

### Vidéo / Player Vilos
* **PiP** : insertion dynamique du bouton dans la barre de contrôle ou flottant.  
* **Auto-Skip** introductions/outros + toast de confirmation.  
* **Auto-Next** configurable avec overlay d’annulation.  
* Barre de progression & segments recolorés.  
* Spinner Lottie recoloré via CSS & JS.  
* Coins du player et des contrôles arrondis.

### Simulcast Calendar
* Thème sombre dédié isolé dans `calendar.css`.  
* Header & boutons mode *glass* + accent.  
* Colonnes espacées (`gap`), affiches arrondies, hover lift.

### Footer & liens
* Hover animé (lift + accent).  
* Texte hérité, couleur accent au survol.

### Menu utilisateur
* Fond sombre (#121317) + glass blur & ombre.  
* Coins arrondis pour s’aligner sur la navbar.

---

## Personnalisation
Ouvrez le **popup** de BetterCrunchy :
1. Choisissez la couleur d’accent (couleur HEX).  
2. Définissez le rayon global (px).  
3. Activez/désactivez : Couleur des titres, Auto-Hide Header, Auto-Skip, Auto-Next.

Les changements sont appliqués **instantanément** sur les pages actives (ou après rafraîchissement si nécessaire).

---

## Installation
1. Téléchargez ou clonez ce dépôt.  
2. Ouvrez `chrome://extensions` → **Mode développeur**.  
3. **Charger l’extension non empaquetée** → sélectionnez le dossier `BetterCrunchyroll`.  
4. Rendez-vous sur Crunchyroll : l’interface est métamorphosée 🎉

> L’extension s’injecte sur `*.crunchyroll.com` hors Store & Help, et sur `*.vrv.co`.

---

## Développement
* **Manifest V3** – service worker `background.js`.  
* Scripts : `content.js` (général) + `calendar.css` dédié sur Simulcast Calendar.  
* Build : aucune dépendance externe, live-reload via rechargement de l’extension.

### Structure
```
BetterCrunchyroll/
├─ background.js              # service worker (fetch blob, etc.)
├─ content.js                 # logique principale
├─ content.css                # styles globaux CR
├─ calendar.css               # styles spécifiques Simulcast Calendar
├─ manifest.json              # Manifest V3
├─ popup.html / popup.js      # UI options
├─ icons/                     # logos extension
└─ Crunchyroll Default Files/ # ressources originales de référence
```

---

## Roadmap
- [ ] Support complet du **Manga Reader**.  
- [ ] Mode clair optionnel.  
- [ ] Personnalisation avancée des raccourcis clavier.  
- [ ] Portage **Firefox** (MV3 support en cours).

---

## Crédits & licence
*Développé avec ❤️ par la communauté anime.*  
BetterCrunchy est un projet non-officiel, sans lien avec Crunchyroll LLC.  
Licence MIT – voir `LICENSE`. 