#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, '.codex-tmp', 'tournament-reddit-bots');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'corpus.json');
const TARGET_COUNT = 200;
const USER_AGENT = 'Mozilla/5.0 PhrasemanBotCorpus/2.0 (local development corpus audit)';
const LISTINGS = [
  'https://en.reddit.com/r/languagelearning/top/?sort=top&t=all',
  'https://en.reddit.com/r/EnglishLearning/top/?sort=top&t=all',
  'https://en.reddit.com/r/ENGLISH/top/?sort=top&t=all',
  'https://en.reddit.com/r/language_exchange/top/?sort=top&t=all',
];
const SEED_PAGES = [
  'https://en.reddit.com/r/languagelearning/comments/13rplub/do_you_create_your_own_private_dictionary_of_new/?limit=500',
  'https://en.reddit.com/r/languagelearning/comments/5i7fhb/there_have_been_threads_in_the_past_asking_why_we/?limit=500',
];
const BLOCKED = /bot|admin|mod(?:erator)?|fuck|shit|cunt|nazi|porn|sex|nipple|racist|hitler|asshole|penis|fart|dick|cock|boob|tits|whore|slut|rape/i;

function fetchHtml(url) {
  return execFileSync('curl.exe', [
    '-L', '--fail', '--silent', '--show-error', '--max-time', '30',
    '-A', USER_AGENT, url,
  ], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });
}

function canonicalCommentUrl(raw) {
  const decoded = raw.replaceAll('&amp;', '&');
  let parsed;
  try {
    parsed = new URL(decoded, 'https://en.reddit.com');
  } catch {
    return null;
  }
  if (!/(?:^|\.)reddit\.com$/i.test(parsed.hostname)) return null;
  if (!/^\/r\/[^/]+\/comments\/[^/]+\//i.test(parsed.pathname)) return null;
  parsed.protocol = 'https:';
  parsed.hostname = 'en.reddit.com';
  parsed.search = '?limit=500';
  parsed.hash = '';
  return parsed.toString();
}

function commentLinks(html) {
  const links = [];
  const seen = new Set();
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const url = canonicalCommentUrl(match[1]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push(url);
  }
  return links;
}

function authors(html) {
  const names = [];
  for (const match of html.matchAll(/class="author[^"]*"[^>]*>([^<]+)<\/a>/g)) {
    const name = match[1].trim();
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(name)) continue;
    if (/^(?:\[deleted\]|AutoModerator)$/i.test(name) || BLOCKED.test(name)) continue;
    names.push(name);
  }
  return names;
}

const pageQueue = [...SEED_PAGES];
for (const listing of LISTINGS) {
  const html = fetchHtml(listing);
  pageQueue.push(...commentLinks(html).slice(0, 12));
}

const uniquePages = [...new Set(pageQueue)];
const selected = [];
const selectedLower = new Set();
const provenance = [];
for (const url of uniquePages) {
  let html;
  try {
    html = fetchHtml(url);
  } catch (error) {
    provenance.push({ url, ok: false, error: String(error?.message || error).slice(0, 300) });
    continue;
  }
  const pageNames = authors(html);
  let accepted = 0;
  for (const name of pageNames) {
    const key = name.toLowerCase();
    if (selectedLower.has(key)) continue;
    selectedLower.add(key);
    selected.push(name);
    accepted += 1;
    if (selected.length === TARGET_COUNT) break;
  }
  provenance.push({ url, ok: true, observedAuthors: pageNames.length, accepted });
  if (selected.length === TARGET_COUNT) break;
}

if (selected.length !== TARGET_COUNT) {
  throw new Error(`reddit_bot_corpus_incomplete:${selected.length}/${TARGET_COUNT}`);
}

const payload = {
  kind: 'tournament_reddit_bot_corpus_v1',
  generatedAt: new Date().toISOString(),
  count: selected.length,
  names: selected,
  sourcePages: provenance.filter((entry) => entry.ok && entry.accepted > 0),
};
const canonicalNames = `${selected.join('\n')}\n`;
payload.namesSha256 = crypto.createHash('sha256').update(canonicalNames).digest('hex');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  count: payload.count,
  sourcePages: payload.sourcePages.length,
  namesSha256: payload.namesSha256,
  output: path.relative(ROOT, OUTPUT_PATH).replaceAll('\\', '/'),
}));
