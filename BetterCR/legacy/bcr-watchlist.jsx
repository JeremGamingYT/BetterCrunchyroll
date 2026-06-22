/* BetterCR — Watchlist */
const { useState, useMemo } = React;

const WD = window.BCR_DATA;

const FILTERS = [
  { id: "all", key: "wl.all" },
  { id: "new", key: "wl.newEps" },
  { id: "progress", key: "wl.inprogress" },
  { id: "fav", key: "wl.favorites" },
];

function WatchlistCard({ item, index, onPlay, onOpen }) {
  const [removed, setRemoved] = useState(false);
  const [fav, setFav] = useState(() => window.BCRFavs.has(item.seriesId));
  const prog = item.durMin ? Math.min(98, Math.round((item.playhead / 60) / item.durMin * 100)) : 0;
  if (removed) return null;
  return (
    <div className="wcard" style={{ animationDelay: Math.min((index % 9) * 40, 320) + "ms", "--cardc": animeColor(item.seriesId + item.seriesTitle) }}>
      <div className="ccard-frame wcard-frame" onClick={() => onPlay(item)}>
        <img className="ccard-img" src={item.thumb} alt="" loading="lazy" />
        <div className="ccard-shade"></div>
        <span className="ccard-play"><Icon name="play" size={16} /></span>
        {item.newEp && <span className="flag flag-new">{t("flag.newEp")}</span>}
        <button className={"wcard-fav" + (fav ? " is-on" : "")} title={t(fav ? "wl.unfav" : "wl.fav")} aria-pressed={fav}
          onClick={(e) => { e.stopPropagation(); setFav(window.BCRFavs.toggle(item.seriesId)); }}>
          <Icon name="heart" size={15} solid={fav} />
        </button>
        <button className="wcard-remove" title={t("wl.remove")}
          onClick={(e) => { e.stopPropagation(); setRemoved(true); }}>
          <Icon name="x" size={13} />
        </button>
      </div>
      <button className="wcard-cap" onClick={() => onOpen(item)}>
        <p className="pcard-title">{item.seriesTitle}</p>
        <p className="pcard-meta">
          {item.epNum ? "S" + (item.seasonNum || 1) + " E" + item.epNum + " · " : ""}{item.epTitle}
        </p>
        {prog > 2 && <p className="prog-text"><span className="prog-pct">{prog} %</span> {t("common.watched")}</p>}
        <div className="wcard-langs">
          {item.dub && <Chip tone="line">VF</Chip>}
          {item.sub && <Chip tone="line">VOSTFR</Chip>}
        </div>
      </button>
    </div>
  );
}

/* Carte « série favorite » : représente l'anime (pas un épisode) — image, titre, langues. */
function FavCard({ item, index, onPlay, onOpen }) {
  const [fav, setFav] = useState(true);
  if (!fav) return null;
  return (
    <div className="wcard" style={{ animationDelay: Math.min((index % 9) * 40, 320) + "ms", "--cardc": animeColor(item.seriesId + item.seriesTitle) }}>
      <div className="ccard-frame wcard-frame" onClick={() => onPlay(item)}>
        <img className="ccard-img" src={item.thumb} alt="" loading="lazy" />
        <div className="ccard-shade"></div>
        <span className="ccard-play"><Icon name="play" size={16} /></span>
        <button className="wcard-fav is-on" title={t("wl.unfav")} aria-pressed="true"
          onClick={(e) => { e.stopPropagation(); window.BCRFavs.toggle(item.seriesId); setFav(false); }}>
          <Icon name="heart" size={15} solid />
        </button>
      </div>
      <button className="wcard-cap" onClick={() => onOpen(item)}>
        <p className="pcard-title">{item.seriesTitle}</p>
        <div className="wcard-langs">
          {item.dub && <Chip tone="line">VF</Chip>}
          {item.sub && <Chip tone="line">VOSTFR</Chip>}
        </div>
      </button>
    </div>
  );
}

