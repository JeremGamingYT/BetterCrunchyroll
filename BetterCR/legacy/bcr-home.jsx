/* BetterCR — Accueil : hero carousel + rangées */
const { useState, useEffect, useRef, useMemo } = React;

const D = window.BCR_DATA;
const byTitle = (t) => D.series.find((s) => s.title === t);

/* La fiche JJK sous forme de série (pour hero + navigation) */
const JJK_AS_SERIES = {
  id: D.jjk.id, title: D.jjk.title, desc: D.jjk.desc, poster: D.jjk.poster,
  wide: D.jjk.wide, wideXL: D.jjk.wide, eps: D.jjk.eps, year: D.jjk.year,
  dub: D.jjk.dub, sub: D.jjk.sub, simulcast: false, rating: D.jjk.rating, isJJK: true
};

const HERO_TITLES = ["86 EIGHTY-SIX", "A Sign of Affection"];
const HERO = [JJK_AS_SERIES].concat(HERO_TITLES.map(byTitle).filter(Boolean));
window.JJK_AS_SERIES = JJK_AS_SERIES;
const HERO_TAG_KEYS = { "JUJUTSU KAISEN": "tag.shonen", "86 EIGHTY-SIX": "tag.scifi", "A Sign of Affection": "tag.romance" };
const heroTag = (title) => HERO_TAG_KEYS[title] ? t(HERO_TAG_KEYS[title]) : t("common.selection");

/* Vraies bandes-annonces officielles (Crunchyroll Collection, YouTube) */
const HERO_YT = {
  "JUJUTSU KAISEN": "pkKu9hLT-t8",
  "86 EIGHTY-SIX": "VSdS29SDvn4",
  "A Sign of Affection": "v50CI8LVwEY"
};

const HERO_DELAY = 32000;
const IMAGE_HOLD = 3200;

function ytEmbed(id, muted) {
  var origin = "";
  try {origin = "&origin=" + encodeURIComponent(location.origin) + "&widget_referrer=" + encodeURIComponent(location.href);} catch (e) {}
  return "https://www.youtube.com/embed/" + id +
  "?autoplay=1&mute=" + (muted ? 1 : 0) + "&controls=0&loop=1&playlist=" + id +
  "&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1" + origin;
}

