/* BetterCR — Page série (détails) + Lecteur */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const DD = window.BCR_DATA;
const JJK_ID = DD.jjk.id;

function isJjk(series) {return series && (series.id === JJK_ID || series.isJJK);}

/* Épisodes d'une série : réels pour JJK, génériques sinon */
function episodesFor(series) {
  if (isJjk(series)) return DD.jjkEps;
  const n = Math.min(series.eps || 12, 12);
  const epLabel = (window.getLang && window.getLang() === "en") ? "Episode " : "Épisode ";
  return Array.from({ length: n }).map((_, i) => ({
    id: series.id + "-e" + (i + 1), num: i + 1, title: epLabel + (i + 1),
    desc: "", thumb: series.wide || series.poster, durMin: 24, air: ""
  }));
}

/* Progression connue (historique réel JJK : E24 à 36 %) */
function watchedFor(series) {
  if (!isJjk(series)) return {};
  const map = {};
  for (let i = 1; i <= 23; i++) map[i] = 100;
  map[24] = 36;
  return map;
}

/* ---------- Carte épisode ---------- */
function EpisodeCard({ ep, index, watched, onPlay }) {
  return (
    <div className="ecard" style={{ animationDelay: Math.min(index % 8 * 40, 280) + "ms" }}>
      <button className="ecard-hit" onClick={() => onPlay(ep)}>
        <div className="ecard-frame">
          <img className="ecard-img" src={ep.thumb} alt="" loading="lazy" />
          <div className="ccard-shade"></div>
          <span className="ccard-play"><Icon name="play" size={16} /></span>
          <span className="ecard-dur">{ep.durMin} min</span>
          {watched === 100 && <span className="ecard-seen"><Icon name="check" size={11} /> {t("common.seen")}</span>}
        </div>
        <div className="ecard-cap">
          <p className="ecard-title"><span className="ecard-num">E{ep.num}</span> {ep.title}</p>
          {watched != null && watched < 100 && <p className="prog-text"><span className="prog-pct">{watched} %</span> {t("common.watched")}</p>}
          {ep.desc && <p className="ecard-desc">{ep.desc}</p>}
        </div>
      </button>
    </div>);

}

/* ---------- Étoiles de note ---------- */
function Stars({ score }) {
  const full = Math.round(score / 2);
  return (
    <span className="dt-stars">
      <span className="dt-stars-glyphs">
        {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={14} className={i < full ? "" : "dim"} />)}
      </span>
      <b>{score.toFixed(1).replace(".", ",")}</b>
      <span>/ 10</span>
    </span>);

}

