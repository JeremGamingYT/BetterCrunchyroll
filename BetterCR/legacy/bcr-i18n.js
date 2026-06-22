/* BetterCR — internationalisation FR/EN
   - état de langue persistant (localStorage)
   - t(key, vars) : recherche avec repli FR puis clé brute
   - useLang() : hook React qui re-rend l'arbre au changement de langue */

window.BCR_I18N = {
  fr: {
    /* ---- Header / nav ---- */
    "nav.home": "Accueil",
    "nav.series": "Séries",
    "nav.films": "Films",
    "nav.simulcast": "Simulcast",
    "nav.watchlist": "Watchlist",
    "menu.user": "Utilisateur",
    "menu.premium": "Premium",
    "menu.avatar": "Changer d'avatar",
    "menu.settings": "Paramètres",
    "menu.logout": "Déconnexion",

    /* ---- Connexion / Inscription ---- */
    "auth.tab.login": "Connexion",
    "auth.tab.signup": "Inscription",
    "auth.brandline": "La maison des otakus",
    "auth.aside.kicker": "Dernières sorties",
    "auth.aside.title": "Des milliers d'épisodes. Dès leur sortie au Japon.",
    "auth.aside.sub": "Simulcast en illimité, VF & VOSTFR, sans pub. Reprenez là où vous vous étiez arrêté.",
    "auth.login.title": "Bon retour parmi nous",
    "auth.login.sub": "Connectez-vous pour reprendre vos animes.",
    "auth.signup.title": "Créer un compte",
    "auth.signup.sub": "Gratuit en 30 secondes. Pas de carte requise.",
    "auth.field.name": "Nom d'utilisateur",
    "auth.field.name.ph": "Votre pseudo otaku",
    "auth.field.email": "Adresse e-mail",
    "auth.field.email.ph": "vous@exemple.com",
    "auth.field.password": "Mot de passe",
    "auth.field.password.ph": "••••••••",
    "auth.field.confirm": "Confirmer le mot de passe",
    "auth.remember": "Se souvenir de moi",
    "auth.forgot": "Mot de passe oublié ?",
    "auth.terms": "J'accepte les conditions et la politique de confidentialité",
    "auth.cta.login": "Se connecter",
    "auth.cta.signup": "Créer mon compte",
    "auth.or": "ou continuer avec",
    "auth.noaccount": "Pas encore de compte ?",
    "auth.hasaccount": "Déjà un compte ?",
    "auth.switch.signup": "Inscrivez-vous",
    "auth.switch.login": "Connectez-vous",
    "auth.back": "Retour à l'accueil",
    "auth.social.google": "Google",
    "auth.social.discord": "Discord",
    "auth.social.apple": "Apple",

    /* ---- Au revoir (déconnexion) ---- */
    "bye.title": "À bientôt !",
    "bye.sub": "Matane ! On garde votre place au chaud.",
    "bye.tag": "// déconnexion…",

    /* ---- Recherche ---- */
    "search.placeholder": "Rechercher un anime, un film…",
    "search.popular": "Recherches populaires",
    "search.noresult": "Aucun résultat pour « {q} »",

    /* ---- Communs ---- */
    "common.seeAll": "Tout voir",
    "common.episodes": "{n} épisodes",
    "common.epShort": "{n} ép.",
    "common.minLeft": "{n} min restantes",
    "common.left": "reste {n} min",
    "common.watched": "regardé",
    "common.seen": "Vu",
    "common.watch": "Regarder",
    "common.moreInfo": "Plus d'infos",
    "common.min": "{n} min",
    "common.featured": "À la une",
    "common.selection": "Sélection",

    /* ---- Badges ---- */
    "flag.new": "NOUVEAU",
    "flag.simulcast": "SIMULCAST",
    "flag.newEp": "NOUVEL ÉPISODE",

    /* ---- Tags hero ---- */
    "tag.shonen": "Shōnen culte",
    "tag.scifi": "Science-fiction",
    "tag.romance": "Romance",

    /* ---- Rangées accueil ---- */
    "row.continue": "Continuer à regarder",
    "row.reco": "Recommandés pour vous",
    "row.reco.sub": "D'après vos derniers visionnages",
    "row.recent": "Ajouts récents",
    "row.recent.sub": "Fraîchement ajoutés au catalogue",
    "row.popular": "Populaires",
    "row.popular.sub": "Ce que la communauté regarde en ce moment",
    "row.simulcast": "Simulcast de la saison",
    "row.vf": "Doublés en français (VF)",
    "row.vostfr": "Sous-titrés (VOSTFR)",
    "row.top10": "Top 10 cette semaine",
    "row.gems": "Pépites à découvrir",
    "section.top10.sub": "Les titres les plus regardés en ce moment",
    "section.genres": "Parcourir par genre",
    "section.genres.sub": "Trouvez votre prochaine obsession",

    /* ---- Genres ---- */
    "genre.action": "Action",
    "genre.romance": "Romance",
    "genre.fantasy": "Fantastique",
    "genre.comedy": "Comédie",
    "genre.scifi": "Science-fiction",
    "genre.slice": "Tranche de vie",
    "genre.adventure": "Aventure",
    "genre.drama": "Drame",

    /* ---- Bandeau promo ---- */
    "promo.kicker": "BetterCR Premium",
    "promo.title": "Sans pub. En 1080p. Dès la sortie au Japon.",
    "promo.desc": "Profitez du simulcast en illimité, du téléchargement hors-ligne et d'un son haute qualité sur tous vos écrans.",
    "promo.cta": "Essayer 14 jours offerts",
    "promo.note": "Sans engagement · résiliable à tout moment",

    /* ---- Pages grilles ---- */
    "grid.series.title": "Séries populaires",
    "grid.series.sub": "Le catalogue trié par popularité",
    "grid.films.title": "Films",
    "grid.films.sub": "Longs-métrages et compilations",
    "grid.simulcast.title": "Simulcast",
    "grid.simulcast.sub": "Les épisodes diffusés cette saison, dès leur sortie au Japon",

    /* ---- Détails ---- */
    "detail.series": "Série",
    "detail.seasons": "{n} saisons",
    "detail.resume": "Reprendre",
    "detail.start": "Commencer",
    "detail.inWatchlist": "Dans la watchlist",
    "detail.watchlist": "Watchlist",
    "detail.about": "À propos",
    "detail.info": "Informations",
    "detail.season": "Saison",
    "detail.related": "Dans le même esprit",
    "detail.facet.about": "Synopsis",
    "detail.facet.info": "Informations",
    "detail.facet.awards": "Distinctions",
    "detail.facet.team": "Studio & équipe",
    "facts.studio": "Studio",
    "facts.author": "Auteur",
    "facts.magazine": "Prépublication",
    "award.won": "Remporté",
    "award.nominee": "Nomination",
    "facts.year": "Année",
    "facts.seasons": "Saisons",
    "facts.episodes": "Épisodes",
    "facts.rating": "Classification",
    "facts.languages": "Langues",
    "facts.awards": "Distinctions",
    "facts.awardsN": "{n} récompenses",

    /* ---- Lecteur ---- */
    "player.upnext": "À suivre",
    "player.viewSeries": "Voir la fiche de la série",
    "player.aired": "Diffusé le {d}",

    /* ---- Watchlist ---- */
    "wl.title": "Ma watchlist",
    "wl.count": "{n} titres suivis",
    "wl.all": "Tous",
    "wl.newEps": "Nouveaux épisodes",
    "wl.inprogress": "En cours",
    "wl.favorites": "Favoris",
    "wl.fav": "Ajouter aux favoris",
    "wl.unfav": "Retirer des favoris",
    "wl.empty": "Rien ici pour l'instant.",
    "wl.emptyFav": "Aucun favori pour l'instant.",
    "wl.browse": "Parcourir le catalogue",
    "wl.showmore": "Afficher plus ({n})",
    "wl.remove": "Retirer de la watchlist",

    /* ---- Paramètres / Stats ---- */
    "set.title": "Paramètres",
    "set.sub": "Ton profil et tes statistiques de visionnage",
    "set.memberSince": "Membre depuis 2021",
    "set.statsTitle": "Tes statistiques",
    "set.stat.series": "Animés suivis",
    "set.stat.eps": "Épisodes vus",
    "set.stat.hours": "Heures de visionnage",
    "set.stat.favs": "Favoris",
    "set.stat.done": "Séries terminées",
    "set.stat.progress": "En cours",
    "set.stat.days": "Jours cumulés",
    "set.stat.streak": "Jours d'affilée",
    "set.breakdownTitle": "Langues de visionnage",
    "set.vf": "VF (doublé)",
    "set.vostfr": "VOSTFR (sous-titré)",
    "set.favTitle": "Tes favoris",
    "set.favEmpty": "Tu n'as pas encore de favoris. Ajoute-en depuis ta watchlist.",
    "set.seeWatchlist": "Voir la watchlist",
    "set.prefTitle": "Préférences",
    "set.pref.lang": "Langue de l'interface",
    "set.pref.more": "Plus d'options dans le panneau Tweaks",
    "set.unit.h": "h",

    /* ---- Footer ---- */
    "ftr.tagline": "L'anime comme il devrait être. Une interface repensée, plus rapide et plus belle, pour votre catalogue.",
    "ftr.col.browse": "Explorer",
    "ftr.col.account": "Mon compte",
    "ftr.col.help": "Aide",
    "ftr.col.bcr": "BetterCR",
    "ftr.link.new": "Nouveautés",
    "ftr.link.simulcast": "Simulcast",
    "ftr.link.genres": "Genres",
    "ftr.link.films": "Films",
    "ftr.link.profile": "Profil",
    "ftr.link.watchlist": "Watchlist",
    "ftr.link.history": "Historique",
    "ftr.link.subscription": "Abonnement",
    "ftr.link.faq": "FAQ",
    "ftr.link.devices": "Appareils",
    "ftr.link.contact": "Nous contacter",
    "ftr.link.status": "État des services",
    "ftr.link.about": "À propos",
    "ftr.link.press": "Presse",
    "ftr.link.jobs": "Recrutement",
    "ftr.link.community": "Communauté",
    "ftr.lang": "Langue",
    "ftr.social": "Suivez-nous",
    "ftr.status.label": "État du service",
    "ftr.status.ext": "Extension active",
    "ftr.status.connected": "Connecté à Crunchyroll",
    "ftr.status.comments": "Commentaires activés",
    "ftr.status.oss": "Open-source",
    "ftr.version": "v2.4 · stable",
    "ftr.terms": "Conditions",
    "ftr.privacy": "Confidentialité",
    "ftr.cookies": "Cookies",
    "ftr.see404": "Voir la page 404",
    "ftr.note": "Indépendant, non affilié à Crunchyroll. Toutes les données de votre compte restent LOCALES / sur les serveurs Crunchyroll (je me fiche de vos données).",
    "ftr.copyright": "@2026–2062 BetterCR — Créé avec <3",

    /* ---- 404 ---- */
    "nf.code": "404",
    "nf.title": "Cette page a disparu dans un autre monde",
    "nf.desc": "Le lien que vous cherchez a été isekai. Pas de panique — votre prochain épisode vous attend ailleurs.",
    "nf.home": "Retour à l'accueil",
    "nf.search": "Rechercher un titre",
    "nf.suggest": "Ou reprenez l'un de ces titres",
    "nf.gifalt": "Personnage d'anime perplexe"
  },

  en: {
    /* ---- Header / nav ---- */
    "nav.home": "Home",
    "nav.series": "Series",
    "nav.films": "Movies",
    "nav.simulcast": "Simulcast",
    "nav.watchlist": "Watchlist",
    "menu.user": "User",
    "menu.premium": "Premium",
    "menu.avatar": "Change avatar",
    "menu.settings": "Settings",
    "menu.logout": "Log out",

    /* ---- Login / Sign up ---- */
    "auth.tab.login": "Log in",
    "auth.tab.signup": "Sign up",
    "auth.brandline": "The home of otaku",
    "auth.aside.kicker": "Latest releases",
    "auth.aside.title": "Thousands of episodes. Straight from Japan.",
    "auth.aside.sub": "Unlimited simulcast, dub & sub, no ads. Pick up right where you left off.",
    "auth.login.title": "Welcome back",
    "auth.login.sub": "Log in to resume your anime.",
    "auth.signup.title": "Create your account",
    "auth.signup.sub": "Free in 30 seconds. No card required.",
    "auth.field.name": "Username",
    "auth.field.name.ph": "Your otaku handle",
    "auth.field.email": "Email address",
    "auth.field.email.ph": "you@example.com",
    "auth.field.password": "Password",
    "auth.field.password.ph": "••••••••",
    "auth.field.confirm": "Confirm password",
    "auth.remember": "Remember me",
    "auth.forgot": "Forgot password?",
    "auth.terms": "I agree to the terms and privacy policy",
    "auth.cta.login": "Log in",
    "auth.cta.signup": "Create my account",
    "auth.or": "or continue with",
    "auth.noaccount": "No account yet?",
    "auth.hasaccount": "Already have an account?",
    "auth.switch.signup": "Sign up",
    "auth.switch.login": "Log in",
    "auth.back": "Back home",
    "auth.social.google": "Google",
    "auth.social.discord": "Discord",
    "auth.social.apple": "Apple",

    /* ---- Goodbye (logout) ---- */
    "bye.title": "See you soon!",
    "bye.sub": "Matane! We'll keep your spot warm.",
    "bye.tag": "// logging out…",

    /* ---- Search ---- */
    "search.placeholder": "Search for an anime, a movie…",
    "search.popular": "Popular searches",
    "search.noresult": "No results for “{q}”",

    /* ---- Common ---- */
    "common.seeAll": "See all",
    "common.episodes": "{n} episodes",
    "common.epShort": "{n} ep.",
    "common.minLeft": "{n} min left",
    "common.left": "{n} min left",
    "common.watched": "watched",
    "common.seen": "Watched",
    "common.watch": "Watch",
    "common.moreInfo": "More info",
    "common.min": "{n} min",
    "common.featured": "Featured",
    "common.selection": "Selection",

    /* ---- Badges ---- */
    "flag.new": "NEW",
    "flag.simulcast": "SIMULCAST",
    "flag.newEp": "NEW EPISODE",

    /* ---- Hero tags ---- */
    "tag.shonen": "Cult shōnen",
    "tag.scifi": "Sci-fi",
    "tag.romance": "Romance",

    /* ---- Home rows ---- */
    "row.continue": "Continue watching",
    "row.reco": "Recommended for you",
    "row.reco.sub": "Based on what you've been watching",
    "row.recent": "Recently added",
    "row.recent.sub": "Freshly added to the catalog",
    "row.popular": "Popular",
    "row.popular.sub": "What the community is watching right now",
    "row.simulcast": "This season's simulcast",
    "row.vf": "French dub (VF)",
    "row.vostfr": "Subtitled (VOSTFR)",
    "row.top10": "Top 10 this week",
    "row.gems": "Hidden gems",
    "section.top10.sub": "The most-watched titles right now",
    "section.genres": "Browse by genre",
    "section.genres.sub": "Find your next obsession",

    /* ---- Genres ---- */
    "genre.action": "Action",
    "genre.romance": "Romance",
    "genre.fantasy": "Fantasy",
    "genre.comedy": "Comedy",
    "genre.scifi": "Sci-Fi",
    "genre.slice": "Slice of Life",
    "genre.adventure": "Adventure",
    "genre.drama": "Drama",

    /* ---- Promo banner ---- */
    "promo.kicker": "BetterCR Premium",
    "promo.title": "Ad-free. In 1080p. The moment it airs in Japan.",
    "promo.desc": "Unlimited simulcast, offline downloads and high-quality audio on every screen you own.",
    "promo.cta": "Start your 14-day free trial",
    "promo.note": "No commitment · cancel anytime",

    /* ---- Grid pages ---- */
    "grid.series.title": "Popular series",
    "grid.series.sub": "The catalog sorted by popularity",
    "grid.films.title": "Movies",
    "grid.films.sub": "Feature films and compilations",
    "grid.simulcast.title": "Simulcast",
    "grid.simulcast.sub": "Episodes airing this season, straight from Japan",

    /* ---- Details ---- */
    "detail.series": "Series",
    "detail.seasons": "{n} seasons",
    "detail.resume": "Resume",
    "detail.start": "Start",
    "detail.inWatchlist": "In watchlist",
    "detail.watchlist": "Watchlist",
    "detail.about": "About",
    "detail.info": "Information",
    "detail.season": "Season",
    "detail.related": "More like this",
    "detail.facet.about": "Synopsis",
    "detail.facet.info": "Information",
    "detail.facet.awards": "Awards",
    "detail.facet.team": "Studio & staff",
    "facts.studio": "Studio",
    "facts.author": "Author",
    "facts.magazine": "Serialized in",
    "award.won": "Won",
    "award.nominee": "Nominee",
    "facts.year": "Year",
    "facts.seasons": "Seasons",
    "facts.episodes": "Episodes",
    "facts.rating": "Rating",
    "facts.languages": "Languages",
    "facts.awards": "Awards",
    "facts.awardsN": "{n} awards",

    /* ---- Player ---- */
    "player.upnext": "Up next",
    "player.viewSeries": "View series page",
    "player.aired": "Aired {d}",

    /* ---- Watchlist ---- */
    "wl.title": "My watchlist",
    "wl.count": "{n} titles followed",
    "wl.all": "All",
    "wl.newEps": "New episodes",
    "wl.inprogress": "In progress",
    "wl.favorites": "Favorites",
    "wl.fav": "Add to favorites",
    "wl.unfav": "Remove from favorites",
    "wl.empty": "Nothing here yet.",
    "wl.emptyFav": "No favorites yet.",
    "wl.browse": "Browse the catalog",
    "wl.showmore": "Show more ({n})",
    "wl.remove": "Remove from watchlist",

    /* ---- Settings / Stats ---- */
    "set.title": "Settings",
    "set.sub": "Your profile and viewing statistics",
    "set.memberSince": "Member since 2021",
    "set.statsTitle": "Your statistics",
    "set.stat.series": "Anime followed",
    "set.stat.eps": "Episodes watched",
    "set.stat.hours": "Hours watched",
    "set.stat.favs": "Favorites",
    "set.stat.done": "Series completed",
    "set.stat.progress": "In progress",
    "set.stat.days": "Total days",
    "set.stat.streak": "Day streak",
    "set.breakdownTitle": "Viewing languages",
    "set.vf": "Dubbed",
    "set.vostfr": "Subtitled",
    "set.favTitle": "Your favorites",
    "set.favEmpty": "No favorites yet. Add some from your watchlist.",
    "set.seeWatchlist": "Go to watchlist",
    "set.prefTitle": "Preferences",
    "set.pref.lang": "Interface language",
    "set.pref.more": "More options in the Tweaks panel",
    "set.unit.h": "h",

    /* ---- Footer ---- */
    "ftr.tagline": "Anime the way it should be. A rethought interface — faster and better looking — for your catalog.",
    "ftr.col.browse": "Browse",
    "ftr.col.account": "My account",
    "ftr.col.help": "Help",
    "ftr.col.bcr": "BetterCR",
    "ftr.link.new": "New releases",
    "ftr.link.simulcast": "Simulcast",
    "ftr.link.genres": "Genres",
    "ftr.link.films": "Movies",
    "ftr.link.profile": "Profile",
    "ftr.link.watchlist": "Watchlist",
    "ftr.link.history": "History",
    "ftr.link.subscription": "Subscription",
    "ftr.link.faq": "FAQ",
    "ftr.link.devices": "Devices",
    "ftr.link.contact": "Contact us",
    "ftr.link.status": "Service status",
    "ftr.link.about": "About",
    "ftr.link.press": "Press",
    "ftr.link.jobs": "Careers",
    "ftr.link.community": "Community",
    "ftr.lang": "Language",
    "ftr.social": "Follow us",
    "ftr.status.label": "Service status",
    "ftr.status.ext": "Extension active",
    "ftr.status.connected": "Connected to Crunchyroll",
    "ftr.status.comments": "Comments enabled",
    "ftr.status.oss": "Open-source",
    "ftr.version": "v2.4 · stable",
    "ftr.terms": "Terms",
    "ftr.privacy": "Privacy",
    "ftr.cookies": "Cookies",
    "ftr.see404": "See the 404 page",
    "ftr.note": "Independent, not affiliated with Crunchyroll. All data from your account is LOCAL / Crunchyroll server (I don't care about your data).",
    "ftr.copyright": "@2026–2062 BetterCR — Created with <3",

    /* ---- 404 ---- */
    "nf.code": "404",
    "nf.title": "This page got isekai'd to another world",
    "nf.desc": "The link you're after vanished into another dimension. Don't panic — your next episode is waiting elsewhere.",
    "nf.home": "Back home",
    "nf.search": "Search a title",
    "nf.suggest": "Or jump back into one of these",
    "nf.gifalt": "Confused anime character"
  }
};

