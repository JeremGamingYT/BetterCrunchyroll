import {
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { bridge } from '@core/api/transport';
import { fetchAniListTrending, type TrendingItem } from '@core/providers';
import { useAsync } from '@app/hooks/useAsync';
import { useI18n } from '@app/i18n/i18n';
import { animeColor } from '@app/lib/anime-color';
import { Icon, type IconName } from '@app/components/Icon';
import { LangSwitch } from '@app/components/LangSwitch';

const BYE_GIFS = [
  'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif',
  'https://media.giphy.com/media/26FLgGTPUDH6UGAbm/giphy.gif',
  'https://media.giphy.com/media/edGzBC6GDOhutW32ps/giphy.gif',
  'https://media.giphy.com/media/uNzGan0eVgvmZfH6H5/giphy.gif',
];

function PosterWall({ items }: { readonly items: readonly TrendingItem[] }): React.JSX.Element {
  const columns = [items.slice(0, 9), items.slice(9, 18), items.slice(18, 27)];
  return (
    <div className="aw-wall" aria-hidden="true">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className={`aw-col aw-col-${String(columnIndex)}`}>
          <div className="aw-track">
            {column.concat(column).map((item, index) => (
              <div
                className="aw-tile"
                key={`${item.title}-${String(index)}`}
                style={{ '--tc': animeColor(item.title) } as CSSProperties}
              >
                <img src={item.image} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface AuthFieldProps {
  readonly icon: IconName;
  readonly label: string;
  readonly type?: string;
  readonly placeholder?: string;
  readonly name: string;
  readonly autoComplete?: string;
  readonly trailing?: ReactNode;
}

function AuthField({
  icon,
  label,
  type = 'text',
  placeholder,
  name,
  autoComplete = 'off',
  trailing,
}: AuthFieldProps): React.JSX.Element {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <div className="auth-input-wrap">
        <Icon name={icon} size={17} className="auth-input-ic" />
        <input
          className="auth-input"
          type={type}
          placeholder={placeholder}
          name={name}
          autoComplete={autoComplete}
        />
        {trailing}
      </div>
    </label>
  );
}

export interface AuthPageProps {
  readonly onAuthenticated: () => void;
}

export function AuthPage({ onAuthenticated }: AuthPageProps): React.JSX.Element {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';
  const wall = useAsync(() => fetchAniListTrending(27), []);
  const trending = wall.data ?? [];
  const newest = trending.slice(0, 4);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);
    if (!isLogin) {
      setError(t('auth.signupOnCr'));
      return;
    }
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!email || !password) {
      return;
    }
    setBusy(true);
    bridge
      .login(email, password)
      .then((result) => {
        setBusy(false);
        if (result.ok) {
          onAuthenticated();
        } else {
          setError(result.error);
        }
      })
      .catch((reason: unknown) => {
        setBusy(false);
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  };

  const preventDefault = (event: MouseEvent): void => event.preventDefault();
  const pwToggle = (
    <button
      type="button"
      className="auth-pw-toggle"
      onClick={() => setShowPw((value) => !value)}
      aria-label={showPw ? 'Masquer' : 'Afficher'}
      tabIndex={-1}
    >
      <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
    </button>
  );

  return (
    <div className="auth" data-screen-label="Connexion">
      <aside className="auth-aside">
        <PosterWall items={trending} />
        <div className="auth-aside-grad" />
        <div className="auth-aside-glow" />
        <div className="auth-aside-content">
          <span className="hdr-logo auth-aside-brand">
            <span className="hdr-wordmark">
              better<b>CR</b>
            </span>
          </span>
          <div className="auth-aside-foot">
            <span className="auth-aside-kicker">
              <i className="dot" /> {t('auth.aside.kicker')}
            </span>
            <h2 className="auth-aside-title">{t('auth.aside.title')}</h2>
            <p className="auth-aside-sub">{t('auth.aside.sub')}</p>
            <div className="auth-aside-chips">
              {newest.map((item) => (
                <span key={item.title} className="auth-chip">
                  <span className="auth-chip-flag">{t('flag.new')}</span>
                  {item.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-top auth-top-end">
          <LangSwitch align="end" />
        </div>

        <div className="auth-card">
          <span className="hdr-logo auth-card-brand">
            <span className="hdr-wordmark">
              better<b>CR</b>
            </span>
          </span>

          <div className="auth-tabs">
            <span className={`auth-tab-ind${isLogin ? '' : ' is-right'}`} />
            <button
              className={`auth-tab${isLogin ? ' is-on' : ''}`}
              onClick={() => setMode('login')}
            >
              {t('auth.tab.login')}
            </button>
            <button
              className={`auth-tab${!isLogin ? ' is-on' : ''}`}
              onClick={() => setMode('signup')}
            >
              {t('auth.tab.signup')}
            </button>
          </div>

          <div className="auth-head" key={mode}>
            <h1 className="auth-title">
              {isLogin ? t('auth.login.title') : t('auth.signup.title')}
            </h1>
            <p className="auth-sub">{isLogin ? t('auth.login.sub') : t('auth.signup.sub')}</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {!isLogin && (
              <AuthField
                icon="user"
                label={t('auth.field.name')}
                placeholder={t('auth.field.name.ph')}
                name="name"
              />
            )}
            <AuthField
              icon="mail"
              label={t('auth.field.email')}
              type="email"
              placeholder={t('auth.field.email.ph')}
              name="email"
              autoComplete="email"
            />
            <AuthField
              icon="lock"
              label={t('auth.field.password')}
              type={showPw ? 'text' : 'password'}
              placeholder={t('auth.field.password.ph')}
              name="password"
              autoComplete="current-password"
              trailing={pwToggle}
            />
            {!isLogin && (
              <AuthField
                icon="lock"
                label={t('auth.field.confirm')}
                type={showPw ? 'text' : 'password'}
                placeholder={t('auth.field.password.ph')}
                name="confirm"
              />
            )}

            {isLogin ? (
              <div className="auth-row">
                <label className="auth-check">
                  <input type="checkbox" defaultChecked />
                  <span className="auth-box">
                    <Icon name="check" size={12} />
                  </span>
                  {t('auth.remember')}
                </label>
                <a href="#" className="auth-link" onClick={preventDefault}>
                  {t('auth.forgot')}
                </a>
              </div>
            ) : (
              <label className="auth-check auth-check-terms">
                <input type="checkbox" defaultChecked />
                <span className="auth-box">
                  <Icon name="check" size={12} />
                </span>
                {t('auth.terms')}
              </label>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button className="btn btn-acc auth-submit" type="submit" disabled={busy}>
              {isLogin ? t('auth.cta.login') : t('auth.cta.signup')} <Icon name="chevR" size={18} />
            </button>
          </form>

          <div className="auth-divider">
            <span>{t('auth.or')}</span>
          </div>

          <div className="auth-social">
            <button className="auth-soc" onClick={preventDefault}>
              <Icon name="google" solid size={18} /> {t('auth.social.google')}
            </button>
            <button className="auth-soc" onClick={preventDefault}>
              <Icon name="discord" solid size={18} /> {t('auth.social.discord')}
            </button>
            <button className="auth-soc" onClick={preventDefault}>
              <Icon name="apple" solid size={18} /> {t('auth.social.apple')}
            </button>
          </div>

          <p className="auth-switch">
            {isLogin ? t('auth.noaccount') : t('auth.hasaccount')}{' '}
            <button onClick={() => setMode(isLogin ? 'signup' : 'login')}>
              {isLogin ? t('auth.switch.signup') : t('auth.switch.login')}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

export function GoodbyeOverlay({ show }: { readonly show: boolean }): React.JSX.Element {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [dead, setDead] = useState(false);
  const onError = (): void => {
    if (index < BYE_GIFS.length - 1) {
      setIndex(index + 1);
    } else {
      setDead(true);
    }
  };
  return (
    <div className={`bye-ov${show ? ' is-on' : ''}`} aria-hidden={!show}>
      <div className="bye-card">
        <div className="bye-gifwrap">
          {!dead && (
            <img className="bye-gif" src={BYE_GIFS[index]} alt={t('bye.title')} onError={onError} />
          )}
          <div className="bye-gif-fallback" style={{ display: dead ? 'grid' : 'none' }}>
            <span style={{ fontSize: 42 }}>(ノ^_^)ノ</span>
            <span>// matane.gif</span>
          </div>
          <span className="bye-gif-tag">BYE · またね</span>
        </div>
        <div className="bye-text">
          <span className="bye-wave" aria-hidden="true">
            👋
          </span>
          <h2 className="bye-title">{t('bye.title')}</h2>
          <p className="bye-sub">{t('bye.sub')}</p>
          <span className="bye-tag">{t('bye.tag')}</span>
          <span className="bye-spinner" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
