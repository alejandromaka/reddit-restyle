/* The comments, as reddit.com's: who and when, what they wrote, ⊖ (fold the
   thread; folded: ⊕), ↑ score ↓ and Reply, then its replies along a line.
   "N more replies" loads the rest; a thread too deep for here continues on its
   own page. Searching: the loaded comments that match, on their own. */

import { Avatar } from '../../../components/avatar';
import { BusyButton } from '../../../components/busy';
import { Icon } from '../../../components/icon';
import { Markdown } from '../../../components/markdown';
import { cx, ui } from '../../../components/ui';
import { Votes } from '../../../components/votes';
import { ago } from '../../../core/text';
import type { Comment, More, Reply } from '../contract';
import type { PostAction, PostState } from '../types';
import { Composer } from './composer';

// What every comment needs from the page
export interface Talk {
  state: Pick<PostState, 'folded' | 'loading' | 'replyingTo' | 'sending' | 'sendError'>;
  closed: boolean;  // locked or archived: no replies
  dispatch: (action: PostAction) => void;
}

export function Comments({ replies, talk }: { replies: Reply[]; talk: Talk }) {
  return (
    <div class="rr-grid">
      {replies.map((reply) => (reply.kind === 'comment' ? (
        <CommentItem
          key={reply.id}
          comment={reply}
          talk={talk}
        />
      ) : (
        <MoreItem
          key={reply.id}
          more={reply}
          talk={talk}
        />
      )))}
    </div>
  );
}

function Who({ comment }: { comment: Comment }) {
  return (
    <>
      <Avatar
        name={comment.author}
        icon={null}
      />
      <a
        class="rr-min-w-0 rr-truncate rr-font-semibold rr-text-neutral-content-strong"
        href={`/user/${comment.author}/`}
      >
        {comment.author}
      </a>
      {comment.op && <span class="rr-flex-none rr-font-semibold rr-text-a-default">OP</span>}
      {comment.mod && <span class="rr-flex-none rr-font-semibold rr-text-tags-moderator-content">MOD</span>}
      <span class="rr-flex-none">· {ago(comment.created)}</span>
    </>
  );
}

function CommentItem({ comment, talk }: { comment: Comment; talk: Talk }) {
  const { state, dispatch } = talk;
  const folded = state.folded[comment.id] ?? comment.folded;
  const fold = () => dispatch({ type: 'fold/toggled', id: comment.id, folded: !folded });
  const replying = state.replyingTo === comment.id;
  return (
    <article class="rr-grid rr-pt-3">
      <header class="rr-flex rr-items-center rr-gap-2 rr-text-xs rr-text-neutral-content-weak">
        <Who comment={comment} />
        {folded && (
          <button
            type="button"
            class={cx(ui.icon, 'rr-ml-auto')}
            aria-label="Open the thread"
            aria-expanded="false"
            onClick={fold}
          >
            <Icon name="unfold" />
          </button>
        )}
      </header>
      {!folded && (
        <>
          <div class="rr-grid rr-pl-8">
            <Markdown
              html={comment.html}
              class="rr-pt-1"
            />
            <div class="rr-flex rr-items-center rr-gap-1 rr-text-neutral-content-weak">
              <button
                type="button"
                class={ui.icon}
                aria-label="Fold the thread"
                aria-expanded="true"
                onClick={fold}
              >
                <Icon name="fold" />
              </button>
              <Votes
                vote={comment.vote}
                score={comment.score}
                hidden={comment.scoreHidden}
                onVote={(vote) => dispatch({ type: 'vote/requested', id: comment.id, vote })}
              />
              {!talk.closed && (
                <button
                  type="button"
                  class={ui.plain}
                  aria-expanded={replying}
                  onClick={() => dispatch({ type: 'reply/toggled', parent: replying ? null : comment.id })}
                >
                  <Icon name="comments" />
                  Reply
                </button>
              )}
            </div>
            {replying && (
              <Composer
                placeholder={`Reply to u/${comment.author}`}
                open
                sending={state.sending === comment.id}
                error={state.sendError?.parent === comment.id ? state.sendError.error : null}
                onSend={(text) => dispatch({ type: 'comment/requested', parent: comment.id, text })}
                onCancel={() => dispatch({ type: 'reply/toggled', parent: null })}
              />
            )}
          </div>
          {comment.replies.length > 0 && (
            <div class="rr-ml-3 rr-pl-3 rr-border-l rr-border-neutral-border-weak">
              <Comments
                replies={comment.replies}
                talk={talk}
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}

function MoreItem({ more, talk }: { more: More; talk: Talk }) {
  if (more.continueAt) {
    return (
      <a
        class="rr-py-2 rr-text-xs rr-font-semibold rr-text-a-default"
        href={more.continueAt}
      >
        Continue this thread →
      </a>
    );
  }
  const status = talk.state.loading[more.id];  // undefined: not asked; '': on its way; else: why it didn't come
  const what = more.depth === 0 ? `View ${more.count} more comments` : `${more.count} more ${more.count === 1 ? 'reply' : 'replies'}`;
  return (
    <div class="rr-grid rr-justify-items-start rr-py-2">
      <BusyButton
        busy={status === ''}
        class="rr-h-8 rr-text-xs rr-font-semibold rr-text-a-default"
        onClick={() => talk.dispatch({ type: 'more/requested', id: more.id })}
      >
        {what}
      </BusyButton>
      {status && <p class="rr-text-xs rr-text-danger-content">{status}</p>}
    </div>
  );
}

// Searching: the loaded comments whose words (or author) match, each with a way to its thread
export function SearchResults({ comments, query }: { comments: Comment[]; query: string }) {
  const words = query.trim().toLowerCase();
  const found = comments.filter(({ text, author }) => text.toLowerCase().includes(words) || author.toLowerCase().includes(words));
  return (
    <div class="rr-grid">
      <p class="rr-py-2 rr-text-xs rr-text-neutral-content-weak">
        {found.length} of the loaded comments {found.length === 1 ? 'matches' : 'match'} “{query.trim()}”
      </p>
      {found.map((comment) => (
        <article
          key={comment.id}
          class="rr-grid rr-gap-1 rr-py-3 rr-border-b rr-border-neutral-border-weak"
        >
          <header class="rr-flex rr-items-center rr-gap-2 rr-text-xs rr-text-neutral-content-weak">
            <Who comment={comment} />
          </header>
          <Markdown
            html={comment.html}
            class="rr-pl-8"
          />
          <a
            class="rr-pl-8 rr-text-xs rr-font-semibold rr-text-a-default"
            href={comment.permalink}
          >
            Go to thread
          </a>
        </article>
      ))}
    </div>
  );
}