/* ---- Traductions de contenu (titres / synopsis) ----
   Le jeu de données statique est un export Crunchyroll à langue unique.
   Cette table fournit les variantes par langue pour le contenu mis en avant ;
   loc() retombe sur la valeur d'origine quand aucune traduction n'existe. */
window.BCR_I18N_CONTENT = {
  /* JUJUTSU KAISEN */
  "GRDV0019R": {
    en: { desc: "JUJUTSU KAISEN is a manga by Gege Akutami serialized in Weekly Shonen Jump and adapted into an anime by Studio MAPPA. To save a classmate, Yuji Itadori swallows a cursed object \u2014 a finger of the demon Ryomen Sukuna, the King of Curses \u2014 and ends up sharing his body with him. Curses are supernatural beings born from human negativity, and that same cursed energy fuels the sorcerers who fight them. Yuji enrolls at Tokyo Jujutsu High, where, under his teacher Satoru Gojo, he befriends first-years Megumi Fushiguro and Nobara Kugisaki and begins his initiation into the dangerous world of exorcism." }
  },
  /* 86 EIGHTY-SIX */
  "GVDHX8DM5": {
    fr: { desc: "Pour répondre aux attaques de drones autonomes lancées par l'empire voisin de Giad, la république de San Magnolia aligne ses propres drones de combat, surnommés « Juggernaut » et présentés comme sans pilote, afin de mener la guerre sans la moindre perte humaine. En réalité, ces engins sont pilotés par les habitants du 86e district, considérés comme moins que des humains et rayés des registres officiels." },
    en: { desc: "To counter the autonomous drone attacks launched by the neighboring Empire of Giad, the Republic of San Magnolia fields combat drones called \u201cJuggernauts\u201d \u2014 supposedly piloted by no one, so the war can be waged without casualties. In truth, those machines are crewed by the people of the 86th district, deemed less than human and erased from the official count." }
  },
  /* A Sign of Affection */
  "GEXH3W2V7": {
    fr: { desc: "Yuki, étudiante sourde, voit son monde s'ouvrir le jour où un camarade, Itsuomi, lui vient en aide. Loin d'être déconcerté par sa surdité, il échange avec elle aussi naturellement qu'avec n'importe qui. Grand voyageur parlant plusieurs langues, il l'entraîne vers des expériences et des sentiments qu'elle n'avait encore jamais connus." },
    en: { desc: "Yuki is a deaf university student whose world opens up the day a classmate, Itsuomi, comes to her aid. Unfazed that she cannot hear, he speaks with her as naturally as anyone \u2014 and as a well-traveled student fluent in several languages, he draws her toward experiences and feelings she has never known." }
  }
};