window.WatchlistPage = function WatchlistPage({ go }) {
  const loading = useFakeLoad("watchlist", 750);
  const [filter, setFilter] = useState("all");
  const [shown, setShown] = useState(18);

  const newCount = useMemo(() => WD.watchlist.filter((w) => w.newEp).length, []);
  const favCount = window.BCRFavs.count();

  const items = useMemo(() => {
    let list = WD.watchlist.filter((w) => w.seriesTitle);
    if (filter === "new") list = list.filter((w) => w.newEp);
    if (filter === "progress") list = list.filter((w) => w.playhead > 60 && !w.full);
    if (filter === "fav") list = list.filter((w) => window.BCRFavs.has(w.seriesId));
    return list;
  }, [filter]);

  /* Favoris = séries (et non épisodes) : on dédoublonne par série, sans métadonnées d'épisode. */
  const favSeries = useMemo(() => {
    const seen = {};
    const out = [];
    WD.watchlist.forEach((w) => {
      if (!w.seriesTitle || seen[w.seriesId] || !window.BCRFavs.has(w.seriesId)) return;
      seen[w.seriesId] = 1;
      const s = WD.series.find((x) => x.id === w.seriesId);
      out.push({ seriesId: w.seriesId, seriesTitle: w.seriesTitle, thumb: (s && (s.wide || s.poster)) || w.thumb, dub: w.dub, sub: w.sub, epNum: 1 });
    });
    return out;
  }, [filter]);

  const isFav = filter === "fav";
  const list = isFav ? favSeries : items;

  const toWatch = (item) => {
    if (item.seriesId === WD.jjk.id) { go("watch", { series: { id: WD.jjk.id, isJJK: true, title: WD.jjk.title, poster: WD.jjk.poster, wide: WD.jjk.wide, dub: true, sub: true }, epNum: item.epNum || 1 }); return; }
    go("watch", { cont: { seriesId: item.seriesId, seriesTitle: item.seriesTitle, epTitle: item.epTitle, epNum: item.epNum || 1, seasonNum: item.seasonNum || 1, thumb: item.thumb, durMin: item.durMin || 24, progress: item.durMin ? Math.round((item.playhead / 60) / item.durMin * 100) : 0, playheadMin: Math.round(item.playhead / 60) } });
  };
  const toDetail = (item) => {
    const known = WD.series.find((s) => s.id === item.seriesId);
    if (known) { go("detail", { series: known }); return; }
    if (item.seriesId === WD.jjk.id) { go("detail", { series: { id: WD.jjk.id, isJJK: true, title: WD.jjk.title, poster: WD.jjk.poster, wide: WD.jjk.wide, dub: true, sub: true, year: WD.jjk.year, rating: WD.jjk.rating, desc: WD.jjk.desc } }); return; }
    go("detail", { series: { id: item.seriesId, title: item.seriesTitle, poster: item.thumb, wide: item.thumb, eps: 12, dub: item.dub, sub: item.sub, desc: "" } });
  };

  return (
    <div className="page-pad" data-screen-label="Watchlist">
      <div className="page-head page-head-split">
        <div>
          <h1 className="page-title">{t("wl.title")}</h1>
          <p className="page-sub">{t("wl.count", { n: list.length })}</p>
        </div>
        <div className="filters">
          {FILTERS.filter((f) => f.id !== "new" || newCount > 0).map((f) => (
            <button key={f.id} className={"season-tab" + (filter === f.id ? " is-active" : "")}
              onClick={() => { setFilter(f.id); setShown(18); }}>
              {t(f.key)}
              {f.id === "new" && newCount > 0 && <span className="filter-count">{newCount}</span>}
              {f.id === "fav" && favCount > 0 && <span className="filter-count">{favCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="wl-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="sk-ccard" style={{ animationDelay: i * 60 + "ms" }}>
              <div className="sk sk-thumb sk-thumb-wide"></div>
              <div className="sk sk-line"></div>
              <div className="sk sk-line sk-short"></div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="wl-empty">
          <Icon name={filter === "fav" ? "heart" : "bookmark"} size={36} solid={false} />
          <p>{t(filter === "fav" ? "wl.emptyFav" : "wl.empty")}</p>
          <button className="btn btn-acc" onClick={() => go("series")}><Icon name="search" size={16} /> {t("wl.browse")}</button>
        </div>
      ) : (
        <React.Fragment>
          <div className="wl-grid">
            {list.slice(0, shown).map((x, i) => (
              isFav
                ? <FavCard key={x.seriesId + "-" + i} item={x} index={i} onPlay={toWatch} onOpen={toDetail} />
                : <WatchlistCard key={x.seriesId + "-" + i} item={x} index={i} onPlay={toWatch} onOpen={toDetail} />
            ))}
          </div>
          {shown < list.length && (
            <div className="wl-more">
              <button className="btn btn-glass" onClick={() => setShown(shown + 18)}>
                {t("wl.showmore", { n: list.length - shown })}
              </button>
            </div>
          )}
        </React.Fragment>
      )}
    </div>
  );
};
