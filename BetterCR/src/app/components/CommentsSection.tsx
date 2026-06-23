import { useMemo, useState, type FormEvent } from 'react';
import {
  clientId,
  commentsEnabled,
  deleteComment,
  editComment,
  getComments,
  postComment,
  type Comment,
} from '@core/api/comments';
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

interface RowProps {
  readonly comment: Comment;
  readonly mine: boolean;
  readonly isReply?: boolean;
  readonly onReply?: () => void;
  readonly onEdit: (text: string) => void;
  readonly onDelete: () => void;
}

function CommentRow({
  comment,
  mine,
  isReply,
  onReply,
  onEdit,
  onDelete,
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
                  if (draft.trim()) {
                    onEdit(draft.trim());
                  }
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
          </div>
        )}
      </div>
    </div>
  );
}

export interface CommentsSectionProps {
  readonly seriesId: string;
}

export function CommentsSection({ seriesId }: CommentsSectionProps): React.JSX.Element | null {
  const { t } = useI18n();
  const { profile } = useProfile();
  const name = profile?.username || t('menu.user');
  const avatar = profile?.avatarUrl || '';
  const enabled = commentsEnabled();
  const myUid = clientId();

  const { data, loading } = useAsync(
    () => (enabled && seriesId ? getComments(seriesId) : Promise.resolve<Comment[]>([])),
    [seriesId, enabled],
  );
  const [posted, setPosted] = useState<Comment[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Comment>>>({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { tops, repliesOf, total } = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...posted, ...(data ?? [])]
      .filter((comment) => (seen.has(comment.id) ? false : (seen.add(comment.id), true)))
      .map((comment) => ({ ...comment, ...overrides[comment.id] }));
    const byParent = new Map<string, Comment[]>();
    for (const comment of merged) {
      if (comment.parentId) {
        const list = byParent.get(comment.parentId) ?? [];
        list.push(comment);
        byParent.set(comment.parentId, list);
      }
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.ts - b.ts);
    }
    return {
      tops: merged.filter((comment) => !comment.parentId),
      repliesOf: (id: string): Comment[] => byParent.get(id) ?? [],
      total: merged.filter((comment) => !comment.deleted).length,
    };
  }, [posted, data, overrides]);

  if (!seriesId) {
    return null;
  }

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
    void postComment(seriesId, { name, avatar, text: body })
      .then((comment) => addPosted(comment, () => setText('')))
      .finally(() => setBusy(false));
  };

  const submitReply = (parentId: string): void => {
    const body = replyText.trim();
    if (!body) return;
    void postComment(seriesId, { name, avatar, text: body, parentId }).then((comment) =>
      addPosted(comment, () => {
        setReplyText('');
        setReplyTo(null);
      }),
    );
  };

  const doEdit = (id: string, next: string): void => {
    void editComment(seriesId, id, next).then((comment) => {
      if (comment) setOverrides((o) => ({ ...o, [id]: { text: comment.text, edited: true } }));
    });
  };
  const doDelete = (id: string): void => {
    void deleteComment(seriesId, id).then((ok) => {
      if (ok) setOverrides((o) => ({ ...o, [id]: { deleted: true, text: '' } }));
    });
  };

  return (
    <section className="cmt page-pad">
      <div className="cmt-head">
        <h2 className="row-title">{t('comments.title')}</h2>
        {total > 0 && <span className="cmt-count">{total}</span>}
      </div>

      {!enabled ? (
        <p className="cmt-soon">{t('comments.soon')}</p>
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
                    mine={comment.uid === myUid}
                    onReply={() => {
                      setReplyTo(replyTo === comment.id ? null : comment.id);
                      setReplyText('');
                    }}
                    onEdit={(next) => doEdit(comment.id, next)}
                    onDelete={() => doDelete(comment.id)}
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
                          mine={reply.uid === myUid}
                          isReply
                          onEdit={(next) => doEdit(reply.id, next)}
                          onDelete={() => doDelete(reply.id)}
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