function HeroCarousel({ go }) {
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [phase, setPhase] = useState("image");
  const [trailerReady, setTrailerReady] = useState(false);
  const timerRef = useRef(null);
  const phaseRef = useRef(null);
  const frameRef = useRef(null);
  const slide = HERO[idx];
  const trailer = HERO_YT[slide.title];
  const live = phase === "trailer" && !!trailer;
  const showVideo = live && trailerReady;

  const next = (n) => setIdx((p) => (p + n + HERO.length) % HERO.length);

  useEffect(() => {
    timerRef.current = setTimeout(() => next(1), HERO_DELAY);
    return () => clearTimeout(timerRef.current);
  }, [idx]);

  /* phase image (quelques secondes) puis bande-annonce */
  useEffect(() => {
    setPhase("image");
    setMuted(true);
    clearTimeout(phaseRef.current);
    phaseRef.current = setTimeout(() => setPhase("trailer"), IMAGE_HOLD);
    return () => clearTimeout(phaseRef.current);
  }, [idx]);

  /* On ne révèle la vidéo QUE si le lecteur YouTube confirme son démarrage
     (handshake postMessage). Sinon l'affiche cinématique reste — aucune erreur visible. */
  useEffect(() => {
    setTrailerReady(false);
    if (!live) return;
    const onMsg = (e) => {
      const w = frameRef.current && frameRef.current.contentWindow;
      if (!w || e.source !== w) return;
      if (typeof e.data !== "string") return;
      /* on confirme uniquement sur une vraie activité de lecture (infoDelivery / état / prêt) */
      if (e.data.indexOf("infoDelivery") > -1 || e.data.indexOf("onStateChange") > -1 || e.data.indexOf("onReady") > -1) {
        setTrailerReady(true);
      }
    };
    window.addEventListener("message", onMsg);
    const nudge = setInterval(() => {
      const w = frameRef.current && frameRef.current.contentWindow;
      if (w) {try {w.postMessage(JSON.stringify({ event: "listening" }), "*");} catch (e) {}}
    }, 350);
    const stop = setTimeout(() => clearInterval(nudge), 5000);
    return () => {window.removeEventListener("message", onMsg);clearInterval(nudge);clearTimeout(stop);};
  }, [live, idx, muted]);

  return (
    <div className="hero" data-screen-label="Hero">
      {HERO.map((h, i) =>
      <div key={h.id} className={"hero-bg" + (i === idx ? " is-active" : "") + (i === idx && live ? " is-trailer" : "")}>
          <img src={h.wideXL || h.wide} alt="" className="hero-img" />
        </div>
      )}
      {trailer &&
      <div className={"hero-video" + (showVideo ? " is-on" : "")} aria-hidden="true">
        {live &&
        <iframe ref={frameRef} key={slide.id + (muted ? "-m" : "-u")} title="Bande-annonce" src={ytEmbed(trailer, muted)}
        frameBorder="0" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture"></iframe>
        }
      </div>
      }
      <div className="hero-grad"></div>
      <div className="hero-grad-side"></div>

      <div className="hero-content" key={slide.id}>
        <span className="hero-kicker"><i className="dot"></i> {t("common.featured")} · {heroTag(slide.title)}</span>
        <h1 className="hero-title">{slide.title}</h1>
        <div className="hero-meta">
          {slide.rating && <Chip tone="line">{slide.rating}</Chip>}
          {slide.year && <span>{slide.year}</span>}
          {slide.eps && <span>{t("common.episodes", { n: slide.eps })}</span>}
          {slide.dub && <Chip tone="line">VF</Chip>}
          {slide.sub && <Chip tone="line">VOSTFR</Chip>}
        </div>
        <p className="hero-desc">{window.loc(slide, "desc")}</p>
        <div className="hero-cta">
          <button className="btn btn-acc" onClick={() => go("watch", { series: slide, epNum: 1 })}>
            <Icon name="play" size={18} /> {t("common.watch")}
          </button>
          <button className="btn btn-glass" onClick={() => go("detail", { series: slide })}>
            <Icon name="info" size={18} /> {t("common.moreInfo")}
          </button>
          <button className="btn btn-icon" aria-label="Ajouter à la watchlist"><Icon name="plus" size={18} /></button>
        </div>
      </div>

      <div className="hero-side">
        {showVideo &&
        <button className="btn btn-icon hero-mute" onClick={() => setMuted(!muted)}
        title="Activer / couper le son de la bande-annonce" aria-label="Son de la bande-annonce">
          <Icon name={muted ? "volX" : "vol"} size={17} />
        </button>
        }
      </div>

      <div className="hero-foot">
        <button className="hero-nav" onClick={() => next(-1)} aria-label="Précédent"><Icon name="chevL" size={18} /></button>
        <div className="hero-dots">
          {HERO.map((h, i) =>
          <button key={h.id} className={"hero-dot" + (i === idx ? " is-active" : "")} onClick={() => setIdx(i)} aria-label={h.title}>
              <span className="hero-dot-fill" style={i === idx ? { animationDuration: HERO_DELAY + "ms" } : null}></span>
            </button>
          )}
        </div>
        <button className="hero-nav" onClick={() => next(1)} aria-label="Suivant"><Icon name="chevR" size={18} /></button>
      </div>
    </div>);

}

/* ---------- Sélections de rangées ---------- */
function pickTitles(titles) {return titles.map(byTitle).filter(Boolean);}

const ROW_RECO = [JJK_AS_SERIES].concat(pickTitles([
"86 EIGHTY-SIX", "A Sign of Affection", "A Place Further Than the Universe",
"'Tis Time for \"Torture,\" Princess", "A Couple of Cuckoos", "Adachi and Shimamura",
"ACCA: 13-Territory Inspection Dept.", "A Lull in the Sea (Nagi-Asu: Nagi no Asukara)",
"A Certain Scientific Railgun", "Afro Samurai", "Ace Attorney"]
));
const ROW_NEW = D.series.filter((s) => s.year >= 2024).slice(0, 14);
const ROW_POP = D.series.slice(4, 18);
const ROW_SIMUL = D.series.filter((s) => s.simulcast);
const ROW_VF = D.series.filter((s) => s.dub).slice(0, 14);
const ROW_VOSTFR = D.series.filter((s) => s.sub && !s.dub).slice(0, 14);