(function () {
  var KEY = "bcr_lang_v1";
  var lang = "fr";
  try { lang = localStorage.getItem(KEY) || "fr"; } catch (e) {}
  if (lang !== "fr" && lang !== "en") lang = "fr";
  window.__BCR_LANG = lang;
  document.documentElement.lang = lang;

  var subs = [];
  window.getLang = function () { return window.__BCR_LANG; };
  window.setLang = function (l) {
    if (l !== "fr" && l !== "en") return;
    window.__BCR_LANG = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    document.documentElement.lang = l;
    subs.slice().forEach(function (fn) { fn(l); });
  };
  window.onLangChange = function (fn) {
    subs.push(fn);
    return function () { subs = subs.filter(function (x) { return x !== fn; }); };
  };
  window.t = function (key, vars) {
    var dict = window.BCR_I18N[window.__BCR_LANG] || window.BCR_I18N.fr;
    var s = dict[key];
    if (s == null) s = window.BCR_I18N.fr[key];
    if (s == null) s = key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split("{" + k + "}").join(vars[k]);
      });
    }
    return s;
  };

  /* Renvoie le champ (title/desc) localisé d'une entrée, sinon la valeur d'origine. */
  window.loc = function (obj, field, id) {
    if (!obj) return "";
    id = id || obj.id;
    var map = window.BCR_I18N_CONTENT[id];
    var lng = window.__BCR_LANG;
    if (map && map[lng] && map[lng][field] != null) return map[lng][field];
    return obj[field];
  };

  /* Hook React (React est déjà chargé avant ce script) */
  window.useLang = function () {
    var st = React.useState(window.__BCR_LANG);
    React.useEffect(function () {
      return window.onLangChange(function (nl) { st[1](nl); });
    }, []);
    return [st[0], window.setLang];
  };
})();
