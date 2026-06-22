/* BetterCR — composants partagés : icônes, header, cartes, rangées, skeletons */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- Icônes ---------- */
function Ic({ d, fill = false, size = 20, style, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style}
    fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>);

}
const ICONS = {
  play: "M8 5.5v13l11-6.5z",
  pause: "M7 5h3.5v14H7z|M13.5 5H17v14h-3.5z",
  plus: "M12 5v14|M5 12h14",
  check: "M20 6L9 17l-5-5",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20|M12 16v-5|M12 8h.01",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14|M21 21l-4.35-4.35",
  chevL: "M15 18l-6-6 6-6",
  chevR: "M9 18l6-6-6-6",
  chevD: "M6 9l6 6 6-6",
  back: "M19 12H5|M12 19l-7-7 7-7",
  bookmark: "M19 21l-7-4.5L5 21V5a2 2 0 012-2h10a2 2 0 012 2z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8|M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7",
  gear: "M4 7h9|M17 7h3|M4 17h3|M11 17h9|M15 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5|M9 14.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4|M16 17l5-5-5-5|M21 12H9",
  x: "M18 6L6 18|M6 6l12 12",
  star: "M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20|M12 7v5l3.5 2",
  vol: "M11 5L6 9H2v6h4l5 4z|M15.5 8.5a5 5 0 010 7|M18.5 5.5a9 9 0 010 13",
  volX: "M11 5L6 9H2v6h4l5 4z|M22 9l-6 6|M16 9l6 6",
  full: "M8 3H5a2 2 0 00-2 2v3|M16 3h3a2 2 0 012 2v3|M3 16v3a2 2 0 002 2h3|M21 16v3a2 2 0 01-2 2h-3",
  rew: "M3 3v5h5|M3.5 8A9 9 0 1012 3a9.3 9.3 0 00-8.5 5",
  fwd: "M21 3v5h-5|M20.5 8A9 9 0 1112 3a9.3 9.3 0 018.5 5",
  cc: "M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2z|M10.5 10.5a2 2 0 100 3|M17 10.5a2 2 0 100 3",
  next: "M6 5.5v13l9-6.5z|M18 5v14",
  grid: "M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z",
  globe: "M12 22a10 10 0 100-20 10 10 0 000 20|M2 12h20|M12 2a15 15 0 010 20|M12 2a15 15 0 000 20",
  chat: "M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z",
  camera: "M3 8.5a2 2 0 012-2h2L8.5 4.5h7L17 6.5h2a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z|M12 16.5a3.3 3.3 0 100-6.6 3.3 3.3 0 000 6.6",
  send: "M22 2L11 13|M22 2l-7 20-4-9-9-4z",
  compass: "M12 22a10 10 0 100-20 10 10 0 000 20|M15.5 8.5l-2.4 4.6-4.6 2.4 2.4-4.6z",
  home: "M3 11l9-8 9 8|M5 10v10h5v-6h4v6h5V10",
  heart: "M12 20.5l-1.5-1.35C5.4 14.5 2.5 11.9 2.5 8.7 2.5 6.3 4.4 4.5 6.8 4.5c1.4 0 2.7.65 3.5 1.7.8-1.05 2.1-1.7 3.5-1.7 2.4 0 4.3 1.8 4.3 4.2 0 3.2-2.9 5.8-8 11.45z",
  film: "M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z|M7 3v18|M17 3v18|M3 8h4|M3 16h4|M17 8h4|M17 16h4",
  flame: "M12 22a7 7 0 007-7c0-3-2-5-3-7-1.5 2-3 2.5-3 4 0 .8-.7 1.2-1.3.7C9.5 11.5 9 9 10.5 6 7.5 7.5 5 10.5 5 15a7 7 0 007 7z",
  trophy: "M7 4h10v4a5 5 0 01-10 0z|M7 6H4v1a3 3 0 003 3|M17 6h3v1a3 3 0 01-3 3|M9 14h6|M12 14v4|M8 21h8|M10 18h4",
  chart: "M4 20V10|M10 20V4|M16 20v-6|M22 20H2",
  sparkle: "M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9|M13.7 21a2 2 0 01-3.4 0",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  discord: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6066 3.9495-1.5218 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  google: "M21.35 11.1H12v3.24h5.38c-.23 1.4-1.6 4.12-5.38 4.12A5.96 5.96 0 016 12.46 5.96 5.96 0 0112 6.5c1.72 0 2.88.74 3.54 1.37l2.42-2.33C16.4 3.97 14.42 3 12 3a9 9 0 100 18c5.2 0 8.64-3.66 8.64-8.8 0-.6-.06-1.04-.16-1.5z",
  apple: "M16.36 1.43c.05 1.06-.35 2.08-1.04 2.85-.72.8-1.87 1.4-2.97 1.32-.05-1.02.4-2.06 1.07-2.78.74-.78 1.98-1.36 2.94-1.39z|M19.6 17.2c-.5 1.16-.74 1.68-1.39 2.7-.9 1.42-2.18 3.2-3.76 3.2-1.4.02-1.76-.92-3.66-.9-1.9.01-2.3.92-3.7.9-1.58-.01-2.79-1.6-3.7-3.02C.8 16.1.56 11.4 2.2 8.9c1.17-1.78 3.02-2.82 4.76-2.82 1.77 0 2.88.97 4.35.97 1.42 0 2.29-.97 4.34-.97 1.55 0 3.2.85 4.37 2.3-3.84 2.1-3.22 7.6.58 8.82z",
  mail: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z|M3.5 7.5l8.5 6 8.5-6",
  lock: "M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z|M8 11V8a4 4 0 018 0v3",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z|M12 15a3 3 0 100-6 3 3 0 000 6",
  eyeOff: "M2 12s3.5-7 10-7c1.4 0 2.7.33 3.9.9|M22 12s-3.5 7-10 7c-1.4 0-2.7-.33-3.9-.9|M9.9 9.9a3 3 0 004.2 4.2|M3 3l18 18"
};
window.Icon = function Icon({ name, ...rest }) {
  const filled = ["play", "pause", "star", "bookmark", "next"].includes(name) && rest.fill !== false;
  return <Ic d={ICONS[name]} fill={rest.solid != null ? rest.solid : filled} {...rest} />;
};