const byId = (id) => D.series.find((s) => s.id === id);
const ROW_TOP10 = [JJK_AS_SERIES].concat(pickTitles([
"86 EIGHTY-SIX", "A Sign of Affection", "A Couple of Cuckoos", "A Certain Scientific Railgun",
"A Place Further Than the Universe", "Afro Samurai", "Adachi and Shimamura",
"A Returner's Magic Should Be Special", "Ace Attorney"])).slice(0, 10);
const ROW_GEMS = D.series.filter((s) => s.sub).slice(11, 25);

const GENRES = [
{ key: "genre.action", id: "G5PHNMW59", c: "#e0556b" },
{ key: "genre.romance", id: "GEXH3W2V7", c: "#e070a8" },
{ key: "genre.fantasy", id: "GEXH3W207", c: "#8a6fe0" },
{ key: "genre.comedy", id: "G1XHJV0KV", c: "#e0a13f" },
{ key: "genre.scifi", id: "GVDHX8DM5", c: "#3f9fe0" },
{ key: "genre.slice", id: "GYK541EPR", c: "#3fc08a" },
{ key: "genre.adventure", id: "G79H23ZVX", c: "#e07a3f" },
{ key: "genre.drama", id: "GR49M7GP6", c: "#6f86e0" }];


/* ---------- Top 10 (rangée classée) ---------- */
function Top10Row({ items, go }) {
  return (
    <section className="row">
      <div className="row-head"><h2 className="row-title">{t("row.top10")}</h2></div>
      <div className="t10-scroll scrollbar-none">
        {items.map((a, i) => {
          const meta = [a.year, a.eps && t("common.epShort", { n: a.eps })].filter(Boolean).join(" · ");
          return (
          <div key={a.id} className={"t10card" + (i === 9 ? " is-ten" : "")}
          style={{ animationDelay: Math.min(i * 45, 360) + "ms", "--cardc": animeColor(a.id + a.title) }}>
            <span className="t10-rank">{i + 1}</span>
            <div className="t10-poster">
              <button className="pcard-hit" onClick={() => go("detail", { series: a })} aria-label={a.title}>
                <div className="pcard-frame">
                  <img className="pcard-img" src={a.poster} alt="" loading="lazy" />
                  <div className="pcard-shade"></div>
                  <div className="t10-veil">
                    <p className="t10-title">{a.title}</p>
                    {meta && <p className="t10-meta">{meta}</p>}
                  </div>
                </div>
              </button>
            </div>
          </div>);

        })}
      </div>
    </section>);

}

/* ---------- Parcourir par genre ---------- */
function GenreSection({ go }) {
  return (
    <section className="row">
      <div className="row-head"><h2 className="row-title">{t("section.genres")}</h2></div>
      <div className="genre-grid">
        {GENRES.map((g, i) => {
          const s = byId(g.id);
          return (
            <button key={g.key} className="genre-card" style={{ "--gc": g.c, animationDelay: Math.min(i * 40, 320) + "ms" }}
            onClick={() => go("series")}>
              {s && <img src={s.wide || s.poster} alt="" loading="lazy" />}
              <span className="genre-label">{t(g.key)}</span>
              <span className="genre-arrow"><Icon name="chevR" size={18} /></span>
            </button>);

        })}
      </div>
    </section>);

}

/* ---------- Bandeau promo Premium ---------- */
/* Retiré à la demande de l'équipe (pas de branding Crunchyroll officiel). */

