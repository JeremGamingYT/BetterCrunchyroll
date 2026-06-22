/* BetterCR — Paramètres & statistiques personnelles */
const { useMemo } = React;

const SD = window.BCR_DATA;

function fmtNum(n) {
  return Math.round(n).toLocaleString(window.getLang() === "fr" ? "fr-FR" : "en-US");
}

window.SettingsPage = function SettingsPage({ go }) {
  const loading = useFakeLoad("settings", 620);
  const [lang, setLang] = useLang();

  const seriesMap = useMemo(() => {
    const m = {};
    SD.series.forEach((s) => { m[s.id] = s; });
    return m;
  }, []);

  const stats = useMemo(() => {
    const wl = SD.watchlist.filter((w) => w.seriesTitle);
    let eps = 0, minutes = 0, done = 0, progress = 0, vf = 0, vostfr = 0;
    wl.forEach((w) => {
      const s = seriesMap[w.seriesId];
      const totalEps = (s && s.eps) || w.epNum || 12;
      const dur = w.durMin || (s && 24) || 24;
      if (w.full) {
        done++;
        eps += totalEps;
        minutes += totalEps * dur;
      } else {
        if (w.playhead > 60) progress++;
        const watchedEps = w.epNum ? Math.max(0, w.epNum - 1) : 0;
        eps += watchedEps;
        const head = w.playheadMin != null ? w.playheadMin : Math.round((w.playhead || 0) / 60);
        minutes += watchedEps * dur + head;
      }
      if (w.dub) vf++; else vostfr++;
    });
    const hours = minutes / 60;
    return {
      series: wl.length,
      eps,
      hours,
      days: hours / 24,
      done,
      progress,
      favs: window.BCRFavs.count(),
      vf, vostfr,
      streak: 12,
    };
  }, [seriesMap]);

  const favItems = useMemo(() => {
    const seen = {};
    const out = [];
    SD.watchlist.forEach((w) => {
      if (!w.seriesTitle || seen[w.seriesId] || !window.BCRFavs.has(w.seriesId)) return;
      seen[w.seriesId] = 1;
      const s = seriesMap[w.seriesId];
      out.push({
        seriesId: w.seriesId,
        seriesTitle: w.seriesTitle,
        poster: (s && (s.wide || s.poster)) || w.thumb,
        wide: (s && (s.wideXL || s.wide)) || w.thumb,
        dub: w.dub, sub: w.sub,
      });
    });
    return out.slice(0, 14);
  }, [seriesMap]);

  const backdrop = useMemo(() => {
    const f = favItems.find((x) => x.wide);
    return (f && f.wide) || (SD.jjk && SD.jjk.wide);
  }, [favItems]);

  const openFav = (w) => {
    const known = seriesMap[w.seriesId];
    if (known) { go("detail", { series: known }); return; }
    go("detail", { series: { id: w.seriesId, title: w.seriesTitle, poster: w.poster, wide: w.wide, eps: 12, dub: w.dub, sub: w.sub, desc: "" } });
  };

  const langTotal = Math.max(1, stats.vf + stats.vostfr);
  const vfPct = Math.round((stats.vf / langTotal) * 100);

  const primary = [
    { key: "set.stat.series", value: fmtNum(stats.series), icon: "film" },
    { key: "set.stat.eps", value: fmtNum(stats.eps), icon: "play" },
    { key: "set.stat.hours", value: fmtNum(stats.hours), icon: "clock" },
    { key: "set.stat.favs", value: fmtNum(stats.favs), icon: "heart" },
  ];
  const secondary = [
    { key: "set.stat.done", value: fmtNum(stats.done), icon: "check" },
    { key: "set.stat.progress", value: fmtNum(stats.progress), icon: "play" },
    { key: "set.stat.days", value: fmtNum(stats.days), icon: "chart" },
    { key: "set.stat.streak", value: fmtNum(stats.streak), icon: "flame" },
  ];

  if (loading) {
    return (
      <div className="page-pad" data-screen-label="Settings">
        <div className="page-head"><div className="sk sk-title" style={{ width: 220 }}></div></div>
        <div className="set-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sk" style={{ height: 132, borderRadius: 18, animationDelay: i * 70 + "ms" }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-pad" data-screen-label="Settings">
      {/* Profil */}
      <div className="set-profile">
        <div className="set-profile-bg">{backdrop && <img src={backdrop} alt="" />}</div>
        <span className="set-avatar"><Icon name="user" size={34} /></span>
        <div className="set-id">
          <h1 className="set-name">{t("menu.user")}</h1>
          <div className="set-id-row">
            <span className="set-prem"><Icon name="star" size={12} /> {t("menu.premium")}</span>
            <span className="set-since">{t("set.memberSince")}</span>
          </div>
        </div>
        <button className="btn btn-glass set-wl-btn" onClick={() => go("watchlist")}>
          <Icon name="bookmark" size={16} /> {t("set.seeWatchlist")}
        </button>
      </div>

      {/* Stats principales */}
      <section className="set-section">
        <h2 className="set-h2"><span className="set-h2-tick"></span>{t("set.statsTitle")}</h2>
        <div className="set-grid">
          {primary.map((s, i) => (
            <div key={s.key} className="set-stat set-stat-lg" style={{ animationDelay: i * 60 + "ms" }}>
              <span className="set-stat-ic"><Icon name={s.icon} size={20} solid={s.icon === "heart"} /></span>
              <span className="set-stat-val">{s.value}</span>
              <span className="set-stat-lbl">{t(s.key)}</span>
            </div>
          ))}
        </div>
        <div className="set-grid set-grid-sm">
          {secondary.map((s, i) => (
            <div key={s.key} className="set-stat" style={{ animationDelay: (i + 4) * 60 + "ms" }}>
              <span className="set-stat-ic set-stat-ic-sm"><Icon name={s.icon} size={16} /></span>
              <div className="set-stat-txt">
                <span className="set-stat-val set-stat-val-sm">{s.value}</span>
                <span className="set-stat-lbl">{t(s.key)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Langues */}
      <section className="set-section">
        <h2 className="set-h2"><span className="set-h2-tick"></span>{t("set.breakdownTitle")}</h2>
        <div className="set-bar-card">
          <div className="set-bar">
            <div className="set-bar-vf" style={{ width: vfPct + "%" }}></div>
            <div className="set-bar-sub" style={{ width: (100 - vfPct) + "%" }}></div>
          </div>
          <div className="set-bar-legend">
            <span className="set-leg"><i className="set-dot set-dot-vf"></i>{t("set.vf")} · {fmtNum(stats.vf)} ({vfPct}%)</span>
            <span className="set-leg"><i className="set-dot set-dot-sub"></i>{t("set.vostfr")} · {fmtNum(stats.vostfr)} ({100 - vfPct}%)</span>
          </div>
        </div>
      </section>

      {/* Favoris */}
      <section className="set-section">
        <h2 className="set-h2"><span className="set-h2-tick"></span>{t("set.favTitle")} <span className="set-h2-count">{stats.favs}</span></h2>
        {favItems.length === 0 ? (
          <div className="set-fav-empty">
            <Icon name="heart" size={28} />
            <p>{t("set.favEmpty")}</p>
          </div>
        ) : (
          <div className="set-fav-grid">
            {favItems.map((w, i) => {
              const poster = w.poster;
              return (
                <button key={w.seriesId + i} className="set-fav" style={{ animationDelay: i * 45 + "ms", "--cardc": animeColor(w.seriesId + w.seriesTitle) }} onClick={() => openFav(w)}>
                  <div className="set-fav-frame">
                    <img src={poster} alt="" loading="lazy" />
                    <span className="set-fav-heart"><Icon name="heart" size={13} solid /></span>
                  </div>
                  <p className="set-fav-title">{w.seriesTitle}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Préférences */}
      <section className="set-section">
        <h2 className="set-h2"><span className="set-h2-tick"></span>{t("set.prefTitle")}</h2>
        <div className="set-pref-card">
          <div className="set-pref-row">
            <div className="set-pref-l">
              <span className="set-pref-ic"><Icon name="globe" size={18} /></span>
              <span className="set-pref-lbl">{t("set.pref.lang")}</span>
            </div>
            <div className="set-lang-toggle">
              {["fr", "en"].map((l) => (
                <button key={l} className={"set-lang-opt" + (lang === l ? " is-active" : "")} onClick={() => setLang(l)}>
                  {l === "fr" ? "Français" : "English"}
                </button>
              ))}
            </div>
          </div>
          <p className="set-pref-note"><Icon name="gear" size={13} /> {t("set.pref.more")}</p>
        </div>
      </section>
    </div>
  );
};