/* ---------- Hooks ---------- */
window.useInView = function useInView(margin = "0px 0px -8% 0px") {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {if (e.isIntersecting) {setVis(true);io.disconnect();}}, { rootMargin: margin });
    io.observe(el);
    /* filet de sécurité : si l'observer ne se déclenche pas (iframe masquée), on révèle quand même */
    const fb = setTimeout(() => {setVis(true);io.disconnect();}, 1100);
    return () => {io.disconnect();clearTimeout(fb);};
  }, []);
  return [ref, vis];
};

/* Ajoute .is-mounted une frame après le montage (transitions d'entrée) */
window.Mounted = function Mounted({ className = "", children, ...rest }) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setM(true), 40);
    return () => clearTimeout(id);
  }, []);
  return <div className={className + (m ? " is-mounted" : "")} {...rest}>{children}</div>;
};

/* Simule un chargement réseau la 1re fois qu'un type de page est visité */
const loadedOnce = {};
window.useFakeLoad = function useFakeLoad(key, ms = 850) {
  const [loading, setLoading] = useState(!loadedOnce[key]);
  useEffect(() => {
    if (loadedOnce[key]) return;
    const t = setTimeout(() => {loadedOnce[key] = true;setLoading(false);}, ms);
    return () => clearTimeout(t);
  }, [key]);
  return loading;
};

/* ---------- Couleur par titre (proxy de coverImage.color / AniList) ---------- */
const _ccache = {};
window.animeColor = function animeColor(seed) {
  seed = String(seed || "");
  if (_ccache[seed]) return _ccache[seed];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {h ^= seed.charCodeAt(i);h = Math.imul(h, 16777619);}
  const hue = (h >>> 0) % 360;
  const sat = 60 + (h >>> 9) % 16;
  const col = "hsl(" + hue + " " + sat + "% 61%)";
  _ccache[seed] = col;
  return col;
};

/* ---------- Petits éléments ---------- */
window.Chip = function Chip({ children, tone = "ghost", className = "" }) {
  return <span className={"chip chip-" + tone + " " + className}>{children}</span>;
};
window.Prog = function Prog({ value, slim = false }) {
  return (
    <div className={"prog" + (slim ? " prog-slim" : "")}>
      <div className="prog-fill" style={{ width: value + "%" }}></div>
    </div>);

};

