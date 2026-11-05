// ═══════════════════════════════════════════════════════════════════════════
// frames_ladder.tsx — история лесенки приглашений, 3 кадра (фотостудия 29–31): друг прошёл первый урок, каждый третий друг, тому, кого позвали.
//
// зачем (владелец 29.10: «автоматически, плюс история»; макет claude.ai/artifact/AjzTj69i2bE6EeDfPBxxTG v3): тот же каркас, что у истории
// победителю — диск с числом (StoryDisc), обзор, заголовок, строка текста; без плиток с числами (правило владельца с анонса) и без кнопки.
// Данные — Ядро (LadderStory v1 → проекция доступа → мост в кольцо), цвета — только темы, движение — от часов кадра.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StoryDisc } from './story_disc';
import { Art, FrameRoot, H1, Ov, P } from './story_template_kit';
import type { StoryFrameProps } from './story_template_registry';
import { tplNumber, tplText } from './story_template_strings';

const plusSign = (n: number): string => `+${tplNumber(n)}`;

// ── 29 · друг прошёл первый урок: +500 монет обоим ──────────────────────────────────────────────────────────────────────

export const LadderFriendFrame = memo(function LadderFriendFrame({ tpl, lang }: StoryFrameProps<'ladder_friend'>) {
  const coins = tplText(lang, 'ladderCoinsText', { coins: tpl.coins });
  // зачем: «Ещё N друга — и Plus на 14 дней» — только когда Plus правда начислится (не бессрочный) и ступень не взята прямо сейчас
  const text = tpl.friendsLeft !== null && tpl.friendsLeft > 0 ? `${coins} ${tplText(lang, 'ladderNextPlus', { friends: tpl.friendsLeft, plusDays: tpl.plusDays })}` : coins;
  return (
    <FrameRoot testID="story-tpl-ladder_friend">
      <Art>
        <StoryDisc big={plusSign(tpl.coins)} word={tplText(lang, 'ladderCoinsWord', { coins: tpl.coins })} label={tplText(lang, 'ladderCoinsLabel', { coins: tpl.coins })} lang={lang} size="amount" />
      </Art>
      <Ov text={tplText(lang, 'ladderOverline')} d={360} />
      <H1 text={tplText(lang, 'ladderFriendTitle')} d0={440} />
      <P text={text} d={620} />
    </FrameRoot>
  );
});

// ── 30 · каждый третий друг: Plus на 14 дней и 500 монет ────────────────────────────────────────────────────────────────

export const LadderPlusFrame = memo(function LadderPlusFrame({ tpl, lang }: StoryFrameProps<'ladder_plus'>) {
  return (
    <FrameRoot testID="story-tpl-ladder_plus">
      <Art>
        <StoryDisc big={tplNumber(tpl.plusDays)} word={tplText(lang, 'ladderPlusDaysWord', { plusDays: tpl.plusDays })} label={tplText(lang, 'ladderPlusLabel', { plusDays: tpl.plusDays })} lang={lang} />
      </Art>
      <Ov text={tplText(lang, 'ladderOverline')} d={360} />
      <H1 text={tplText(lang, 'ladderPlusTitle', { passed: tpl.friends })} d0={440} />
      <P text={tplText(lang, 'ladderPlusText', { plusDays: tpl.plusDays, coins: tpl.coins })} d={620} />
    </FrameRoot>
  );
});

// ── 31 · тому, кого позвали: первый урок пройден ────────────────────────────────────────────────────────────────────────

export const LadderInvitedFrame = memo(function LadderInvitedFrame({ tpl, lang }: StoryFrameProps<'ladder_invited'>) {
  return (
    <FrameRoot testID="story-tpl-ladder_invited">
      <Art>
        <StoryDisc big={plusSign(tpl.coins)} word={tplText(lang, 'ladderCoinsWord', { coins: tpl.coins })} label={tplText(lang, 'ladderCoinsLabel', { coins: tpl.coins })} lang={lang} size="amount" />
      </Art>
      <Ov text={tplText(lang, 'ladderInvitedOverline')} d={360} />
      <H1 text={tplText(lang, 'ladderInvitedTitle')} d0={440} />
      <P text={tplText(lang, 'ladderInvitedText', { coins: tpl.coins })} d={620} />
    </FrameRoot>
  );
});
