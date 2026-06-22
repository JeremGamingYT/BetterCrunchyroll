/* BetterCR — App : routeur, transitions, tweaks */
const { useState, useEffect, useMemo, useCallback } = React;

const AD = window.BCR_DATA;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#ff8133",
  "cardWidth": 178,
  "motion": true
}/*EDITMODE-END*/;

const ROUTE_KEY = "bcr_route_v1";

function findSeries(id) {
  if (id === AD.jjk.id) return { id: AD.jjk.id, isJJK: true, title: AD.jjk.title, desc: AD.jjk.desc, poster: AD.jjk.poster, wide: AD.jjk.wide, wideXL: AD.jjk.wide, eps: AD.jjk.eps, year: AD.jjk.year, dub: AD.jjk.dub, sub: AD.jjk.sub, rating: AD.jjk.rating };
  return AD.series.find((s) => s.id === id) || null;
}

function loadRoute() {
  try {
    const raw = localStorage.getItem(ROUTE_KEY);
    if (!raw) return { page: "home", params: {} };
    const r = JSON.parse(raw);
    if (r.page === "detail" || r.page === "watch") {
      const series = r.seriesId ? findSeries(r.seriesId) : null;
      if (!series && !r.cont) return { page: "home", params: {} };
      return { page: r.page, params: { series, epNum: r.epNum, cont: r.cont } };
    }
    return { page: r.page || "home", params: {} };
  } catch (e) { return { page: "home", params: {} }; }
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [lang, setLang] = useLang();
  const [route, setRoute] = useState(loadRoute);
  const [searchOpen, setSearchOpen] = useState(false);
  const [transKey, setTransKey] = useState(0);
  const [goodbye, setGoodbye] = useState(false);

  const go = useCallback((page, params = {}) => {
    setRoute({ page, params });
    setTransKey((k) => k + 1);
    window.scrollTo(0, 0);
    try {
      localStorage.setItem(ROUTE_KEY, JSON.stringify({
        page,
        seriesId: params.series ? params.series.id : null,
        epNum: params.epNum || null,
        cont: params.cont || null,
      }));
    } catch (e) { }
  }, []);

  /* Déconnexion : on joue l'overlay « au revoir » puis on bascule vers la connexion */
  const logout = useCallback(() => {
    setGoodbye(true);
    setTimeout(() => {
      go("auth");
      setTimeout(() => setGoodbye(false), 650);
    }, 2300);
  }, [go]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--acc", t.accent);
    root.style.setProperty("--pw", t.cardWidth + "px");
    document.body.classList.toggle("no-motion", !t.motion);
  }, [t.accent, t.cardWidth, t.motion]);

  let page = null;
  if (route.page === "home") page = <HomePage go={go} />;
  else if (route.page === "series" || route.page === "films" || route.page === "simulcast") page = <GridPage go={go} variant={route.page} />;
  else if (route.page === "watchlist") page = <WatchlistPage go={go} />;
  else if (route.page === "settings") page = <SettingsPage go={go} />;
  else if (route.page === "detail" && route.params.series) page = <DetailPage go={go} series={route.params.series} />;
  else if (route.page === "watch") page = <WatchPage go={go} series={route.params.series} epNum={route.params.epNum} cont={route.params.cont} />;
  else if (route.page === "notfound") page = <NotFoundPage go={go} />;
  else page = <NotFoundPage go={go} />;

  const isWatch = route.page === "watch";
  const isAuth = route.page === "auth";

  return (
    <React.Fragment>
      <div className="ambient" aria-hidden="true"></div>
      {!isWatch && !isAuth && <Header route={route.page} go={go} onSearch={() => setSearchOpen(true)} onLogout={logout} />}
      {isAuth ?
        <AuthPage go={go} /> :
        <div className="page-wrap" key={transKey}>
          {page}
          <Footer go={go} />
        </div>
      }
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)}
        onOpenAnime={(a) => go("detail", { series: a })} />
      <GoodbyeOverlay show={goodbye} />

      <TweaksPanel>
        <TweakSection label="Couleur" />
        <TweakColor label="Accent" value={t.accent}
          options={["#ff8133", "#f4b63f", "#ef4565", "#3fb6e8"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Mise en page" />
        <TweakSlider label="Taille des cartes" value={t.cardWidth} min={140} max={230} step={2} unit="px"
          onChange={(v) => setTweak("cardWidth", v)} />
        <TweakSection label="Mouvement" />
        <TweakToggle label="Animations" value={t.motion} onChange={(v) => setTweak("motion", v)} />
        <TweakSection label="Langue / Language" />
        <TweakRadio label="Langue" value={lang} options={["fr", "en"]} onChange={(v) => setLang(v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