/* ---------- Carte affiche (poster) ---------- */
window.PosterCard = function PosterCard({ anime, index = 0, onOpen, onPlay, showNew = false, showAiring = false }) {
  const [marked, setMarked] = useState(false);
  const meta = [];
  if (anime.year) meta.push(anime.year);
  if (anime.eps) meta.push(t("common.epShort", { n: anime.eps }));
  return (
    <div className="pcard" style={{ animationDelay: Math.min(index * 45, 360) + "ms", "--cardc": animeColor(anime.id + anime.title) }}>
      <button className="pcard-hit" onClick={() => onOpen && onOpen(anime)} aria-label={anime.title}>
        <div className="pcard-frame">
          <img className="pcard-img" src={anime.poster} alt="" loading="lazy" />
          <div className="pcard-shade"></div>
          {showNew && <span className="flag flag-new">{t("flag.new")}</span>}
          {showAiring && anime.simulcast && <span className="flag flag-air"><i className="dot"></i>{t("flag.simulcast")}</span>}
          <div className="pcard-veil">
            <div className="pcard-actions">
              <span className="round-btn round-acc" onClick={(e) => {e.stopPropagation();onPlay && onPlay(anime);}}>
                <Icon name="play" size={16} />
              </span>
              <span className={"round-btn" + (marked ? " is-on" : "")}
              onClick={(e) => {e.stopPropagation();setMarked(!marked);}}>
                <Icon name={marked ? "check" : "bookmark"} size={15} solid={marked} />
              </span>
            </div>
            <div className="pcard-langs">
              {anime.dub && <Chip tone="line">VF</Chip>}
              {anime.sub && <Chip tone="line">VOSTFR</Chip>}
            </div>
          </div>
        </div>
        <div className="pcard-cap">
          <p className="pcard-title">{anime.title}</p>
          <p className="pcard-meta">{meta.join(" · ")}</p>
        </div>
      </button>
    </div>);

};

/* ---------- Carte « Continuer à regarder » ---------- */
window.ContinueCard = function ContinueCard({ item, index = 0, onPlay }) {
  const remain = Math.max(1, item.durMin - item.playheadMin);
  return (
    <div className="ccard" style={{ animationDelay: Math.min(index * 45, 360) + "ms", "--cardc": animeColor(item.seriesId + item.seriesTitle) }}>
      <button className="ccard-hit" onClick={() => onPlay && onPlay(item)}>
        <div className="ccard-frame">
          <img className="ccard-img" src={item.thumb} alt="" loading="lazy" />
          <div className="ccard-shade"></div>
          <span className="ccard-play"><Icon name="play" size={18} /></span>
          <span className="ccard-remain"><Icon name="clock" size={11} /> {t("common.minLeft", { n: remain })}</span>
        </div>
        <div className="ccard-cap">
          <p className="pcard-title">{item.seriesTitle}</p>
          <p className="pcard-meta">S{item.seasonNum || 1} E{item.epNum} · {item.epTitle}</p>
          <p className="prog-text"><span className="prog-pct">{item.progress} %</span> · {t("common.left", { n: remain })}</p>
        </div>
      </button>
    </div>);

};

/* ---------- Rangée défilante ---------- */
window.Row = function Row({ title, sub, children, onAll }) {
  const scrollerRef = useRef(null);
  const [edges, setEdges] = useState({ l: false, r: true });
  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({ l: el.scrollLeft > 12, r: el.scrollLeft < el.scrollWidth - el.clientWidth - 12 });
  }, []);
  useEffect(() => {update();}, [children]);
  const nudge = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    // NB : la forme options {behavior:"smooth"} est ignorée ici (scroll-behavior CSS déjà smooth) ;
    // on utilise la forme à 2 arguments qui, elle, anime correctement.
    el.scrollBy(dir * el.clientWidth * 0.82, 0);
  };
  return (
    <section className="row">
      <div className="row-head">
        <div className="row-headings">
          <h2 className="row-title">{title}</h2>
          {sub && <p className="row-sub">{sub}</p>}
        </div>
        {onAll && <button className="row-all" onClick={onAll}>{t("common.seeAll")} <Icon name="chevR" size={14} /></button>}
      </div>
      <div className="row-body">
        <div className={"row-fade row-fade-l" + (edges.l ? " is-on" : "")}></div>
        <div className={"row-fade row-fade-r" + (edges.r ? " is-on" : "")}></div>
        <button className={"row-arrow row-arrow-l" + (edges.l ? " is-on" : "")} onClick={() => nudge(-1)} aria-label="Précédent"><Icon name="chevL" size={20} /></button>
        <button className={"row-arrow row-arrow-r" + (edges.r ? " is-on" : "")} onClick={() => nudge(1)} aria-label="Suivant"><Icon name="chevR" size={20} /></button>
        <div className="row-scroll scrollbar-none" ref={scrollerRef} onScroll={update}>{children}</div>
      </div>
    </section>);

};

