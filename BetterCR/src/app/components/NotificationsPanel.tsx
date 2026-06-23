import { useState } from 'react';
import type { NewEpisode } from '@core/api/client';
import type { ReplyNotif } from '@core/api/notifications';
import { postComment } from '@core/api/comments';
import { bridge } from '@core/api/transport';
import { useI18n } from '@app/i18n/i18n';
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

export interface NotificationsPanelProps {
  readonly open: boolean;
  readonly replies: readonly ReplyNotif[];
  readonly episodes: readonly NewEpisode[];
  readonly name: string;
  readonly avatar: string;
  readonly onClose: () => void;
}

function ReplyNotifRow({
  notif,
  name,
  avatar,
}: {
  notif: ReplyNotif;
  name: string;
  avatar: string;
}): React.JSX.Element {
  const { t, lang } = useI18n();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const send = (): void => {
    const body = text.trim();
    if (!body) return;
    // Comments are keyed by episode; recover it from the stored watch path.
    const episodeId = (notif.watchPath ?? '').replace(/^\/watch\//, '').split(/[/?#]/)[0];
    if (!episodeId) return;
    void postComment(episodeId, {
      name,
      avatar,
      text: body,
      parentId: notif.parentId,
      seriesId: notif.series,
      seriesTitle: notif.seriesTitle,
      watchPath: notif.watchPath,
    }).then((comment) => {
      if (comment) {
        setText('');
        setReplying(false);
        setSent(true);
      }
    });
  };

  return (
    <div className="notif-item">
      <span className="notif-avatar">
        {notif.fromAvatar ? <img src={notif.fromAvatar} alt="" /> : <Icon name="user" size={16} />}
      </span>
      <div className="notif-body">
        <p className="notif-line">
          <b>{notif.fromName}</b> {t('notif.replied')}
          {notif.seriesTitle ? <span className="notif-ctx"> · {notif.seriesTitle}</span> : null}
          <span className="notif-time"> · {relTime(notif.ts, lang)}</span>
        </p>
        <p className="notif-text">{notif.text}</p>
        {sent ? (
          <p className="notif-sent">{t('notif.sent')}</p>
        ) : replying ? (
          <div className="notif-reply">
            <textarea
              className="cmt-input"
              value={text}
              maxLength={MAX}
              rows={2}
              placeholder={t('comments.replyTo', { name: notif.fromName })}
              onChange={(event) => setText(event.target.value)}
            />
            <div className="cmt-edit-actions">
              <button className="btn btn-acc cmt-post" disabled={!text.trim()} onClick={send}>
                {t('comments.reply')}
              </button>
              <button className="cmt-act" onClick={() => setReplying(false)}>
                {t('comments.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="notif-actions">
            <button className="cmt-act" onClick={() => setReplying(true)}>
              {t('comments.reply')}
            </button>
            {notif.watchPath && (
              <button className="cmt-act" onClick={() => bridge.navigate(notif.watchPath ?? '')}>
                {t('notif.open')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationsPanel({
  open,
  replies,
  episodes,
  name,
  avatar,
  onClose,
}: NotificationsPanelProps): React.JSX.Element | null {
  const { t } = useI18n();
  if (!open) {
    return null;
  }

  const empty = replies.length === 0 && episodes.length === 0;

  return (
    <div className="notif-panel">
      <div className="notif-head">
        <h3>{t('notif.title')}</h3>
        <button className="hdr-icon" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="notif-scroll">
        {empty && <p className="notif-empty">{t('notif.empty')}</p>}

        {episodes.length > 0 && (
          <section className="notif-section">
            <p className="notif-section-title">{t('notif.episodesToday')}</p>
            {episodes.map((episode) => (
              <button
                key={episode.watchPath}
                className="notif-item notif-ep"
                onClick={() => bridge.navigate(episode.watchPath)}
              >
                <span className="notif-thumb">
                  {episode.thumb && <img src={episode.thumb} alt="" />}
                </span>
                <div className="notif-body">
                  <p className="notif-line">
                    <b>{episode.seriesTitle}</b>
                  </p>
                  <p className="notif-text">
                    {episode.episodeNumber ? `E${String(episode.episodeNumber)} · ` : ''}
                    {t('notif.newEpisode')}
                  </p>
                </div>
                <Icon name="play" size={15} />
              </button>
            ))}
          </section>
        )}

        {replies.length > 0 && (
          <section className="notif-section">
            <p className="notif-section-title">{t('notif.replies')}</p>
            {replies.map((notif) => (
              <ReplyNotifRow key={notif.id} notif={notif} name={name} avatar={avatar} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
