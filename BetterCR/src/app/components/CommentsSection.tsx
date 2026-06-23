import { useMemo, useState, type FormEvent } from 'react';
import { commentsEnabled, getComments, postComment, type Comment } from '@core/api/comments';
import { useAsync } from '@app/hooks/useAsync';
import { useI18n } from '@app/i18n/i18n';
import { useProfile } from '@app/profile';
import { Icon } from './Icon';

const MAX = 1000;

function relTime(ts: number, lang: string): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return lang === 'en' ? 'just now' : "à l'instant";
  if (min < 60) return `${String(min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${String(h)} h`;
  return `${String(Math.floor(h / 24))} j`;
}

export interface CommentsSectionProps {
  readonly seriesId: string;
}

/** Watch-page comments for an anime, backed by the free BetterCR comments API. */
export function CommentsSection({ seriesId }: CommentsSectionProps): React.JSX.Element | null {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const name = profile?.username || t('menu.user');
  const enabled = commentsEnabled();

  const { data, loading } = useAsync(
    () => (enabled && seriesId ? getComments(seriesId) : Promise.resolve<Comment[]>([])),
    [seriesId, enabled],
  );
  const [posted, setPosted] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const comments = useMemo(() => [...posted, ...(data ?? [])], [posted, data]);

  if (!seriesId) {
    return null;
  }

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) {
      return;
    }
    setBusy(true);
    void postComment(seriesId, name, body)
      .then((comment) => {
        if (comment) {
          setPosted((prev) => [comment, ...prev]);
          setText('');
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <section className="cmt page-pad">
      <div className="cmt-head">
        <h2 className="row-title">{t('comments.title')}</h2>
        {comments.length > 0 && <span className="cmt-count">{comments.length}</span>}
      </div>

      {!enabled ? (
        <p className="cmt-soon">{t('comments.soon')}</p>
      ) : (
        <>
          <form className="cmt-form" onSubmit={submit}>
            <span className="cmt-avatar">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                <Icon name="user" size={18} />
              )}
            </span>
            <div className="cmt-field">
              <textarea
                className="cmt-input"
                value={text}
                maxLength={MAX}
                rows={2}
                placeholder={t('comments.placeholder')}
                onChange={(event) => setText(event.target.value)}
              />
              <div className="cmt-actions">
                <span className="cmt-as">{t('comments.as', { name })}</span>
                <button className="btn btn-acc cmt-post" disabled={busy || !text.trim()}>
                  {t('comments.post')}
                </button>
              </div>
            </div>
          </form>

          {loading && comments.length === 0 ? (
            <p className="cmt-soon">…</p>
          ) : comments.length === 0 ? (
            <p className="cmt-empty">{t('comments.empty')}</p>
          ) : (
            <ul className="cmt-list">
              {comments.map((comment) => (
                <li key={comment.id} className="cmt-item">
                  <span className="cmt-avatar">
                    <Icon name="user" size={16} />
                  </span>
                  <div className="cmt-body">
                    <p className="cmt-meta">
                      <b className="cmt-name">{comment.name}</b>
                      <span className="cmt-time">{relTime(comment.ts, lang)}</span>
                    </p>
                    <p className="cmt-text">{comment.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