/* ---------- Skeletons ---------- */
window.SkeletonRow = function SkeletonRow({ landscape = false, count = 8 }) {
  return (
    <section className="row">
      <div className="row-head"><div className="sk sk-title"></div></div>
      <div className="row-scroll scrollbar-none">
        {Array.from({ length: count }).map((_, i) =>
        <div key={i} className={landscape ? "sk-ccard" : "sk-pcard"} style={{ animationDelay: i * 70 + "ms" }}>
            <div className="sk sk-thumb"></div>
            <div className="sk sk-line"></div>
            <div className="sk sk-line sk-short"></div>
          </div>
        )}
      </div>
    </section>);

};
window.SkeletonHero = function SkeletonHero() {
  return (
    <div className="hero hero-sk">
      <div className="sk hero-sk-bg"></div>
      <div className="hero-content">
        <div className="sk sk-line" style={{ width: 120, height: 24, borderRadius: 99 }}></div>
        <div className="sk" style={{ width: "min(540px,46vw)", height: 64, borderRadius: 12, marginTop: 18 }}></div>
        <div className="sk sk-line" style={{ width: "min(420px,38vw)", marginTop: 18 }}></div>
        <div className="sk sk-line" style={{ width: "min(380px,32vw)" }}></div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <div className="sk" style={{ width: 170, height: 48, borderRadius: 12 }}></div>
          <div className="sk" style={{ width: 48, height: 48, borderRadius: 12 }}></div>
        </div>
      </div>
    </div>);

};

/* ---------- Header ---------- */
const NAV = [
{ key: "nav.home", route: "home" },
{ key: "nav.series", route: "series" },
{ key: "nav.films", route: "films" },
{ key: "nav.simulcast", route: "simulcast" },
{ key: "nav.watchlist", route: "watchlist" }];

