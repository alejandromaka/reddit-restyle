/* A subreddit's rules, to report a post or comment by: /r/name/about/rules.json,
   its own (each for posts, comments or both) and reddit's (site_rules) */

import { fetchJson } from '../core/http';

interface RedditRules {
  rules: { short_name: string; violation_reason?: string; kind: 'link' | 'comment' | 'all' }[];
  site_rules: string[];
}

export interface Rule {
  label: string;                      // its name
  reason: string;                     // what a report says (its violation reason, else its name)
  on: 'post' | 'comment' | 'all';     // what it's for
}

export interface Rules {
  subreddit: Rule[];
  reddit: string[];                   // reddit's, each its own reason
}

const ON = { link: 'post', comment: 'comment', all: 'all' } as const;

export const readRules = (answer: RedditRules): Rules => ({
  subreddit: answer.rules.map((rule) => ({ label: rule.short_name, reason: rule.violation_reason || rule.short_name, on: ON[rule.kind] })),
  reddit: answer.site_rules,
});

export const rulesUrl = (subreddit: string) => `/r/${subreddit}/about/rules.json?raw_json=1`;

export const fetchRules = async (subreddit: string) => readRules(await fetchJson<RedditRules>(rulesUrl(subreddit)));