/* ---------- Page détails ---------- */
window.DetailPage = function DetailPage({ go, series }) {
  const loading = useFakeLoad("detail-" + series.id, 700);
  const jjk = isJjk(series);
  const seasons = jjk ? DD.jjkSeasons.slice().sort((a, b) => a.num - b.num) : [{ id: "s1", title: series.title, num: 1, display: "1" }];
  const [seasonId, setSeasonId] = useState(seasons[0].id);
  const eps = episodesFor(series);
  const watched = watchedFor(series);
  const resumeEp = jjk ? eps.find((e) => e.num === 24) : null;
  const [marked, setMarked] = useState(jjk);
  const detail = jjk ? DD.jjk : series;

  const related = useMemo(
    () => DD.series.filter((s) => s.id !== series.id && s.poster).slice(3, 17),
    [series.id]
  );

  useEffect(() => {window.scrollTo(0, 0);}, [series.id]);

  if (loading) {
    return (
      <div key="loading">
        <div className="sk" style={{ width: "100%", height: "min(86vh,820px)" }}></div>
        <div className="page-pad" style={{ marginTop: 28 }}>
          <div className="sk" style={{ width: "100%", height: 180, borderRadius: 22 }}></div>
        </div>
      </div>);

  }

  const langs = [series.sub && "VOSTFR", series.dub && "VF"].filter(Boolean).join(" · ");
  const facts = [
  [t("facts.year"), detail.year],
  [t("facts.seasons"), jjk ? DD.jjk.seasonCount : 1],
  [t("facts.episodes"), jjk ? DD.jjk.eps : series.eps],
  [t("facts.rating"), detail.rating],
  [t("facts.languages"), langs],
  jjk && DD.jjk.awards && DD.jjk.awards.length ? [t("facts.awards"), t("facts.awardsN", { n: DD.jjk.awards.length })] : null].
  filter((f) => f && f[1]);
  const about = (jjk && DD.jjk.extDesc) || window.loc(detail, "desc");
  const tags = jjk ? DD.jjk.keywords : [];
  const seriesColor = animeColor((series.id || "") + (series.title || ""));

  return (
    <div key="ready" data-screen-label={"Détails — " + series.title} style={{ "--cardc": seriesColor }}>
      <div className="dt-stage">
        <div className="dt-stage-bg"><img src={series.wideXL || series.wide || series.poster} alt="" /></div>
        <div className="dt-stage-grad"></div>
        <div className="dt-stage-glow"></div>
        <button className="btn btn-icon dt-back" onClick={() => go("home")} aria-label="Retour"><Icon name="back" size={18} /></button>
        <div className="dt-stage-inner page-pad">
          <div className="dt-poster-wrap">
            <img className="dt-poster" src={series.poster} alt={series.title} />
          </div>
          <div className="dt-headline">
            <span className="dt-kicker"><i className="dot"></i> {t("detail.series")}{detail.year ? " · " + detail.year : ""}{jjk ? " · " + t("detail.seasons", { n: DD.jjk.seasonCount }) : ""}</span>
            <h1 className="dt-title">{series.title}</h1>
            <div className="dt-ratingline">
              {jjk && <Stars score={8.7} />}
              <div className="dt-meta" style={{ marginTop: 0 }}>
                {detail.rating && <Chip tone="line">{detail.rating}</Chip>}
                {jjk ? <span>{t("common.episodes", { n: DD.jjk.eps })}</span> : series.eps ? <span>{t("common.episodes", { n: series.eps })}</span> : null}
                {series.dub && <Chip tone="line">VF</Chip>}
                {series.sub && <Chip tone="line">VOSTFR</Chip>}
              </div>
            </div>
            <p className="dt-synopsis">{window.loc(detail, "desc")}</p>
            <div className="dt-cta">
              {resumeEp ?
              <button className="btn btn-acc" onClick={() => go("watch", { series, epNum: 24 })}>
                  <Icon name="play" size={18} /> {t("detail.resume")} S1 E24
                </button> :

              <button className="btn btn-acc" onClick={() => go("watch", { series, epNum: 1 })}>
                  <Icon name="play" size={18} /> {t("detail.start")} E1
                </button>
              }
              <button className={"btn btn-glass" + (marked ? " is-marked" : "")} onClick={() => setMarked(!marked)}>
                <Icon name={marked ? "check" : "bookmark"} size={17} solid={marked} /> {marked ? t("detail.inWatchlist") : t("detail.watchlist")}
              </button>
              <button className="btn btn-icon" aria-label="Partager"><Icon name="plus" size={18} /></button>
            </div>
            {resumeEp &&
            <div className="dt-resume">
                <Prog value={36} slim />
                <span>36 % · {t("common.left", { n: 15 })}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <div className="page-pad dt-section" style={{ marginTop: 30 }}>
        <div className="glass-card">
          <div className="glass-about">
            <p className="glass-h">{t("detail.about")}</p>
            <p>{about}</p>
            {jjk && DD.jjk.descriptors.length > 0 &&
            <p className="dt-warn" style={{ marginTop: 14 }}>{DD.jjk.descriptors.join(" · ")}</p>
            }
            {tags.length > 0 &&
            <div className="glass-tags">
                {tags.map((k) => <span key={k} className="chip chip-btn">{k}</span>)}
              </div>
            }
          </div>
          <div className="facts-col">
            <p className="glass-h">{t("detail.info")}</p>
            <div className="facts">
              {facts.map(([k, v]) =>
              <div key={k} className="fact"><span className="fact-k">{k}</span><span className="fact-v">{v}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad dt-section">
        <div className="dt-seasons">
          {seasons.map((s) =>
          <button key={s.id} className={"season-tab" + (s.id === seasonId ? " is-active" : "")} onClick={() => setSeasonId(s.id)}>
              {s.display ? t("detail.season") + " " + s.display : s.title}
            </button>
          )}
        </div>
        <div className="ep-grid">
          {(seasonId === seasons[0].id ? eps : eps.slice(0, 6)).map((e, i) =>
          <EpisodeCard key={e.id} ep={e} index={i} watched={watched[e.num]}
          onPlay={(ep) => go("watch", { series, epNum: ep.num })} />
          )}
        </div>
      </div>

      {related.length > 0 &&
      <div className="dt-section" style={{ marginBottom: 10 }}>
          <Row title={t("detail.related")}>
            {related.map((a, i) =>
          <PosterCard key={a.id} anime={a} index={i}
          onOpen={(x) => go("detail", { series: x })}
          onPlay={(x) => go("watch", { series: x, epNum: 1 })} />
          )}
          </Row>
        </div>
      }
    </div>);

};

/* ---------- Lecteur ---------- */
function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60),s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

window.WatchPage = function WatchPage({ go, series, epNum, cont }) {
  /* Depuis « continuer à regarder » : reconstruire la série */
  const realSeries = useMemo(() => {
    if (series) return series;
    if (cont.seriesId === JJK_ID) return { id: JJK_ID, isJJK: true, title: DD.jjk.title, poster: DD.jjk.poster, wide: DD.jjk.wide, eps: DD.jjk.eps, year: DD.jjk.year, dub: true, sub: true, rating: DD.jjk.rating, desc: DD.jjk.desc };
    return { id: cont.seriesId, title: cont.seriesTitle, poster: cont.thumb, wide: cont.thumb, eps: 12, desc: "" };
  }, [series, cont]);

  const eps = episodesFor(realSeries);
  const num = epNum || (cont ? cont.epNum : 1);
  const ep = eps.find((e) => e.num === num) || { id: realSeries.id + "-e" + num, num, title: cont ? cont.epTitle : ((window.getLang && window.getLang() === "en" ? "Episode " : "Épisode ") + num), thumb: cont ? cont.thumb : realSeries.wide, durMin: cont ? cont.durMin || 24 : 24, desc: "" };
  const durSec = (ep.durMin || 24) * 60;
  const posKey = "bcr_pos_" + ep.id;

  const initial = useMemo(() => {
    const saved = parseFloat(localStorage.getItem(posKey));
    if (!isNaN(saved)) return saved;
    if (cont && cont.progress) return cont.progress / 100 * durSec;
    if (isJjk(realSeries) && num === 24) return 0.36 * durSec;
    return 0;
  }, [posKey]);

  const [pos, setPos] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(80);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {setPos(initial);}, [initial]);
  useEffect(() => {window.scrollTo(0, 0);}, [ep.id]);

  /* avance + persistance */
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPos((p) => {
        const n = Math.min(durSec, p + 1);
        if (n >= durSec) setPlaying(false);
        return n;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, durSec]);
  useEffect(() => {
    const save = setInterval(() => localStorage.setItem(posKey, String(posRef.current)), 2000);
    return () => {clearInterval(save);localStorage.setItem(posKey, String(posRef.current));};
  }, [posKey]);

  /* masquer les contrôles */
  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2600);
  }, []);
  useEffect(() => {if (!playing) setIdle(false);else wake();}, [playing]);

  const scrubRef = useRef(null);
  const seek = (e) => {
    const r = scrubRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setPos(ratio * durSec);
  };

  const nextEps = eps.filter((e) => e.num > num).slice(0, 5);
  const pct = pos / durSec * 100;

  return (
    <div className="watch" data-screen-label={"Lecteur — " + realSeries.title + " E" + num}>
      <div className={"player" + (playing ? " is-playing" : "") + (idle && playing ? " is-idle" : "")}
      onMouseMove={wake} onClick={() => {setPlaying(!playing);wake();}}>
        <img className="player-img" src={ep.thumb} alt="" />
        <div className="player-vignette"></div>

        <div className="player-top">
          <button className="btn btn-icon" onClick={(e) => {e.stopPropagation();go("detail", { series: realSeries });}} aria-label="Retour"><Icon name="back" size={18} /></button>
          <div className="player-top-title">
            <p className="player-series">{realSeries.title}</p>
            <p className="player-ep">S1 E{num} · {ep.title}</p>
          </div>
        </div>

        {!playing &&
        <button className="player-bigplay" onClick={(e) => {e.stopPropagation();setPlaying(true);}} aria-label="Lecture">
            <Icon name="play" size={32} />
          </button>
        }

        <div className="player-ctrls" onClick={(e) => e.stopPropagation()}>
          <div className="scrub" ref={scrubRef} onClick={seek}>
            <div className="scrub-buffer" style={{ width: Math.min(100, pct + 14) + "%" }}></div>
            <div className="scrub-fill" style={{ width: pct + "%" }}>
              <span className="scrub-knob"></span>
            </div>
          </div>
          <div className="ctrl-bar">
            <div className="ctrl-group">
              <button className="ctrl-btn" onClick={() => setPlaying(!playing)} aria-label="Lecture/Pause"><Icon name={playing ? "pause" : "play"} size={22} /></button>
              <button className="ctrl-btn" onClick={() => setPos((p) => Math.max(0, p - 10))} aria-label="-10 s"><Icon name="rew" size={19} /></button>
              <button className="ctrl-btn" onClick={() => setPos((p) => Math.min(durSec, p + 10))} aria-label="+10 s"><Icon name="fwd" size={19} /></button>
              <div className="ctrl-vol">
                <button className="ctrl-btn" onClick={() => setMuted(!muted)} aria-label="Volume"><Icon name={muted || vol === 0 ? "volX" : "vol"} size={19} /></button>
                <input type="range" min="0" max="100" value={muted ? 0 : vol} className="vol-range"
                onChange={(e) => {setVol(+e.target.value);setMuted(false);}} aria-label="Niveau du volume" />
              </div>
              <span className="ctrl-time">{fmt(pos)} <em>/ {fmt(durSec)}</em></span>
            </div>
            <div className="ctrl-group">
              <Chip tone="line" className="ctrl-quality">1080p</Chip>
              <button className="ctrl-btn" aria-label="Sous-titres"><Icon name="cc" size={19} /></button>
              <button className="ctrl-btn" aria-label="Paramètres"><Icon name="gear" size={19} /></button>
              {nextEps.length > 0 &&
              <button className="ctrl-btn" onClick={() => go("watch", { series: realSeries, epNum: num + 1 })} aria-label="Épisode suivant"><Icon name="next" size={19} /></button>
              }
              <button className="ctrl-btn" aria-label="Plein écran"><Icon name="full" size={19} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="watch-below page-pad">
        <div className="watch-info">
          <p className="watch-kicker">{realSeries.title}</p>
          <h1 className="watch-title">E{num} · {ep.title}</h1>
          <div className="dt-meta">
            <span>{t("common.min", { n: ep.durMin })}</span>
            {ep.air && <span>{t("player.aired", { d: ep.air })}</span>}
            {realSeries.dub && <Chip tone="line">VF</Chip>}
            {realSeries.sub && <Chip tone="line">VOSTFR</Chip>}
          </div>
          {ep.desc && <p className="dt-desc">{ep.desc}</p>}
          <button className="row-all" onClick={() => go("detail", { series: realSeries })}>
            {t("player.viewSeries")} <Icon name="chevR" size={14} />
          </button>
        </div>
        {nextEps.length > 0 &&
        <aside className="watch-next">
            <h2 className="row-title">{t("player.upnext")}</h2>
            <div className="next-list">
              {nextEps.map((e) =>
            <button key={e.id} className="next-item" onClick={() => go("watch", { series: realSeries, epNum: e.num })}>
                  <div className="next-thumb">
                    <img src={e.thumb} alt="" loading="lazy" />
                    <span className="ccard-play next-play"><Icon name="play" size={13} /></span>
                  </div>
                  <div className="next-cap">
                    <p className="next-title"><span className="ecard-num">E{e.num}</span> {e.title}</p>
                    <p className="pcard-meta">{t("common.min", { n: e.durMin })}</p>
                  </div>
                </button>
            )}
            </div>
          </aside>
        }
      </div>
    </div>);

};