window.Header = function Header({ route, go, onSearch, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const [ind, setInd] = useState({ left: 0, width: 0, on: false });
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const place = () => {
      const nav = navRef.current;
      if (!nav) return;
      const act = nav.querySelector('[data-active="true"]');
      if (act) setInd({ left: act.offsetLeft, width: act.offsetWidth, on: true });else
      setInd((p) => ({ ...p, on: false }));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [route]);

  useEffect(() => {
    const close = (e) => {if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);};
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const active = NAV.find((n) => n.route === route) ? route : null;
  return (
    <header className={"hdr" + (scrolled ? " is-scrolled" : "")}>
      <div className="hdr-in">
        <button className="hdr-logo" onClick={() => go("home")} aria-label="Accueil">
          <span className="hdr-wordmark">better<b>CR</b></span>
        </button>
        <nav className="hdr-nav" ref={navRef}>
          <span className={"hdr-ind" + (ind.on ? " is-on" : "")} style={{ left: ind.left, width: ind.width }}></span>
          {NAV.map((n) =>
          <button key={n.route} data-active={active === n.route} className={"hdr-link" + (active === n.route ? " is-active" : "")}
          onClick={() => go(n.route)}>{t(n.key)}</button>
          )}
        </nav>
        <div className="hdr-right" ref={menuRef}>
          <button className="hdr-icon" onClick={onSearch} aria-label="Recherche"><Icon name="search" size={19} /></button>
          <button className={"hdr-avatar" + (menuOpen ? " is-open" : "")} onClick={() => setMenuOpen(!menuOpen)} aria-label="Profil">
            <span className="hdr-avatar-img"><Icon name="user" size={16} /></span>
            <Icon name="chevD" size={14} className="hdr-avatar-chev" />
          </button>
          <div className={"menu" + (menuOpen ? " is-open" : "")}>
            <div className="menu-id">
              <span className="menu-avatar"><Icon name="user" size={20} /></span>
              <div>
                <p className="menu-name">{t("menu.user")}</p>
                <p className="menu-prem"><Icon name="star" size={11} /> {t("menu.premium")}</p>
              </div>
            </div>
            <div className="menu-items">
              <button className="menu-item"><Icon name="user" size={16} /> {t("menu.avatar")}</button>
              <button className="menu-item" onClick={() => { setMenuOpen(false); go("settings"); }}><Icon name="gear" size={16} /> {t("menu.settings")}</button>
              <div className="menu-sep"></div>
              <button className="menu-item menu-danger" onClick={() => { setMenuOpen(false); onLogout && onLogout(); }}><Icon name="logout" size={16} /> {t("menu.logout")}</button>
            </div>
          </div>
        </div>
      </div>
    </header>);

};

/* ---------- Recherche plein écran ---------- */
window.SearchOverlay = function SearchOverlay({ open, onClose, onOpenAnime }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {setQ("");setTimeout(() => inputRef.current && inputRef.current.focus(), 60);}
  }, [open]);
  useEffect(() => {
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const all = useMemo(() => {
    const pool = window.BCR_DATA.series.slice();
    if (window.JJK_AS_SERIES) pool.unshift(window.JJK_AS_SERIES);
    return pool;
  }, []);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const t = q.trim().toLowerCase();
    return all.filter((a) => a.title.toLowerCase().includes(t)).slice(0, 12);
  }, [q]);
  return (
    <div className={"search-ov" + (open ? " is-open" : "")} role="dialog" aria-hidden={!open}>
      <div className="search-top">
        <div className="search-box">
          <Icon name="search" size={20} className="search-glyph" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")} className="search-input" />
          {q && <button className="hdr-icon" onClick={() => setQ("")}><Icon name="x" size={16} /></button>}
        </div>
        <button className="search-close" onClick={onClose}><Icon name="x" size={20} /></button>
      </div>
      <div className="search-body scrollbar-none">
        {!q.trim() &&
        <div className="search-hint">
            <p className="search-hint-title">{t("search.popular")}</p>
            <div className="search-tags">
              {["Jujutsu Kaisen", "86 Eighty-Six", "Railgun", "A Sign of Affection", "Cuckoos"].map((s) =>
            <button key={s} className="chip chip-btn" onClick={() => setQ(s)}>{s}</button>
            )}
            </div>
          </div>
        }
        {q.trim() && results.length === 0 &&
        <p className="search-empty">{t("search.noresult", { q: q })}</p>
        }
        <div className="search-grid">
          {results.map((a, i) =>
          <PosterCard key={a.id} anime={a} index={i} onOpen={(x) => {onClose();onOpenAnime(x);}} onPlay={(x) => {onClose();onOpenAnime(x);}} />
          )}
        </div>
      </div>
    </div>);

};

/* ---------- Sélecteur de langue ---------- */
window.LangSwitch = function LangSwitch() {
  const lang = window.getLang ? window.getLang() : "fr";
  const opts = [
  { id: "fr", flag: "🇫🇷", label: "FR" },
  { id: "en", flag: "🇬🇧", label: "EN" }];

  return (
    <div className="lang-switch" role="group" aria-label={t("ftr.lang")}>
      {opts.map((o) =>
      <button key={o.id} className={"lang-opt" + (lang === o.id ? " is-on" : "")}
      onClick={() => window.setLang(o.id)} aria-pressed={lang === o.id}>
          <span className="lang-flag">{o.flag}</span>{o.label}
        </button>
      )}
    </div>);

};

