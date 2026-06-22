/* BetterCR — Connexion / Inscription + overlay de déconnexion */
const { useState, useEffect, useMemo } = React;

const AUTH_D = window.BCR_DATA;

/* ---------- Mur d'affiches (derniers animés sortis) ---------- */
function PosterWall() {
  const cols = useMemo(() => {
    const pool = AUTH_D.series.filter((s) => s.poster);
    const newest = pool.slice().sort((a, b) => (b.year || 0) - (a.year || 0));
    return [newest.slice(0, 9), newest.slice(9, 18), newest.slice(18, 27)];
  }, []);
  return (
    <div className="aw-wall" aria-hidden="true">
      {cols.map((col, ci) =>
        <div key={ci} className={"aw-col aw-col-" + ci}>
          <div className="aw-track">
            {col.concat(col).map((s, i) =>
              <div className="aw-tile" key={i} style={{ "--tc": animeColor(s.id + s.title) }}>
                <img src={s.poster} alt="" loading="lazy" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>);
}

/* ---------- Champ de formulaire ---------- */
function AuthField({ icon, label, type = "text", placeholder, name, autoComplete, trailing }) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <div className="auth-input-wrap">
        <Icon name={icon} size={17} className="auth-input-ic" />
        <input className="auth-input" type={type} placeholder={placeholder} name={name} autoComplete={autoComplete || "off"} />
        {trailing}
      </div>
    </label>);
}

/* ---------- Page Connexion / Inscription ---------- */
window.AuthPage = function AuthPage({ go }) {
  const [mode, setMode] = useState("login");
  const [showPw, setShowPw] = useState(false);
  const isLogin = mode === "login";

  const newest = useMemo(() =>
    AUTH_D.series.filter((s) => s.year >= 2024)
      .sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 4), []);

  const submit = (e) => { e.preventDefault(); go("home"); };
  const pwTrailing = (
    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((v) => !v)}
      aria-label={showPw ? "Masquer" : "Afficher"} tabIndex={-1}>
      <Icon name={showPw ? "eyeOff" : "eye"} size={17} />
    </button>);

  return (
    <div className="auth" data-screen-label="Connexion">
      {/* -------- Visuel gauche : derniers animés -------- */}
      <aside className="auth-aside">
        <PosterWall />
        <div className="auth-aside-grad"></div>
        <div className="auth-aside-glow"></div>
        <div className="auth-aside-content">
          <button className="hdr-logo auth-aside-brand" onClick={() => go("home")} aria-label="Accueil">
            <span className="hdr-wordmark">better<b>CR</b></span>
          </button>
          <div className="auth-aside-foot">
            <span className="auth-aside-kicker"><i className="dot"></i> {t("auth.aside.kicker")}</span>
            <h2 className="auth-aside-title">{t("auth.aside.title")}</h2>
            <p className="auth-aside-sub">{t("auth.aside.sub")}</p>
            <div className="auth-aside-chips">
              {newest.map((s) =>
                <span key={s.id} className="auth-chip">
                  <span className="auth-chip-flag">{t("flag.new")}</span>{s.title}
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* -------- Formulaire droite -------- */}
      <main className="auth-main">
        <div className="auth-top">
          <button className="auth-back" onClick={() => go("home")}><Icon name="back" size={16} /> {t("auth.back")}</button>
          <LangSwitch />
        </div>

        <div className="auth-card">
          <button className="hdr-logo auth-card-brand" onClick={() => go("home")} aria-label="Accueil">
            <span className="hdr-wordmark">better<b>CR</b></span>
          </button>

          <div className="auth-tabs">
            <span className={"auth-tab-ind" + (isLogin ? "" : " is-right")}></span>
            <button className={"auth-tab" + (isLogin ? " is-on" : "")} onClick={() => setMode("login")}>{t("auth.tab.login")}</button>
            <button className={"auth-tab" + (!isLogin ? " is-on" : "")} onClick={() => setMode("signup")}>{t("auth.tab.signup")}</button>
          </div>

          <div className="auth-head" key={mode}>
            <h1 className="auth-title">{isLogin ? t("auth.login.title") : t("auth.signup.title")}</h1>
            <p className="auth-sub">{isLogin ? t("auth.login.sub") : t("auth.signup.sub")}</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {!isLogin &&
              <AuthField icon="user" label={t("auth.field.name")} placeholder={t("auth.field.name.ph")} name="name" />
            }
            <AuthField icon="mail" label={t("auth.field.email")} type="email" placeholder={t("auth.field.email.ph")} name="email" autoComplete="email" />
            <AuthField icon="lock" label={t("auth.field.password")} type={showPw ? "text" : "password"}
              placeholder={t("auth.field.password.ph")} name="password" trailing={pwTrailing} />
            {!isLogin &&
              <AuthField icon="lock" label={t("auth.field.confirm")} type={showPw ? "text" : "password"}
                placeholder={t("auth.field.password.ph")} name="confirm" />
            }

            {isLogin ?
              <div className="auth-row">
                <label className="auth-check">
                  <input type="checkbox" defaultChecked /><span className="auth-box"><Icon name="check" size={12} /></span>
                  {t("auth.remember")}
                </label>
                <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>{t("auth.forgot")}</a>
              </div> :
              <label className="auth-check auth-check-terms">
                <input type="checkbox" defaultChecked /><span className="auth-box"><Icon name="check" size={12} /></span>
                {t("auth.terms")}
              </label>
            }

            <button className="btn btn-acc auth-submit" type="submit">
              {isLogin ? t("auth.cta.login") : t("auth.cta.signup")} <Icon name="chevR" size={18} />
            </button>
          </form>

          <div className="auth-divider"><span>{t("auth.or")}</span></div>

          <div className="auth-social">
            <button className="auth-soc" onClick={() => go("home")}><Icon name="google" solid size={18} /> {t("auth.social.google")}</button>
            <button className="auth-soc" onClick={() => go("home")}><Icon name="discord" solid size={18} /> {t("auth.social.discord")}</button>
            <button className="auth-soc" onClick={() => go("home")}><Icon name="apple" solid size={18} /> {t("auth.social.apple")}</button>
          </div>

          <p className="auth-switch">
            {isLogin ? t("auth.noaccount") : t("auth.hasaccount")}{" "}
            <button onClick={() => setMode(isLogin ? "signup" : "login")}>
              {isLogin ? t("auth.switch.signup") : t("auth.switch.login")}
            </button>
          </p>
        </div>
      </main>
    </div>);
};

/* ---------- Overlay « au revoir » (déconnexion) ---------- */
const BYE_GIFS = [
  /* candidats « salut de la main » — bascule automatique si indisponible */
  "https://media.giphy.com/media/Od0QRnzwUtBJK/giphy.gif",
  "https://media.giphy.com/media/26FLgGTPUDH6UGAbm/giphy.gif",
  /* filets de sécurité : GIFs anime déjà éprouvés dans le projet */
  "https://media.giphy.com/media/edGzBC6GDOhutW32ps/giphy.gif",
  "https://media.giphy.com/media/uNzGan0eVgvmZfH6H5/giphy.gif",
  "https://media.giphy.com/media/Y4vg6chFftvP2/giphy.gif"];

window.GoodbyeOverlay = function GoodbyeOverlay({ show }) {
  const [idx, setIdx] = useState(0);
  const [dead, setDead] = useState(false);
  useEffect(() => { if (show) { setIdx(0); setDead(false); } }, [show]);
  const onErr = () => { if (idx < BYE_GIFS.length - 1) setIdx(idx + 1); else setDead(true); };
  return (
    <div className={"bye-ov" + (show ? " is-on" : "")} aria-hidden={!show}>
      <div className="bye-card">
        <div className="bye-gifwrap">
          {!dead &&
            <img className="bye-gif" src={BYE_GIFS[idx]} alt={t("bye.title")} onError={onErr} />
          }
          <div className="bye-gif-fallback" style={{ display: dead ? "grid" : "none" }}>
            <span style={{ fontSize: 42 }}>(ノ^_^)ノ</span>
            <span>// matane.gif</span>
          </div>
          <span className="bye-flag" aria-hidden="true">🏳️</span>
          <span className="bye-gif-tag">BYE · またね</span>
        </div>
        <div className="bye-text">
          <span className="bye-wave" aria-hidden="true">👋</span>
          <h2 className="bye-title">{t("bye.title")}</h2>
          <p className="bye-sub">{t("bye.sub")}</p>
          <span className="bye-tag">{t("bye.tag")}</span>
          <span className="bye-spinner" aria-hidden="true"></span>
        </div>
      </div>
    </div>);
};
