/* A subreddit's rules, to report a post or comment by: /r/name/about/rules.json,
   its own (each for posts, comments or both) and reddit's: site_rules_flow,
   the steps reddit.com's report asks you through (else site_rules, a plain
   list). reportFlow lays them out as reddit.com does: "Breaks r/name rules"
   first (which rule?), then reddit's, each a reason or a question with
   more under it. */

import { fetchJson } from '../core/http';

// One of reddit's report steps, as rules.json gives it
interface RedditStep {
  reasonTextToShow: string;          // its name
  reasonText?: string;               // what a report says ('' when it asks more)
  nextStepHeader?: string;           // the question under it
  nextStepReasons?: RedditStep[];
  fileComplaint?: boolean;           // not a report: a form on reddit.com
  complaintPrompt?: string;
  complaintUrl?: string;             // its "(thing)": what's reported
  complaintButtonText?: string;
  canWriteNotes?: boolean;           // more to say, in your words
  notesInputTitle?: string;
  isAbuseOfReportButton?: boolean;   // a shorter note
  canSpecifyUsernames?: boolean;     // who: its author
}

interface RedditRules {
  rules: { short_name: string; violation_reason?: string; description?: string; kind: 'link' | 'comment' | 'all' }[];
  site_rules: string[];
  site_rules_flow?: RedditStep[];
}

export interface Rule {
  label: string;                      // its name (what a report says)
  about: string;                      // what it means, in the moderators' words
  on: 'post' | 'comment' | 'all';     // what it's for
}

export interface Rules {
  subreddit: Rule[];
  reddit: Step[];                     // reddit's report steps
}

// What a report says: one of the subreddit's rules, or one of reddit's
// reasons (and a note, and who it's about, where reddit asks)
export type ReportReason =
  | { kind: 'rule'; text: string }
  | { kind: 'site'; text: string; notes: string; usernames: string | null };

// A choice in the report: a reason it sends, a question with more choices
// under it, or a form on reddit.com instead
export interface Step {
  label: string;
  about: string;                                  // a rule's meaning ('' none)
  question: string | null;                        // more to choose (next)
  next: Step[];
  reason: { kind: 'rule' | 'site'; text: string; usernames: boolean } | null;  // what it sends
  notes: { title: string; limit: number } | null;  // a box for more, in your words
  complaint: { prompt: string; url: string; button: string } | null;
}

const ON = { link: 'post', comment: 'comment', all: 'all' } as const;

const step = (label: string): Step => ({ label, about: '', question: null, next: [], reason: null, notes: null, complaint: null });

function readStep(redditStep: RedditStep): Step {
  const next = (redditStep.nextStepReasons ?? []).map(readStep);
  const { complaintUrl, reasonText } = redditStep;
  return {
    ...step(redditStep.reasonTextToShow),
    question: next.length ? redditStep.nextStepHeader || null : null,
    next,
    // a last step without reasonText still reports (by its name, as reddit.com would show it): else Submit could never be tapped
    reason: !next.length && !redditStep.fileComplaint ? { kind: 'site', text: reasonText || redditStep.reasonTextToShow, usernames: Boolean(redditStep.canSpecifyUsernames) } : null,
    notes: redditStep.canWriteNotes ? { title: redditStep.notesInputTitle || 'Additional information (optional)', limit: redditStep.isAbuseOfReportButton ? 250 : 2000 } : null,
    complaint: redditStep.fileComplaint && complaintUrl
      ? { prompt: redditStep.complaintPrompt ?? '', url: complaintUrl, button: redditStep.complaintButtonText || 'Continue' }
      : null,
  };
}

export const readRules = (answer: RedditRules): Rules => ({
  subreddit: answer.rules.map((rule) => ({ label: rule.short_name, about: rule.description ?? '', on: ON[rule.kind] })),
  reddit: answer.site_rules_flow?.length
    ? answer.site_rules_flow.map(readStep)
    : answer.site_rules.map((rule) => ({ ...step(rule), reason: { kind: 'site', text: rule, usernames: false } })),
});

// The report's first choices, as reddit.com's: the subreddit's rules for it
// (behind "Breaks r/name rules"), then reddit's
export function reportFlow(rules: Rules, thing: { kind: 'post' | 'comment'; subreddit: string }): Step[] {
  const own = rules.subreddit.filter(({ on }) => on === 'all' || on === thing.kind);
  const breaks: Step = {
    ...step(`Breaks r/${thing.subreddit} rules`),
    question: 'Which community rule does this violate?',
    next: own.map((rule) => ({ ...step(rule.label), about: rule.about, reason: { kind: 'rule', text: rule.label, usernames: false } })),
  };
  return own.length ? [breaks, ...rules.reddit] : rules.reddit;
}

// The steps chosen so far (by place in each list), each with its choices
export function stepsAt(flow: Step[], trail: number[]) {
  const steps: Step[] = [];
  let choices = flow;
  for (const at of trail) {
    const chosen = choices[at];
    if (!chosen) break;
    steps.push(chosen);
    choices = chosen.next;
  }
  return { steps, choices };
}

// A form's address on reddit.com, for what's reported
export const complaintUrl = (url: string, id: string) => url.replace(/\(thing\)|%28thing%29/gi, id);

export const rulesUrl = (subreddit: string) => `/r/${subreddit}/about/rules.json?raw_json=1`;

export const fetchRules = async (subreddit: string) => readRules(await fetchJson<RedditRules>(rulesUrl(subreddit)));