/* ---------- Footer ---------- */
window.Footer = function Footer({ go }) {
  const nav = (page) => (e) => {e.preventDefault();if (go) go(page);};
  const noop = (e) => e.preventDefault();
  const cols = [
  { h: "ftr.col.browse", links: [
    { k: "ftr.link.new", on: nav("series") },
    { k: "ftr.link.simulcast", on: nav("simulcast") },
    { k: "ftr.link.genres", on: nav("home") },
    { k: "ftr.link.films", on: nav("films") }]
  },
  { h: "ftr.col.account", links: [
    { k: "ftr.link.profile", on: noop },
    { k: "ftr.link.watchlist", on: nav("watchlist") },
    { k: "ftr.link.history", on: noop },
    { k: "ftr.link.subscription", on: noop }]
  },
  { h: "ftr.col.help", links: [
    { k: "ftr.link.faq", on: noop },
    { k: "ftr.link.devices", on: noop },
    { k: "ftr.link.contact", on: noop },
    { k: "ftr.link.status", on: noop }]
  },
  { h: "ftr.col.bcr", links: [
    { k: "ftr.link.about", on: noop },
    { k: "ftr.link.press", on: noop },
    { k: "ftr.link.jobs", on: noop },
    { k: "ftr.link.community", on: noop }]
  }];

  return (
    <footer className="ftr">
      <div className="ftr-top">
        <div className="ftr-brand">
          <button className="hdr-logo" onClick={() => go && go("home")} aria-label="Accueil">
            <span className="hdr-wordmark">better<b>CR</b></span>
          </button>
          <p className="ftr-tagline">{t("ftr.tagline")}</p>
          <div className="ftr-social">
            <a className="ftr-oss" href="#" onClick={noop} title="Open-source"><Icon name="github" size={17} solid /> {t("ftr.status.oss")}</a>
          </div>
        </div>
        {cols.map((c) =>
        <div key={c.h} className="ftr-col">
            <h4>{t(c.h)}</h4>
            <ul>
              {c.links.map((l) =>
            <li key={l.k}><a href="#" onClick={l.on}>{t(l.k)}</a></li>
            )}
            </ul>
          </div>
        )}
      </div>
      <div className="ftr-bottom">
        <div className="ftr-bottom-l">
          <span className="lang-label"><Icon name="globe" size={14} /> {t("ftr.lang")}</span>
          <LangSwitch />
        </div>
        <div className="ftr-legal">
          <a href="#" onClick={noop}>{t("ftr.terms")}</a>
          <a href="#" onClick={noop}>{t("ftr.privacy")}</a>
          <a href="#" onClick={noop}>{t("ftr.cookies")}</a>
          <button className="ftr-see404" onClick={() => go && go("notfound")}>
            <Icon name="compass" size={13} /> {t("ftr.see404")}
          </button>
        </div>
        <p className="ftr-note">{t("ftr.note")} &nbsp;·&nbsp; {t("ftr.copyright")}</p>
      </div>
    </footer>);

};

/* ---------- Page 404 ---------- */
const NF_GIFS = [
"https://media.giphy.com/media/edGzBC6GDOhutW32ps/giphy.gif",
"https://media.giphy.com/media/uNzGan0eVgvmZfH6H5/giphy.gif",
"https://media.giphy.com/media/Y4vg6chFftvP2/giphy.gif"];

window.NotFoundPage = function NotFoundPage({ go }) {
  const [gifIdx, setGifIdx] = useState(0);
  const [gifDead, setGifDead] = useState(false);
  const D = window.BCR_DATA;
  const byTitle = (ti) => D.series.find((s) => s.title === ti);
  const picks = [window.JJK_AS_SERIES, byTitle("86 EIGHTY-SIX"), byTitle("A Sign of Affection"),
  byTitle("A Couple of Cuckoos"), byTitle("A Certain Scientific Railgun")].filter(Boolean);
  const onErr = () => {
    if (gifIdx < NF_GIFS.length - 1) setGifIdx(gifIdx + 1);else
    setGifDead(true);
  };
  return (
    <div className="nf" data-screen-label="404">
      <div className="nf-in">
        <div className="nf-gifwrap">
          {!gifDead &&
          <img className="nf-gif" src={NF_GIFS[gifIdx]} alt={t("nf.gifalt")} onError={onErr} />
          }
          <div className="nf-gif-fallback" style={{ display: gifDead ? "grid" : "none" }}>
            <span style={{ fontSize: 30 }}>(╯°□°)╯</span>
            <span>// anime_reaction.gif</span>
          </div>
          <span className="nf-gif-tag">404 · NANI?!</span>
        </div>
        <div className="nf-text">
          <div className="nf-code">{t("nf.code")}</div>
          <h1 className="nf-title">{t("nf.title")}</h1>
          <p className="nf-desc">{t("nf.desc")}</p>
          <div className="nf-cta">
            <button className="btn btn-acc" onClick={() => go("home")}><Icon name="home" size={17} /> {t("nf.home")}</button>
            <button className="btn btn-glass" onClick={() => go("series")}><Icon name="search" size={17} /> {t("nf.search")}</button>
          </div>
          <div className="nf-suggest">
            <p className="nf-suggest-h">{t("nf.suggest")}</p>
            <div className="nf-chips">
              {picks.map((p) =>
              <button key={p.id} className="chip chip-btn" onClick={() => go("detail", { series: p })}>{p.title}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

};

Object.assign(window, { Ic });