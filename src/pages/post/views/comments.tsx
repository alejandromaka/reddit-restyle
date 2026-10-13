/* The comments, as reddit.com's: who and when (a tap on the row folds the
   comment and its replies away, again brings them back; on the name: their
   profile), what they wrote, ⊖ (folds it too), ↑ score ↓, Reply and "…"
   (Report), then its replies. A comment with replies has a line down from
   its avatar, past what it wrote (⊖ on it), curving into each reply and
   ending in the last one's curve; a tap on the line folds it too, a mouse on
   it darkens it.
   "N more replies" loads the rest; a thread too deep for here continues on its
   own page. Searching: the loaded comments that match, on their own. */

import { Avatar } from '../../../components/avatar';
import { BusyButton } from '../../../components/busy';
import { Icon } from '../../../components/icon';
import { Markdown } from '../../../components/markdown';
import { cx, ui } from '../../../components/ui';
import { Votes } from '../../../components/votes';
import { ago } from '../../../core/text';
import { commentThing } from '../../../overflow/state';
import { MoreButton } from '../../../overflow/views';
import type { Comment, More, Reply } from '../contract';
import type { PostAction, PostState } from '../types';
import { Composer } from './composer';

// What every comment needs from the page
export interface Talk {
  state: Pick<PostState, 'folded' | 'loading' | 'replyingTo' | 'sending' | 'sendError'>;
  subreddit: string;  // its rules, to report a comment by
  closed: boolean;    // locked or archived: no replies
  dispatch: (action: PostAction) => void;
}

interface CommentsProps {
  replies: Reply[];
  talk: Talk;
  curved?: boolean;  // replies to a comment: each curves out of its line (at the top: none)
}

export function Comments({ replies, talk, curved = false }: CommentsProps) {
  return (
    <div class="rr-grid">
      {replies.map((reply) => (
        <div
          key={reply.id}
          class="rr-relative"
        >
          {curved && <Curve />}
          {reply.kind === 'comment' ? (
            <CommentItem
              comment={reply}
              talk={talk}
            />
          ) : (
            <MoreItem
              more={reply}
              talk={talk}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// A reply's curve out of its parent's line (16px to its left) into its first
// row's middle (28px down: its avatar's, or ⊕'s). The line runs down to where it bends.
function Curve() {
  return <span class="rr-absolute rr-top-4 -rr-left-4 rr-w-4 rr-h-3 rr-border-l rr-border-b rr-rounded-bl-xl rr-border-(--line) rr-pointer-events-none" />;
}

// Who and when: their avatar (32px), name (their profile), OP or MOD, how long ago
function Who({ comment }: { comment: Comment }) {
  return (
    <>
      <Avatar
        name={comment.author}
        icon={null}
        size="md"
      />
      <a
        class="rr-min-w-0 rr-truncate rr-font-semibold rr-text-neutral-content-strong"
        href={`/user/${comment.author}/`}
        onClick={(event) => event.stopPropagation()}  // their profile, not a fold
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
  const earlier = comment.replies.slice(0, -1);
  const last = comment.replies.slice(-1);
  return (
    // --line: its line's color, for the line and its replies' curves (theirs set their own); a mouse on the line darkens it
    <article class="rr-grid rr-pt-3 rr-[--line:var(--color-neutral-border-weak)] has-[>div>button:hover]:rr-[--line:var(--color-neutral-content-weak)]">
      {/* A tap on the row: fold or open it (keys: ⊖, ⊕) */}
      <header
        class="rr-flex rr-items-center rr-gap-2 rr-text-xs rr-text-neutral-content-weak rr-cursor-pointer"
        onClick={fold}
      >
        <Who comment={comment} />
        {folded && (
          <button
            type="button"
            class={cx(ui.icon, 'rr-ml-auto')}
            aria-label="Open the thread"
            aria-expanded="false"
            onClick={(event) => {
              event.stopPropagation();  // the row would open it too
              fold();
            }}
          >
            <Icon name="unfold" />
          </button>
        )}
      </header>
      {!folded && (
        <>
          {/* Beside the line: what it wrote, its actions, its replies but the last (the line runs into its curve) */}
          <div class="rr-relative rr-grid">
            {last.length > 0 && (
              // A tap folds the comment (wider than it looks)
              <button
                type="button"
                class="rr-absolute rr-top-0 -rr-bottom-4 rr-left-1 rr-w-6 rr-cursor-pointer"
                aria-label="Fold the thread"
                aria-expanded="true"
                onClick={fold}
              >
                <span class="rr-block rr-ml-3 rr-h-full rr-border-l rr-border-(--line)" />
              </button>
            )}
            <Markdown
              html={comment.html}
              class="rr-pt-1 rr-pl-10"
            />
            <div class="rr-flex rr-items-center rr-gap-1 rr-text-neutral-content-weak">
              {/* ⊖ on the line, under the avatar: the line breaks around it */}
              <button
                type="button"
                class={cx(ui.icon, 'rr-relative rr-mr-1')}
                aria-label="Fold the thread"
                aria-expanded="true"
                onClick={fold}
              >
                <span class="rr-rounded-full rr-bg-neutral-background">
                  <Icon name="fold" />
                </span>
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
              <MoreButton onOpen={(at) => dispatch({ type: 'menu/opened', thing: commentThing(comment.id, talk.subreddit), at })} />
            </div>
            {replying && (
              <div class="rr-pl-10">
                <Composer
                  placeholder={`Reply to u/${comment.author}`}
                  open
                  sending={state.sending === comment.id}
                  error={state.sendError?.parent === comment.id ? state.sendError.error : null}
                  onSend={(text) => dispatch({ type: 'comment/requested', parent: comment.id, text })}
                  onCancel={() => dispatch({ type: 'reply/toggled', parent: null })}
                />
              </div>
            )}
            {earlier.length > 0 && (
              <div class="rr-pl-8">
                <Comments
                  replies={earlier}
                  talk={talk}
                  curved
                />
              </div>
            )}
          </div>
          {last.length > 0 && (
            <div class="rr-pl-8">
              <Comments
                replies={last}
                talk={talk}
                curved
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}

// More: a row as a comment's first, ⊕ where its avatar would be
const MORE = 'rr-flex rr-items-center rr-gap-2 rr-h-8 rr-text-xs rr-font-semibold rr-text-neutral-content-weak';

function MoreItem({ more, talk }: { more: More; talk: Talk }) {
  const plus = (
    <span class="rr-grid rr-place-items-center rr-w-8">
      <Icon name="unfold" />
    </span>
  );
  if (more.continueAt) {
    return (
      <div class="rr-grid rr-justify-items-start rr-pt-3">
        <a
          class={MORE}
          href={more.continueAt}
        >
          {plus}
          Continue this thread →
        </a>
      </div>
    );
  }
  const status = talk.state.loading[more.id];  // undefined: not asked; '': on its way; else: why it didn't come
  const what = more.depth === 0 ? `View ${more.count} more comments` : `${more.count} more ${more.count === 1 ? 'reply' : 'replies'}`;
  return (
    <div class="rr-grid rr-justify-items-start rr-pt-3">
      <BusyButton
        busy={status === ''}
        class={MORE}
        onClick={() => talk.dispatch({ type: 'more/requested', id: more.id })}
      >
        {plus}
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
            class="rr-pl-10"
          />
          <a
            class="rr-pl-10 rr-text-xs rr-font-semibold rr-text-a-default"
            href={comment.permalink}
          >
            Go to thread
          </a>
        </article>
      ))}
    </div>
  );
}