window.HomePage = function HomePage({ go }) {
  const loading = useFakeLoad("home");
  if (loading) {
    return (
      <div>
        <SkeletonHero />
        <div className="rows">
          <SkeletonRow landscape count={6} />
          <SkeletonRow count={9} />
          <SkeletonRow count={9} />
        </div>
      </div>);

  }
  const openDetail = (a) => go("detail", { series: a });
  const playFirst = (a) => go("watch", { series: a, epNum: 1 });
  return (
    <div data-screen-label="Accueil">
      <HeroCarousel go={go} />
      <div className="rows">
        <Row title={t("row.continue")}>
          {D.cont.map((c, i) =>
          <ContinueCard key={c.seriesId + c.epNum} item={c} index={i}
          onPlay={(it) => go("watch", { cont: it })} />
          )}
        </Row>
        <Row title={t("row.reco")} sub={t("row.reco.sub")} onAll={() => go("series")}>
          {ROW_RECO.map((a, i) => <PosterCard key={a.id} anime={a} index={i} onOpen={openDetail} onPlay={playFirst} />)}
        </Row>
        <Top10Row items={ROW_TOP10} go={go} />
        <Row title={t("row.recent")} sub={t("row.recent.sub")} onAll={() => go("series")}>
          {ROW_NEW.map((a, i) => <PosterCard key={a.id} anime={a} index={i} showNew onOpen={openDetail} onPlay={playFirst} />)}
        </Row>
        <GenreSection go={go} />
        <Row title={t("row.popular")} sub={t("row.popular.sub")} onAll={() => go("series")}>
          {ROW_POP.map((a, i) => <PosterCard key={a.id} anime={a} index={i} onOpen={openDetail} onPlay={playFirst} />)}
        </Row>
        {ROW_SIMUL.length > 0 &&
        <Row title={t("row.simulcast")} onAll={() => go("simulcast")}>
            {ROW_SIMUL.map((a, i) => <PosterCard key={a.id} anime={a} index={i} showAiring onOpen={openDetail} onPlay={playFirst} />)}
          </Row>
        }
        <Row title={t("row.gems")} onAll={() => go("series")}>
          {ROW_GEMS.map((a, i) => <PosterCard key={a.id} anime={a} index={i} onOpen={openDetail} onPlay={playFirst} />)}
        </Row>
        <Row title={t("row.vf")}>
          {ROW_VF.map((a, i) => <PosterCard key={a.id} anime={a} index={i} onOpen={openDetail} onPlay={playFirst} />)}
        </Row>
        <Row title={t("row.vostfr")}>
          {ROW_VOSTFR.map((a, i) => <PosterCard key={a.id} anime={a} index={i} onOpen={openDetail} onPlay={playFirst} />)}
        </Row>
      </div>
    </div>);

};

/* ---------- Pages grilles (Séries / Films / Simulcast) ---------- */
window.GridPage = function GridPage({ go, variant }) {
  const loading = useFakeLoad("grid-" + variant);
  const conf = {
    series: { title: t("grid.series.title"), sub: t("grid.series.sub"), data: D.series },
    films: { title: t("grid.films.title"), sub: t("grid.films.sub"), data: D.series.slice().sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 24) },
    simulcast: { title: t("grid.simulcast.title"), sub: t("grid.simulcast.sub"), data: D.series.filter((s) => s.simulcast).concat(D.series.filter((s) => s.year >= 2025)).slice(0, 24) }
  }[variant];
  const openDetail = (a) => go("detail", { series: a });
  return (
    <div className="page-pad" data-screen-label={conf.title}>
      <div className="page-head">
        <h1 className="page-title">{conf.title}</h1>
        <p className="page-sub">{conf.sub}</p>
      </div>
      {loading ?
      <div className="grid-cards">
          {Array.from({ length: 12 }).map((_, i) =>
        <div key={i} className="sk-pcard" style={{ animationDelay: i * 60 + "ms" }}>
              <div className="sk sk-thumb"></div>
              <div className="sk sk-line"></div>
              <div className="sk sk-line sk-short"></div>
            </div>
        )}
        </div> :

      <div className="grid-cards">
          {conf.data.map((a, i) =>
        <PosterCard key={a.id + i} anime={a} index={i % 12} showAiring={variant === "simulcast"}
        onOpen={openDetail} onPlay={(x) => go("watch", { series: x, epNum: 1 })} />
        )}
        </div>
      }
    </div>);

};