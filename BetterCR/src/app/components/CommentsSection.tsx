import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  commentsEnabled,
  deleteComment,
  editComment,
  getComments,
  postComment,
  reportComment,
  type Comment,
} from '@core/api/comments';
import { useI18n } from '@app/i18n/i18n';
import { useProfile } from '@app/profile';
import { addMuteWord, isMuted, removeMuteWord, useMuteWords } from '@app/lib/muteWords';
import { relTime } from '@app/lib/relTime';
import { Icon } from './Icon';

const MAX = 1000;
const POLL_MS = 12_000;
const DELETE_LINGER_MS = 4000;

interface RowProps {
  readonly comment: Comment;
  readonly mine: boolean;
  readonly isReply?: boolean;
  readonly onReply?: () => void;
  readonly onEdit: (text: string) => void;
  readonly onDelete: () => void;
  readonly onReport: () => void;
}

function CommentRow({
  comment,
  mine,
  isReply,
  onReply,
  onEdit,
  onDelete,
  onReport,
}: RowProps): React.JSX.Element {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);

  return (
    <div className={`cmt-item${isReply ? ' cmt-reply' : ''}`}>
      <span className="cmt-avatar">
        {comment.avatar ? <img src={comment.avatar} alt="" /> : <Icon name="user" size={16} />}
      </span>
      <div className="cmt-body">
        <p className="cmt-meta">
          <b className="cmt-name">{comment.name}</b>
          <span className="cmt-time">{relTime(comment.ts, lang)}</span>
          {comment.edited && !comment.deleted && (
            <span className="cmt-edited">· {t('comments.edited')}</span>
          )}
        </p>

        {comment.deleted ? (
          <p className="cmt-text cmt-deleted">{t('comments.deleted')}</p>
        ) : editing ? (
          <div className="cmt-edit">
            <textarea
              className="cmt-input"
              value={draft}
              maxLength={MAX}
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="cmt-edit-actions">
              <button
                className="btn btn-acc cmt-post"
                onClick={() => {
                  if (draft.trim()) onEdit(draft.trim());
                  setEditing(false);
                }}
              >
                {t('comments.save')}
              </button>
              <button
                className="cmt-act"
                onClick={() => {
                  setDraft(comment.text);
                  setEditing(false);
                }}
              >
                {t('comments.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <p className="cmt-text">{comment.text}</p>
        )}

        {!comment.deleted && !editing && (
          <div className="cmt-row-actions">
            {onReply && (
              <button className="cmt-act" onClick={onReply}>
                {t('comments.reply')}
              </button>
            )}
            {mine && (
              <button className="cmt-act" onClick={() => setEditing(true)}>
                {t('comments.edit')}
              </button>
            )}
            {mine && (
              <button className="cmt-act cmt-act-danger" onClick={onDelete}>
                {t('comments.delete')}
              </button>
            )}
            {!mine && (
              <button className="cmt-act" onClick={onReport} title={t('comments.report')}>
                <Icon name="shield" size={12} /> {t('comments.report')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface CommentsSectionProps {
  /** Episode id the comments are keyed by (required to show anything). */
  readonly episodeId: string;
  readonly seriesId?: string;
  readonly seriesTitle?: string;
  readonly watchPath?: string;
  /** When true the thread is hidden behind an anti-spoiler guard until revealed. */
  readonly locked?: boolean;
}

export function CommentsSection({
  episodeId,
  seriesId,
  seriesTitle,
  watchPath,
  locked = false,
}: CommentsSectionProps): React.JSX.Element | null {
  const { t } = useI18n();
  const { profile } = useProfile();
  const name = profile?.username || t('menu.user');
  const avatar = profile?.avatarUrl || '';
  const enabled = commentsEnabled();
  const muteWords = useMuteWords();

  const [fetched, setFetched] = useState<Comment[] | null>(null);
  const [posted, setPosted] = useState<Comment[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Comment>>>({});
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [muteOpen, setMuteOpen] = useState(false);
  const [muteDraft, setMuteDraft] = useState('');
  const viewedRef = useRef(false);

  const active = enabled && Boolean(episodeId) && (!locked || revealed);

  // Live updates: poll while the (unlocked) thread is open.
  useEffect(() => {
    if (!active) {
      setFetched(null);
      return;
    }
    let alive = true;
    const load = (): void => {
      const view = !viewedRef.current;
      void getComments(episodeId, { view }).then((items) => {
        if (alive) {
          setFetched(items);
          viewedRef.current = true;
        }
      });
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [episodeId, active]);

  const { tops, repliesOf, total } = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...posted, ...(fetched ?? [])]
      .filter((c) => !removed.has(c.id) && (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .map((c) => ({ ...c, ...overrides[c.id] }))
      .filter((c) => c.deleted || !isMuted(c.text, muteWords));
    const ids = new Set(merged.map((c) => c.id));
    const byParent = new Map<string, Comment[]>();
    for (const c of merged) {
      if (c.parentId && ids.has(c.parentId)) {
        const list = byParent.get(c.parentId) ?? [];
        list.push(c);
        byParent.set(c.parentId, list);
      }
    }
    for (const list of byParent.values()) list.sort((a, b) => a.ts - b.ts);
    return {
      tops: merged.filter((c) => !c.parentId || !ids.has(c.parentId)),
      repliesOf: (id: string): Comment[] => byParent.get(id) ?? [],
      total: merged.filter((c) => !c.deleted).length,
    };
  }, [posted, fetched, overrides, removed, muteWords]);

  if (!episodeId) {
    return null;
  }

  const loading = fetched === null;
  const ctx = { name, avatar, seriesId, seriesTitle, watchPath };

  const addPosted = (comment: Comment | null, after: () => void): void => {
    if (comment) {
      setPosted((prev) => [comment, ...prev]);
      after();
    }
  };

  const submitTop = (event: FormEvent): void => {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    void postComment(episodeId, { ...ctx, text: body })
      .then((comment) => addPosted(comment, () => setText('')))
      .finally(() => setBusy(false));
  };

  const submitReply = (parentId: string): void => {
    const body = replyText.trim();
    if (!body) return;
    void postComment(episodeId, { ...ctx, text: body, parentId }).then((comment) =>
      addPosted(comment, () => {
        setReplyText('');
        setReplyTo(null);
      }),
    );
  };

  const doEdit = (id: string, next: string): void => {
    void editComment(episodeId, id, next).then((comment) => {
      if (comment) setOverrides((o) => ({ ...o, [id]: { text: comment.text, edited: true } }));
    });
  };

  const doDelete = (id: string): void => {
    void deleteComment(episodeId, id).then((ok) => {
      if (!ok) return;
      setOverrides((o) => ({ ...o, [id]: { deleted: true, text: '' } }));
      window.setTimeout(() => setRemoved((prev) => new Set(prev).add(id)), DELETE_LINGER_MS);
    });
  };

  const doReport = (id: string): void => {
    setRemoved((prev) => new Set(prev).add(id)); // hide locally right away
    void reportComment(episodeId, id);
  };

  const addMute = (event: FormEvent): void => {
    event.preventDefault();
    if (muteDraft.trim()) {
      addMuteWord(muteDraft);
      setMuteDraft('');
    }
  };

  return (
    <section className="cmt page-pad">
      <div className="cmt-head">
        <h2 className="row-title">
          {total > 0
            ? `${String(total)} ${t('comments.title').toLowerCase()}`
            : t('comments.title')}
        </h2>
        {enabled && active && (
          <button
            className={`cmt-mute-toggle${muteWords.length > 0 ? ' is-on' : ''}`}
            onClick={() => setMuteOpen((v) => !v)}
            title={t('comments.mute.title')}
          >
            <Icon name="eyeOff" size={14} />
            {muteWords.length > 0 && <span>{muteWords.length}</span>}
          </button>
        )}
      </div>

      {muteOpen && (
        <div className="cmt-mute">
          <p className="cmt-mute-lead">{t('comments.mute.lead')}</p>
          <form className="cmt-mute-add" onSubmit={addMute}>
            <input
              className="cmt-input"
              value={muteDraft}
              maxLength={40}
              placeholder={t('comments.mute.placeholder')}
              onChange={(event) => setMuteDraft(event.target.value)}
            />
            <button className="btn btn-glass" type="submit" disabled={!muteDraft.trim()}>
              {t('comments.mute.add')}
            </button>
          </form>
          {muteWords.length > 0 && (
            <div className="cmt-mute-chips">
              {muteWords.map((word) => (
                <button key={word} className="cmt-mute-chip" onClick={() => removeMuteWord(word)}>
                  {word} <Icon name="x" size={11} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!enabled ? (
        <p className="cmt-soon">{t('comments.soon')}</p>
      ) : locked && !revealed ? (
        <div className="cmt-guard">
          <Icon name="eyeOff" size={26} />
          <p className="cmt-guard-title">{t('comments.locked.title')}</p>
          <p className="cmt-guard-sub">{t('comments.locked.sub')}</p>
          <button className="btn btn-glass" onClick={() => setRevealed(true)}>
            {t('comments.locked.reveal')}
          </button>
        </div>
      ) : (
        <>
          <form className="cmt-form" onSubmit={submitTop}>
            <span className="cmt-avatar">
              {avatar ? <img src={avatar} alt="" /> : <Icon name="user" size={18} />}
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

          {loading && tops.length === 0 ? (
            <p className="cmt-soon">…</p>
          ) : tops.length === 0 ? (
            <p className="cmt-empty">{t('comments.empty')}</p>
          ) : (
            <div className="cmt-list">
              {tops.map((comment) => (
                <div key={comment.id} className="cmt-thread">
                  <CommentRow
                    comment={comment}
                    mine={comment.mine ?? false}
                    onReply={() => {
                      setReplyTo(replyTo === comment.id ? null : comment.id);
                      setReplyText('');
                    }}
                    onEdit={(next) => doEdit(comment.id, next)}
                    onDelete={() => doDelete(comment.id)}
                    onReport={() => doReport(comment.id)}
                  />

                  {replyTo === comment.id && (
                    <div className="cmt-reply-form">
                      <textarea
                        className="cmt-input"
                        value={replyText}
                        maxLength={MAX}
                        rows={2}
                        placeholder={t('comments.replyTo', { name: comment.name })}
                        onChange={(event) => setReplyText(event.target.value)}
                      />
                      <div className="cmt-edit-actions">
                        <button
                          className="btn btn-acc cmt-post"
                          disabled={!replyText.trim()}
                          onClick={() => submitReply(comment.id)}
                        >
                          {t('comments.reply')}
                        </button>
                        <button className="cmt-act" onClick={() => setReplyTo(null)}>
                          {t('comments.cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {repliesOf(comment.id).length > 0 && (
                    <div className="cmt-replies">
                      {repliesOf(comment.id).map((reply) => (
                        <CommentRow
                          key={reply.id}
                          comment={reply}
                          mine={reply.mine ?? false}
                          isReply
                          onEdit={(next) => doEdit(reply.id, next)}
                          onDelete={() => doDelete(reply.id)}
                          onReport={() => doReport(reply.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
