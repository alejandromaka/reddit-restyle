/* One of someone's comments, as reddit.com's profile has them: the subreddit
   and the post it's on, who and when, what they wrote, ↑ score ↓. A tap on
   it (not on a link or a button): it, in its thread. */

import type { Vote } from '../../../account/contract';
import { Avatar } from '../../../components/avatar';
import { Markdown } from '../../../components/markdown';
import { Votes } from '../../../components/votes';
import { ago } from '../../../core/text';
import type { UserComment } from '../contract';

interface CommentCardProps {
  comment: UserComment;
  onVote: (vote: Vote) => void;
}

export function CommentCard({ comment, onVote }: CommentCardProps) {
  return (
    <article
      class="rr-grid rr-gap-1 rr-px-4 rr-py-3 rr-border-b rr-border-neutral-border-weak"
      onClick={(event) => {
        if (!(event.target as Element).closest('a, button')) location.assign(comment.permalink);
      }}
    >
      <p class="rr-flex rr-items-center rr-gap-1 rr-min-w-0 rr-text-xs">
        <a
          class="rr-flex rr-flex-none rr-items-center rr-gap-2 rr-font-semibold rr-text-neutral-content-strong"
          href={`/r/${comment.subreddit}/`}
        >
          <Avatar
            name={comment.subreddit}
            icon={comment.subredditIcon}
          />
          r/{comment.subreddit}
        </a>
        <span class="rr-flex-none rr-text-neutral-content-weak">·</span>
        <a
          class="rr-truncate rr-text-neutral-content"
          href={comment.postPath}
        >
          {comment.postTitle}
        </a>
      </p>
      <p class="rr-pl-8 rr-text-xs rr-text-neutral-content-weak">
        <a
          class="rr-font-semibold rr-text-neutral-content-strong"
          href={`/user/${comment.author}/`}
        >
          {comment.author}
        </a>
        {` commented · ${ago(comment.created)}`}
      </p>
      <Markdown
        html={comment.html}
        class="rr-pl-8 rr-pt-1"
      />
      {/* The arrow under the words (the vote's button pads it) */}
      <div class="rr-flex rr-pl-6 rr-text-neutral-content-weak">
        <Votes
          vote={comment.vote}
          score={comment.score}
          hidden={comment.scoreHidden}
          onVote={onVote}
        />
      </div>
    </article>
  );
}
