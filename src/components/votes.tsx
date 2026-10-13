/* Votes, as reddit.com's: ↑ score ↓. A post's, a pill colored by your vote
   (orange up, purple down); a comment's, plain, its arrows and score in that
   color. A tap votes; again, takes it back. */

import type { Vote } from '../account/contract';
import { compact } from '../core/text';
import { Icon } from './icon';
import { cx, ui } from './ui';

const PILL = { 1: 'rr-bg-upvote-background rr-text-upvote-onBackground', 0: 'rr-bg-secondary-background', [-1]: 'rr-bg-downvote-background rr-text-downvote-onBackground' };
const PLAIN = { 1: 'rr-text-action-upvote', 0: '', [-1]: 'rr-text-action-downvote' };

interface VotesProps {
  vote: Vote;
  score: number;
  hidden?: boolean;  // reddit hides a new comment's score for a while
  pill?: boolean;
  onVote: (vote: Vote) => void;
}

export function Votes({ vote, score, hidden = false, pill = false, onVote }: VotesProps) {
  return (
    <span class={cx(ui.pill, (pill ? PILL : PLAIN)[vote])}>
      <button
        type="button"
        class={ui.icon}
        aria-label="Upvote"
        aria-pressed={vote === 1}
        onClick={() => onVote(vote === 1 ? 0 : 1)}
      >
        <Icon name="up" />
      </button>
      {hidden ? 'Vote' : compact(score)}
      <button
        type="button"
        class={ui.icon}
        aria-label="Downvote"
        aria-pressed={vote === -1}
        onClick={() => onVote(vote === -1 ? 0 : -1)}
      >
        <Icon name="down" />
      </button>
    </span>
  );
}
